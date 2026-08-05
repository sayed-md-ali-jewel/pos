import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { authenticate } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { validateInput, categorySchema, categoryUpdateSchema } from '@/utils/productValidation';
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
        return handleGetCategories(req, res);
      case 'POST':
        return handleCreateCategory(req, res);
      case 'PUT':
        return handleUpdateCategory(req, res);
      case 'DELETE':
        return handleDeleteCategory(req, res);
      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed',
        });
    }
  } catch (error) {
    console.error('Category error:', error);
    const { response, statusCode } = errorResponse(
      'Category operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetCategories(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    const { response, statusCode } = successResponse('Categories fetched successfully', {
      categories,
      count: categories.length,
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch categories',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleCreateCategory(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { isValid, messages, value } = validateInput(categorySchema, req.body);
    if (!isValid) {
      const { response, statusCode } = errorResponse(
        'Validation failed',
        messages?.join(', '),
        400
      );
      return res.status(statusCode).json(response);
    }

    const existingCategory = await Category.findOne({ name: value.name });
    if (existingCategory) {
      const { response, statusCode } = errorResponse('Category already exists', undefined, 400);
      return res.status(statusCode).json(response);
    }

    const category = await Category.create(value);
    const { response, statusCode } = successResponse(
      'Category created successfully',
      category,
      201
    );
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to create category',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
async function handleUpdateCategory(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { id } = req.query;
    if (!id) {
      const { response, statusCode } = errorResponse('Category ID is required', undefined, 400);
      return res.status(statusCode).json(response);
    }

    const { isValid, messages, value } = validateInput(categoryUpdateSchema, req.body);
    if (!isValid) {
      const { response, statusCode } = errorResponse(
        'Validation failed',
        messages?.join(', '),
        400
      );
      return res.status(statusCode).json(response);
    }

    if (value.name) {
      const existingCategory = await Category.findOne({ name: value.name, _id: { $ne: id } });
      if (existingCategory) {
        const { response, statusCode } = errorResponse('Category already exists', undefined, 400);
        return res.status(statusCode).json(response);
      }
    }

    const category = await Category.findByIdAndUpdate(id, value, { new: true });
    if (!category) {
      const { response, statusCode } = errorResponse('Category not found', undefined, 404);
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = successResponse('Category updated successfully', category);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to update category',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleDeleteCategory(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { id } = req.query;
    if (!id) {
      const { response, statusCode } = errorResponse('Category ID is required', undefined, 400);
      return res.status(statusCode).json(response);
    }

    const assignedInStockProducts = await Product.countDocuments({
      category: id,
      isActive: true,
      stock: { $gt: 0 },
    });
    if (assignedInStockProducts > 0) {
      const { response, statusCode } = errorResponse(
        `Category cannot be deleted because ${assignedInStockProducts} in-stock product is assigned to it`,
        undefined,
        400
      );
      return res.status(statusCode).json(response);
    }

    const category = await Category.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!category) {
      const { response, statusCode } = errorResponse('Category not found', undefined, 404);
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = successResponse('Category deleted successfully', category);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to delete category',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
