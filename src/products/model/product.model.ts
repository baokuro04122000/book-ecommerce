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
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      default: '',
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
    reviews: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'users', required: true },
        rating: { type: Number, required: true },
        comment: { type: String, required: true },
        createdAt: {
          type: Date,
          default: Date.now(),
        },
        updatedAt: {
          type: Date,
          default: Date.now(),
        },
      },
    ],
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
  slug?: string;
  description?: string;
  productPictures: [string];
  variants: Variant[];
  release_date: Date;
  meta?: {
    totalSold: number;
    totalOrder: number;
    totalReview: number;
    totalRating: number;
  };
  specs?: [any];
  reviews: any;
}
