import mongoose, { Document } from 'mongoose';
export const VARIANT_MODEL = 'VARIANT_MODEL';
const VariantSchema = new mongoose.Schema(
  {
    name: {
      required: true,
      type: String,
      unique: true,
    },
    summary: {
      type: String,
    },
    quantity: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

export { VariantSchema };

export interface Variant extends Document {
  name: string;
  summary: string;
  quantity;
}
