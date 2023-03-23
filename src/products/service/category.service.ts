import { Injectable, HttpStatus, Inject, Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import slugify from 'slugify';
import { generate } from 'shortid';
import { Seller, SELLER_MODEL } from 'src/auth/model/seller.model';
import { INotifyResponse } from 'src/utils/generics.util';
import { User, USER_MODEL } from '../../auth/model/user.model';
import { Category, CATEGORY_MODEL } from '../model/category.model';
import { Product, PRODUCT_MODEL } from '../model/product.model';
import Message from '../../lang/en.lang';
import { errorResponse } from 'src/utils/helpers.utils';
import { CreateCategoryDto } from '../dto/category.dto';

@Injectable()
export class CategoryService {
  private logger = new Logger('Category service');
  constructor(
    @Inject(USER_MODEL) private readonly userModel: Model<User>,
    @Inject(SELLER_MODEL) private readonly sellerModel: Model<Seller>,
    @Inject(PRODUCT_MODEL) private readonly productModel: Model<Product>,
    @Inject(CATEGORY_MODEL) private readonly categoryModel: Model<Category>,
  ) {}

  addCategory({
    name,
    categoryImage,
  }: CreateCategoryDto): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      try {
        const existed = await this.categoryModel.findOne({
          name: name,
        });
        if (existed) {
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: Message.name_existed,
            }),
          );
        }
        await new this.categoryModel({
          name: name,
          categoryImage: categoryImage ? categoryImage : '',
          slug: `${slugify(name)}-${generate()}`,
        }).save();
        return resolve({
          status: HttpStatus.OK,
          message: Message.add_category_success,
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

  editCategory({
    name,
    categoryImage,
  }: CreateCategoryDto): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      try {
        const existed = await this.categoryModel.findOneAndUpdate(
          {
            name: name,
          },
          {
            name: name,
            categoryImage: categoryImage,
          },
          {
            upsert: true,
            new: true,
          },
        );
        if (!existed) {
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: Message.name_not_exists,
            }),
          );
        }
        return resolve({
          status: HttpStatus.OK,
          message: Message.update_success,
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
