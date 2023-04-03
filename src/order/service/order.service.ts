import { Injectable, HttpStatus, Inject, Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import slugify from 'slugify';
import { generate } from 'shortid';
import { Seller, SELLER_MODEL } from 'src/auth/model/seller.model';
import { INotifyResponse } from 'src/utils/generics.util';
import { User, USER_MODEL } from '../../auth/model/user.model';
import Message from '../../lang/en.lang';
import { errorResponse } from 'src/utils/helpers.utils';
import { PRODUCT_MODEL, Product } from 'src/products/model/product.model';
import { CATEGORY_MODEL, Category } from 'src/products/model/category.model';
import { DELIVERY_INFO_MODEL, DeliveryInfo } from '../model/deliveryInfo.model';

@Injectable()
export class OrderService {
  private logger = new Logger('Category service');
  constructor(
    @Inject(USER_MODEL) private readonly userModel: Model<User>,
    @Inject(SELLER_MODEL) private readonly sellerModel: Model<Seller>,
    @Inject(PRODUCT_MODEL) private readonly productModel: Model<Product>,
    @Inject(CATEGORY_MODEL) private readonly categoryModel: Model<Category>,
    @Inject(DELIVERY_INFO_MODEL)
    private readonly deliveryInfoModel: Model<DeliveryInfo>,
  ) {}

  addOrder(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      return resolve('nothing');
    });
  }
}
