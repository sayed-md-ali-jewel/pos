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

    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return res.status(404).json(errorResponse('Purchase not found', undefined, 404).response);
    }

    if (purchase.status !== 'draft') {
      return res
        .status(400)
        .json(errorResponse('Only draft purchases can be confirmed', undefined, 400).response);
    }

    // Manual Rollback Safety
    const stockIncrements: { productId: any; quantity: number; previousStock: number }[] = [];
    let supplierUpdated = false;

    try {
      // 1. Update product stock — capture previous stock before any updates
      for (const item of purchase.items) {
        const product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Product ${item.productId} not found. Cannot confirm purchase.`);
        }

        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
        stockIncrements.push({
          productId: item.productId,
          quantity: item.quantity,
          previousStock: product.stock,
        });
      }

      // 2. Update Supplier
      await Supplier.findByIdAndUpdate(purchase.supplierId, {
        $inc: {
          totalPurchased: purchase.totalAmount,
          dueAmount: purchase.dueAmount,
        },
        lastTransactionDate: new Date(),
      });
      supplierUpdated = true;

      // 3. Update Purchase Order status (do this AFTER stock/supplier so we can skip if they fail)
      await Purchase.findByIdAndUpdate(id, { status: 'completed' });

      // 4. Create Stock Movements
      for (const inc of stockIncrements) {
        await StockMovement.create({
          type: 'purchase',
          productId: inc.productId,
          quantity: inc.quantity,
          previousStock: inc.previousStock,
          newStock: inc.previousStock + inc.quantity,
          referenceId: purchase._id,
          referenceModel: 'Purchase',
          performedBy: authenticatedReq.userId,
        });
      }

      const confirmedPurchase = await Purchase.findById(id).populate('supplierId', 'name');

      const { response, statusCode } = successResponse(
        'Purchase confirmed successfully',
        confirmedPurchase
      );
      return res.status(statusCode).json(response);
    } catch (operationError: any) {
      console.warn('Purchase confirmation failed, initiating rollback...', operationError.message);

      // Rollback supplier
      if (supplierUpdated) {
        await Supplier.findByIdAndUpdate(purchase.supplierId, {
          $inc: {
            totalPurchased: -purchase.totalAmount,
            dueAmount: -purchase.dueAmount,
          },
        });
      }

      // Rollback stock
      for (const inc of stockIncrements) {
        await Product.findByIdAndUpdate(inc.productId, {
          $inc: { stock: -inc.quantity },
        });
      }

      throw operationError;
    }
  } catch (error: any) {
    const { response, statusCode } = errorResponse(
      error.message || 'Failed to confirm purchase',
      formatErrorMessage(error),
      400
    );
    return res.status(statusCode).json(response);
  }
}
