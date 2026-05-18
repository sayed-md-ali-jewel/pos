import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Purchase from '@/models/Purchase';
import Supplier from '@/models/Supplier';
import { authenticate, AuthenticatedRequest } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { ApiResponse } from '@/types';

void Supplier;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' } as any);
  }
  try {
    await dbConnect();
    if (!(await authenticate(req as AuthenticatedRequest, res))) return;

    const { productId, page = 1, limit = 10 } = req.query;
    if (!productId) {
      const { response, statusCode } = errorResponse('productId is required', undefined, 400);
      return res.status(statusCode).json(response);
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Find all purchases that contain this product
    const purchases = await Purchase.find({ 'items.productId': productId })
      .populate('supplierId', 'name phone email supplierCode')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .lean();

    const total = await Purchase.countDocuments({ 'items.productId': productId });

    // Extract only the item relevant to this product from each purchase
    const enriched = purchases.map((p: any) => {
      const item = p.items.find((i: any) => String(i.productId) === String(productId));
      return {
        _id: p._id,
        purchaseNumber: p.purchaseNumber,
        supplier: p.supplierId,
        date: p.createdAt,
        status: p.status,
        paymentStatus: p.paymentStatus,
        totalAmount: p.totalAmount,
        paidAmount: p.paidAmount,
        dueAmount: p.dueAmount,
        notes: p.notes,
        createdBy: p.createdBy,
        item: item
          ? {
              costPrice: item.costPrice,
              quantity: item.quantity,
              subtotal: item.subtotal,
            }
          : null,
      };
    });

    const { response, statusCode } = successResponse('Purchases fetched', {
      purchases: enriched,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch purchase history',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
