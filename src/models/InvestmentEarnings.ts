import mongoose, { Document, Schema } from 'mongoose';

export interface IInvestmentEarnings extends Document {
  investmentId: mongoose.Types.ObjectId;
  month: Date; // First day of the month
  earnings: number;
  expenses: number;
  netProfit: number;
  createdAt: Date;
  updatedAt: Date;
}

const InvestmentEarningsSchema: Schema = new Schema(
  {
    investmentId: { type: Schema.Types.ObjectId, ref: 'Investment', required: true },
    month: { type: Date, required: true },
    earnings: { type: Number, required: true, default: 0 },
    expenses: { type: Number, required: true, default: 0 },
    netProfit: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one entry per investment per month
InvestmentEarningsSchema.index({ investmentId: 1, month: 1 }, { unique: true });

export default mongoose.models.InvestmentEarnings ||
  mongoose.model<IInvestmentEarnings>('InvestmentEarnings', InvestmentEarningsSchema);
