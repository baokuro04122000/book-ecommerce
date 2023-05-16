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
  }: CreateCategoryDto): Promise<INotifyResponse<any>> {
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
        const created = await new this.categoryModel({
          name: name,
          categoryImage: categoryImage ? categoryImage : '',
          slug: `${slugify(name)}-${generate()}`,
        }).save();
        return resolve({
          status: HttpStatus.OK,
          message: Message.add_category_success,
          data: created,
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

  editCategory(
    category: CreateCategoryDto,
    slug: string,
  ): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      try {
        const existed = await this.categoryModel.findOneAndUpdate(
          {
            slug: slug,
          },
          {
            name: category.name,
            categoryImage: category.categoryImage,
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

  getAllCategories(): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const categories = await this.categoryModel
          .find({})
          .sort({ createdAt: -1 })
          .lean();
        if (!categories) {
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: Message.category_empty,
            }),
          );
        }
        return resolve({
          status: HttpStatus.OK,
          data: categories,
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

  getAllCategoriesWithAmountProducts(): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const categories = await this.categoryModel
          .find({})
          .sort({ createdAt: -1 })
          .lean();
        if (!categories) {
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: Message.category_empty,
            }),
          );
        }
        const amountProducts = await Promise.all(
          categories.map((category) =>
            this.productModel.countDocuments({
              category: category._id,
            }),
          ),
        );

        const payload = categories.map((category, index) => ({
          ...category,
          products: amountProducts[index],
        }));

        return resolve({
          status: HttpStatus.OK,
          data: payload,
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

  getSellers(): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const sellers = await this.sellerModel
          .find({})
          .sort({ 'meta.totalSold': -1 })
          .skip(0)
          .limit(18)
          .lean();
        if (!sellers) {
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: Message.category_empty,
            }),
          );
        }
        const totalProduct = await Promise.all(
          sellers.map((seller) =>
            this.productModel.countDocuments({
              sellerId: seller._id,
            }),
          ),
        );

        const payload = sellers.map((seller, index) => ({
          ...seller,
          totalProduct: totalProduct[index],
        }));

        return resolve({
          status: HttpStatus.OK,
          data: payload,
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

  getSellersTop3(): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const sellers = await this.sellerModel.find({}).lean();
        if (!sellers) {
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: Message.category_empty,
            }),
          );
        }
        const totalProduct = await Promise.all(
          sellers.map((seller) =>
            this.productModel.countDocuments({
              sellerId: seller._id,
            }),
          ),
        );

        const payload = sellers.map((seller, index) => ({
          ...seller,
          totalProduct: totalProduct[index],
        }));

        const sorted = payload.sort((a, b) => {
          return b.totalProduct - a.totalProduct;
        });

        return resolve({
          status: HttpStatus.OK,
          data: [sorted[0], sorted[1], sorted[2]],
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
