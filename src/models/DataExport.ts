import mongoose from 'mongoose';

const dataExportSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userEmail: {
      type: String,
    },
    module: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      enum: ['json', 'csv', 'xlsx'],
      default: 'json',
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    storageProvider: {
      type: String,
      enum: ['local', 'drive'],
      default: 'local',
    },
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
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

dataExportSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.models.DataExport || mongoose.model('DataExport', dataExportSchema);
