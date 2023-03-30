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
import APIFeatures from 'src/utils/apiFeatures';
import { ProductDetails } from '../types/product.type';
@Injectable()
export class ProductService {
  private logger = new Logger('Product service');
  constructor(
    @Inject(USER_MODEL) private readonly userModel: Model<User>,
    @Inject(SELLER_MODEL) private readonly sellerModel: Model<Seller>,
    @Inject(PRODUCT_MODEL) private readonly productModel: Model<Product>,
    @Inject(CATEGORY_MODEL) private readonly categoryModel: Model<Category>,
  ) {}

  specsResponse(specs: any) {
    const result = {};
    specs.forEach((element: any) => {
      result[element.k] = element.v;
    });
    return result;
  }

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

  getProduct(query: any): Promise<INotifyResponse<ProductDetails[]>> {
    return new Promise(async (resolve, reject) => {
      try {
        const apiFeaturesCountDocuments = new APIFeatures(
          this.productModel,
          query,
        ) // (1)
          .search()
          .filter()
          .query.countDocuments();

        const apiFeatures = new APIFeatures(this.productModel, query) // (2)
          .search()
          .filter()
          .pagination(query.limit)
          .query.populate({
            path: 'sellerId',
            select: 'info',
          })
          .populate('category category.name')
          .lean();
        const [totalProduct, products] = await Promise.all([
          apiFeaturesCountDocuments,
          apiFeatures,
        ]); // (3)

        if (!products) {
          return reject(
            errorResponse({
              status: 404,
              message: Message.product_empty,
            }),
          );
        }

        const productPayload = products.map((product) => ({
          ...product,
          specs: this.specsResponse(product.specs),
        }));
        return resolve({
          status: HttpStatus.OK,
          message: '',
          data: productPayload,
          total: totalProduct,
        });
      } catch (error) {
        console.log(error);
        return reject(
          errorResponse({
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: Message.internal_server_error,
          }),
        );
      }
    });
  }

  getProductBySlug(slug: string): Promise<INotifyResponse<ProductDetails>> {
    return new Promise(async (resolve, reject) => {
      try {
        const product = await this.productModel
          .findOne({ slug })
          .populate({
            path: 'sellerId',
            select: '-proof -isDisabled -updatedAt -specs',
          })
          .populate({
            path: 'category',
            select: 'name categoryImage slug',
          })
          .lean();
        if (!product) {
          return reject(
            errorResponse({
              status: 404,
              message: Message.product_not_found,
            }),
          );
        }

        return resolve({
          status: HttpStatus.FOUND,
          data: {
            name: product.name,
            seller: product.sellerId,
            category: product.category,
            slug: product.slug,
            variant: product.variants,
            meta: product.meta,
            specs: this.specsResponse(product.specs),
          },
        });
      } catch (error) {
        console.log(error);
        return reject(
          errorResponse({
            status: 500,
            message: Message.internal_server_error,
          }),
        );
      }
    });
  }

  getProductsByCategorySlug(
    queryStr: any,
  ): Promise<INotifyResponse<ProductDetails>> {
    return new Promise((resolve, reject) => {
      this.categoryModel
        .findOne({ slug: queryStr.slug })
        .exec(async (error, category) => {
          if (error) {
            return reject(
              errorResponse({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: Message.internal_server_error,
              }),
            );
          }
          if (!category)
            return reject(
              errorResponse({
                status: HttpStatus.NOT_FOUND,
                message: Message.category_not_exist,
              }),
            );
          const query = new APIFeatures(
            this.productModel.find({
              category: category._id,
            }),
            queryStr,
          )
            .filter()
            .pagination(queryStr.limit)
            .query.populate({
              path: 'category',
              select: 'name categoryImage slug',
            })
            .populate({
              path: 'sellerId',
              select: '-proof -isDisabled -updatedAt -specs',
            })
            .lean();

          try {
            const products = await query;
            if (!products)
              return reject(
                errorResponse({
                  status: 404,
                  message: Message.category_not_products,
                }),
              );

            const apiFeaturesCountDocuments = new APIFeatures(
              this.productModel.find({
                category: category._id,
              }),
              queryStr,
            )
              .filter()
              .query.countDocuments();
            const totalProduct = await apiFeaturesCountDocuments;

            const productList = products.map((product) => ({
              ...product,
              specs: this.specsResponse(product.specs),
            }));

            return resolve({
              status: HttpStatus.OK,
              data: productList,
              total: totalProduct,
            });
          } catch (error) {
            console.log(error);
            return reject(
              errorResponse({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: Message.internal_server_error,
              }),
            );
          }
        });
    });
  }
  searchFeature(keyword: string): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      console.log(keyword);

      const resultCategory = this.categoryModel
        .find({
          name: {
            $regex: keyword.length > 1 ? keyword : '^' + keyword,
            $options: 'i',
          },
        })
        .select('slug name categoryImage')
        .lean();

      const resultProduct = this.productModel
        .find({
          name: {
            $regex: keyword.length > 1 ? keyword : '^' + keyword,
            $options: 'i',
          },
        })
        .select('name slug')
        .lean();
      try {
        const [categories, products] = await Promise.all([
          resultCategory,
          resultProduct,
        ]);
        const payload = [
          ...categories.map((category) => {
            return {
              ...category,
              type: 'category',
            };
          }),
          ...products.map((product) => {
            return {
              ...product,
              type: 'product',
            };
          }),
        ];
        return resolve({
          status: HttpStatus.FOUND,
          data: payload,
        });
      } catch (error) {
        console.log(error);
        return reject(
          errorResponse({
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: Message.internal_server_error,
          }),
        );
      }
    });
  }

  updateProduct(
    product: CreateProductDto,
    slug: string,
    sellerId: string,
  ): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      try {
        const producted = await this.productModel.findOneAndUpdate(
          {
            $and: [{ slug: slug }, { sellerId: sellerId }],
          },
          {
            $set: {
              name: product.name,
              category: product.category,
              description: product.description,
              productPictures: product.productPictures,
              specs: product.specs,
              variants: product.variant,
            },
          },
          { new: true },
        );
        if (!producted) {
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: Message.product_not_found,
            }),
          );
        }
        return resolve({
          status: HttpStatus.OK,
          message: Message.update_success,
          data: null,
        });
      } catch (error) {
        console.log(error);
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
