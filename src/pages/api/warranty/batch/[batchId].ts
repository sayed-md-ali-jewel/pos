import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import WarrantyRepairBatch from '@/models/WarrantyRepairBatch';
import WarrantyRepair from '@/models/WarrantyRepair';
import { AuthenticatedRequest, authenticate } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    if (!(await authenticate(req as AuthenticatedRequest, res))) {
      return;
    }

    const { batchId } = req.query;

    if (!batchId) {
      return res
        .status(400)
        .json(errorResponse('Batch ID required', 'Please provide a batch ID', 400).response);
    }

    switch (req.method) {
      case 'GET':
        return handleGetBatchDetail(req, res, batchId as string);
      default:
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Warranty batch error:', error);
    const { response, statusCode } = errorResponse(
      'Warranty batch operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetBatchDetail(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  batchId: string
) {
  try {
    const batch = await WarrantyRepairBatch.findById(batchId).lean();

    if (!batch) {
      return res
        .status(404)
        .json(errorResponse('Batch not found', 'The warranty batch does not exist', 404).response);
    }

    const repairs = await WarrantyRepair.find({ batchId }).sort({ createdAt: 1 }).lean();

    const { response, statusCode } = successResponse('Batch details fetched successfully', {
      batch,
      repairs,
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch batch details',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
