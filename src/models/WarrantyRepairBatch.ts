import mongoose from 'mongoose';

const warrantyRepairBatchSchema = new mongoose.Schema(
  {
    batchNumber: {
      type: String,
      unique: true,
    },
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    customerAddress: {
      type: String,
      trim: true,
    },
    invoicePurchaseDate: {
      type: Date,
      required: true,
    },
    invoiceTotal: {
      type: Number,
    },
    // Track sent and remaining quantities per product
    productRepairTracking: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        productName: {
          type: String,
          required: true,
        },
        productSku: String,
        invoiceQuantity: {
          type: Number,
          required: true,
        },
        totalSentQuantity: {
          type: Number,
          default: 0,
        },
        remainingQuantity: {
          type: Number,
          required: true,
        },
        warrantyType: String,
        warrantyExpiresAt: Date,
        warrantyValid: Boolean,
        // History of all sends for this product
        sendHistory: [
          {
            repairId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'WarrantyRepair',
            },
            quantitySent: Number,
            sentAt: Date,
            status: String,
          },
        ],
      },
    ],
    status: {
      type: String,
      enum: ['Pending', 'Sent to Supplier', 'Received from Supplier', 'Delivered Back to Customer'],
      default: 'Pending',
    },
    notes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate batch number
warrantyRepairBatchSchema.pre('save', async function (next) {
  if (!this.batchNumber) {
    const count = await mongoose.model('WarrantyRepairBatch').countDocuments();
    this.batchNumber = `WB-${Date.now()}-${count + 1}`;
  }
  next();
});

const WarrantyRepairBatch =
  mongoose.models.WarrantyRepairBatch ||
  mongoose.model('WarrantyRepairBatch', warrantyRepairBatchSchema);

export default WarrantyRepairBatch;
