import mongoose from 'mongoose';

const dataBackupSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userEmail: {
      type: String,
    },
    modules: {
      type: [String],
      required: true,
    },
    backupType: {
      type: String,
      enum: ['manual', 'auto'],
      default: 'manual',
    },
    format: {
      type: String,
      enum: ['json', 'csv', 'zip'],
      default: 'json',
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
    destinationPath: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    encrypted: {
      type: Boolean,
      default: false,
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

dataBackupSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.models.DataBackup || mongoose.model('DataBackup', dataBackupSchema);
