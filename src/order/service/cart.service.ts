import { Injectable, HttpStatus, Inject, Logger } from '@nestjs/common';
import mongoose, { Model } from 'mongoose';
import slugify from 'slugify';
import { generate } from 'shortid';
import { Seller, SELLER_MODEL } from 'src/auth/model/seller.model';
import { INotifyResponse } from 'src/utils/generics.util';
import { User, USER_MODEL } from '../../auth/model/user.model';
import Message from '../../lang/en.lang';
import { errorResponse } from 'src/utils/helpers.utils';
import { PRODUCT_MODEL, Product } from 'src/products/model/product.model';
import { CATEGORY_MODEL, Category } from 'src/products/model/category.model';
import { CART_MODEL, Cart } from '../model/cart.model';

@Injectable()
export class CartService {
  private logger = new Logger('Category service');
  constructor(
    @Inject(USER_MODEL) private readonly userModel: Model<User>,
    @Inject(SELLER_MODEL) private readonly sellerModel: Model<Seller>,
    @Inject(PRODUCT_MODEL) private readonly productModel: Model<Product>,
    @Inject(CATEGORY_MODEL) private readonly categoryModel: Model<Category>,
    @Inject(CART_MODEL) private readonly cartModel: Model<Cart>,
  ) {}

  specsResponse(specs: any) {
    const result = {};
    specs.forEach((element: any) => {
      result[element.k] = element.v;
    });
    return result;
  }

  addToCart(userId: string, cartItem: any): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      try {
        const productExists = await this.productModel
          .findOne({
            _id: cartItem.product,
          })
          .lean();

        if (!productExists)
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: Message.product_not_found,
            }),
          );
        const cartExists = this.cartModel
          .findOne({
            user: userId,
          })
          .lean();

        const productAlready = this.cartModel
          .findOne({
            $and: [
              { user: userId },
              { cartItems: { $elemMatch: { product: cartItem.product } } },
            ],
          })
          .lean();

        const [cart, productAdded] = await Promise.all([
          cartExists,
          productAlready,
        ]);

        console.log('test::', productAdded);
        if (cart) {
          let condition: any;
          let update: any;
          if (productAdded) {
            if (
              productAdded.cartItems.find((item) => {
                if (
                  item.product.toString() === cartItem.product &&
                  item.variant.toString() === cartItem.variant
                ) {
                  return true;
                }
                return false;
              })
            ) {
              condition = {
                $and: [
                  { user: userId },
                  { cartItems: { $elemMatch: { product: cartItem.product } } },
                ],
              };
              update = {
                $set: {
                  'cartItems.$.quantity': cartItem.quantity,
                  'cartItems.$.wishlist': cartItem.wishlist,
                },
              };
            } else {
              condition = { user: userId };
              update = {
                $push: {
                  cartItems: cartItem,
                },
              };
            }
          } else {
            condition = { user: userId };
            update = {
              $push: {
                cartItems: cartItem,
              },
            };
          }
          this.cartModel
            .findOneAndUpdate(condition, update, {
              new: true,
              upsert: true,
              setDefaultsOnInsert: false,
            })
            .exec((error, cart) => {
              if (error)
                return reject(
                  errorResponse({
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: Message.internal_server_error,
                  }),
                );
              if (cart) {
                return resolve({
                  status: HttpStatus.CREATED,
                  message: Message.add_cart_success,
                  data: null,
                });
              }
            });
        } else {
          const cart = new this.cartModel({
            user: userId,
            cartItems: [cartItem],
          });
          cart.save((error, cart) => {
            if (error)
              return reject(
                errorResponse({
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                  message: Message.internal_server_error,
                }),
              );
            if (cart) {
              return resolve({
                status: HttpStatus.CREATED,
                message: Message.add_cart_success,
                data: null,
              });
            }
          });
        }
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

  getCartItems(userId: string): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const cart = await this.cartModel
          .findOne({
            user: userId,
          })
          .populate({
            path: 'cartItems.product',
            populate: [
              {
                path: 'sellerId',
                select: 'info',
              },
              {
                path: 'category',
                select: 'name -_id',
              },
            ],
            select: '-description -summary',
          })
          .lean();
        if (!cart) {
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Cart empty',
            }),
          );
        }
        return resolve({
          status: HttpStatus.OK,
          data: {
            _id: cart._id,
            user: cart.user,
            cartItems: cart.cartItems.map((item) => {
              if (!item.product) {
                return {
                  message: 'product not exists',
                };
              }
              return {
                ...item,
                product: {
                  ...item.product,
                  seller: item.product.sellerId,
                  sellerId: item.product.sellerId._id,
                  specs: this.specsResponse(item.product.specs),
                  productPictures: item.product.productPictures[0],
                },
              };
            }),
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

  removeCartItem(
    userId: string,
    cartItem: any,
  ): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      try {
        const cart = await this.cartModel
          .findOneAndUpdate(
            {
              user: userId,
            },
            {
              $pull: {
                cartItems: {
                  product: cartItem.productId,
                  variant: cartItem.variantId,
                },
              },
            },
            { new: true, upsert: true },
          )
          .lean();
        if (!cart) {
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: Message.internal_server_error,
            }),
          );
        }
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

  deleteCartByUser(userId: string): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      try {
        const cart = await this.cartModel
          .deleteOne({
            user: userId,
          })
          .lean();
        if (!cart) {
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: Message.internal_server_error,
            }),
          );
        }
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
}
