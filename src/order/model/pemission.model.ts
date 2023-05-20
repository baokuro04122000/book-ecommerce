import mongoose, { Document } from 'mongoose';
import { Variant } from 'src/products/model/variant.model';

export const PERMISSION_MODEL = 'permission-model';

const PermissionReviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'products',
    },
    list: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: 'users',
          createdAt: {
            type: Date,
            default: Date.now(),
          },
        },
      },
    ],
  },
  { timestamps: true },
);

export { PermissionReviewSchema };

export interface Permission extends Document {
  product: any;
  list: any;
}
