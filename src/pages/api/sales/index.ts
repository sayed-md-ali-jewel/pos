import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Sale from '@/models/Sale';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import { authenticate, AuthenticatedRequest } from '@/middleware/auth';
import { getBranchFilter, resolveWriteBranchId } from '@/utils/branchScope';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { validateInput, saleSchema } from '@/utils/saleValidation';
import { ApiResponse } from '@/types';

import StockMovement from '@/models/StockMovement';
import Counter from '@/models/Counter';

async function generateSaleNumber() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const counterName = `sale-${dateStr}`;

  const counter = await Counter.findOneAndUpdate(
    { name: counterName },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );

  return `INV-${dateStr}-${String(counter.sequence).padStart(4, '0')}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    // Authenticate
    if (!(await authenticate(req as AuthenticatedRequest, res))) {
      return;
    }

    const { id } = req.query;

    switch (req.method) {
      case 'GET':
        return id ? handleGetSale(req, res, id as string) : handleGetSales(req, res);
      case 'POST':
        return handleCreateSale(req, res as any);
      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed',
        });
    }
  } catch (error) {
    console.error('Sale error:', error);
    const { response, statusCode } = errorResponse(
      'Sale operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetSales(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { page = 1, limit = 20, customerId } = req.query;

    const query: any = { ...getBranchFilter(req, { adminCanViewAll: true }) };
    if (customerId) {
      query.customerId = customerId;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sales = await Sale.find(query)
      .populate('customerId', 'name phone')
      .populate('cashierId', 'firstName lastName')
      .populate('items.productId', 'name cost')
      .populate('returnInfo.productId', 'name')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Sale.countDocuments(query);

    const { response, statusCode } = successResponse('Sales fetched successfully', {
      sales,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch sales',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetSale(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>,
  id: string
) {
  try {
    const sale = await Sale.findOne({ _id: id, ...getBranchFilter(req, { adminCanViewAll: true }) })
      .populate('customerId', 'name phone email')
      .populate('items.productId', 'name cost')
      .populate('cashierId', 'firstName lastName email');

    if (!sale) {
      const { response, statusCode } = errorResponse('Sale not found', undefined, 404);
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = successResponse('Sale fetched successfully', sale);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch sale',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleCreateSale(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { isValid, messages, value } = validateInput(saleSchema, req.body);
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

    if (value.clientSaleId) {
      const existingSale = await Sale.findOne({
        reference: value.clientSaleId,
        ...getBranchFilter(req, { adminCanViewAll: true }),
      });

      if (existingSale) {
        const { response, statusCode } = successResponse(
          'Offline sale already synced',
          existingSale
        );
        return res.status(statusCode).json(response);
      }
    }

    // --- Manual Rollback Safety ---
    const stockDeductions: { productId: string; quantity: number; previousStock: number }[] = [];
    let customerUpdated = false;

    try {
      // 1. Verify and deduct product stock
      for (const item of value.items) {
        const product = await Product.findOne({
          _id: item.productId,
          ...(branchId ? { branchId } : {}),
        });
        if (!product) {
          throw new Error(`Product ${item.productName} not found`);
        }
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productName}`);
        }

        // Deduct stock
        await Product.findOneAndUpdate(
          { _id: item.productId, ...(branchId ? { branchId } : {}) },
          { $inc: { stock: -item.quantity } }
        );
        stockDeductions.push({
          productId: item.productId,
          quantity: item.quantity,
          previousStock: product.stock,
        });
      }

      // Calculate due amount (never negative)
      const dueAmount = Math.max(value.total - value.paidAmount, 0);

      if (dueAmount > 0 && !value.customerId) {
        throw new Error('Customer is required for partial payment');
      }

      // 2. Update customer if present
      if (value.customerId) {
        await Customer.findOneAndUpdate(
          { _id: value.customerId, ...(branchId ? { branchId } : {}) },
          {
            $inc: {
              totalPurchased: value.total,
              balance: dueAmount,
              dueAmount,
              totalTransactions: 1,
            },
            lastPurchaseDate: new Date(),
          }
        );
        customerUpdated = true;
      }

      const salePayloadData = {
        ...value,
        branchId,
        dueAmount,
        cashierId: req.userId,
        reference: value.clientSaleId,
      };

      salePayloadData.walkinCustomerName = salePayloadData.walkinCustomerName?.trim() || undefined;
      salePayloadData.walkinCustomerPhone =
        salePayloadData.walkinCustomerPhone?.trim() || undefined;
      salePayloadData.walkinCustomerAddress =
        salePayloadData.walkinCustomerAddress?.trim() || undefined;

      // Ensure saleNumber exists before Mongoose required validation.
      if (!salePayloadData.saleNumber || !String(salePayloadData.saleNumber).trim()) {
        salePayloadData.saleNumber = await generateSaleNumber();
      }

      if (!salePayloadData.customerId) {
        delete salePayloadData.customerId;
      }

      // 3. Create sale
      const sale = await Sale.create(salePayloadData);

      // 4. Create Stock Movements
      for (const deduction of stockDeductions) {
        await StockMovement.create({
          type: 'sale',
          branchId,
          productId: deduction.productId,
          quantity: -deduction.quantity,
          previousStock: deduction.previousStock,
          newStock: deduction.previousStock - deduction.quantity,
          referenceId: sale._id,
          referenceModel: 'Sale',
          performedBy: req.userId,
        });
      }

      const populatedSale = await sale.populate('customerId', 'name');

      const { response, statusCode } = successResponse(
        'Sale created successfully',
        populatedSale,
        201
      );
      return res.status(statusCode).json(response);
    } catch (operationError: any) {
      // ROLLBACK
      console.warn('Sale operation failed, initiating rollback...', operationError.message);

      // Rollback customer
      if (customerUpdated && value.customerId) {
        const dueAmount = Math.max(value.total - value.paidAmount, 0);
        await Customer.findOneAndUpdate(
          { _id: value.customerId, ...(branchId ? { branchId } : {}) },
          {
            $inc: {
              totalPurchased: -value.total,
              balance: -dueAmount,
              dueAmount: -dueAmount,
              totalTransactions: -1,
            },
          }
        );
      }

      // Rollback stock
      for (const deduction of stockDeductions) {
        await Product.findOneAndUpdate(
          { _id: deduction.productId, ...(branchId ? { branchId } : {}) },
          { $inc: { stock: deduction.quantity } }
        );
      }

      throw operationError;
    }
  } catch (error: any) {
    console.error('Sale creation error:', error);
    const { response, statusCode } = errorResponse(
      error.message || 'Failed to create sale',
      formatErrorMessage(error),
      400
    );
    return res.status(statusCode).json(response);
  }
}
