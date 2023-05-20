import mongoose, { Document } from 'mongoose';

export const PAYMENT_HISTORY_MODEL = 'payment-history-model';

const PaymentHistorySchema = new mongoose.Schema(
  {
    payId: { type: String, required: true, unique: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'users',
    },
    token: {
      type: String,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'orders',
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'products',
        },
        seller: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'sellers',
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
        paymentStatus: {
          type: String,
          enum: ['pending', 'completed', 'cancelled', 'refund'],
          required: true,
        },
        orderStatus: [
          {
            type: {
              type: String,
              enum: ['ordered', 'packed', 'shipped', 'delivered'],
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
      },
    ],
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'cancelled', 'refund'],
      default: 'pending',
    },
    address: {
      type: Object,
      required: true,
    },
    paymentDetails: {
      type: Object,
    },
  },
  {
    timestamps: true,
  },
);

export { PaymentHistorySchema };

export interface PaymentHistory extends Document {
  payId: any;
  user: any;
  token: string;
  items: any;
  paymentStatus: string;
  address: any;
  paymentDetails: any;
}
