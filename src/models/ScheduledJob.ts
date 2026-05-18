import mongoose from 'mongoose';

const scheduledJobSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['backup', 'export', 'import'],
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    scheduleType: {
      type: String,
      enum: ['cron', 'once'],
      required: true,
      default: 'cron',
    },
    scheduleValue: {
      type: String,
      required: true,
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    lastRunAt: {
      type: Date,
    },
    nextRunAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'success', 'failed'],
      default: 'pending',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdByEmail: {
      type: String,
    },
    errorMessage: {
      type: String,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

scheduledJobSchema.index({ type: 1, status: 1, nextRunAt: 1 });

export default mongoose.models.ScheduledJob || mongoose.model('ScheduledJob', scheduledJobSchema);
