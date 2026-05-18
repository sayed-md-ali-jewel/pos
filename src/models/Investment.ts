import mongoose, { Document, Schema } from 'mongoose';

export interface IInvestment extends Document {
  name: string;
  category: string;
  initialAmount: number;
  investmentDate: Date;
  description?: string;
  status: 'active' | 'inactive';
  earningInterval?: 'daily' | '15days' | '30days';
  expectedIncome?: number;
  createdAt: Date;
  updatedAt: Date;
}

const InvestmentSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    initialAmount: { type: Number, required: true },
    investmentDate: { type: Date, required: true },
    description: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    earningInterval: { type: String, enum: ['daily', '15days', '30days'] },
    expectedIncome: { type: Number },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.Investment) {
  delete mongoose.models.Investment;
}

export default mongoose.model<IInvestment>('Investment', InvestmentSchema);
