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

@Module({
  imports: [DatabaseModule],
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
  ],
  controllers: [OrderController],
})
export class OrderModule {}
