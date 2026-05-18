import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Sale from '@/models/Sale';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
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

    if (req.method !== 'POST') {
      return res.status(405).json(errorResponse('Method not allowed', undefined, 405).response);
    }

    const { id } = req.query;
    const { returnItems } = req.body;
    // returnItems: { productId, quantity, reason, condition, refundAmount }[]

    if (!returnItems || !Array.isArray(returnItems) || returnItems.length === 0) {
      return res
        .status(400)
        .json(errorResponse('Validation failed', 'returnItems array is required', 400).response);
    }

    const sale = await Sale.findById(id);
    if (!sale) {
      return res.status(404).json(errorResponse('Sale not found', undefined, 404).response);
    }

    if (sale.status === 'returned_full' || sale.status === 'cancelled') {
      return res
        .status(400)
        .json(
          errorResponse(`Cannot return items from a ${sale.status} sale`, undefined, 400).response
        );
    }

    // Manual Rollback Safety
    const stockUpdates: {
      productId: string;
      quantity: number;
      condition: string;
      previousStock: number;
    }[] = [];
    let totalRefundAmount = 0;
    let customerUpdated = false;

    try {
      // 1. Process Product Inventory (Restock / Defective)
      for (const item of returnItems) {
        const product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        const saleItem = sale.items.find((si: any) => si.productId.toString() === item.productId);
        if (!saleItem) {
          throw new Error(`Item ${item.productId} was not part of this sale`);
        }

        // Find existing returns for this item to ensure we don't over-return
        const previousReturnedQty = sale.returnInfo
          ? sale.returnInfo
              .filter((ri: any) => ri.productId.toString() === item.productId)
              .reduce((sum: number, ri: any) => sum + ri.quantity, 0)
          : 0;

        if (item.quantity + previousReturnedQty > saleItem.quantity) {
          throw new Error(
            `Cannot return more quantity than originally sold for product ${item.productId}`
          );
        }

        totalRefundAmount += Number(item.refundAmount || 0);

        // Update Inventory based on condition
        if (item.condition === 'Damaged') {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { defectiveStock: item.quantity },
          });
          stockUpdates.push({
            productId: item.productId,
            quantity: item.quantity,
            condition: 'Damaged',
            previousStock: product.defectiveStock || 0,
          });
        } else {
          await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
          stockUpdates.push({
            productId: item.productId,
            quantity: item.quantity,
            condition: 'Good',
            previousStock: product.stock,
          });
        }
      }

      // 2. Update Customer Balance if applicable
      if (sale.customerId && totalRefundAmount > 0) {
        // If returning items, we decrease their totalPurchased.
        // We also decrease their dueAmount if they had one, OR add to their balance if fully paid.
        // For simplicity, we just reduce the dueAmount by refundAmount, allowing it to go negative (meaning we owe them money/store credit).
        await Customer.findByIdAndUpdate(sale.customerId, {
          $inc: {
            totalPurchased: -totalRefundAmount,
            balance: -totalRefundAmount,
            dueAmount: -totalRefundAmount,
          },
        });
        customerUpdated = true;
      }

      // 3. Update Sale
      const newReturnInfo = returnItems.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        reason: item.reason,
        condition: item.condition || 'Good',
        refundAmount: item.refundAmount || 0,
        date: new Date(),
      }));

      // Check if FULL or PARTIAL return
      const totalItemsOriginallySold = sale.items.reduce(
        (sum: number, item: any) => sum + item.quantity,
        0
      );
      const previouslyReturned = sale.returnInfo
        ? sale.returnInfo.reduce((sum: number, ri: any) => sum + ri.quantity, 0)
        : 0;
      const newlyReturned = returnItems.reduce((sum: number, item: any) => sum + item.quantity, 0);

      const newStatus =
        previouslyReturned + newlyReturned >= totalItemsOriginallySold
          ? 'returned_full'
          : 'returned_partial';

      const updatedSale = await Sale.findByIdAndUpdate(
        id,
        {
          $set: { status: newStatus },
          $push: { returnInfo: { $each: newReturnInfo } },
        },
        { new: true }
      )
        .populate('customerId', 'name')
        .populate('returnInfo.productId', 'name');

      // 4. Create Stock Movements
      for (const update of stockUpdates) {
        await StockMovement.create({
          type: 'return',
          productId: update.productId,
          quantity: update.quantity,
          previousStock: update.previousStock,
          newStock: update.previousStock + update.quantity,
          referenceId: sale._id,
          referenceModel: 'Sale',
          notes: `Return - Condition: ${update.condition}`,
          performedBy: (req as AuthenticatedRequest).userId,
        });
      }

      const { response, statusCode } = successResponse(
        'Return processed successfully',
        updatedSale
      );
      return res.status(statusCode).json(response);
    } catch (operationError: any) {
      console.warn('Return operation failed, initiating rollback...', operationError.message);

      // Rollback customer
      if (customerUpdated && sale.customerId) {
        await Customer.findByIdAndUpdate(sale.customerId, {
          $inc: {
            totalPurchased: totalRefundAmount,
            balance: totalRefundAmount,
            dueAmount: totalRefundAmount,
          },
        });
      }

      // Rollback stock
      for (const update of stockUpdates) {
        if (update.condition === 'Damaged') {
          await Product.findByIdAndUpdate(update.productId, {
            $inc: { defectiveStock: -update.quantity },
          });
        } else {
          await Product.findByIdAndUpdate(update.productId, { $inc: { stock: -update.quantity } });
        }
      }

      throw operationError;
    }
  } catch (error: any) {
    const { response, statusCode } = errorResponse(
      error.message || 'Failed to process return',
      formatErrorMessage(error),
      400
    );
    return res.status(statusCode).json(response);
  }
}
