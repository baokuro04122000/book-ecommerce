import mongoose, { Document } from 'mongoose';

export const SHIPPING_MODEL = 'shipping-model';

const ShippingSchema = new mongoose.Schema(
  {
    code: {
      type: Number,
      required: true,
      unique: true,
    },
    to: {
      type: Number,
      required: true,
    },
    from: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      default: 0,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'shippingCompany',
      required: true,
    },
  },
  {
    collection: 'shipping',
    timestamps: true,
  },
);

export { ShippingSchema };

export interface Shipping extends Document {
  user: any;
  code: number;
  to: number;
  from: number;
  price: number;
  company: any;
}
