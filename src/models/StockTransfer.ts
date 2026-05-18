import mongoose from 'mongoose';

const stockTransferSchema = new mongoose.Schema(
  {
    transferNumber: {
      type: String,
      unique: true,
      required: true,
    },
    fromBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    toBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['completed', 'cancelled'],
      default: 'completed',
    },
    notes: {
      type: String,
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

stockTransferSchema.pre('validate', async function (next) {
  if (!this.transferNumber) {
    const count = await mongoose.model('StockTransfer').countDocuments();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    this.transferNumber = `TRF-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  next();
});

export default mongoose.models.StockTransfer ||
  mongoose.model('StockTransfer', stockTransferSchema);
