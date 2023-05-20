import mongoose, { Document } from 'mongoose';
import { Seller } from 'src/auth/model/seller.model';
import { Product } from 'src/products/model/product.model';
import { Variant } from 'src/products/model/variant.model';

export const ORDER_MODEL = 'order-model';
const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      require: true,
    },
    address: {
      type: Object,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'products',
        },
        variant: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'variants',
        },
        shippingCode: {
          type: Number,
          required: true,
        },
        currency: {
          type: String,
          enum: ['VND', 'USD'],
          default: 'VND',
        },
        discount: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
        price: {
          type: Number,
          required: true,
        },
        totalPaid: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        shippingCost: {
          type: Number,
          default: 0,
        },
        isCancel: {
          type: Boolean,
          default: false,
        },
        reason: {
          type: String,
          default: null,
        },
        personCancel: {
          type: String,
          default: null,
        },
        isDeleted: {
          type: Boolean,
          default: false,
        },
        seller: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'sellers',
        },
        paymentStatus: {
          type: String,
          enum: ['pending', 'completed', 'cancelled', 'refund'],
          required: true,
        },
        orderStatus: [
          {
            type: {
              type: String,
              enum: ['ordered', 'packed', 'shipped', 'delivered', 'cancelled'],
              default: 'ordered',
            },
            date: {
              type: Date,
              default: Date.now(),
            },
            isCompleted: {
              type: Boolean,
              default: false,
            },
          },
        ],
        createdAt: { type: Date, default: Date.now() },
        updatedAt: { type: Date, default: Date.now() },
      },
    ],
    paymentType: {
      type: String,
      enum: ['cod', 'paypal'],
      default: 'cod',
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export { OrderSchema };

export interface Order extends Document {
  user: any;
  address: any;
  totalAmount: number;
  subtotal: number;
  items: Array<{
    product: Product;
    variant: Variant;
    shippingCode: number;
    currency: string;
    discount: number;
    price: number;
    totalPaid: number;
    quantity: number;
    shippingCost: number;
    isCancel: boolean;
    isDeleted: boolean;
    seller: Seller;
    orderStatus: any;
    createdAt: Date;
    updatedAt: Date;
    paymentStatus: string;
    personCancel: string;
    reason: string;
  }>;
  paymentType: string;
  shippingCost: number;
  orderStatus: any;
}
