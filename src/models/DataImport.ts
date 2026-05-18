import mongoose from 'mongoose';

const dataImportSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userEmail: {
      type: String,
    },
    sourceFileName: {
      type: String,
      required: true,
    },
    sourceFormat: {
      type: String,
      enum: ['json', 'csv', 'zip'],
      required: true,
    },
    module: {
      type: String,
    },
    strategy: {
      type: String,
      enum: ['merge', 'overwrite', 'skip'],
      default: 'merge',
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
    },
    records: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    errors: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

dataImportSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.models.DataImport || mongoose.model('DataImport', dataImportSchema);
