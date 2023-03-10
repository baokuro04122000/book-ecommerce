import mongoose, { Document } from 'mongoose';
import { User } from './user.model';
export const SELLER_MODEL = 'Seller_MODEL';
const SellerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'sellers',
    },
    info: {
      name: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },
      phone: {
        type: String,
        min: 9,
        max: 11,
      },
      address: [{ location: { type: String, min: 5, max: 150 } }],
    },
    logo: {
      type: String,
    },
    slogan: {
      type: String,
    },
    type: {
      type: String,
      enum: ['normal', 'mall', 'global'],
      default: 'normal',
    },
    proof: [String],
    meta: {
      totalSold: {
        type: Number,
        default: 0,
      },
      totalProduct: {
        type: Number,
        default: 0,
      },
      totalEvaluation: {
        type: Number,
        default: 0,
      },
      ranking: {
        type: Number,
        default: 0,
      },
      title: {
        type: String,
      },
    },
    socialLinks: {
      facebook: { type: String, min: 10, max: 150 },
      instagram: { type: String, min: 10, max: 150 },
      youtube: { type: String, min: 10, max: 150 },
      linkedin: { type: String, min: 10, max: 150 },
    },
    specs: { type: Array, default: [] },
    isDisabled: { type: Boolean, default: false },
  },
  {
    collection: 'sellers',
    timestamps: true,
  },
);

export { SellerSchema };

export interface Seller extends Document {
  userId: string | User;
  info: {
    name: string;
    phone: string;
    address: [{ location: string }];
  };
  logo: {
    fileLink: string;
    fileId: string;
  };
  slogan: string;
  type: string;
  proof: [
    {
      fileLink: string;
      fileId: string;
    },
  ];
  meta?: {
    totalSold: number;
    totalProduct: number;
    totalEvaluation: number;
    ranking: number;
    title: string;
  };
  socialLinks?: {
    facebook: string;
    instagram: string;
    youtube: string;
    linkedin: string;
  };
  specs?: Array<any>;
  isDisabled: boolean;
}
