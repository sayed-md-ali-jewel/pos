import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Supplier from '@/models/Supplier';
import Purchase from '@/models/Purchase';
import SupplierPayment from '@/models/SupplierPayment';
import { authenticate, AuthenticatedRequest } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    if (!(await authenticate(req as AuthenticatedRequest, res))) {
      return;
    }

    if (req.method !== 'POST') {
      return res.status(405).json(errorResponse('Method not allowed', undefined, 405).response);
    }

    const { id } = req.query;
    const { amount, paymentDate, note } = req.body;
    const requestedAmount = Number(amount);

    if (!id || Array.isArray(id)) {
      return res
        .status(400)
        .json(errorResponse('Validation failed', 'Supplier id is required', 400).response);
    }

    if (!requestedAmount || requestedAmount <= 0) {
      return res
        .status(400)
        .json(
          errorResponse('Validation failed', 'Payment amount must be greater than 0', 400).response
        );
    }

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json(errorResponse('Supplier not found', undefined, 404).response);
    }

    const duePurchases = await Purchase.find({
      supplierId: id,
      dueAmount: { $gt: 0 },
      status: { $ne: 'cancelled' },
    }).sort({ createdAt: 1 });

    if (duePurchases.length === 0) {
      return res
        .status(400)
        .json(errorResponse('No outstanding due found for this supplier', undefined, 400).response);
    }

    const totalDueInPurchases = duePurchases.reduce(
      (sum, purchase) => sum + Number(purchase.dueAmount || 0),
      0
    );
    const payableAmount = Math.min(
      requestedAmount,
      totalDueInPurchases,
      Number(supplier.dueAmount || 0)
    );

    if (payableAmount <= 0) {
      return res
        .status(400)
        .json(errorResponse('No payable due amount available', undefined, 400).response);
    }

    const rollbackSnapshot: {
      purchaseId: string;
      paidAmount: number;
      dueAmount: number;
      paymentStatus: string;
    }[] = [];

    let remaining = payableAmount;

    try {
      for (const purchase of duePurchases) {
        if (remaining <= 0) break;

        const currentDue = Number(purchase.dueAmount || 0);
        if (currentDue <= 0) continue;

        const allocate = Math.min(currentDue, remaining);
        const nextDue = Math.max(currentDue - allocate, 0);
        const nextPaid = Number(purchase.paidAmount || 0) + allocate;
        const nextPaymentStatus = nextDue === 0 ? 'paid' : nextPaid > 0 ? 'partial' : 'due';

        rollbackSnapshot.push({
          purchaseId: String(purchase._id),
          paidAmount: Number(purchase.paidAmount || 0),
          dueAmount: currentDue,
          paymentStatus: String(purchase.paymentStatus || 'due'),
        });

        await Purchase.findByIdAndUpdate(purchase._id, {
          paidAmount: nextPaid,
          dueAmount: nextDue,
          paymentStatus: nextPaymentStatus,
        });

        remaining -= allocate;
      }

      await Supplier.findByIdAndUpdate(id, {
        $inc: { dueAmount: -payableAmount },
        lastTransactionDate: new Date(),
      });

      await SupplierPayment.create({
        supplierId: id,
        amount: payableAmount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        note: String(note || '').trim(),
        createdBy: (req as AuthenticatedRequest).userId,
      });

      const updatedSupplier = await Supplier.findById(id);
      const { response, statusCode } = successResponse('Due payment recorded successfully', {
        paidAmount: payableAmount,
        requestedAmount,
        remainingRequested: Math.max(requestedAmount - payableAmount, 0),
        supplier: updatedSupplier,
      });
      return res.status(statusCode).json(response);
    } catch (operationError: any) {
      for (const snapshot of rollbackSnapshot) {
        await Purchase.findByIdAndUpdate(snapshot.purchaseId, {
          paidAmount: snapshot.paidAmount,
          dueAmount: snapshot.dueAmount,
          paymentStatus: snapshot.paymentStatus,
        });
      }

      throw operationError;
    }
  } catch (error: any) {
    const { response, statusCode } = errorResponse(
      error.message || 'Failed to process due payment',
      formatErrorMessage(error),
      400
    );
    return res.status(statusCode).json(response);
  }
}
