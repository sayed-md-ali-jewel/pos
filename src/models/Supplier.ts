import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    supplierCode: {
      type: String,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
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
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: 5,
      min: 1,
      max: 5,
    },
    lastTransactionDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate supplierCode before saving
supplierSchema.pre('save', async function (next) {
  if (!this.supplierCode) {
    const count = await mongoose.models.Supplier.countDocuments();
    this.supplierCode = `SUP-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

supplierSchema.index({ name: 'text', phone: 1, email: 1, supplierCode: 1 });

export default mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema);
