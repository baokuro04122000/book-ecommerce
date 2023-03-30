import mongoose, { Document } from 'mongoose';
import * as bcrypt from 'bcryptjs';
export const USER_MODEL = 'USER_MODEL';
const UserSchema = new mongoose.Schema(
  {
    contact: {
      address: { type: String, min: 3, max: 50 },
      phone: { type: String, default: null, min: 10, max: 11 },
    },
    local: {
      email: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        index: true,
      },
      verified: { type: Boolean, default: false },
      password: { type: String },
    },
    google: {
      uid: { type: String },
      name: { type: String },
      email: { type: String, trim: true, unique: true, index: true },
      picture: { type: String },
    },
    info: {
      name: { type: String, min: 2, max: 30 },
      nickName: { type: String, min: 2, max: 50, default: '' },
      gender: {
        type: String,
        min: 3,
        max: 15,
        enum: ['nam', 'nu', 'male', 'female', 'other'],
        default: 'male',
      },
      birthDay: { type: String, min: 6, max: 8 },
      language: { type: String, default: 'en' },
      avatar: { type: String },
    },
    status: {
      type: String,
      enum: ['normal', 'blocked'],
      default: 'normal',
    },
    role: {
      type: String,
      enum: ['user', 'seller', 'shipper'],
      default: 'user',
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'sellers',
    },
    meta: {
      totalBuy: {
        type: Number,
        default: 0,
      },
      totalCancel: {
        type: Number,
        default: 0,
      },
    },
    specs: {
      type: Array,
      default: [],
    },
  },
  {
    collection: 'users',
    timestamps: true,
  },
);

UserSchema.pre('save', async function (next) {
  try {
    if (this.local.password) {
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(this.local.password, salt);
      this.local.password = hashPassword;
    }
    next();
  } catch (error) {
    next(error);
  }
});

UserSchema.methods.isCheckPassword = async function (password: string) {
  try {
    return await bcrypt.compare(password, this.local.password);
  } catch (error) {
    console.log(error);
  }
};

UserSchema.methods.hashPassword = async (password) => {
  try {
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);
      return Promise.resolve(hashPassword);
    }
  } catch (error) {
    return Promise.reject({
      status: 500,
      errors: {
        message: 'Internal Server Error',
      },
    });
  }
};

export { UserSchema };

export interface User extends Document {
  contact?: {
    address: string;
    phone: string;
  };
  local: {
    email: string;
    verified: boolean;
    password?: string;
  };
  google?: {
    name: string;
    email: string;
    picture: string;
  };
  info: {
    name: string;
    nickName?: string;
    gender: string;
    birthDay: string;
    language: string;
    avatar?: string;
  };
  status: string;
  role: string;
  seller: {
    type: mongoose.Schema.Types.ObjectId;
    ref: 'sellers';
  };
  meta: {
    totalBuy: number;
    totalCancel: number;
  };
  isCheckPassword?: (password: string) => boolean;
  specs: [];
}
