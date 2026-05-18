import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userEmail: {
      type: String,
    },
    action: {
      type: String,
      required: true,
      // e.g. 'CREATE_SALE', 'UPDATE_PRODUCT', 'DELETE_CUSTOMER', 'CHANGE_SETTINGS'
    },
    module: {
      type: String,
      required: true,
      enum: [
        'sale',
        'product',
        'customer',
        'supplier',
        'purchase',
        'user',
        'settings',
        'inventory',
        'auth',
      ],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      // ID of the resource being acted on
    },
    targetModel: {
      type: String,
      // e.g. 'Sale', 'Product'
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      // { before: {...}, after: {...} }
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    status: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success',
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookups by user, module, and time
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, action: 1, createdAt: -1 });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
