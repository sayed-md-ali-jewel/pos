import mongoose from 'mongoose';
import Counter from './Counter';

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: {
      type: String,
      unique: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        productName: String,
        costPrice: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        subtotal: Number,
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    paidAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    dueAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'completed', 'pending', 'cancelled'],
      default: 'completed',
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'partial', 'due'],
      default: 'paid',
    },
    notes: {
      type: String,
      trim: true,
    },
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

// Generate unique purchase number
purchaseSchema.pre('save', async function (next) {
  if (!this.isNew) return next();

  const sequence = await (Counter as any).getNextSequence('purchase');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  this.purchaseNumber = `PO-${dateStr}-${String(sequence).padStart(4, '0')}`;

  if (this.paidAmount >= this.totalAmount) {
    this.paymentStatus = 'paid';
  } else if (this.paidAmount > 0) {
    this.paymentStatus = 'partial';
  } else {
    this.paymentStatus = 'due';
  }

  next();
});

export default mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);
