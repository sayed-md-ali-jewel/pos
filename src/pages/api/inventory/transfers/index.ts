import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Product from '@/models/Product';
import StockMovement from '@/models/StockMovement';
import StockTransfer from '@/models/StockTransfer';
import { authenticate, authorize, AuthenticatedRequest } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    if (!(await authenticate(req as AuthenticatedRequest, res))) return;
    if (!(await authorize(['admin', 'manager'])(req as AuthenticatedRequest, res))) return;

    switch (req.method) {
      case 'GET':
        return handleGetTransfers(req, res);
      case 'POST':
        return handleCreateTransfer(req as AuthenticatedRequest, res);
      default:
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Transfer operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetTransfers(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const { page = 1, limit = 20, branchId } = req.query;
  const query = branchId ? { $or: [{ fromBranchId: branchId }, { toBranchId: branchId }] } : {};
  const skip = (Number(page) - 1) * Number(limit);

  const transfers = await StockTransfer.find(query)
    .populate('productId', 'name sku barcode')
    .populate('performedBy', 'firstName lastName')
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await StockTransfer.countDocuments(query);
  const { response, statusCode } = successResponse('Transfers fetched successfully', {
    transfers,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
  return res.status(statusCode).json(response);
}

async function handleCreateTransfer(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { productId, fromBranchId, toBranchId, quantity, notes } = req.body;

    if (!productId || !fromBranchId || !toBranchId || !quantity) {
      const { response, statusCode } = errorResponse(
        'Product, source branch, destination branch, and quantity are required',
        undefined,
        400
      );
      return res.status(statusCode).json(response);
    }

    if (fromBranchId === toBranchId) {
      const { response, statusCode } = errorResponse(
        'Source and destination branches must be different',
        undefined,
        400
      );
      return res.status(statusCode).json(response);
    }

    if (req.userRole !== 'admin' && req.branchId !== fromBranchId) {
      const { response, statusCode } = errorResponse(
        'Managers can only transfer stock from their assigned branch',
        undefined,
        403
      );
      return res.status(statusCode).json(response);
    }

    const transferQuantity = Number(quantity);
    const sourceProduct = await Product.findOne({ _id: productId, branchId: fromBranchId });

    if (!sourceProduct) {
      const { response, statusCode } = errorResponse(
        'Source branch product not found',
        undefined,
        404
      );
      return res.status(statusCode).json(response);
    }

    if (sourceProduct.stock < transferQuantity) {
      const { response, statusCode } = errorResponse(
        'Insufficient source branch stock',
        undefined,
        400
      );
      return res.status(statusCode).json(response);
    }

    const destinationProduct = await Product.findOneAndUpdate(
      { sku: sourceProduct.sku, barcode: sourceProduct.barcode, branchId: toBranchId },
      {
        $setOnInsert: {
          name: sourceProduct.name,
          description: sourceProduct.description,
          category: sourceProduct.category,
          subcategory: sourceProduct.subcategory,
          brand: sourceProduct.brand,
          barcode: sourceProduct.barcode,
          sku: sourceProduct.sku,
          price: sourceProduct.price,
          cost: sourceProduct.cost,
          minStock: sourceProduct.minStock,
          warranty: sourceProduct.warranty,
          image: sourceProduct.image,
          images: sourceProduct.images,
          branchId: toBranchId,
          stock: 0,
        },
      },
      { upsert: true, new: true }
    );

    const sourcePreviousStock = sourceProduct.stock;
    const destinationPreviousStock = destinationProduct.stock;

    await Product.findByIdAndUpdate(sourceProduct._id, { $inc: { stock: -transferQuantity } });
    await Product.findByIdAndUpdate(destinationProduct._id, { $inc: { stock: transferQuantity } });

    const transfer = await StockTransfer.create({
      productId: sourceProduct._id,
      fromBranchId,
      toBranchId,
      quantity: transferQuantity,
      notes,
      performedBy: req.userId,
    });

    await StockMovement.create({
      type: 'transfer_out',
      branchId: fromBranchId,
      productId: sourceProduct._id,
      quantity: -transferQuantity,
      previousStock: sourcePreviousStock,
      newStock: sourcePreviousStock - transferQuantity,
      referenceId: transfer._id,
      referenceModel: 'StockTransfer',
      notes,
      performedBy: req.userId,
    });

    await StockMovement.create({
      type: 'transfer_in',
      branchId: toBranchId,
      productId: destinationProduct._id,
      quantity: transferQuantity,
      previousStock: destinationPreviousStock,
      newStock: destinationPreviousStock + transferQuantity,
      referenceId: transfer._id,
      referenceModel: 'StockTransfer',
      notes,
      performedBy: req.userId,
    });

    const populatedTransfer = await transfer.populate('productId');
    const { response, statusCode } = successResponse(
      'Stock transferred successfully',
      populatedTransfer,
      201
    );
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to transfer stock',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
