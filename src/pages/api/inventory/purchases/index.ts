import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Purchase from '@/models/Purchase';
import Product from '@/models/Product';
import Supplier from '@/models/Supplier';
import StockMovement from '@/models/StockMovement';
import { authenticate, AuthenticatedRequest } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    if (!(await authenticate(req as AuthenticatedRequest, res))) {
      return;
    }

    const { id } = req.query;

    switch (req.method) {
      case 'GET':
        return id ? handleGetPurchase(req, res, id as string) : handleGetPurchases(req, res);
      case 'POST':
        return handleCreatePurchase(req as AuthenticatedRequest, res);
      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed',
        });
    }
  } catch (error) {
    console.error('Purchase error:', error);
    const { response, statusCode } = errorResponse(
      'Purchase operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetPurchase(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: string
) {
  try {
    const purchase = await Purchase.findById(id)
      .populate('supplierId', 'name phone email address city supplierCode')
      .populate('createdBy', 'firstName lastName')
      .populate('items.productId', 'name sku price stock');

    if (!purchase) {
      const { response, statusCode } = errorResponse('Purchase not found', undefined, 404);
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = successResponse('Purchase fetched successfully', purchase);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch purchase',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetPurchases(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { page = 1, limit = 20, supplierId } = req.query;

    const query: any = {};
    if (supplierId) query.supplierId = supplierId;

    const skip = (Number(page) - 1) * Number(limit);
    const purchases = await Purchase.find(query)
      .populate('supplierId', 'name phone')
      .populate('createdBy', 'firstName lastName')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Purchase.countDocuments(query);

    const { response, statusCode } = successResponse('Purchases fetched successfully', {
      purchases,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch purchases',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleCreatePurchase(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { supplierId, items, paidAmount, notes, status = 'completed' } = req.body;

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json(errorResponse('Validation failed', 'Supplier and items are required', 400).response);
    }

    // Manual Rollback Safety
    const stockIncrements: { productId: string; quantity: number; previousStock: number }[] = [];
    let supplierUpdated = false;
    let totalAmount = 0;

    try {
      // 1. Calculate total
      for (const item of items) {
        if (!item.productId || !item.quantity || !item.costPrice) {
          throw new Error('Invalid item data (requires productId, quantity, costPrice)');
        }

        const subtotal = Number(item.quantity) * Number(item.costPrice);
        totalAmount += subtotal;
        item.subtotal = subtotal;

        if (status === 'completed') {
          const product = await Product.findById(item.productId);
          if (!product) {
            throw new Error(`Product ${item.productId} not found`);
          }

          const productUpdate: any = {};
          if (item.costPrice > (product.cost ?? 0)) {
            productUpdate.cost = item.costPrice;

            const existingCost = product.cost ?? 0;
            const existingPrice = product.price ?? 0;
            let suggestedPrice = existingPrice;

            if (existingCost > 0) {
              const currentMargin = (existingPrice - existingCost) / existingCost;
              suggestedPrice = Number((item.costPrice * (1 + currentMargin)).toFixed(2));
              if (suggestedPrice <= existingPrice) {
                suggestedPrice = existingPrice;
              }
            } else if (existingPrice <= item.costPrice) {
              suggestedPrice = Number((item.costPrice * 1.1).toFixed(2));
            }

            if (suggestedPrice > existingPrice) {
              productUpdate.price = suggestedPrice;
            }
          }

          if (Object.keys(productUpdate).length > 0) {
            await Product.findByIdAndUpdate(item.productId, productUpdate);
          }

          // Increment stock
          await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
          stockIncrements.push({
            productId: item.productId,
            quantity: item.quantity,
            previousStock: product.stock,
          });
        }
      }

      const dueAmount = totalAmount - Number(paidAmount || 0);

      // 2. Update Supplier only if completed
      if (status === 'completed') {
        await Supplier.findByIdAndUpdate(supplierId, {
          $inc: {
            totalPurchased: totalAmount,
            dueAmount: dueAmount,
          },
          lastTransactionDate: new Date(),
        });
        supplierUpdated = true;
      }

      // 3. Create Purchase Order
      const purchase = await Purchase.create({
        supplierId,
        items,
        totalAmount,
        paidAmount: Number(paidAmount || 0),
        dueAmount,
        notes,
        status,
        createdBy: req.userId,
      });

      // 4. Create Stock Movements only if completed
      if (status === 'completed') {
        for (const inc of stockIncrements) {
          await StockMovement.create({
            type: 'purchase',
            productId: inc.productId,
            quantity: inc.quantity,
            previousStock: inc.previousStock,
            newStock: inc.previousStock + inc.quantity,
            referenceId: purchase._id,
            referenceModel: 'Purchase',
            performedBy: req.userId,
          });
        }
      }

      const populatedPurchase = await purchase.populate('supplierId', 'name');

      const { response, statusCode } = successResponse(
        `Purchase ${status === 'draft' ? 'drafted' : 'created'} successfully`,
        populatedPurchase,
        201
      );
      return res.status(statusCode).json(response);
    } catch (operationError: any) {
      if (status === 'completed') {
        console.warn('Purchase operation failed, initiating rollback...', operationError.message);

        // Rollback supplier
        if (supplierUpdated) {
          const dueAmount = totalAmount - Number(paidAmount || 0);
          await Supplier.findByIdAndUpdate(supplierId, {
            $inc: { totalPurchased: -totalAmount, dueAmount: -dueAmount },
          });
        }

        // Rollback stock
        for (const inc of stockIncrements) {
          await Product.findByIdAndUpdate(inc.productId, {
            $inc: { stock: -inc.quantity },
          });
        }
      }

      throw operationError;
    }
  } catch (error: any) {
    const { response, statusCode } = errorResponse(
      error.message || 'Failed to create purchase',
      formatErrorMessage(error),
      400
    );
    return res.status(statusCode).json(response);
  }
}
