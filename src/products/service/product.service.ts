import { Injectable, HttpStatus, Inject, Logger } from '@nestjs/common';
import mongoose, { Model } from 'mongoose';
import slugify from 'slugify';
import { generate } from 'shortid';
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

  addProduct(
    product: CreateProductDto,
    sellerId: string,
  ): Promise<INotifyResponse<null>> {
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
        await new this.productModel({
          ...product,
          sellerId,
          slug: slugify(product.name) + '-' + generate(),
        }).save();
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

  getProducts(query: any): Promise<INotifyResponse<ProductDetails[]>> {
    return new Promise(async (resolve, reject) => {
      try {
        const apiFeaturesCountDocuments = new APIFeatures(
          this.productModel,
          query,
        ) // (1)
          .filter()
          .search()
          .query.sort({ createdAt: -1 })
          .countDocuments();

        const apiFeatures = new APIFeatures(this.productModel, query) // (2)
          .search()
          .pagination(query.limit)
          .filter()
          .query.sort({ createdAt: -1 })
          .populate({
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
          .populate({
            path: 'reviews.user',
            select: 'info',
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
          status: HttpStatus.OK,
          data: {
            ...product,
            productPictures: product.productPictures,
            name: product.name,
            seller: product.sellerId,
            category: product.category,
            slug: product.slug,
            variants: product.variants,
            meta: product.meta,
            description: product.description,
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
      const resultCategory = this.categoryModel
        .find({
          name: {
            $regex: keyword.length > 1 ? keyword : '^' + keyword,
            $options: 'i',
          },
        })
        .select('slug name categoryImage _id')
        .lean();

      const resultProduct = this.productModel
        .find({
          name: {
            $regex: keyword.length > 1 ? keyword : '^' + keyword,
            $options: 'i',
          },
        })
        .select('name slug _id')
        .lean();

      const resultSellers = this.sellerModel
        .find({
          'info.name': {
            $regex: keyword.length > 1 ? keyword : '^' + keyword,
            $options: 'i',
          },
        })
        .select('info _id')
        .lean();

      const resultAuthor = this.productModel
        .find({
          specs: {
            $elemMatch: {
              k: 'author',
              v: {
                $regex: keyword.length > 1 ? keyword : '^' + keyword,
                $options: 'i',
              },
            },
          },
        })
        .select('specs')
        .lean();

      try {
        const [categories, sellers, authors, products] = await Promise.all([
          resultCategory,
          resultSellers,
          resultAuthor,
          resultProduct,
        ]);
        const payload = [
          ...categories.map((category) => {
            return {
              ...category,
              type: 'category',
            };
          }),
          ...sellers.map((seller) => {
            return {
              ...seller,
              type: 'seller',
            };
          }),
          ...authors.map((author) => {
            return {
              ...this.specsResponse(author.specs),
              type: 'author',
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
          status: HttpStatus.OK,
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

  getProductByCategoryName(queryStr: any): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      console.log('queryStr', queryStr);
      const searchBySellerId = queryStr.sellerId
        ? { sellerId: new mongoose.Types.ObjectId(queryStr.sellerId) }
        : {};
      let limit = 10;
      if (queryStr.limit) {
        limit = Number(queryStr.limit) < 100 ? Number(queryStr.limit) : 10;
      }
      // check max product 100
      const currentPage = Number(queryStr.page) || 1;
      const skip = limit * (currentPage - 1);

      const list = this.productModel.aggregate([
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'category',
          },
        },
        {
          $match: {
            $and: [
              searchBySellerId,
              {
                'category.name': {
                  $regex: queryStr.categoryName,
                  $options: 'i',
                },
              },
            ],
          },
        },
        {
          $unwind: '$category',
        },
        {
          $skip: skip,
        },
        { $limit: limit },
      ]);

      const countDocuments = this.productModel.aggregate([
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'category',
          },
        },
        {
          $match: {
            $and: [
              searchBySellerId,
              {
                'category.name': {
                  $regex: queryStr.categoryName,
                  $options: 'i',
                },
              },
            ],
          },
        },
        {
          $count: 'name',
        },
      ]);

      try {
        const [totalProduct, products] = await Promise.all([
          countDocuments,
          list,
        ]);

        const productPayload = products.map((product) => ({
          ...product,
          specs: this.specsResponse(product.specs),
        }));
        return resolve({
          status: HttpStatus.OK,
          message: '',
          data: productPayload,
          total: totalProduct[0]?.name || 0,
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
              variants: product.variants,
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

  deleteProductById(
    id: string,
    sellerId: string,
  ): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('sellerId', sellerId);
        const product: any = await this.productModel.findOne({
          $and: [{ _id: id }, { sellerId: sellerId }],
        });
        if (!product) {
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: Message.product_not_found,
            }),
          );
        }
        if (product.meta.totalOrder !== 0) {
          return reject(
            errorResponse({
              status: HttpStatus.CONFLICT,
              message: Message.product_order,
            }),
          );
        }
        if (product.meta.totalSold !== 0) {
          return reject(
            errorResponse({
              status: HttpStatus.CONFLICT,
              message: Message.product_sold,
            }),
          );
        }
        const deleted = await product.remove();
        console.log(deleted);
        return resolve({
          status: HttpStatus.OK,
          message: Message.delete_success,
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

  bestSelling(): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const products = await this.productModel
          .find({})
          .sort({
            'meta.totalSold': -1,
          })
          .skip(0)
          .limit(10)
          .populate({
            path: 'category',
            select: 'name _id',
          })
          .populate({
            path: 'sellerId',
            select: 'info _id',
          })
          .lean();
        if (!products) {
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: Message.product_not_found,
            }),
          );
        }
        return resolve({
          status: HttpStatus.OK,
          data: products.map((product) => {
            return {
              ...product,
              specs: this.specsResponse(product.specs),
            };
          }),
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

  featureProduct(): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const admin = await this.userModel
          .findOne({
            role: 'admin',
          })
          .lean();
        if (!admin) {
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'admin not found',
            }),
          );
        }
        const productId: any = admin.specs.find(
          (product: any) => product.k === 'featured',
        );
        const product = await this.productModel
          .findOne({
            _id: productId.v,
          })
          .populate({
            path: 'category',
            select: 'name _id',
          })
          .populate({
            path: 'sellerId',
            select: 'info _id',
          })
          .lean();

        return resolve({
          status: HttpStatus.OK,
          data: {
            ...product,
            specs: this.specsResponse(product?.specs),
          },
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

  newReleaseProduct(query: any): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const products = await new APIFeatures(
          this.productModel.find({}).sort({
            createdAt: -1,
          }),
          query,
        )
          .pagination(query.limit)
          .query.populate({
            path: 'category',
            select: 'name _id',
          })
          .populate({
            path: 'sellerId',
            select: 'info _id',
          })
          .lean();

        const payload = products.map((product) => ({
          ...product,
          specs: this.specsResponse(product.specs),
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

  relatedProducts(categoryId: string): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const products = await this.productModel
          .find({
            category: categoryId,
          })
          .populate({
            path: 'category',
            select: 'name _id',
          })
          .populate({
            path: 'sellerId',
            select: 'info _id',
          })
          .lean();
        const makeProducts = products.map((product) => ({
          ...product,
          specs: this.specsResponse(product.specs),
        }));
        if (products.length < 10) {
          return resolve({
            status: HttpStatus.OK,
            data: makeProducts,
          });
        }
        const payload: any = [
          makeProducts[Math.floor(Math.random() * products.length)],
          makeProducts[Math.floor(Math.random() * products.length)],
          makeProducts[Math.floor(Math.random() * products.length)],
          makeProducts[Math.floor(Math.random() * products.length)],
          makeProducts[Math.floor(Math.random() * products.length)],
          makeProducts[Math.floor(Math.random() * products.length)],
          makeProducts[Math.floor(Math.random() * products.length)],
          makeProducts[Math.floor(Math.random() * products.length)],
          makeProducts[Math.floor(Math.random() * products.length)],
          makeProducts[Math.floor(Math.random() * products.length)],
        ];
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

  getProductsByAuthor(query: any): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const [products, totalProduct] = await Promise.all([
          new APIFeatures(
            this.productModel.find({
              specs: {
                $elemMatch: { k: 'author', v: query.author },
              },
            }),
            query,
          ) // (2)
            .filter()
            .pagination(query.limit)
            .query.populate({
              path: 'category',
              select: 'name _id',
            })
            .populate({
              path: 'sellerId',
              select: 'info _id',
            })
            .lean(),
          new APIFeatures(
            this.productModel.find({
              specs: {
                $elemMatch: { k: 'author', v: query.author },
              },
            }),
            query,
          ) // (2)
            .filter()
            .query.lean(),
        ]);
        const makeProducts = products.map((product) => ({
          ...product,
          specs: this.specsResponse(product.specs),
        }));
        return resolve({
          status: HttpStatus.OK,
          data: makeProducts,
          total: totalProduct?.length,
        });
      } catch (error) {
        console.log('err::', error);
        return reject(
          errorResponse({
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: Message.internal_server_error,
          }),
        );
      }
    });
  }

  updateTypeMigration(): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const products = await this.productModel.find({}).lean();

        await Promise.all(
          products.map((product) => {
            const variants = product.variants.map((variant) => ({
              ...variant,
              price: Number(variant.price),
            }));
            return this.productModel.updateOne(
              { _id: product._id },
              {
                $set: {
                  variants: variants,
                },
              },
            );
          }),
        );

        return resolve({
          status: HttpStatus.OK,
          data: 'success',
        });
      } catch (error) {
        console.log('err::', error);
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
