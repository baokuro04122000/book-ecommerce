import mongoose, { Document } from 'mongoose';
export const CATEGORY_MODEL = 'CATEGORY_MODEL';
const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    categoryImage: {
      type: String,
      default: '',
    },
    specs: { type: Array, default: [] },
    isDisabled: { type: Boolean, default: false },
  },
  {
    collection: 'categories',
    timestamps: true,
  },
);
CategorySchema.index({ 'specs.k': 1, 'specs.v': 1 });

export { CategorySchema };

export interface Category extends Document {
  name: string;
  categoryImage?: string;
  specs?: [any];
  isDisabled?: boolean;
  slug?: string;
}
