import { Schema, Document } from 'mongoose';
import { Seller } from '../../auth/model/seller.model';
import { Variant, VariantSchema } from '../model/variant.model';
import { Category } from '../model/category.model';
const ProductSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'sellers',
      require: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'categories',
      require: true,
    },
    quantity: {
      type: Number,
      default: 0,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    maxOrder: { type: Number, default: 5, required: true },
    price: {
      type: Number,
      required: true,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    summary: {
      type: String,
      default: 'hello',
      index: true,
    },
    type: { type: String, default: 'book' },
    productPictures: [String],
    variants: [VariantSchema],
    release_date: Date,
    meta: {
      totalSold: { type: Number, default: 0 },
      totalOrder: { type: Number, default: 0 },
      totalReview: { type: Number, default: 0 },
      totalRating: { type: Number, default: 0 },
    },
    specs: {
      type: Array,
      default: [],
    },
  },
  {
    collection: 'products',
    timestamps: true,
  },
);

ProductSchema.index({ 'specs.k': 1, 'specs.v': 1 });

export { ProductSchema };
export const PRODUCT_MODEL = 'PRODUCT_MODEL';
export interface Product extends Document {
  name: string;
  sellerId?: Seller;
  category: Category;
  quantity: number;
  slug?: string;
  maxOrder?: string;
  price: number;
  discountPercent?: number;
  description?: string;
  summary?: string;
  productPictures: [string];
  variants: Variant;
  release_date: Date;
  meta?: {
    totalSold: number;
    totalOrder: number;
    totalReview: number;
    totalRating: number;
  };
  specs?: [any];
}
