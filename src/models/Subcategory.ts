import mongoose from 'mongoose';

const subcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness of subcategory name within a category
subcategorySchema.index({ name: 1, category: 1 }, { unique: true });

export default mongoose.models.Subcategory || mongoose.model('Subcategory', subcategorySchema);
