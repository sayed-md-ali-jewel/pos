import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subcategory',
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
    },
    barcode: {
      type: String,
      sparse: true,
    },
    sku: {
      type: String,
      sparse: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    cost: {
      type: Number,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    defectiveStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    minStock: {
      type: Number,
      default: 5,
      min: 0,
    },
    warranty: {
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
    image: {
      type: String,
    },
    images: {
      type: [String],
      default: [],
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

// Index for faster queries
productSchema.index({ branchId: 1, name: 'text', barcode: 1, sku: 1 });
productSchema.index({ branchId: 1, barcode: 1 }, { sparse: true });
productSchema.index({ branchId: 1, sku: 1 }, { sparse: true });

export default mongoose.models.Product || mongoose.model('Product', productSchema);
