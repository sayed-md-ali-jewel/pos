import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Brand from '@/models/Brand';
import Product from '@/models/Product';
import { authenticate } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { validateInput, brandSchema, brandUpdateSchema } from '@/utils/productValidation';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    // Authenticate
    if (!(await authenticate(req as any, res))) {
      return;
    }

    switch (req.method) {
      case 'GET':
        return handleGetBrands(req, res);
      case 'POST':
        return handleCreateBrand(req, res);
      case 'PUT':
        return handleUpdateBrand(req, res);
      case 'DELETE':
        return handleDeleteBrand(req, res);
      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed',
        });
    }
  } catch (error) {
    console.error('Brand error:', error);
    const { response, statusCode } = errorResponse(
      'Brand operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetBrands(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const brands = await Brand.find({ isActive: true }).sort({ name: 1 });
    const { response, statusCode } = successResponse('Brands fetched successfully', {
      brands,
      count: brands.length,
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch brands',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleCreateBrand(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { isValid, messages, value } = validateInput(brandSchema, req.body);
    if (!isValid) {
      const { response, statusCode } = errorResponse(
        'Validation failed',
        messages?.join(', '),
        400
      );
      return res.status(statusCode).json(response);
    }

    const existingBrand = await Brand.findOne({ name: value.name });
    if (existingBrand) {
      const { response, statusCode } = errorResponse('Brand already exists', undefined, 400);
      return res.status(statusCode).json(response);
    }

    const brand = await Brand.create(value);
    const { response, statusCode } = successResponse('Brand created successfully', brand, 201);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to create brand',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleUpdateBrand(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { id } = req.query;
    if (!id) {
      const { response, statusCode } = errorResponse('Brand ID is required', undefined, 400);
      return res.status(statusCode).json(response);
    }

    const { isValid, messages, value } = validateInput(brandUpdateSchema, req.body);
    if (!isValid) {
      const { response, statusCode } = errorResponse(
        'Validation failed',
        messages?.join(', '),
        400
      );
      return res.status(statusCode).json(response);
    }

    if (value.name) {
      const existingBrand = await Brand.findOne({ name: value.name, _id: { $ne: id } });
      if (existingBrand) {
        const { response, statusCode } = errorResponse('Brand already exists', undefined, 400);
        return res.status(statusCode).json(response);
      }
    }

    const brand = await Brand.findByIdAndUpdate(id, value, { new: true });
    if (!brand) {
      const { response, statusCode } = errorResponse('Brand not found', undefined, 404);
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = successResponse('Brand updated successfully', brand);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to update brand',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleDeleteBrand(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { id } = req.query;
    if (!id) {
      const { response, statusCode } = errorResponse('Brand ID is required', undefined, 400);
      return res.status(statusCode).json(response);
    }

    const assignedInStockProducts = await Product.countDocuments({
      brand: id,
      isActive: true,
      stock: { $gt: 0 },
    });
    if (assignedInStockProducts > 0) {
      const { response, statusCode } = errorResponse(
        `Brand cannot be deleted because ${assignedInStockProducts} in-stock product is assigned to it`,
        undefined,
        400
      );
      return res.status(statusCode).json(response);
    }

    const brand = await Brand.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!brand) {
      const { response, statusCode } = errorResponse('Brand not found', undefined, 404);
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = successResponse('Brand deleted successfully', brand);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to delete brand',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
