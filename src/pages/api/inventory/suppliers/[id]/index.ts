import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Supplier from '@/models/Supplier';
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

    switch (req.method) {
      case 'GET':
        return handleGetSupplier(req, res, id as string);
      case 'PATCH':
        return handleUpdateSupplier(req, res, id as string);
      case 'DELETE':
        return handleDeleteSupplier(req, res, id as string);
      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed',
        });
    }
  } catch (error) {
    console.error('Supplier error:', error);
    const { response, statusCode } = errorResponse(
      'Supplier operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetSupplier(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: string
) {
  try {
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json(errorResponse('Supplier not found', undefined, 404).response);
    }

    const { response, statusCode } = successResponse('Supplier fetched successfully', supplier);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch supplier',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleUpdateSupplier(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: string
) {
  try {
    const supplier = await Supplier.findByIdAndUpdate(id, req.body, { new: true });
    if (!supplier) {
      return res.status(404).json(errorResponse('Supplier not found', undefined, 404).response);
    }

    const { response, statusCode } = successResponse('Supplier updated successfully', supplier);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to update supplier',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleDeleteSupplier(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: string
) {
  try {
    const supplier = await Supplier.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!supplier) {
      return res.status(404).json(errorResponse('Supplier not found', undefined, 404).response);
    }

    const { response, statusCode } = successResponse('Supplier deleted successfully', supplier);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to delete supplier',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
