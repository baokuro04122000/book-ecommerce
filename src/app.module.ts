import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './products/category.module';
import { ProductModule } from './products/product.module';
import { AdminModule } from './admin/admin.module';
import { CartModule } from './order/modules/cart.module';
import { OrderModule } from './order/modules/order.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    ProductModule,
    CategoryModule,
    CartModule,
    OrderModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
