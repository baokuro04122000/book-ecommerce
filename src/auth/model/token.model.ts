import mongoose, { Document } from 'mongoose';
export const TOKEN_MODEL = 'TOKEN_MODEL';
const TokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'users',
    },
    generatedToken: {
      type: String,
      required: true,
      trim: true,
    },
    expireAt: {
      type: Date,
      default: Date.now,
      expires: '1d', // set expire time is 24h
    },
  },
  {
    timestamps: true,
  },
);

export { TokenSchema };

export interface Token extends Document {
  generatedToken: string;
  expireAt: Date;
  user: {
    type: mongoose.Schema.Types.ObjectId;
    ref: 'users';
  };
}
