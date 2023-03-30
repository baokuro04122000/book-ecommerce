import mongoose, { Document } from 'mongoose';
export const VARIANT_MODEL = 'VARIANT_MODEL';
const VariantSchema = new mongoose.Schema(
  {
    type: {
      required: true,
      type: String,
    },
    summary: {
      type: String,
    },
    quantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    maxOrder: {
      type: Number,
      default: 10,
    },
  },
  {
    timestamps: true,
  },
);

export { VariantSchema };

export interface Variant extends Document {
  type: string;
  maxOrder: number;
  price: number;
  discount: number;
  quantity: number;
  summary?: string;
}
