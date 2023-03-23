import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { Connection } from 'mongoose';
import { JwtStrategy } from 'src/auth/jwt.strategy';
import { SELLER_MODEL, SellerSchema } from 'src/auth/model/seller.model';
import { USER_MODEL, UserSchema } from 'src/auth/model/user.model';
import {
  DatabaseModule,
  DATABASE_CONNECTION,
} from 'src/database/mongodb.module';
import { ProductController } from './controller/product.controller';
import { CategorySchema, CATEGORY_MODEL } from './model/category.model';
import { ProductSchema, PRODUCT_MODEL } from './model/product.model';
import { ProductService } from './service/product.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    ProductService,
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
  controllers: [ProductController],
})
export class ProductModule {}
