import mongoose, { Document } from 'mongoose';
import { Variant } from 'src/products/model/variant.model';

export const NOTIFICATION_MODEL = 'notification-model';

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'users',
    },
    content: {
      type: String,
    },
    image: {
      type: String,
    },
    title: {
      type: String,
    },
    status: {
      type: Boolean,
      default: false,
    },
    type: {
      type: Object,
      required: true,
    },
    specs: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'notifications',
  },
);

export { NotificationSchema };

export interface NotificationType extends Document {
  user: any;
  content: string;
  image: string;
  title: string;
  status: string;
  type: any;
  specs: any;
  _id: any;
}
