import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Subcategory from '@/models/Subcategory';
import Product from '@/models/Product';
import { authenticate } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import {
  validateInput,
  subcategorySchema,
  subcategoryUpdateSchema,
} from '@/utils/productValidation';
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
        return handleGetSubcategories(req, res);
      case 'POST':
        return handleCreateSubcategory(req, res);
      case 'PUT':
        return handleUpdateSubcategory(req, res);
      case 'DELETE':
        return handleDeleteSubcategory(req, res);
      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed',
        });
    }
  } catch (error) {
    console.error('Subcategory error:', error);
    const { response, statusCode } = errorResponse(
      'Subcategory operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetSubcategories(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { categoryId } = req.query;
    const query: any = { isActive: true };

    if (categoryId) {
      query.category = categoryId;
    }

    const subcategories = await Subcategory.find(query).sort({ name: 1 });
    const { response, statusCode } = successResponse('Subcategories fetched successfully', {
      subcategories,
      count: subcategories.length,
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch subcategories',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleCreateSubcategory(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { isValid, messages, value } = validateInput(subcategorySchema, req.body);
    if (!isValid) {
      const { response, statusCode } = errorResponse(
        'Validation failed',
        messages?.join(', '),
        400
      );
      return res.status(statusCode).json(response);
    }

    const existingSubcategory = await Subcategory.findOne({
      name: value.name,
      category: value.category,
    });
    if (existingSubcategory) {
      const { response, statusCode } = errorResponse(
        'Subcategory already exists in this category',
        undefined,
        400
      );
      return res.status(statusCode).json(response);
    }

    const subcategory = await Subcategory.create(value);
    const { response, statusCode } = successResponse(
      'Subcategory created successfully',
      subcategory,
      201
    );
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to create subcategory',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleUpdateSubcategory(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { id } = req.query;
    if (!id) {
      const { response, statusCode } = errorResponse('Subcategory ID is required', undefined, 400);
      return res.status(statusCode).json(response);
    }

    const { isValid, messages, value } = validateInput(subcategoryUpdateSchema, req.body);
    if (!isValid) {
      const { response, statusCode } = errorResponse(
        'Validation failed',
        messages?.join(', '),
        400
      );
      return res.status(statusCode).json(response);
    }

    const subcategoryToUpdate = await Subcategory.findById(id);
    if (!subcategoryToUpdate) {
      const { response, statusCode } = errorResponse('Subcategory not found', undefined, 404);
      return res.status(statusCode).json(response);
    }

    const nameToCheck = value.name || subcategoryToUpdate.name;
    const categoryToCheck = value.category || subcategoryToUpdate.category;
    const existingSubcategory = await Subcategory.findOne({
      name: nameToCheck,
      category: categoryToCheck,
      _id: { $ne: id },
    });
    if (existingSubcategory) {
      const { response, statusCode } = errorResponse(
        'Subcategory already exists in this category',
        undefined,
        400
      );
      return res.status(statusCode).json(response);
    }

    const subcategory = await Subcategory.findByIdAndUpdate(id, value, { new: true });
    const { response, statusCode } = successResponse(
      'Subcategory updated successfully',
      subcategory
    );
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to update subcategory',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleDeleteSubcategory(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { id } = req.query;
    if (!id) {
      const { response, statusCode } = errorResponse('Subcategory ID is required', undefined, 400);
      return res.status(statusCode).json(response);
    }

    const assignedInStockProducts = await Product.countDocuments({
      subcategory: id,
      isActive: true,
      stock: { $gt: 0 },
    });
    if (assignedInStockProducts > 0) {
      const { response, statusCode } = errorResponse(
        `Subcategory cannot be deleted because ${assignedInStockProducts} in-stock product is assigned to it`,
        undefined,
        400
      );
      return res.status(statusCode).json(response);
    }

    const subcategory = await Subcategory.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!subcategory) {
      const { response, statusCode } = errorResponse('Subcategory not found', undefined, 404);
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = successResponse(
      'Subcategory deleted successfully',
      subcategory
    );
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to delete subcategory',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
