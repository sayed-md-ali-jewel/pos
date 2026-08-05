import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Purchase from '@/models/Purchase';
import Supplier from '@/models/Supplier';
import SupplierPayment from '@/models/SupplierPayment';
import { authenticate } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    if (!(await authenticate(req as any, res))) {
      return;
    }

    const { id } = req.query;

    if (req.method !== 'GET') {
      return res.status(405).json(errorResponse('Method not allowed', undefined, 405).response);
    }

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json(errorResponse('Supplier not found', undefined, 404).response);
    }

    // Fetch all purchases for this supplier
    const purchases = await Purchase.find({ supplierId: id }).sort({ createdAt: -1 });

    const purchaseEntries = purchases.map((p) => ({
      purchaseId: p._id,
      date: p.createdAt,
      reference: p.purchaseNumber,
      type: 'Purchase',
      amount: p.totalAmount,
      paid: p.paidAmount,
      balance: p.dueAmount,
      status: p.status,
      note: p.notes || '',
      items: p.items.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        costPrice: item.costPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
    }));

    const payments = await SupplierPayment.find({ supplierId: id }).sort({ paymentDate: -1 });
    const paymentEntries = payments.map((p) => ({
      date: p.paymentDate || p.createdAt,
      reference: `PAY-${String(p._id).slice(-6).toUpperCase()}`,
      type: 'Payment',
      amount: 0,
      paid: p.amount,
      balance: 0,
      status: 'paid',
      note: p.note || '',
    }));

    const ledger = [...purchaseEntries, ...paymentEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const { response, statusCode } = successResponse('Supplier ledger fetched successfully', {
      supplier,
      ledger,
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    console.error('Ledger error:', error);
    const { response, statusCode } = errorResponse(
      'Failed to fetch supplier ledger',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
