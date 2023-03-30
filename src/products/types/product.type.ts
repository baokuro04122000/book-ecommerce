export interface ProductDetails {
  name: string;
  seller: any;
  category: any;
  slug: string;
  variant: Array<{
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
  specs: any;
}
