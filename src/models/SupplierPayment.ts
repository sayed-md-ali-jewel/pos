import mongoose from 'mongoose';

const supplierPaymentSchema = new mongoose.Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

supplierPaymentSchema.index({ supplierId: 1, paymentDate: -1 });

export default mongoose.models.SupplierPayment ||
  mongoose.model('SupplierPayment', supplierPaymentSchema);
