import { Module } from '@nestjs/common';
import { Connection } from 'mongoose';
import { SELLER_MODEL, SellerSchema } from 'src/auth/model/seller.model';
import { USER_MODEL, UserSchema } from 'src/auth/model/user.model';
import {
  DatabaseModule,
  DATABASE_CONNECTION,
} from 'src/database/mongodb.module';
import { CategoryController } from './controller/category.controller';
import { CategorySchema, CATEGORY_MODEL } from './model/category.model';
import { ProductSchema, PRODUCT_MODEL } from './model/product.model';
import { CategoryService } from './service/category.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    CategoryService,
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
  ],
  controllers: [CategoryController],
})
export class CategoryModule {}
