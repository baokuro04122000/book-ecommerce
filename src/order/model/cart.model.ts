import mongoose, { Document } from 'mongoose';
import { Variant } from 'src/products/model/variant.model';

export const CART_MODEL = 'cart-model';

const CartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'users',
    },
    cartItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: 'products',
        },
        variant: {
          type: mongoose.Schema.Types.ObjectId,
          required: false,
          ref: 'variants',
        },
        wishlist: { type: Boolean, default: false },
        quantity: { type: Number, default: 1, min: 1 },
        modifiedOn: { type: Date, default: Date.now() },
      },
    ],
  },
  { timestamps: true },
);

export { CartSchema };

export interface Cart extends Document {
  user: any;
  cartItems: Array<{
    product: any;
    variant: any;
    wishlist: boolean;
    quantity: number;
    modifiedOn: Date;
  }>;
}
