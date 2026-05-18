import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Branch from '@/models/Branch';
import Product from '@/models/Product';
import Sale from '@/models/Sale';
import { authenticate, authorize, AuthenticatedRequest } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    if (!(await authenticate(req as AuthenticatedRequest, res))) return;
    if (!(await authorize(['admin', 'manager'])(req as AuthenticatedRequest, res))) return;

    const branchMatch = req.query.branchId
      ? { branchId: req.query.branchId }
      : (req as AuthenticatedRequest).userRole === 'admin'
        ? {}
        : { branchId: (req as AuthenticatedRequest).branchId };

    const [branches, sales, stock] = await Promise.all([
      Branch.find({ isActive: true }).sort({ name: 1 }),
      Sale.aggregate([
        { $match: branchMatch },
        {
          $group: {
            _id: '$branchId',
            totalSales: { $sum: '$total' },
            transactions: { $sum: 1 },
            dueAmount: { $sum: '$dueAmount' },
          },
        },
      ]),
      Product.aggregate([
        { $match: { isActive: true, ...branchMatch } },
        {
          $group: {
            _id: '$branchId',
            products: { $sum: 1 },
            stockUnits: { $sum: '$stock' },
            lowStockItems: {
              $sum: { $cond: [{ $lte: ['$stock', '$minStock'] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const report = branches
      .filter(
        (branch: any) =>
          !branchMatch.branchId || branch._id.toString() === String(branchMatch.branchId)
      )
      .map((branch: any) => {
        const branchId = branch._id.toString();
        const saleSummary = sales.find((item) => item._id?.toString() === branchId);
        const stockSummary = stock.find((item) => item._id?.toString() === branchId);

        return {
          branch,
          totalSales: saleSummary?.totalSales || 0,
          transactions: saleSummary?.transactions || 0,
          dueAmount: saleSummary?.dueAmount || 0,
          products: stockSummary?.products || 0,
          stockUnits: stockSummary?.stockUnits || 0,
          lowStockItems: stockSummary?.lowStockItems || 0,
        };
      });

    const { response, statusCode } = successResponse('Branch report fetched successfully', report);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch branch report',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
