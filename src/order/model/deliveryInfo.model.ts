import mongoose, { Document } from 'mongoose';
import { User } from 'src/auth/model/user.model';

export const DELIVERY_INFO_MODEL = 'delivery-info-model';
const addressSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      min: 3,
      max: 50,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
      min: 10,
      max: 100,
    },
    addressCode: {
      district: { type: Number, default: 1 },
      province: { type: Number, default: 1 },
      ward: { type: Number, default: 1 },
      street: { type: String, default: '' },
    },
    zipCode: {
      type: Number,
      max: 999999,
      min: 1000,
    },
    code: {
      type: Number,
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: 'addresses',
    timestamps: true,
  },
);

const DeliveryInfoSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'users',
    },
    address: [addressSchema],
  },
  { collection: 'deliveryInfo', timestamps: true },
);

export { DeliveryInfoSchema, addressSchema };

export interface Address extends Document {
  name: string;
  phoneNumber: string;
  address: string;
  addressCode: {
    district: number;
    province: number;
    ward: number;
    street: string;
  };
  zipCode: number;
  code: number;
  isDefault: boolean;
}

export interface DeliveryInfo extends Document {
  user: User;
  address: any;
}
