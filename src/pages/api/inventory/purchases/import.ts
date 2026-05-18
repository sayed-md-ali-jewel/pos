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
    const { supplierId, items, notes } = req.body;
    // items: { sku, quantity, costPrice }[]

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json(errorResponse('Validation failed', 'Supplier and items are required', 400).response);
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json(errorResponse('Supplier not found', undefined, 404).response);
    }

    const processedItems: {
      productId: any;
      productName: string;
      costPrice: number;
      quantity: number;
      subtotal: number;
    }[] = [];
    const stockIncrements: { productId: any; quantity: number; previousStock: number }[] = [];
    let totalAmount = 0;
    let supplierUpdated = false;
    let purchase: any = null;

    try {
      // 1. Validate and resolve products by SKU, capture previous stock before any updates
      for (const item of items) {
        if (!item.sku || !item.quantity || !item.costPrice) {
          throw new Error('Each item requires sku, quantity, and costPrice');
        }

        const product = await Product.findOne({ sku: item.sku });
        if (!product) {
          throw new Error(`Product with SKU "${item.sku}" not found`);
        }

        const qty = Number(item.quantity);
        const cost = Number(item.costPrice);

        if (qty <= 0) throw new Error(`Quantity must be positive for SKU "${item.sku}"`);
        if (cost < 0) throw new Error(`Cost price cannot be negative for SKU "${item.sku}"`);

        const subtotal = qty * cost;
        totalAmount += subtotal;

        processedItems.push({
          productId: product._id,
          productName: product.name,
          costPrice: cost,
          quantity: qty,
          subtotal,
        });

        stockIncrements.push({
          productId: product._id,
          quantity: qty,
          previousStock: product.stock,
        });
      }

      // 2. Increment product stock
      for (const inc of stockIncrements) {
        await Product.findByIdAndUpdate(inc.productId, { $inc: { stock: inc.quantity } });
      }

      // 3. Update Supplier balance
      await Supplier.findByIdAndUpdate(supplierId, {
        $inc: {
          totalPurchased: totalAmount,
          dueAmount: totalAmount, // Bulk imports are assumed fully due
        },
        lastTransactionDate: new Date(),
      });
      supplierUpdated = true;

      // 4. Create Purchase record
      purchase = await Purchase.create({
        supplierId,
        items: processedItems,
        totalAmount,
        paidAmount: 0,
        dueAmount: totalAmount,
        notes: notes || 'Bulk CSV Import',
        status: 'completed',
        createdBy: authenticatedReq.userId,
      });

      // 5. Create Stock Movements
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

      const { response, statusCode } = successResponse(
        'Bulk purchase imported successfully',
        purchase
      );
      return res.status(statusCode).json(response);
    } catch (operationError: any) {
      console.warn('Bulk import failed, initiating rollback...', operationError.message);

      // Rollback stock increments
      for (const inc of stockIncrements) {
        await Product.findByIdAndUpdate(inc.productId, {
          $inc: { stock: -inc.quantity },
        });
      }

      // Rollback supplier balance
      if (supplierUpdated) {
        await Supplier.findByIdAndUpdate(supplierId, {
          $inc: { totalPurchased: -totalAmount, dueAmount: -totalAmount },
        });
      }

      throw operationError;
    }
  } catch (error: any) {
    console.error('Import error:', error);
    const { response, statusCode } = errorResponse(
      error.message || 'Bulk import failed',
      formatErrorMessage(error),
      400
    );
    return res.status(statusCode).json(response);
  }
}
