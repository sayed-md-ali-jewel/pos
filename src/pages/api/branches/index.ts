import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Branch from '@/models/Branch';
import { authenticate, authorize, AuthenticatedRequest } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    if (!(await authenticate(req as AuthenticatedRequest, res))) return;

    if (req.method !== 'GET' && !(await authorize(['admin'])(req as AuthenticatedRequest, res))) {
      return;
    }

    switch (req.method) {
      case 'GET':
        return handleGetBranches(res);
      case 'POST':
        return handleCreateBranch(req, res);
      default:
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Branch operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetBranches(res: NextApiResponse<ApiResponse>) {
  const branches = await Branch.find({ isActive: true }).sort({ name: 1 });
  const { response, statusCode } = successResponse('Branches fetched successfully', branches);
  return res.status(statusCode).json(response);
}

async function handleCreateBranch(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const branch = await Branch.create({
      name: req.body.name,
      code: req.body.code,
      phone: req.body.phone,
      address: req.body.address,
      city: req.body.city,
    });

    const { response, statusCode } = successResponse('Branch created successfully', branch, 201);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to create branch',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
