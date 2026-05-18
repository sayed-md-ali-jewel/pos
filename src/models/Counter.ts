import mongoose from 'mongoose';

interface ICounter {
  name: string;
  sequence: number;
}

interface ICounterModel extends mongoose.Model<ICounter> {
  getNextSequence(name: string): Promise<number>;
}

const counterSchema = new mongoose.Schema<ICounter>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    sequence: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Static method to get next sequence value
counterSchema.statics.getNextSequence = async function (name: string): Promise<number> {
  const counter = await this.findOneAndUpdate(
    { name },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  return counter.sequence;
};

export default mongoose.models.Counter ||
  mongoose.model<ICounter, ICounterModel>('Counter', counterSchema);
