export interface ProductDetails {
  name: string;
  seller: any;
  category: any;
  slug: string;
  description: string;
  variants: Array<{
    type: string;
    maxOrder: number;
    price: number;
    discount: number;
    quantity: number;
    summary?: string;
  }>;
  meta?: {
    totalSold: number;
    totalOrder: number;
    totalReview: number;
    totalRating: number;
  };
  productPictures: string[];
  specs: any;
}
