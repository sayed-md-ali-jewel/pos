import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import StockMovement from '@/models/StockMovement';
import { authenticate } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    if (!(await authenticate(req as any, res))) {
      return;
    }

    if (req.method !== 'GET') {
      return res.status(405).json(errorResponse('Method not allowed', undefined, 405).response);
    }

    const { page = 1, limit = 50, productId, type } = req.query;

    const query: any = {};
    if (productId) query.productId = productId;
    if (type) query.type = type;

    const skip = (Number(page) - 1) * Number(limit);
    const history = await StockMovement.find(query)
      .populate('productId', 'name sku')
      .populate('performedBy', 'firstName lastName')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await StockMovement.countDocuments(query);

    const { response, statusCode } = successResponse('Stock history fetched successfully', {
      history,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    console.error('Stock History error:', error);
    const { response, statusCode } = errorResponse(
      'Failed to fetch stock history',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
