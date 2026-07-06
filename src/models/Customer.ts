import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    customerCode: {
      type: String,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      sparse: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPurchased: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalTransactions: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPurchaseDate: {
      type: Date,
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
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

// Auto-generate customerCode before saving
customerSchema.pre('save', async function (next) {
  if (!this.customerCode) {
    const count = await mongoose.models.Customer.countDocuments();
    this.customerCode = `CUS-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Index for faster searches
customerSchema.index({ branchId: 1, name: 'text', phone: 1, email: 1, customerCode: 1 });
customerSchema.index({ branchId: 1, email: 1 }, { sparse: true });

export default mongoose.models.Customer || mongoose.model('Customer', customerSchema);
