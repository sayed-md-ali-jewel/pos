import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import WarrantyRepair from '@/models/WarrantyRepair';
import WarrantyRepairBatch from '@/models/WarrantyRepairBatch';
import Supplier from '@/models/Supplier';
import Purchase from '@/models/Purchase';
import Sale from '@/models/Sale';
import Product from '@/models/Product';
import { AuthenticatedRequest, authenticate } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { ApiResponse } from '@/types';
import { calculateWarrantyExpiry } from '@/utils/warranty';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    if (!(await authenticate(req as AuthenticatedRequest, res))) {
      return;
    }

    switch (req.method) {
      case 'GET':
        return handleGetRequests(req, res);
      case 'POST':
        return handleCreateRequest(req as AuthenticatedRequest, res);
      default:
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Warranty request error:', error);
    const { response, statusCode } = errorResponse(
      'Warranty request operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetRequests(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    if (req.query.invoiceId) {
      return handleInvoiceLookup(req, res);
    }

    const { status, supplierId, search, page = 1, limit = 20, startDate, endDate } = req.query;
    const query: any = {};

    if (status) {
      query.status = status;
    }
    if (supplierId) {
      query.supplierId = supplierId;
    }
    if (search) {
      query.$or = [
        { repairNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const pageNumber = Number(page) || 1;
    const pageSize = Number(limit) || 20;
    const skip = (pageNumber - 1) * pageSize;

    const repairs = await WarrantyRepair.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const total = await WarrantyRepair.countDocuments(query);
    const statusCounts = await WarrantyRepair.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const formattedStatusCounts = statusCounts.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const { response, statusCode } = successResponse('Warranty requests fetched successfully', {
      repairs,
      total,
      page: pageNumber,
      pages: Math.ceil(total / pageSize),
      statusCounts: formattedStatusCounts,
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch warranty requests',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleInvoiceLookup(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const invoiceId = String(req.query.invoiceId || '').trim();
    if (!invoiceId) {
      return res
        .status(400)
        .json(
          errorResponse('Invoice ID required', 'Please provide a valid invoice ID', 400).response
        );
    }

    const sale = await Sale.findOne({ saleNumber: invoiceId })
      .populate('customerId', 'name phone email address')
      .populate('items.productId', 'name sku warranty');

    if (!sale) {
      return res
        .status(404)
        .json(
          errorResponse('Invoice not found', 'No sale matches the provided invoice ID', 404)
            .response
        );
    }

    // Check if batch already exists for this sale
    const batch = await WarrantyRepairBatch.findOne({ saleId: sale._id });

    // Build product options with warranty and quantity tracking
    const productOptions = await Promise.all(
      sale.items.map(async (item: any) => {
        const product = item.productId as any;
        const warrantyDuration = product?.warranty || 'None';
        const warrantyExpiresAt = calculateWarrantyExpiry(sale.createdAt, warrantyDuration);
        const warrantyValid = warrantyExpiresAt && warrantyExpiresAt >= new Date();

        // Calculate sent quantity from previous repairs
        const previousRepairs = await WarrantyRepair.find({
          saleId: sale._id,
          productId: product?._id,
        });
        const totalSentQuantity = previousRepairs.reduce(
          (sum, repair) => sum + (repair.repairQuantity || 0),
          0
        );
        const remainingQuantity = item.quantity - totalSentQuantity;

        return {
          productId: product?._id ? String(product._id) : '',
          productName: item.productName || product?.name || 'Unknown product',
          productSku: product?.sku || '',
          warrantyType: warrantyDuration,
          warrantyExpiresAt,
          warrantyValid,
          invoiceQuantity: item.quantity,
          totalSentQuantity,
          remainingQuantity,
          suggestedSupplier: undefined,
        };
      })
    );

    const productIds = productOptions.map((item) => item.productId).filter(Boolean) as string[];

    const purchases = await Purchase.find({
      status: 'completed',
      'items.productId': { $in: productIds },
    })
      .populate('supplierId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const supplierOptionsMap = new Map<string, { _id: string; name: string }>();
    const productSupplierMap: Record<string, { _id: string; name: string } | undefined> = {};

    for (const purchase of purchases) {
      const supplier = purchase.supplierId as any;
      if (supplier?._id) {
        supplierOptionsMap.set(String(supplier._id), {
          _id: String(supplier._id),
          name: supplier.name,
        });
        for (const line of purchase.items) {
          const itemProductId = String(line.productId);
          if (!productSupplierMap[itemProductId]) {
            productSupplierMap[itemProductId] = {
              _id: String(supplier._id),
              name: supplier.name,
            };
          }
        }
      }
    }

    const supplierOptions = Array.from(supplierOptionsMap.values());
    const productOptionsWithSupplier = productOptions
      .map((option) => ({
        ...option,
        suggestedSupplier: productSupplierMap[option.productId],
      }))
      .filter((option) => option.productId && option.remainingQuantity > 0);

    const relatedRepairs = await WarrantyRepair.find({
      saleId: sale._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    const customerInfo = sale.customerId
      ? sale.customerId
      : sale.walkinCustomerName || sale.walkinCustomerPhone || sale.walkinCustomerAddress
        ? {
            name: sale.walkinCustomerName || '',
            phone: sale.walkinCustomerPhone || '',
            email: '',
            address: sale.walkinCustomerAddress || '',
          }
        : null;

    const { response, statusCode } = successResponse('Invoice details fetched successfully', {
      invoice: {
        id: sale._id,
        saleNumber: sale.saleNumber,
        date: sale.createdAt,
        customer: customerInfo,
        total: sale.total,
        status: sale.status,
        notes: sale.notes,
      },
      productOptions: productOptionsWithSupplier,
      supplierOptions,
      previousClaims: relatedRepairs,
      batch: batch || null,
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to lookup invoice details',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleCreateRequest(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      saleId,
      invoiceNumber,
      invoiceDate,
      // Batch submission with multiple products
      productRepairs, // Array of { productId, quantity, warrantyType, warrantyExpiresAt }
      // Legacy single-product submission
      productName,
      productSku,
      serialNumber,
      purchaseDate,
      warrantyType,
      issueDescription,
      supplierId,
      purchaseId,
      purchaseNumber,
    } = req.body;

    if (!customerName || !customerPhone) {
      return res
        .status(400)
        .json(errorResponse('Validation failed', 'Required fields missing', 400).response);
    }

    if (!saleId && !invoiceNumber) {
      return res
        .status(400)
        .json(errorResponse('Validation failed', 'Invoice information required', 400).response);
    }

    // Get sale/invoice data - always fetch full document
    let sale;
    if (saleId) {
      sale = await Sale.findById(saleId);
    } else if (invoiceNumber) {
      sale = await Sale.findOne({ saleNumber: invoiceNumber });
    }

    if (!sale) {
      return res
        .status(404)
        .json(
          errorResponse('Invoice not found', 'The referenced invoice does not exist', 404).response
        );
    }

    // Handle batch repairs (new flow - multiple products/quantities)
    if (productRepairs && Array.isArray(productRepairs) && productRepairs.length > 0) {
      try {
        // Create or get batch
        let batch = await WarrantyRepairBatch.findOne({
          saleId: saleId || sale._id,
        });

        if (!batch) {
          const productTrackingData = await Promise.all(
            productRepairs.map(async (repair: any) => {
              const product = await Product.findById(repair.productId).select('name sku warranty');
              return {
                productId: repair.productId,
                productName: product?.name || repair.productName,
                productSku: product?.sku || '',
                invoiceQuantity:
                  sale.items?.find(
                    (item: any) => String(item.productId) === String(repair.productId)
                  )?.quantity ||
                  repair.totalInvoiceQty ||
                  0,
                totalSentQuantity: repair.quantity,
                remainingQuantity:
                  (sale.items?.find(
                    (item: any) => String(item.productId) === String(repair.productId)
                  )?.quantity ||
                    repair.totalInvoiceQty ||
                    0) - repair.quantity,
                warrantyType: repair.warrantyType,
                warrantyExpiresAt: repair.warrantyExpiresAt,
                warrantyValid: repair.warrantyValid,
                sendHistory: [],
              };
            })
          );

          batch = await WarrantyRepairBatch.create({
            saleId: saleId || sale._id,
            invoiceNumber: invoiceNumber || sale.saleNumber,
            customerId: sale.customerId,
            customerName,
            customerPhone,
            customerEmail,
            customerAddress,
            invoicePurchaseDate: invoiceDate || sale.createdAt,
            invoiceTotal: sale.total,
            productRepairTracking: productTrackingData,
            createdBy: req.userId,
          });
        }

        // Create individual repair records for each product
        const repairRecords = await Promise.all(
          productRepairs.map(async (repair: any) => {
            let supplierName;
            if (repair.supplierId) {
              const supplier = await Supplier.findById(repair.supplierId);
              if (supplier) {
                supplierName = supplier.name;
              }
            }

            const repairRecord = await WarrantyRepair.create({
              repairNumber: undefined, // Will be auto-generated
              batchId: batch._id,
              saleId: saleId || sale._id,
              invoiceNumber: invoiceNumber || sale.saleNumber,
              productId: repair.productId,
              productName: repair.productName,
              productSku: repair.productSku,
              repairQuantity: repair.quantity,
              returnableQuantity: repair.quantity,
              purchaseDate: invoiceDate || sale.createdAt,
              warrantyType: repair.warrantyType,
              warrantyExpiresAt: repair.warrantyExpiresAt,
              warrantyValid: repair.warrantyValid,
              issueDescription: repair.issueDescription || 'Warranty repair - batch submission',
              supplierId: repair.supplierId || undefined,
              supplierName,
              purchaseId,
              purchaseNumber,
              attachments: repair.attachments || [],
              customerName,
              customerEmail,
              customerPhone,
              customerAddress,
              status: 'Pending',
              createdBy: req.userId,
              history: [
                {
                  status: 'Pending',
                  note: `Batch repair initiated - ${repair.quantity} unit(s) of ${repair.productName}`,
                  performedBy: {
                    id: req.userId,
                    role: req.userRole,
                  },
                },
              ],
            });

            return repairRecord;
          })
        );

        // Update batch with send history for each repair
        for (const repair of repairRecords) {
          await WarrantyRepairBatch.updateOne(
            { _id: batch._id, 'productRepairTracking.productId': repair.productId },
            {
              $push: {
                'productRepairTracking.$.sendHistory': {
                  repairId: repair._id,
                  quantitySent: repair.repairQuantity,
                  sentAt: new Date(),
                  status: 'Pending',
                },
              },
              $inc: {
                'productRepairTracking.$.totalSentQuantity': repair.repairQuantity,
                'productRepairTracking.$.remainingQuantity': -repair.repairQuantity,
              },
            }
          );
        }

        const { response, statusCode } = successResponse(
          'Batch warranty repairs created successfully',
          {
            batch,
            repairs: repairRecords,
          },
          201
        );
        return res.status(statusCode).json(response);
      } catch (error) {
        console.error('Batch repair creation error:', error);
        const { response, statusCode } = errorResponse(
          'Failed to create batch warranty repairs',
          formatErrorMessage(error)
        );
        return res.status(statusCode).json(response);
      }
    }

    // Legacy single-product repair flow
    const { productId, quantity = 1 } = req.body;

    if (!productName || !purchaseDate || !issueDescription || !productId) {
      return res
        .status(400)
        .json(errorResponse('Validation failed', 'Required fields missing', 400).response);
    }

    // Validate quantity against remaining
    const previousRepairs = await WarrantyRepair.find({
      saleId: saleId || sale._id,
      productId,
    });
    const totalSentQuantity = previousRepairs.reduce(
      (sum, repair) => sum + (repair.repairQuantity || 0),
      0
    );
    const saleItem = sale.items?.find((item: any) => String(item.productId) === String(productId));
    const remainingQuantity = (saleItem?.quantity || 0) - totalSentQuantity;

    if (quantity > remainingQuantity) {
      return res
        .status(400)
        .json(
          errorResponse(
            'Invalid quantity',
            `Only ${remainingQuantity} units remaining for this product`,
            400
          ).response
        );
    }

    let supplierName;
    if (supplierId) {
      const supplier = await Supplier.findById(supplierId);
      if (!supplier) {
        return res
          .status(404)
          .json(errorResponse('Invalid supplier', 'Supplier not found', 404).response);
      }
      supplierName = supplier.name;
    }

    let validPurchaseNumber = purchaseNumber;
    if (purchaseId) {
      const purchase = await Purchase.findById(purchaseId).select('purchaseNumber supplierId');
      if (purchase) {
        validPurchaseNumber = purchase.purchaseNumber || purchaseNumber;
      }
    }

    const request = await WarrantyRepair.create({
      saleId: saleId || sale._id,
      invoiceNumber: invoiceNumber || sale.saleNumber,
      productId,
      productName,
      productSku,
      repairQuantity: quantity,
      returnableQuantity: quantity,
      purchaseDate,
      warrantyType,
      issueDescription,
      supplierId: supplierId || undefined,
      supplierName,
      purchaseId,
      purchaseNumber: validPurchaseNumber,
      attachments: [],
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      createdBy: req.userId,
      history: [
        {
          status: 'Pending',
          note: `Warranty repair request created - ${quantity} unit(s)`,
          performedBy: {
            id: req.userId,
            role: req.userRole,
          },
        },
      ],
    });

    const { response, statusCode } = successResponse(
      'Warranty repair request created successfully',
      request,
      201
    );
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to create warranty repair request',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
