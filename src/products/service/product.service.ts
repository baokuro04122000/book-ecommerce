import { Injectable, HttpStatus, Inject, Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import { Seller, SELLER_MODEL } from 'src/auth/model/seller.model';
import { INotifyResponse } from 'src/utils/generics.util';
import { User, USER_MODEL } from '../../auth/model/user.model';
import { Category, CATEGORY_MODEL } from '../model/category.model';
import { Product, PRODUCT_MODEL } from '../model/product.model';
import Message from '../../lang/en.lang';
import { errorResponse } from 'src/utils/helpers.utils';
import { CreateProductDto } from '../dto/product.dto';
@Injectable()
export class ProductService {
  private logger = new Logger('Product service');
  constructor(
    @Inject(USER_MODEL) private readonly userModel: Model<User>,
    @Inject(SELLER_MODEL) private readonly sellerModel: Model<Seller>,
    @Inject(PRODUCT_MODEL) private readonly productModel: Model<Product>,
    @Inject(CATEGORY_MODEL) private readonly categoryModel: Model<Category>,
  ) {}

  addProduct(product: CreateProductDto): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      try {
        const categoryExisted = await this.categoryModel
          .findById(product.category)
          .lean();
        if (!categoryExisted) {
          return reject(
            errorResponse({ status: 401, message: Message.category_not_exist }),
          );
        }
        await new this.productModel(product).save();
        return resolve({
          status: HttpStatus.CREATED,
          message: Message.add_product_success,
          data: null,
        });
      } catch (error) {
        this.logger.error(error);
        return reject(
          errorResponse({
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: Message.internal_server_error,
          }),
        );
      }
    });
  }
}
