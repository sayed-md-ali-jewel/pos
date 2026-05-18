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

    switch (req.method) {
      case 'GET':
        return handleGetSuppliers(req, res);
      case 'POST':
        return handleCreateSupplier(req, res);
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

async function handleGetSuppliers(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { search, page = 1, limit = 50 } = req.query;

    const query: any = { isActive: true };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { supplierCode: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const suppliers = await Supplier.find(query)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Supplier.countDocuments(query);

    const { response, statusCode } = successResponse('Suppliers fetched successfully', {
      suppliers,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch suppliers',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleCreateSupplier(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { name, phone, email, address, contactPerson } = req.body;
    if (!name || !phone) {
      return res
        .status(400)
        .json(errorResponse('Validation failed', 'Name and phone are required', 400).response);
    }

    const supplier = await Supplier.create({ name, phone, email, address, contactPerson });
    const { response, statusCode } = successResponse(
      'Supplier created successfully',
      supplier,
      201
    );
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to create supplier',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
