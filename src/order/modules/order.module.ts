import { Module } from '@nestjs/common';
import { Connection } from 'mongoose';
import { SELLER_MODEL, SellerSchema } from 'src/auth/model/seller.model';
import { USER_MODEL, UserSchema } from 'src/auth/model/user.model';
import {
  DatabaseModule,
  DATABASE_CONNECTION,
} from 'src/database/mongodb.module';
import { OrderService } from '../service/order.service';
import { OrderController } from '../controller/order.controller';
import {
  CATEGORY_MODEL,
  CategorySchema,
} from 'src/products/model/category.model';
import { PRODUCT_MODEL, ProductSchema } from 'src/products/model/product.model';
import {
  DELIVERY_INFO_MODEL,
  DeliveryInfoSchema,
} from '../model/deliveryInfo.model';
import { SHIPPING_MODEL, ShippingSchema } from '../model/shipping.model';
import {
  SHIPPING_COMPANY_MODEL,
  ShippingCompanySchema,
} from '../model/shippingCompany.model';
import { INVENTORY_MODEL, InventorySchema } from '../model/inventory.model';
import {
  PAYMENT_HISTORY_MODEL,
  PaymentHistorySchema,
} from '../model/paymentHistory.model';
import { CART_MODEL, CartSchema } from '../model/cart.model';
import { ORDER_MODEL, OrderSchema } from '../model/order.model';
import { redisModule } from 'src/module.config';
import {
  NOTIFICATION_MODEL,
  NotificationSchema,
} from '../model/notification.model';
import {
  PERMISSION_MODEL,
  PermissionReviewSchema,
} from '../model/pemission.model';

@Module({
  imports: [DatabaseModule, redisModule],
  providers: [
    OrderService,
    {
      provide: USER_MODEL,
      useFactory: (connect: Connection) => connect.model('users', UserSchema),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: SELLER_MODEL,
      useFactory: (connect: Connection) =>
        connect.model('sellers', SellerSchema),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: PRODUCT_MODEL,
      useFactory: (connect: Connection) =>
        connect.model('products', ProductSchema),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: CATEGORY_MODEL,
      useFactory: (connect: Connection) =>
        connect.model('categories', CategorySchema),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: DELIVERY_INFO_MODEL,
      useFactory: (connect: Connection) =>
        connect.model('deliveryInfo', DeliveryInfoSchema),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: ORDER_MODEL,
      useFactory: (connect: Connection) => connect.model('orders', OrderSchema),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: SHIPPING_MODEL,
      useFactory: (connect: Connection) =>
        connect.model('shipping', ShippingSchema),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: SHIPPING_COMPANY_MODEL,
      useFactory: (connect: Connection) =>
        connect.model('shippingCompany', ShippingCompanySchema),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: INVENTORY_MODEL,
      useFactory: (connect: Connection) =>
        connect.model('inventories', InventorySchema),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: CART_MODEL,
      useFactory: (connect: Connection) => connect.model('carts', CartSchema),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: PAYMENT_HISTORY_MODEL,
      useFactory: (connect: Connection) =>
        connect.model('paymentHistories', PaymentHistorySchema),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: NOTIFICATION_MODEL,
      useFactory: (connect: Connection) =>
        connect.model('notifications', NotificationSchema),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: PERMISSION_MODEL,
      useFactory: (connect: Connection) =>
        connect.model('permissionReview', PermissionReviewSchema),
      inject: [DATABASE_CONNECTION],
    },
  ],
  controllers: [OrderController],
})
export class OrderModule {}
