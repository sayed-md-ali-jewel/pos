import mongoose from 'mongoose';
import { calculateWarrantyExpiry } from '@/utils/warranty';
import Counter from './Counter';

const warrantyRepairSchema = new mongoose.Schema(
  {
    repairNumber: {
      type: String,
      unique: true,
    },
    // Link to batch for multi-product repairs
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WarrantyRepairBatch',
    },
    // Link to invoice (sale)
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
    // For single-product repairs (legacy)
    invoiceItems: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        productName: String,
        productSku: String,
        quantity: Number,
        serialNumber: String,
      },
    ],
    // For product-wise repairs (new)
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    repairQuantity: {
      type: Number,
      default: 1,
    },
    returnableQuantity: {
      type: Number,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    customerAddress: {
      type: String,
      trim: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    productSku: {
      type: String,
      trim: true,
    },
    serialNumber: {
      type: String,
      trim: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
    },
    warrantyType: {
      type: String,
      enum: [
        'None',
        '1 Month',
        '3 Months',
        '6 Months',
        '1 Year',
        '2 Years',
        '3 Years',
        '4 Years',
        '5 Years',
        '6 Years',
        '7 Years',
        '8 Years',
        '9 Years',
        '10 Years',
        '11 Years',
        '12 Years',
        '13 Years',
        '14 Years',
        '15 Years',
      ],
      default: 'None',
    },
    warrantyExpiresAt: {
      type: Date,
    },
    warrantyValid: {
      type: Boolean,
      default: false,
    },
    issueDescription: {
      type: String,
      trim: true,
      required: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    supplierName: {
      type: String,
      trim: true,
    },
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
    },
    purchaseNumber: {
      type: String,
      trim: true,
    },
    attachments: {
      type: [String],
      default: [],
    },
    sendToSupplier: {
      sentAt: Date,
      expectedReturnDate: Date,
      shippingMethod: String,
      trackingNumber: String,
      notes: String,
    },
    status: {
      type: String,
      enum: [
        'Pending',
        'Sent to Supplier',
        'In Repair',
        'Received from Supplier',
        'Ready for Delivery',
        'Repaired',
        'Returned to Shop',
        'Delivered Back to Customer',
      ],
      default: 'Pending',
    },
    history: [
      {
        status: String,
        note: String,
        performedBy: {
          id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          name: String,
          role: String,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

warrantyRepairSchema.pre('save', async function (next) {
  if (!this.repairNumber) {
    const sequence = await (Counter as any).getNextSequence('warrantyRepair');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    this.repairNumber = `WR-${dateStr}-${String(sequence).padStart(4, '0')}`;
  }

  if (this.purchaseDate) {
    const expiry = calculateWarrantyExpiry(this.purchaseDate, this.warrantyType);
    this.warrantyExpiresAt = expiry || undefined;
    this.warrantyValid = !!expiry && expiry >= new Date();
  } else {
    this.warrantyValid = false;
    this.warrantyExpiresAt = undefined;
  }

  next();
});

warrantyRepairSchema.index({
  repairNumber: 1,
  invoiceNumber: 'text',
  customerName: 'text',
  productName: 'text',
  serialNumber: 'text',
});

export default mongoose.models.WarrantyRepair ||
  mongoose.model('WarrantyRepair', warrantyRepairSchema);
