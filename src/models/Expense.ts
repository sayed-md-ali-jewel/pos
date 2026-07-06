import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    expenseNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'mobile', 'bank', 'cheque', 'other'],
      default: 'cash',
    },
    expenseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    vendor: {
      type: String,
      trim: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

expenseSchema.pre('save', async function (next) {
  if (!this.expenseNumber) {
    const count = await mongoose.models.Expense.countDocuments();
    this.expenseNumber = `EXP-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

expenseSchema.index({
  branchId: 1,
  title: 'text',
  category: 1,
  vendor: 1,
  reference: 1,
});
expenseSchema.index({ branchId: 1, expenseDate: -1 });

export default mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
