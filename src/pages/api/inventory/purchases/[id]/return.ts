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

    if (req.method !== 'POST') {
      return res.status(405).json(errorResponse('Method not allowed', undefined, 405).response);
    }

    const authenticatedReq = req as AuthenticatedRequest;
    const { id } = req.query;
    const { returnItems, reason } = req.body;
    // returnItems: { productId, quantity, refundAmount }[]

    if (!returnItems || !Array.isArray(returnItems) || returnItems.length === 0) {
      return res
        .status(400)
        .json(errorResponse('Validation failed', 'returnItems array is required', 400).response);
    }

    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return res.status(404).json(errorResponse('Purchase not found', undefined, 404).response);
    }

    if (purchase.status !== 'completed') {
      return res
        .status(400)
        .json(
          errorResponse('Can only return items from completed purchases', undefined, 400).response
        );
    }

    // Manual Rollback Safety
    const stockDecrements: { productId: any; quantity: number; previousStock: number }[] = [];
    let supplierUpdated = false;
    let totalRefundAmount = 0;

    try {
      // 1. Validate all items first before touching the database
      for (const item of returnItems) {
        if (!item.productId || !item.quantity || item.quantity <= 0) {
          throw new Error('Each return item requires productId and a positive quantity');
        }

        const purchaseItem = purchase.items.find(
          (pi: any) => pi.productId.toString() === item.productId
        );
        if (!purchaseItem) {
          throw new Error(`Item ${item.productId} was not part of this purchase`);
        }
        if (item.quantity > purchaseItem.quantity) {
          throw new Error(
            `Cannot return more than ${purchaseItem.quantity} units for product ${item.productId}`
          );
        }

        const product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        if (product.stock < item.quantity) {
          throw new Error(
            `Insufficient stock to return ${item.quantity} units of product ${item.productId}. Current stock: ${product.stock}`
          );
        }

        totalRefundAmount += Number(item.refundAmount || 0);

        stockDecrements.push({
          productId: item.productId,
          quantity: item.quantity,
          previousStock: product.stock,
        });
      }

      // 2. Apply stock decrements
      for (const dec of stockDecrements) {
        await Product.findByIdAndUpdate(dec.productId, { $inc: { stock: -dec.quantity } });
      }

      // 3. Update Supplier balance
      await Supplier.findByIdAndUpdate(purchase.supplierId, {
        $inc: {
          totalPurchased: -totalRefundAmount,
          dueAmount: -totalRefundAmount,
        },
      });
      supplierUpdated = true;

      // 4. Append return note to purchase (use findByIdAndUpdate to avoid re-triggering pre-save hook)
      const returnNote = `\n[RETURNED: ${new Date().toLocaleDateString()} - Reason: ${reason || 'N/A'}]`;
      await Purchase.findByIdAndUpdate(id, {
        $set: { notes: (purchase.notes || '') + returnNote },
      });

      // 5. Create Stock Movements
      for (const dec of stockDecrements) {
        await StockMovement.create({
          type: 'return',
          productId: dec.productId,
          quantity: -dec.quantity,
          previousStock: dec.previousStock,
          newStock: dec.previousStock - dec.quantity,
          referenceId: purchase._id,
          referenceModel: 'Purchase',
          notes: `Purchase Return - Reason: ${reason || 'N/A'}`,
          performedBy: authenticatedReq.userId,
        });
      }

      const updatedPurchase = await Purchase.findById(id).populate('supplierId', 'name');

      const { response, statusCode } = successResponse(
        'Purchase return processed successfully',
        updatedPurchase
      );
      return res.status(statusCode).json(response);
    } catch (operationError: any) {
      console.warn('Purchase return failed, initiating rollback...', operationError.message);

      // Rollback supplier
      if (supplierUpdated) {
        await Supplier.findByIdAndUpdate(purchase.supplierId, {
          $inc: { totalPurchased: totalRefundAmount, dueAmount: totalRefundAmount },
        });
      }

      // Rollback stock
      for (const dec of stockDecrements) {
        await Product.findByIdAndUpdate(dec.productId, {
          $inc: { stock: dec.quantity },
        });
      }

      throw operationError;
    }
  } catch (error: any) {
    const { response, statusCode } = errorResponse(
      error.message || 'Failed to process purchase return',
      formatErrorMessage(error),
      400
    );
    return res.status(statusCode).json(response);
  }
}
