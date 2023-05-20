import mongoose, { Document } from 'mongoose';

export const INVENTORY_MODEL = 'inventory-model';

const InventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.SchemaTypes.ObjectId,
      require: true,
      ref: 'products',
    },
    sellerId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'sellers',
      required: true,
    },
    reservations: [
      {
        order: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'orders',
          required: true,
        },
      },
    ],
  },
  {
    collection: 'inventories',
    timestamps: true,
  },
);

export { InventorySchema };

export interface Inventory extends Document {
  product: any;
  sellerId: any;
  reservations: any;
}
