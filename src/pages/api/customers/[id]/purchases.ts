import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Sale from '@/models/Sale';
import { authenticate } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    if (!(await authenticate(req as any, res))) return;

    const { id } = req.query;
    if (!id) {
      const { response, statusCode } = errorResponse('Customer ID is required', undefined, 400);
      return res.status(statusCode).json(response);
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const sales = await Sale.find({ customerId: id })
      .populate('items.productId', 'name')
      .populate('cashierId', 'name')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Sale.countDocuments({ customerId: id });

    const { response, statusCode } = successResponse('Purchase history fetched', {
      purchases: sales,
      total,
      page: Number(page),
      limit: Number(limit),
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
