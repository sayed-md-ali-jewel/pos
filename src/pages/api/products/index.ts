import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Product from '@/models/Product';
import '@/models/Category';
import '@/models/Subcategory';
import '@/models/Brand';
import { authenticate } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/middleware/auth';
import { getBranchFilter, resolveWriteBranchId } from '@/utils/branchScope';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { validateInput, productSchema, productUpdateSchema } from '@/utils/productValidation';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    // Authenticate
    if (!(await authenticate(req as any, res))) {
      return;
    }

    const { id } = req.query;

    switch (req.method) {
      case 'GET':
        return id ? handleGetProduct(req, res, id as string) : handleGetProducts(req, res);
      case 'POST':
        return handleCreateProduct(req, res);
      case 'PUT':
        return id
          ? handleUpdateProduct(req, res, id as string)
          : handleError(res, 'Product ID required', 400);
      case 'DELETE':
        return id
          ? handleDeleteProduct(req, res, id as string)
          : handleError(res, 'Product ID required', 400);
      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed',
        });
    }
  } catch (error) {
    console.error('Product error:', error);
    const { response, statusCode } = errorResponse(
      'Product operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetProducts(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const {
      search,
      exactBarcode,
      category,
      brand,
      subcategory,
      minPrice,
      maxPrice,
      stockStatus,
      page = 1,
      limit = 20,
    } = req.query;

    const branchFilter = getBranchFilter(req, { adminCanViewAll: true });
    const query: any = { isActive: true, ...branchFilter };

    if (exactBarcode) {
      // Extremely fast lookup for POS scanner
      const product = await Product.findOne({
        barcode: exactBarcode,
        isActive: true,
        ...getBranchFilter(req, { adminCanViewAll: true }),
      })
        .populate('category', 'name')
        .populate('subcategory', 'name')
        .populate('brand', 'name');

      if (!product) {
        // Return empty successful list to match standard format
        return res.status(200).json({
          success: true,
          message: 'Product not found',
          data: { products: [], total: 0, page: 1, limit: 1, pages: 0 },
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Product found',
        data: { products: [product], total: 1, page: 1, limit: 1, pages: 1 },
      });
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: search },
        { sku: search },
      ];
    }

    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (subcategory) query.subcategory = subcategory;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (stockStatus === 'inStock') {
      query.$expr = { $gt: ['$stock', '$minStock'] };
    } else if (stockStatus === 'lowStock') {
      query.$expr = { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$minStock'] }] };
    } else if (stockStatus === 'outOfStock') {
      query.stock = 0;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('brand', 'name')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);
    const summaryQuery = { isActive: true, ...branchFilter };
    const [totalItems, lowStockItems, outOfStockItems] = await Promise.all([
      Product.countDocuments(summaryQuery),
      Product.countDocuments({
        ...summaryQuery,
        $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$minStock'] }] },
      }),
      Product.countDocuments({ ...summaryQuery, stock: 0 }),
    ]);

    const { response, statusCode } = successResponse('Products fetched successfully', {
      products,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
      summary: {
        totalItems,
        lowStockItems,
        outOfStockItems,
      },
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch products',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetProduct(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>,
  id: string
) {
  try {
    const product = await Product.findOne({
      _id: id,
      ...getBranchFilter(req, { adminCanViewAll: true }),
    })
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('brand', 'name');

    if (!product) {
      const { response, statusCode } = errorResponse('Product not found', undefined, 404);
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = successResponse('Product fetched successfully', product);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch product',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleCreateProduct(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { isValid, messages, value } = validateInput(productSchema, req.body);
    if (!isValid) {
      const { response, statusCode } = errorResponse(
        'Validation failed',
        messages?.join(', '),
        400
      );
      return res.status(statusCode).json(response);
    }

    const branchId = resolveWriteBranchId(req, res, value.branchId);
    if (res.writableEnded) return;

    const product = await Product.create({ ...value, branchId });
    const populatedProduct = await product.populate('category subcategory brand', 'name');

    const { response, statusCode } = successResponse(
      'Product created successfully',
      populatedProduct,
      201
    );
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to create product',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleUpdateProduct(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>,
  id: string
) {
  try {
    const { isValid, messages, value } = validateInput(productUpdateSchema, req.body);
    if (!isValid) {
      const { response, statusCode } = errorResponse(
        'Validation failed',
        messages?.join(', '),
        400
      );
      return res.status(statusCode).json(response);
    }

    const branchId = resolveWriteBranchId(req, res, value.branchId);
    if (res.writableEnded) return;

    const product = await Product.findOneAndUpdate(
      { _id: id, ...getBranchFilter(req, { adminCanViewAll: true }) },
      { ...value, branchId },
      { new: true }
    ).populate('category subcategory brand', 'name');

    if (!product) {
      const { response, statusCode } = errorResponse('Product not found', undefined, 404);
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = successResponse('Product updated successfully', product);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to update product',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleDeleteProduct(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>,
  id: string
) {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: id, ...getBranchFilter(req, { adminCanViewAll: true }) },
      { isActive: false },
      { new: true }
    );

    if (!product) {
      const { response, statusCode } = errorResponse('Product not found', undefined, 404);
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = successResponse('Product deleted successfully', product);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to delete product',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

function handleError(res: NextApiResponse<ApiResponse>, message: string, statusCode: number) {
  const { response, statusCode: code } = errorResponse(message, undefined, statusCode);
  return res.status(code).json(response);
}
