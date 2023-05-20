import mongoose, { Document } from 'mongoose';

export const SHIPPING_COMPANY_MODEL = 'shipping-company-model';

const ShippingCompanySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: true,
    },
  },
  {
    collection: 'shippingCompany',
    timestamps: true,
  },
);

export { ShippingCompanySchema };

export interface ShippingCompany extends Document {
  name: string;
  _id: any;
}
