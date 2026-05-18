import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import CustomerPayment from '@/models/CustomerPayment';
import { authenticate, AuthenticatedRequest } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    await dbConnect();

    if (!(await authenticate(req as AuthenticatedRequest, res))) {
      return;
    }

    const authReq = req as AuthenticatedRequest;
    if (!authReq.userRole || !['admin', 'manager', 'cashier'].includes(authReq.userRole)) {
      const { response, statusCode } = errorResponse('Unauthorized', undefined, 403);
      return res.status(statusCode).json(response);
    }

    const { id, page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const query = { customerId: id };

    const payments = await CustomerPayment.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await CustomerPayment.countDocuments(query);

    const { response, statusCode } = successResponse('Payments fetched successfully', {
      payments,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    });

    return res.status(statusCode).json(response);
  } catch (error) {
    console.error('Customer payments error:', error);
    const { response, statusCode } = errorResponse(
      'Failed to fetch payments',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
