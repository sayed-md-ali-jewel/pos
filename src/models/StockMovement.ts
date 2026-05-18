import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['sale', 'purchase', 'return', 'adjustment', 'transfer_in', 'transfer_out'],
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      // Positive for purchase/return, Negative for sale
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      // Can be a Sale ID, Purchase ID, etc.
    },
    referenceModel: {
      type: String,
      enum: ['Sale', 'Purchase', 'StockTransfer', 'None'],
      default: 'None',
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

export default mongoose.models.StockMovement ||
  mongoose.model('StockMovement', stockMovementSchema);
