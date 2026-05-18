import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema(
  {
    saleNumber: {
      type: String,
      unique: true,
      required: [true, 'Sale number is required'],
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    walkinCustomerName: String,
    walkinCustomerPhone: String,
    walkinCustomerAddress: String,
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        productName: String,
        price: Number,
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        subtotal: Number,
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxPercent: {
      type: Number,
      default: process.env.STORE_TAX_RATE || 10,
    },
    total: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'cheque', 'mobile'],
      required: true,
    },
    paidAmount: {
      type: Number,
      required: true,
    },
    dueAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'cancelled', 'returned_partial', 'returned_full'],
      default: 'completed',
    },
    returnInfo: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        quantity: Number,
        reason: String,
        condition: {
          type: String,
          enum: ['Good', 'Damaged'],
          default: 'Good',
        },
        refundAmount: Number,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
    cashierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reference: {
      type: String,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique sale number before validation/save
saleSchema.pre('validate', async function (next) {
  try {
    if (!this.isNew) return next();

    // If saleNumber is already set, skip generation
    if (this.saleNumber && this.saleNumber.trim()) return next();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find the highest sale number for today
    const latestSale = await mongoose
      .model('Sale')
      .findOne({ createdAt: { $gte: today, $lt: tomorrow } }, { saleNumber: 1 })
      .sort({ saleNumber: -1 })
      .lean();

    let nextSeq = 1;
    if (latestSale && (latestSale as any).saleNumber) {
      const match = (latestSale as any).saleNumber.match(/(\d+)$/);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }

    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    this.saleNumber = `INV-${dateStr}-${String(nextSeq).padStart(4, '0')}`;
    next();
  } catch (error: any) {
    next(error);
  }
});

saleSchema.index({ branchId: 1, createdAt: -1 });

export default mongoose.models.Sale || mongoose.model('Sale', saleSchema);
