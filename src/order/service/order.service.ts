import { Injectable, HttpStatus, Inject, Logger } from '@nestjs/common';
import mongoose, { Model } from 'mongoose';
import slugify from 'slugify';
import { generate } from 'shortid';
import { Seller, SELLER_MODEL } from 'src/auth/model/seller.model';
import { INotifyResponse } from 'src/utils/generics.util';
import { User, USER_MODEL } from '../../auth/model/user.model';
import Message from '../../lang/en.lang';
import {
  errorResponse,
  getPaginatedItems,
  totalPriceProduct,
} from 'src/utils/helpers.utils';
import { PRODUCT_MODEL, Product } from 'src/products/model/product.model';
import { CATEGORY_MODEL, Category } from 'src/products/model/category.model';
import { DELIVERY_INFO_MODEL, DeliveryInfo } from '../model/deliveryInfo.model';
import { Cart, CART_MODEL } from '../model/cart.model';
import { SHIPPING_MODEL, Shipping } from '../model/shipping.model';
import {
  SHIPPING_COMPANY_MODEL,
  ShippingCompany,
} from '../model/shippingCompany.model';
import { ORDER_MODEL, Order } from '../model/order.model';
import { INVENTORY_MODEL, Inventory } from '../model/inventory.model';
import { IORedisKey } from '../../database/redis.module';
import { Redis } from 'ioredis';
import {
  PAYMENT_HISTORY_MODEL,
  PaymentHistory,
} from '../model/paymentHistory.model';
import * as _ from 'lodash';
import paypal from '../middleware/paypal.midlle';
import APIFeatures from 'src/utils/apiFeatures';
import {
  NOTIFICATION_MODEL,
  NotificationType,
} from '../model/notification.model';
import { PERMISSION_MODEL, Permission } from '../model/pemission.model';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();
@Injectable()
export class OrderService {
  private logger = new Logger('Category service');
  constructor(
    @Inject(USER_MODEL) private readonly userModel: Model<User>,
    @Inject(SELLER_MODEL) private readonly sellerModel: Model<Seller>,
    @Inject(PRODUCT_MODEL) private readonly productModel: Model<Product>,
    @Inject(CATEGORY_MODEL) private readonly categoryModel: Model<Category>,
    @Inject(CART_MODEL) private readonly cartModel: Model<Cart>,
    @Inject(SHIPPING_MODEL) private readonly shippingModel: Model<Shipping>,
    @Inject(ORDER_MODEL) private readonly orderModel: Model<Order>,
    @Inject(INVENTORY_MODEL) private readonly inventoryModel: Model<Inventory>,
    @Inject(DELIVERY_INFO_MODEL)
    private readonly deliveryModel: Model<DeliveryInfo>,
    @Inject(PAYMENT_HISTORY_MODEL)
    private readonly paymentHistoryModel: Model<PaymentHistory>,
    @Inject(NOTIFICATION_MODEL)
    private readonly notificationModel: Model<NotificationType>,
    @Inject(PERMISSION_MODEL)
    private readonly permissionReviewModel: Model<Permission>,
    @Inject(IORedisKey) private readonly redisClient: Redis,
  ) {}

  specsResponse(specs: any) {
    const result = {};
    specs.forEach((element: any) => {
      result[element.k] = element.v;
    });
    return result;
  }

  addDeliveryInfo(userId: string, address: any): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const deliveryInfo = await this.deliveryModel
          .findOne({
            user: userId,
          })
          .lean();

        if (!deliveryInfo) {
          const delivery = new this.deliveryModel({
            user: userId,
            address: [address],
          });
          const info = await delivery.save();
          await this.setDefaultDeliveryInfo(userId, info.address.at(-1)._id);
          return resolve({
            status: HttpStatus.CREATED,
            message: 'add address successfully',
            data: null,
          });
        }

        if (deliveryInfo?.address?.length >= 3) {
          return reject(
            errorResponse({
              status: HttpStatus.FORBIDDEN,
              message: 'Each account only have 3 address!',
            }),
          );
        }
        await this.deliveryModel.updateOne(
          {
            user: userId,
          },
          {
            $push: {
              address: address,
            },
          },
          {
            new: true,
          },
        );

        const info = await this.deliveryModel
          .findOne({
            user: userId,
          })
          .select('address')
          .lean();
        await this.setDefaultDeliveryInfo(userId, info.address.at(-1)._id);
        return resolve({
          status: HttpStatus.CREATED,
          message: 'add address successfully',
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

  getDeliveryInfoById(userId: string): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const info = await this.deliveryModel
          .findOne({
            user: userId,
          })
          .populate({
            path: 'user',
            select: 'name info',
          })
          .lean();
        if (!info)
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Address Empty',
            }),
          );
        return resolve({
          status: HttpStatus.OK,
          data: info,
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

  deleteDeliveryInfoByAddressId(
    userId: string,
    addressId: string,
  ): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const removed = await this.deliveryModel.updateOne(
          {
            user: userId,
          },
          {
            $pull: {
              address: {
                _id: addressId,
              },
            },
          },
          {
            new: true,
          },
        );
        if (!removed.modifiedCount)
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Address not found',
            }),
          );
        return resolve({
          status: HttpStatus.OK,
          message: 'Deleted successfully',
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

  updateDeliveryInfo(
    userId: string,
    addressId: string,
    address: any,
  ): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('address', address);
        console.log('addressId', addressId);
        const deliveryInfo = await this.deliveryModel
          .findOne({
            user: userId,
          })
          .updateOne(
            {
              address: { $elemMatch: { _id: addressId } },
            },
            {
              $set: {
                'address.$.name': address.name,
                'address.$.zipCode': address.zipCode,
                'address.$.phoneNumber': address.phoneNumber,
                'address.$.address': address.address,
                'address.$.addressCode.district': address.addressCode.district,
                'address.$.addressCode.province': address.addressCode.province,
                'address.$.addressCode.ward': address.addressCode.ward,
                'address.$.addressCode.street': address.addressCode.street,
              },
            },
          );
        if (!deliveryInfo.modifiedCount)
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Not Found',
            }),
          );
        return resolve({
          status: HttpStatus.OK,
          message: 'updated successfully',
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

  setDefaultDeliveryInfo(
    userId: string,
    addressId: string,
  ): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      if (!addressId)
        return reject(
          errorResponse({
            status: 403,
            message: 'address id is required',
          }),
        );
      try {
        await this.deliveryModel.updateOne(
          {
            user: userId,
          },
          {
            $set: {
              'address.$[].isDefault': false,
            },
          },
        );

        const setDefault = await this.deliveryModel.updateOne(
          {
            user: userId,
            'address._id': addressId,
          },
          {
            $set: {
              'address.$.isDefault': true,
            },
          },
        );
        if (!setDefault.modifiedCount)
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: 'addressId not found',
            }),
          );
        return resolve({
          status: HttpStatus.OK,
          message: 'updated successfully',
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

  addOrder(userId, order): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('order::', order);
        const address = await this.deliveryModel
          .findOne({
            user: userId,
            'address._id': order.addressId,
          })
          .select('address')
          .lean();
        const checkProductExistsInCart = order.items.map((product) => {
          return this.cartModel.exists({
            $and: [
              { user: userId },
              { 'cartItems.$.product': product.productId },
              { 'cartItems.$.variant': product.variant },
            ],
          });
        });

        const productValid = await Promise.all(checkProductExistsInCart);

        if (productValid.some((valid) => valid === null))
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: 'Product is not exits in your cart!',
            }),
          );

        if (!address)
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: 'Address not found, please add your address!',
            }),
          );
        const addressSend = address.address.find(
          (item) => item._id.toString() === order.addressId,
        );
        const shipping = [...order.items];
        const shippingList = _.uniqBy(shipping, function (e) {
          return e.shippingCode;
        });
        const list = shippingList.map((shipping) =>
          this.shippingModel
            .findOne({
              code: Number(shipping.shippingCode),
            })
            .select('price code')
            .lean(),
        );

        const shippingCostList = await Promise.all(list);
        shippingCostList.forEach((item) => {
          if (!item)
            return reject(
              errorResponse({
                status: HttpStatus.BAD_REQUEST,
                message: 'Shipping code not found',
              }),
            );
        });
        const products = order.items.map((item) => {
          return this.productModel
            .findOne({
              _id: item.productId,
            })
            .lean();
        });

        const productList = await Promise.all(products);
        productList.forEach((item) => {
          if (!item)
            return reject(
              errorResponse({
                status: HttpStatus.BAD_REQUEST,
                message: 'Product not found',
              }),
            );
        });

        if (_.isEmpty(productList))
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: 'Products empty',
            }),
          );

        const mergeDataProducts = order.items.map((item) => {
          const product = productList.find(
            (product) => product._id.toString() === item.productId,
          );
          const shippingCost = shippingCostList.find(
            (shipping) => shipping.code === item.shippingCode,
          );
          if (Number(product.quantity) - Number(item.quantity) <= 0) {
            return reject(
              errorResponse({
                status: 408,
                message: product.name + 'out of stock',
              }),
            );
          }
          const variant = product.variants.find(
            (vari: any) => vari._id.toString() === item.variant,
          );
          return {
            product: product._id.toString(),
            variant: variant._id,
            name: product.name,
            seller: product.sellerId,
            currency: 'USD',
            discount: variant.discount,
            quantity: item.quantity,
            shippingCode: item.shippingCode,
            shippingCost: shippingCost.price,
            price: variant.price,
            totalPaid:
              totalPriceProduct(
                variant.price,
                item.quantity,
                variant.discount,
              ) + shippingCost.price,
            priceDiscount:
              variant.price * item.quantity -
              totalPriceProduct(
                variant.price,
                item.quantity,
                variant.discount,
              ) +
              shippingCost.price,
            orderStatus: {
              type: 'ordered',
              date: Date.now(),
              isCompleted: false,
            },
          };
        });
        if (order.paymentType === 'cod') {
          const orderPayload = {
            user: userId,
            address: addressSend,
            totalAmount: mergeDataProducts.reduce(
              (total, current) => total + current.totalPaid,
              0,
            ),
            items: mergeDataProducts.map((v) => ({
              ...v,
              paymentStatus: 'pending',
            })),
            subtotal: mergeDataProducts.reduce(
              (total, current) =>
                total +
                totalPriceProduct(
                  current.price,
                  current.quantity,
                  current.discount,
                ),
              0,
            ),
            paymentType: order.paymentType,
            shippingCost: mergeDataProducts.reduce(
              (total, current) => total + current.shippingCost,
              0,
            ),
            orderStatus: {
              type: 'ordered',
              date: Date.now(),
              isCompleted: false,
            },
          };
          const ordered = await new this.orderModel(orderPayload).save();
          console.log('order::', ordered);
          const removeProductFromCart = ordered.items.map((item) => {
            return this.cartModel.updateOne(
              {
                user: userId,
              },
              {
                $pull: {
                  cartItems: {
                    product: item?.product,
                    variant: item?.variant,
                  },
                },
              },
              {
                new: true,
              },
            );
          });
          Promise.all(removeProductFromCart)
            .then((x) => console.log('x', x))
            .catch((err) => {
              console.log('err:::', err);
            });
          const updateQuantity = ordered?.items?.map((item) => {
            return this.productModel
              .findOneAndUpdate(
                {
                  _id: item.product,
                },
                {
                  $inc: {
                    quantity: -Number(item.quantity),
                  },
                },
                {
                  new: true,
                },
              )
              .select('quantity sellerId')
              .lean();
          });

          //update quantity of product
          const updatedProduct = await Promise.all([...updateQuantity]);

          console.log('updated:::', updatedProduct);
          const checkInventoryExisted = ordered?.items?.map((item) => {
            return this.inventoryModel.exists({
              product: item?.product,
            });
          });

          // check product exists in inventory
          const inventories = await Promise.all(checkInventoryExisted);

          const createInventory = inventories.map((exists, index) => {
            const reservation = {
              order: ordered._id,
              user: userId,
              quantity: ordered.items[index].quantity,
            };

            if (!_.isEmpty(exists)) {
              return this.inventoryModel
                .findOneAndUpdate(
                  {
                    product: ordered.items[index].product,
                  },
                  {
                    $push: {
                      reservations: reservation,
                    },
                  },
                  {
                    new: true,
                  },
                )
                .lean();
            }

            const updatedProductType = updatedProduct as any;
            return new this.inventoryModel({
              product: ordered.items[index].product,
              sellerId: updatedProductType[0].sellerId,
              reservations: [
                {
                  order: ordered._id,
                  user: userId,
                  quantity: ordered.items[index].quantity,
                },
              ],
            }).save();
          });

          const createdInventory = await Promise.all(createInventory);

          const user = await this.userModel.findOne({ _id: userId }).lean();

          this.redisClient.publish(
            'order_success',
            JSON.stringify({
              email: user.local.email ? user.local.email : user.google.email,
              orderId: ordered._id,
              name: user.local.email ? user.info.name : user.google.name,
              totalPaid: ordered.totalAmount,
              totalShippingCost: ordered.shippingCost,
            }),
          );
          return resolve({
            status: HttpStatus.CREATED,
            data: {
              orderId: ordered._id,
            },
          });
        }
        if (order.paymentType === 'paypal') {
          const x: any = this.paymentHistoryModel;
          const orderPayload = {
            user: userId,
            address: addressSend,
            totalAmount: mergeDataProducts.reduce(
              (total, current) => total + current.totalPaid,
              0,
            ),
            items: mergeDataProducts.map((v) => ({
              ...v,
              paymentStatus: 'pending',
            })),
            paymentStatus: 'pending',
            paymentType: order.paymentType,
            shippingCost: mergeDataProducts.reduce(
              (total, current) => total + current.shippingCost,
              0,
            ),
            orderStatus: {
              type: 'ordered',
              date: Date.now(),
              isCompleted: false,
            },
          };
          let subtotal = 0;
          //let discount = 0;
          const item_list = mergeDataProducts.map((item) => {
            subtotal +=
              totalPriceProduct(item.price, 1, item.discount) * item.quantity;
            return {
              name: item.name,
              currency: 'USD',
              sku: item.product,
              quantity: item.quantity,
              price: Number(
                totalPriceProduct(item.price, 1, item.discount).toFixed(2),
              ),
              // "image_url":item.productPictures ? item.productPictures : "ahsdjs"
            };
          });

          const orderPayloadPayPal = {
            intent: 'sale',
            payer: {
              payment_method: order.paymentType,
            },
            redirect_urls: {
              return_url: process.env.REDIRECT_PAYPAL_SUCCESS,
              cancel_url: process.env.REDIRECT_PAYPAL_CANCEL,
            },
            transactions: [
              {
                amount: {
                  currency: 'USD',
                  total: Number(
                    Math.round(
                      (subtotal + orderPayload.shippingCost + Number.EPSILON) *
                        100,
                    ) / 100,
                  ).toFixed(2),
                  details: {
                    subtotal: (
                      Math.round((Number(subtotal) + Number.EPSILON) * 100) /
                      100
                    ).toFixed(2),

                    shipping: Number(orderPayload.shippingCost),
                  },
                },
                item_list: {
                  items: item_list,
                },
                description: 'Payment description',
              },
            ],
          };

          paypal.payment.create(
            JSON.stringify(orderPayloadPayPal),
            function (error, payment) {
              if (error) {
                console.log(error);
                return reject({
                  status: 400,
                  error: error,
                });
              } else {
                payment.links.forEach(async (link) => {
                  if (link.rel === 'approval_url') {
                    const token = link.href?.split('token=').at(-1);
                    await new x({
                      address: addressSend,
                      payId: payment.id,
                      token: token,
                      user: userId,
                      items: mergeDataProducts.map((product) => {
                        return {
                          ...product,
                          paymentStatus: 'pending',
                          price: product.price,
                          totalPaid: totalPriceProduct(
                            product.price,
                            product.quantity,
                            product.discount,
                          ),
                          shippingCost: product.shippingCost,
                          orderStatus: [
                            {
                              type: 'ordered',
                              date: Date.now(),
                              isCompleted: true,
                            },
                            {
                              type: 'packed',
                              date: Date.now(),
                              isCompleted: false,
                            },
                          ],
                        };
                      }),
                    }).save();

                    return resolve({
                      status: HttpStatus.OK,
                      data: {
                        link: link.href,
                        paymentId: payment.id,
                      },
                    });
                  }
                });
              }
            },
          );
        }
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

  paypalPaymentSuccess(
    payerId: any,
    paymentId: any,
  ): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      const payment = await this.paymentHistoryModel
        .findOne({
          payId: paymentId,
        })
        .lean();

      if (!payment)
        return reject(
          errorResponse({
            status: HttpStatus.NOT_FOUND,
            message: 'Payment not exists',
          }),
        );

      const execute_payment_json = {
        payer_id: payerId,
      };

      const x = this.orderModel;
      const y = this.productModel;
      const z = this.paymentHistoryModel;
      const d = this.inventoryModel;
      const u = this.userModel;
      const r = this.redisClient;
      const c = this.cartModel;
      // Obtains the transaction details from paypal
      paypal.payment.execute(
        paymentId,
        execute_payment_json,
        async function (error, paymentDetails) {
          //When error occurs when due to non-existent transaction, throw an error else log the transaction details in the console then send a Success string reposponse to the user.
          if (error) {
            return reject(
              errorResponse({
                status: HttpStatus.FORBIDDEN,
                message: error,
              }),
            );
          } else {
            const amount = paymentDetails.transactions.at(0).amount;

            const orderPayload = {
              user: payment.user,
              address: payment.address,
              totalAmount: amount.total,
              items: payment.items.map((item) => ({
                ...item,
                paymentStatus: 'completed',
              })),
              paymentType: 'paypal',
              shippingCost: amount.details.shipping,
              subtotal: amount.details.subtotal,
              orderStatus: [
                {
                  type: 'ordered',
                  date: Date.now(),
                  isCompleted: true,
                },
                {
                  type: 'packed',
                  date: Date.now(),
                  isCompleted: false,
                },
              ],
            };
            try {
              const ordered = await new x(orderPayload).save();
              await z.updateOne(
                {
                  payId: paymentId,
                },
                {
                  $set: {
                    order: ordered._id,
                    paymentStatus: 'completed',
                    paymentDetails: paymentDetails,
                  },
                },
              );
              const removeProductFromCart = ordered.items.map((item) => {
                return c.updateOne(
                  {
                    user: ordered.user,
                  },
                  {
                    $pull: {
                      cartItems: {
                        product: item.product,
                        variant: item.variant,
                      },
                    },
                  },
                  {
                    new: true,
                  },
                );
              });
              const updateQuantity = payment.items.map((item) => {
                return y
                  .findOneAndUpdate(
                    {
                      _id: item.product,
                    },
                    {
                      $set: {
                        $inc: {
                          $and: [
                            { quantity: -Number(item.quantity) },
                            { 'meta.totalOrder': 1 },
                          ],
                        },
                      },
                    },
                    {
                      new: true,
                    },
                  )
                  .select('quantity sellerId')
                  .lean();
              });

              //update quantity of product
              const [updatedProduct, removeCart] = await Promise.all([
                ...updateQuantity,
                ...removeProductFromCart,
              ]);

              const checkInventoryExisted = ordered.items.map((item) => {
                return d.exists({
                  product: item.product,
                });
              });

              // check product exists in inventory
              const inventories = await Promise.all(checkInventoryExisted);

              const createInventory = inventories.map((exists, index) => {
                const reservation = {
                  order: ordered._id,
                  user: ordered.user,
                  quantity: ordered.items[index].quantity,
                };

                if (!_.isEmpty(exists)) {
                  return d
                    .findOneAndUpdate(
                      {
                        product: ordered.items[index].product,
                      },
                      {
                        $push: {
                          reservations: reservation,
                        },
                      },
                      {
                        new: true,
                      },
                    )
                    .lean();
                }
                const updatedProductType = updatedProduct as any;

                return new d({
                  product: ordered.items[index].product,
                  sellerId: updatedProductType.sellerId,
                  reservations: [
                    {
                      order: ordered._id,
                      user: ordered.user,
                      quantity: ordered.items[index].quantity,
                    },
                  ],
                }).save();
              });

              const createdInventory = await Promise.all(createInventory);

              u.findOne({ _id: ordered.user })
                .lean()
                .exec((err, user) => {
                  if (err)
                    return reject(
                      errorResponse({
                        status: HttpStatus.INTERNAL_SERVER_ERROR,
                        message: Message.internal_server_error,
                      }),
                    );
                  r.publish(
                    'order_success',
                    JSON.stringify({
                      email: user.local.email
                        ? user.local.email
                        : user.google.email,
                      orderId: ordered._id,
                      name: user.local.email
                        ? user.info.name
                        : user.google.name,
                      totalPaid: ordered.totalAmount,
                      totalShippingCost: ordered.shippingCost,
                    }),
                  );
                });
              return resolve({
                status: HttpStatus.OK,
                data: {
                  paymentId: paymentId,
                },
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
          }
        },
      );
    });
  }

  paypalPaymentCancel(token: any): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.paymentHistoryModel.updateOne(
          {
            token: token,
          },
          {
            $set: {
              paymentStatus: 'cancelled',
            },
          },
        );

        return resolve({
          status: HttpStatus.OK,
          data: {
            message: 'This payment is cancelled',
          },
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

  paypalPaymentStatus(
    userId: string,
    payId: any,
  ): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const payment = await this.paymentHistoryModel
          .findOne({
            $and: [{ user: userId }, { payId: payId }],
          })
          .lean();

        if (!payment)
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Payment not found',
            }),
          );
        return resolve({
          status: HttpStatus.OK,
          data: {
            paymentStatus: payment.paymentStatus,
          },
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

  //order processing by user
  getOrderById(userId: string, orderId: string): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const order = await this.orderModel
          .findOne({
            $and: [{ _id: orderId }, { user: userId }],
          })
          .populate({
            path: 'items.product',
            select:
              'name sellerId category slug summary productPictures specs _id',
            populate: [
              {
                path: 'sellerId',
                select: 'info type logo _id slug',
              },
              {
                path: 'category',
                select: 'name -_id',
              },
            ],
          })
          .lean();

        if (_.isEmpty(order))
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Order not found',
            }),
          );
        const items = order.items.map((item) => {
          return {
            ...item,
            product: {
              ...item.product,
              sellerId: item.product.sellerId._id,
              seller: item.product.sellerId,
              specs: this.specsResponse(item.product.specs),
            },
            orderStatus: item.orderStatus,
          };
        });

        const payload = {
          ...order,
          orderStatus: order.orderStatus.at(-1),
          items: items,
        };

        return resolve({
          status: HttpStatus.OK,
          data: {
            order: payload,
          },
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

  getAllOrders(userId: string, queryStr: any): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const countDocument = this.orderModel
          .find({
            user: userId,
          })
          .countDocuments();

        const list = new APIFeatures(
          this.orderModel
            .find({
              user: userId,
            })
            .select(
              'totalAmount items paymentType subtotal shippingCost address',
            )
            .populate({
              path: 'items.product',
              select: 'name productPictures variants _id slug',
            })
            .sort({
              createdAt: -1,
            }),
          queryStr,
        )
          .pagination(queryStr.limit)
          .query.lean();

        const [totalOrders, orders] = await Promise.all([countDocument, list]);

        const orderList = orders.map((order) => {
          return {
            ...order,
            quantity: order.items.length,
            items: order.items.map((item) => ({
              ...item,
              orderStatus: item.orderStatus.at(-1),
            })),
          };
        });
        const payload = {
          totalOrders: totalOrders,
          data: {
            orders: orderList,
          },
        };
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

  getAllOrderedByUser(userId, page, limit): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const ordered = await this.orderModel.aggregate([
          { $match: { user: new mongoose.Types.ObjectId(userId) } },
          {
            $project: {
              items: {
                $filter: {
                  input: '$items',
                  as: 'item',
                  cond: {
                    $and: [
                      { $eq: ['$$item.isDeleted', false] },
                      { $eq: ['$$item.isCancel', false] },
                      { $eq: [{ $size: '$$item.orderStatus' }, 1] },
                    ],
                  },
                },
              },
              address: 1,
              paymentType: 1,
              createdAt: 1,
            },
          },
          { $sort: { createdAt: -1 } },
          { $match: { 'items.0': { $exists: true } } },
          { $unwind: '$items' },
          {
            $lookup: {
              from: 'products',
              localField: 'items.product',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    name: 1,
                    productPictures: 1,
                    quantity: 1,
                    slug: 1,
                    _id: 1,
                    sellerId: 1,
                    variants: 1,
                  },
                },
              ],
              as: 'product',
            },
          },
          {
            $lookup: {
              from: 'sellers',
              localField: 'product.sellerId',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    info: 1,
                    logo: 1,
                    type: 1,
                    slug: 1,
                    _id: 1,
                  },
                },
              ],
              as: 'seller',
            },
          },
          {
            $unwind: '$product',
          },
          {
            $unwind: '$seller',
          },
          {
            $set: {
              'items.product': '$product',
              'items.seller': '$seller',
            },
          },
          {
            $group: {
              _id: '$_id',
              address: { $first: '$address' },
              paymentType: { $first: '$paymentType' },
              items: { $push: '$items' },
            },
          },
        ]);
        if (_.isEmpty(ordered))
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Order not found',
            }),
          );
        let payload = [];

        ordered.forEach((item) => {
          let reservations = [];
          item.items.forEach((order) => {
            if (!_.isEmpty(order)) {
              reservations = [
                ...reservations,
                {
                  ...order,
                  orderId: item._id,
                  address: item.address,
                  paymentType: item.paymentType,
                },
              ];
            }
          });
          payload = [...payload, ...reservations];
        });
        return resolve({
          status: HttpStatus.OK,
          data: getPaginatedItems(payload, page, limit),
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

  getAllOrdersCancelByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const ordered = await this.orderModel.aggregate([
          { $match: { user: new mongoose.Types.ObjectId(userId) } },
          {
            $project: {
              items: {
                $filter: {
                  input: '$items',
                  as: 'item',
                  cond: { $and: [{ $eq: ['$$item.isCancel', true] }] },
                },
              },
              address: 1,
              paymentType: 1,
              createdAt: 1,
            },
          },
          { $sort: { updatedAt: -1 } },
          { $match: { 'items.0': { $exists: true } } },
          { $unwind: '$items' },
          {
            $lookup: {
              from: 'products',
              localField: 'items.product',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    name: 1,
                    productPictures: 1,
                    quantity: 1,
                    slug: 1,
                    _id: 1,
                    sellerId: 1,
                    variants: 1,
                  },
                },
              ],
              as: 'product',
            },
          },
          {
            $lookup: {
              from: 'sellers',
              localField: 'product.sellerId',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    info: 1,
                    logo: 1,
                    type: 1,
                    slug: 1,
                    _id: 1,
                  },
                },
              ],
              as: 'seller',
            },
          },
          {
            $unwind: '$product',
          },
          {
            $unwind: '$seller',
          },
          {
            $set: {
              'items.product': '$product',
              'items.seller': '$seller',
            },
          },
          {
            $group: {
              _id: '$_id',
              address: { $first: '$address' },
              paymentType: { $first: '$paymentType' },
              items: { $push: '$items' },
            },
          },
        ]);
        if (_.isEmpty(ordered))
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Order not found',
            }),
          );
        let payload = [];

        ordered.forEach((item) => {
          let reservations = [];
          item.items.forEach((order) => {
            if (!_.isEmpty(order)) {
              reservations = [
                ...reservations,
                {
                  ...order,
                  orderId: item._id,
                  address: item.address,
                  paymentType: item.paymentType,
                },
              ];
            }
          });
          payload = [...payload, ...reservations];
        });

        return resolve({
          status: HttpStatus.OK,
          data: getPaginatedItems(payload, page, limit),
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

  cancelOrderItemByUser(
    userId: string,
    orderItemId: string,
  ): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const orderItem = await this.orderModel
          .findOneAndUpdate(
            {
              $and: [
                { user: userId },
                {
                  items: {
                    $elemMatch: {
                      $and: [
                        { _id: orderItemId },
                        { isCancel: false },
                        { isDeleted: false },
                        { 'orderStatus.0.isCompleted': false },
                      ],
                    },
                  },
                },
              ],
            },
            {
              $set: {
                'items.$.isCancel': true,
              },
            },
            {
              new: true,
            },
          )
          .lean();
        if (!orderItem)
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Order not found!',
            }),
          );
        await this.userModel
          .findOneAndUpdate(
            {
              _id: userId,
            },
            {
              $inc: { 'meta.totalCancel': 1 },
            },
            {
              new: true,
            },
          )
          .lean();

        return resolve({
          status: HttpStatus.OK,
          message: 'Your order is canceled successfully',
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

  cancelOrderByUser(userId, orderId): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const order = await this.orderModel
          .findOneAndUpdate(
            {
              $and: [
                { user: userId },
                { _id: orderId },
                {
                  items: {
                    $elemMatch: {
                      $and: [
                        { isCancel: false },
                        { isDeleted: false },
                        { 'orderStatus.0.isCompleted': false },
                      ],
                    },
                  },
                },
              ],
            },
            {
              $set: {
                'items.$[].isCancel': true,
              },
            },
            {
              new: true,
            },
          )
          .lean();

        if (!order)
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Order not found!',
            }),
          );
        const user = await this.userModel
          .findOneAndUpdate(
            {
              user: userId,
            },
            {
              $inc: { 'meta.totalCancel': order.items.length },
            },
            {
              new: true,
            },
          )
          .lean();

        return resolve({
          status: HttpStatus.OK,
          message: 'Your order is canceled successfully',
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

  // shipper
  getAllOrdersShippingByUser(
    userId,
    page,
    limit,
  ): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('userId', userId);
        const ordered = await this.orderModel.aggregate([
          { $match: { user: new mongoose.Types.ObjectId(userId) } },
          {
            $project: {
              items: {
                $filter: {
                  input: '$items',
                  as: 'item',
                  cond: {
                    $and: [
                      { $eq: ['$$item.isCancel', false] },
                      { $eq: ['$$item.isDeleted', false] },
                      { $eq: [{ $size: '$$item.orderStatus' }, 4] },
                    ],
                  },
                },
              },
              address: 1,
              paymentType: 1,
              createdAt: 1,
            },
          },
          { $match: { 'items.0': { $exists: true } } },
          { $sort: { createdAt: -1 } },
          { $unwind: '$items' },
          {
            $lookup: {
              from: 'products',
              localField: 'items.product',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    name: 1,
                    productPictures: 1,
                    quantity: 1,
                    sellerId: 1,
                  },
                },
              ],
              as: 'product',
            },
          },
          {
            $lookup: {
              from: 'sellers',
              localField: 'product.sellerId',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    info: 1,
                    logo: 1,
                    type: 1,
                    slug: 1,
                    _id: 1,
                  },
                },
              ],
              as: 'seller',
            },
          },
          {
            $unwind: '$product',
          },
          {
            $unwind: '$seller',
          },
          {
            $set: {
              'items.product': '$product',
              'items.seller': '$seller',
            },
          },
          {
            $group: {
              _id: '$_id',
              address: { $first: '$address' },
              paymentType: { $first: '$paymentType' },
              items: { $push: '$items' },
            },
          },
        ]);
        if (_.isEmpty(ordered))
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Order not found',
            }),
          );
        let payload = [];

        ordered.forEach((item) => {
          let reservations = [];
          item.items.forEach((order) => {
            if (
              _.isEmpty(order) === false &&
              order.orderStatus.at(-1).isCompleted === false
            ) {
              reservations = [
                ...reservations,
                {
                  ...order,
                  orderId: item._id,
                  address: item.address,
                  paymentType: item.paymentType,
                },
              ];
            }
          });
          payload = [...payload, ...reservations];
        });

        return resolve({
          status: HttpStatus.OK,
          data: getPaginatedItems(payload, page, limit),
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

  getAllOrdersPackedByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const ordered = await this.orderModel.aggregate([
          { $match: { user: new mongoose.Types.ObjectId(userId) } },
          {
            $project: {
              items: {
                $filter: {
                  input: '$items',
                  as: 'item',
                  cond: {
                    $and: [
                      { $eq: ['$$item.isCancel', false] },
                      { $eq: ['$$item.isDeleted', false] },
                      { $in: [{ $size: '$$item.orderStatus' }, [2, 3]] },
                    ],
                  },
                },
              },
              address: 1,
              paymentType: 1,
              createdAt: 1,
            },
          },
          { $match: { 'items.0': { $exists: true } } },
          { $sort: { createdAt: -1 } },
          { $unwind: '$items' },
          {
            $lookup: {
              from: 'products',
              localField: 'items.product',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    name: 1,
                    productPictures: 1,
                    quantity: 1,
                    slug: 1,
                    _id: 1,
                    sellerId: 1,
                    variants: 1,
                  },
                },
              ],
              as: 'product',
            },
          },
          {
            $lookup: {
              from: 'sellers',
              localField: 'product.sellerId',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    info: 1,
                    logo: 1,
                    type: 1,
                    slug: 1,
                    _id: 1,
                  },
                },
              ],
              as: 'seller',
            },
          },
          {
            $unwind: '$product',
          },
          {
            $unwind: '$seller',
          },
          {
            $set: {
              'items.product': '$product',
              'items.seller': '$seller',
            },
          },
          {
            $group: {
              _id: '$_id',
              address: { $first: '$address' },
              paymentType: { $first: '$paymentType' },
              items: { $push: '$items' },
            },
          },
        ]);

        if (_.isEmpty(ordered))
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Order not found!',
            }),
          );
        let payload = [];
        ordered.forEach((item) => {
          let reservations = [];
          item.items.forEach((order) => {
            if (
              _.isEmpty(order) === false &&
              order.orderStatus.at(-1).isCompleted === false
            ) {
              reservations = [
                ...reservations,
                {
                  ...order,
                  orderId: item._id,
                  address: item.address,
                  paymentType: item.paymentType,
                },
              ];
            }
          });

          payload = [...payload, ...reservations];
        });

        const result = await Promise.all(
          payload.map(async (item) => {
            const shippingCompany = await this.shippingModel
              .findOne({
                code: item.shippingCode,
              })
              .select('company user')
              .populate({
                path: 'company',
                select: 'name',
              })
              .populate({
                path: 'user',
                select: 'info contact',
              })
              .lean();

            return {
              ...item,
              shippingCompany: shippingCompany,
            };
          }),
        );
        return resolve({
          status: HttpStatus.OK,
          data: getPaginatedItems(result, page, limit),
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

  getAllOrdersCompletedByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const ordered = await this.orderModel.aggregate([
          { $match: { user: new mongoose.Types.ObjectId(userId) } },
          {
            $project: {
              items: {
                $filter: {
                  input: '$items',
                  as: 'item',
                  cond: {
                    $and: [
                      { $eq: ['$$item.isCancel', false] },
                      { $eq: ['$$item.isDeleted', false] },
                      { $eq: [{ $size: '$$item.orderStatus' }, 4] },
                    ],
                  },
                },
              },
              address: 1,
              paymentType: 1,
              createdAt: 1,
            },
          },
          { $match: { 'items.0': { $exists: true } } },
          { $sort: { createdAt: -1 } },
          { $unwind: '$items' },
          {
            $lookup: {
              from: 'products',
              localField: 'items.product',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    name: 1,
                    productPictures: 1,
                    quantity: 1,
                    sellerId: 1,
                    variants: 1,
                    slug: 1,
                  },
                },
              ],
              as: 'product',
            },
          },
          {
            $lookup: {
              from: 'sellers',
              localField: 'product.sellerId',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    info: 1,
                    logo: 1,
                    type: 1,
                    slug: 1,
                    _id: 1,
                  },
                },
              ],
              as: 'seller',
            },
          },
          {
            $unwind: '$product',
          },
          {
            $unwind: '$seller',
          },
          {
            $set: {
              'items.product': '$product',
              'items.seller': '$seller',
            },
          },
          {
            $group: {
              _id: '$_id',
              address: { $first: '$address' },
              paymentType: { $first: '$paymentType' },
              items: { $push: '$items' },
            },
          },
        ]);
        if (_.isEmpty(ordered))
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Order not found',
            }),
          );
        let payload = [];

        ordered.forEach((item) => {
          let reservations = [];
          item.items.forEach((order) => {
            if (
              _.isEmpty(order) === false &&
              order.orderStatus.at(-1).isCompleted === true
            ) {
              reservations = [
                ...reservations,
                {
                  ...order,
                  orderId: item._id,
                  address: item.address,
                  paymentType: item.paymentType,
                },
              ];
            }
          });
          payload = [...payload, ...reservations];
        });
        return resolve({
          status: HttpStatus.OK,
          data: getPaginatedItems(payload, page, limit),
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

  // seller processing orders
  getOrdersNotDone(
    sellerId: string,
    queryStr: any,
  ): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const productOrdered = await this.inventoryModel.aggregate([
          {
            $match: { sellerId: new mongoose.Types.ObjectId(sellerId) },
          },
          {
            $lookup: {
              from: 'orders',
              localField: 'reservations.order',
              foreignField: '_id',
              let: { productId: '$product' },
              pipeline: [
                {
                  $project: {
                    user: 1,
                    items: {
                      $filter: {
                        input: '$items',
                        as: 'item',
                        cond: {
                          $and: [
                            { $eq: ['$$item.product', '$$productId'] },
                            { $eq: ['$$item.isDeleted', false] },
                            { $eq: ['$$item.isCancel', false] },
                          ],
                        },
                      },
                    },
                    address: 1,
                    paymentType: 1,
                  },
                },
                {
                  $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    pipeline: [
                      {
                        $project: {
                          info: 1,
                          meta: 1,
                        },
                      },
                    ],
                    as: 'user',
                  },
                },
                { $unwind: '$user' },
              ],
              as: 'orders',
            },
          },
          {
            $lookup: {
              from: 'products',
              localField: 'product',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    name: 1,
                    productPictures: 1,
                    quantity: 1,
                    variants: 1,
                  },
                },
              ],
              as: 'product',
            },
          },
          {
            $unwind: '$product',
          },
          {
            $project: {
              reservations: 0,
            },
          },
          {
            $sort: { 'reservations.createdAt': -1 },
          },
        ]);
        let payload = [];
        productOrdered.map((item) => {
          let reservations = [];
          item.orders.forEach((order) => {
            if (!_.isEmpty(order.items)) {
              reservations = [
                ...reservations,
                { ...order, product: item.product },
              ];
            }
          });
          if (_.isEmpty(reservations)) return;
          payload = [...payload, ...reservations];
          return;
        });

        console.log('check::', payload);

        const x = _.uniqBy(payload, (obj) => {
          return obj._id;
        });
        const makeData: any = [];
        x.forEach((ele) => {
          if (ele.items.length > 1) {
            if (
              ele.items[0].orderStatus.at(-1).type === 'delivered' &&
              ele.items[0].orderStatus.at(-1).isCompleted === true
            ) {
              console.log('skip');
            } else {
              makeData.push({
                ...ele,
                items: [ele.items[0]],
              });
            }

            if (
              ele.items[1].orderStatus.at(-1).type === 'delivered' &&
              ele.items[1].orderStatus.at(-1).isCompleted === true
            ) {
              console.log('skip');
            } else {
              makeData.push({
                ...ele,
                items: [ele.items[1]],
              });
            }
          } else {
            if (
              ele.items[0].orderStatus.at(-1).type === 'delivered' &&
              ele.items[0].orderStatus.at(-1).isCompleted === true
            ) {
              console.log('skip');
            } else {
              makeData.push({
                ...ele,
                items: [ele.items[0]],
              });
            }
          }
        });
        return resolve({
          status: HttpStatus.OK,
          data: getPaginatedItems(makeData, queryStr.page, queryStr.limit),
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

  updateStatusOrderBySeller(
    sellerId: string,
    orderId: string,
  ): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const updated = await this.orderModel.aggregate([
          {
            $match: {
              items: {
                $elemMatch: { _id: new mongoose.Types.ObjectId(orderId) },
              },
            },
          },
          {
            $project: {
              items: {
                $filter: {
                  input: '$items',
                  as: 'item',
                  cond: {
                    $and: [
                      {
                        $eq: [
                          '$$item._id',
                          new mongoose.Types.ObjectId(orderId),
                        ],
                      },
                      { $eq: ['$$item.isDeleted', false] },
                      { $eq: ['$$item.isCancel', false] },
                    ],
                  },
                },
              },
              user: 1,
            },
          },
        ]);

        if (_.isEmpty(updated))
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Order not found',
            }),
          );
        if (_.isEmpty(updated.at(0).items))
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'No product order',
            }),
          );

        const product = await this.productModel
          .findOne({
            _id: updated.at(0).items.at(0).product,
          })
          .select('sellerId')
          .lean();

        if (product.sellerId.toString() !== sellerId) {
          return reject(
            errorResponse({
              status: HttpStatus.FORBIDDEN,
              message: 'Product is not owner',
            }),
          );
        }

        const currentStatus = updated.at(0).items.at(0).orderStatus.at(-1).type;
        if (currentStatus !== 'ordered' && currentStatus !== 'packed') {
          return reject(
            errorResponse({
              status: HttpStatus.FORBIDDEN,
              message: 'Update status order invalid!!!',
            }),
          );
        }

        let orderStatusUpdate = [];
        const orderStatus = updated.at(0).items.at(0).orderStatus;
        if (orderStatus.at(-1).type === 'ordered') {
          orderStatusUpdate = [
            { ...orderStatus.at(-1), isCompleted: true, date: Date.now() },
            {
              ...orderStatus.at(-1),
              type: 'packed',
              date: Date.now(),
              isCompleted: false,
            },
          ];
        }
        if (orderStatus.at(-1).type === 'packed') {
          orderStatusUpdate = [
            { ...orderStatus.at(0) },
            { ...orderStatus.at(-1), date: Date.now(), isCompleted: true },
            {
              ...orderStatus.at(-1),
              type: 'shipped',
              date: Date.now(),
              isCompleted: false,
            },
          ];
        }

        const updateStatus = await this.orderModel.updateOne(
          {
            items: { $elemMatch: { _id: orderId } },
          },
          {
            $set: {
              'items.$.orderStatus': orderStatusUpdate,
            },
          },
          {
            new: true,
          },
        );

        if (orderStatus.at(-1).type === 'ordered') {
          const noti = await new this.notificationModel({
            type: {
              type: 'order',
              orderId: updated.at(0)._id,
              childId: updated.at(0).items.at(0)._id,
              productId: updated.at(0).items.at(0).product,
            },
            user: updated.at(0).user,
            content: Message.noti_confirm_order_success,
            title: Message.noti_titile_confirm_order_success,
          }).save();

          this.redisClient.publish(
            'send_noti_order',
            JSON.stringify({
              _id: noti._id,
              user: noti.user,
              _title: noti.title,
              content: noti.content,
              type: noti.type,
            }),
          );
        }

        return resolve({
          status: HttpStatus.OK,
          data: {
            orderStatus: orderStatusUpdate,
          },
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

  updateStatusOrderByShipper(
    shipperId: string,
    orderId: string,
  ): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const shipper = await this.shippingModel
          .findOne({
            user: shipperId,
          })
          .lean();
        if (!shipper)
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: 'You do not a shipper of this order',
            }),
          );
        const updated = await this.orderModel.aggregate([
          {
            $match: {
              items: {
                $elemMatch: {
                  $and: [
                    { _id: new mongoose.Types.ObjectId(orderId) },
                    { shippingCode: shipper.code },
                  ],
                },
              },
            },
          },
          {
            $project: {
              items: {
                $filter: {
                  input: '$items',
                  as: 'item',
                  cond: {
                    $and: [
                      {
                        $eq: [
                          '$$item._id',
                          new mongoose.Types.ObjectId(orderId),
                        ],
                      },
                    ],
                  },
                },
              },
              user: 1,
            },
          },
        ]);

        if (_.isEmpty(updated))
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Order not found!',
            }),
          );
        const currentStatus = updated.at(0).items.at(0).orderStatus.at(-1);
        if (
          !(
            currentStatus.type === 'shipped' ||
            currentStatus.type === 'delivered'
          )
        ) {
          return reject(
            errorResponse({
              status: HttpStatus.FORBIDDEN,
              message: 'Update status order invalid!',
            }),
          );
        }
        if (
          currentStatus.type === 'delivered' &&
          currentStatus.isCompleted === true
        ) {
          return reject(
            errorResponse({
              status: HttpStatus.FORBIDDEN,
              message: 'This order is done!',
            }),
          );
        }

        let orderStatusUpdate = [];
        const orderStatus = updated.at(0).items.at(0).orderStatus;
        if (orderStatus.at(-1).type === 'shipped') {
          orderStatusUpdate = [
            orderStatus.at(0),
            orderStatus.at(1),
            { ...orderStatus.at(-1), isCompleted: true, date: Date.now() },
            {
              ...orderStatus.at(-1),
              type: 'delivered',
              date: Date.now(),
              isCompleted: false,
            },
          ];
        }
        if (orderStatus.at(-1).type === 'delivered') {
          orderStatusUpdate = [
            orderStatus.at(0),
            orderStatus.at(1),
            orderStatus.at(2),
            {
              ...orderStatus.at(-1),
              type: 'delivered',
              date: Date.now(),
              isCompleted: true,
            },
          ];
        }

        const updateStatus = await this.orderModel.updateOne(
          {
            items: { $elemMatch: { _id: orderId } },
          },
          {
            $set: {
              'items.$.orderStatus': orderStatusUpdate,
            },
          },
          {
            new: true,
          },
        );

        if (orderStatus.at(-1).type === 'shipped') {
          const noti = await new this.notificationModel({
            type: {
              type: 'delivery',
              orderId: updated.at(0)._id,
              childId: updated.at(0).items.at(0)._id,
              productId: updated.at(0).items.at(0).product,
            },
            user: updated.at(0).user,
            content: Message.noti_confirm_shipping_success,
            title: Message.noti_title_confirm_shipping_success,
          }).save();

          this.redisClient.publish(
            'send_noti_delivery',
            JSON.stringify({
              _id: noti._id,
              user: noti.user,
              _title: noti.title,
              content: noti.content,
              type: noti.type,
            }),
          );
        }

        if (orderStatus.at(-1).type === 'delivered') {
          const productId = updated.at(0).items.at(0).product;

          const checkExists = await this.permissionReviewModel.exists({
            product: productId,
          });
          await Promise.all([
            this.userModel.updateOne(
              {
                _id: updated.at(0).user,
              },
              {
                $inc: {
                  'meta.totalBuy': 1,
                },
              },
            ),
            this.productModel.updateOne(
              {
                _id: productId,
              },
              {
                $inc: {
                  'meta.totalSold': 1,
                },
              },
            ),
            this.orderModel.updateOne(
              {
                items: { $elemMatch: { _id: orderId } },
              },
              {
                $set: {
                  'items.$.paymentStatus': 'completed',
                },
              },
              {
                new: true,
              },
            ),
          ]);

          if (checkExists) {
            const checkUserExists = await this.permissionReviewModel.exists({
              product: productId,
              'list.user': updated.at(0).user,
            });
            if (!checkUserExists) {
              await this.permissionReviewModel.updateOne(
                {
                  product: productId,
                },
                {
                  $push: {
                    list: updated.at(0).user,
                  },
                },
              );
            }
          } else {
            const permissionReview = new this.permissionReviewModel({
              product: productId,
              list: [
                {
                  user: updated.at(0).user,
                },
              ],
            }).save();
          }
        }

        return resolve({
          status: HttpStatus.OK,
          data: {
            orderStatus: orderStatusUpdate,
          },
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

  cancelOrderItemBySeller(
    sellerId: string,
    orderItemId: string,
    reason: string,
  ): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const permissionCancelOrder = new Map([
          [
            'rules',
            [
              {
                'orderStatus.0.isCompleted': false,
              },
              {
                'orderStatus.0.isCompleted': true,
                'orderStatus.1.isCompleted': false,
              },
              {
                'orderStatus.0.isCompleted': true,
                'orderStatus.1.isCompleted': true,
                'orderStatus.2.isCompleted': false,
              },
            ],
          ],
        ]);

        const [orderItemCod, orderItemPaypal] = await Promise.all([
          this.orderModel
            .findOneAndUpdate(
              {
                $and: [
                  {
                    items: {
                      $elemMatch: {
                        $and: [
                          { _id: orderItemId },
                          { isCancel: false },
                          { isDeleted: false },
                          { seller: sellerId },
                          { $or: permissionCancelOrder.get('rules') },
                        ],
                      },
                    },
                  },
                  {
                    paymentType: 'cod',
                  },
                ],
              },
              {
                $set: {
                  'items.$.isCancel': true,
                  'items.$.reason': reason,
                  'items.$.personCancel': 'seller',
                },
              },
              {
                new: true,
              },
            )
            .lean(),
          this.orderModel
            .findOneAndUpdate(
              {
                $and: [
                  {
                    items: {
                      $elemMatch: {
                        $and: [
                          { _id: orderItemId },
                          { isCancel: false },
                          { isDeleted: false },
                          { seller: sellerId },
                          {
                            $or: permissionCancelOrder.get('rules'),
                          },
                        ],
                      },
                    },
                  },
                  {
                    paymentType: 'paypal',
                  },
                ],
              },
              {
                $set: {
                  'items.$.isCancel': true,
                  'items.$.reason': reason,
                  'items.$.personCancel': 'seller',
                  'items.$.paymentStatus': 'refund',
                },
              },
              {
                new: true,
              },
            )
            .lean(),
        ]);
        if (!orderItemCod && !orderItemPaypal)
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Order not found!',
            }),
          );
        if (orderItemCod) {
          await Promise.all(
            orderItemCod?.items?.map((product) => {
              return this.productModel.updateOne(
                {
                  _id: product.product,
                  variants: {
                    $elemMatch: {
                      _id: product?.variant,
                    },
                  },
                },
                {
                  $inc: {
                    'variants.$.quantity': +Number(product?.quantity),
                  },
                },
              );
            }),
          );
        }

        if (orderItemPaypal) {
          await Promise.all(
            orderItemPaypal?.items?.map((product) => {
              return this.productModel.updateOne(
                {
                  _id: product.product,
                  variants: {
                    $elemMatch: {
                      _id: product?.variant,
                    },
                  },
                },
                {
                  $inc: {
                    'variants.$.quantity': +Number(product?.quantity),
                  },
                },
              );
            }),
          );
        }

        return resolve({
          status: HttpStatus.OK,
          message: 'Your order is canceled successfully',
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

  cancelOrderItemByShipper(
    shipperId: string,
    orderItemId: string,
    reason: string,
  ): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const shipper = await this.shippingModel
          .findOne({
            user: shipperId,
          })
          .select('_id code')
          .lean();
        if (!shipper)
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: 'Shipper not found',
            }),
          );
        const permissionCancelOrder = new Map([
          [
            'rules',
            [
              {
                'orderStatus.0.isCompleted': true,
                'orderStatus.1.isCompleted': true,
                'orderStatus.2.isCompleted': true,
                'orderStatus.3.isCompleted': false,
              },
            ],
          ],
        ]);

        const [orderItemCod, orderItemPaypal] = await Promise.all([
          this.orderModel
            .findOneAndUpdate(
              {
                $and: [
                  {
                    items: {
                      $elemMatch: {
                        $and: [
                          { _id: orderItemId },
                          { isCancel: false },
                          { isDeleted: false },
                          { shippingCode: shipper.code },
                          { $or: permissionCancelOrder.get('rules') },
                        ],
                      },
                    },
                  },
                  {
                    paymentType: 'cod',
                  },
                ],
              },
              {
                $set: {
                  'items.$.isCancel': true,
                  'items.$.reason': reason,
                  'items.$.personCancel': 'shipper',
                },
              },
              {
                new: true,
              },
            )
            .lean(),
          this.orderModel
            .findOneAndUpdate(
              {
                $and: [
                  {
                    items: {
                      $elemMatch: {
                        $and: [
                          { _id: orderItemId },
                          { isCancel: false },
                          { isDeleted: false },
                          { shippingCode: shipper.code },
                          {
                            $or: permissionCancelOrder.get('rules'),
                          },
                        ],
                      },
                    },
                  },
                  {
                    paymentType: 'paypal',
                  },
                ],
              },
              {
                $set: {
                  'items.$.isCancel': true,
                  'items.$.reason': reason,
                  'items.$.personCancel': 'shipper',
                  'items.$.paymentStatus': 'refund',
                },
              },
              {
                new: true,
              },
            )
            .lean(),
        ]);
        if (!orderItemCod && !orderItemPaypal)
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Order not found!',
            }),
          );

        if (orderItemCod) {
          await Promise.all(
            orderItemCod?.items?.map((product) => {
              return this.productModel.updateOne(
                {
                  _id: product.product,
                  variants: {
                    $elemMatch: {
                      _id: product?.variant,
                    },
                  },
                },
                {
                  $inc: {
                    'variants.$.quantity': +Number(product?.quantity),
                  },
                },
              );
            }),
          );
        }

        if (orderItemPaypal) {
          await Promise.all(
            orderItemCod?.items?.map((product) => {
              return this.productModel.updateOne(
                {
                  _id: product.product,
                  variants: {
                    $elemMatch: {
                      _id: product?.variant,
                    },
                  },
                },
                {
                  $inc: {
                    'variants.$.quantity': +Number(product?.quantity),
                  },
                },
              );
            }),
          );
        }

        return resolve({
          status: HttpStatus.OK,
          message: 'Your order is canceled successfully',
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

  cancelOrderItemByShipperClientReject(
    shipperId: string,
    orderItemId: string,
    reason: string,
  ): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const shipper = await this.shippingModel
          .findOne({
            user: shipperId,
          })
          .select('_id code')
          .lean();
        if (!shipper)
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: 'Shipper not found',
            }),
          );
        const permissionCancelOrder = new Map([
          [
            'rules',
            [
              {
                'orderStatus.0.isCompleted': true,
                'orderStatus.1.isCompleted': true,
                'orderStatus.2.isCompleted': true,
                'orderStatus.3.isCompleted': false,
              },
            ],
          ],
        ]);

        const [orderItemCod, orderItemPaypal] = await Promise.all([
          this.orderModel
            .findOneAndUpdate(
              {
                $and: [
                  {
                    items: {
                      $elemMatch: {
                        $and: [
                          { _id: orderItemId },
                          { isCancel: false },
                          { isDeleted: false },
                          { shippingCode: shipper.code },
                          { $or: permissionCancelOrder.get('rules') },
                        ],
                      },
                    },
                  },
                  {
                    paymentType: 'cod',
                  },
                ],
              },
              {
                $set: {
                  'items.$.isCancel': true,
                  'items.$.reason': reason,
                  'items.$.personCancel': 'shipper',
                  'items.$.isClientReject': true,
                },
              },
              {
                new: true,
              },
            )
            .lean(),
          this.orderModel
            .findOneAndUpdate(
              {
                $and: [
                  {
                    items: {
                      $elemMatch: {
                        $and: [
                          { _id: orderItemId },
                          { isCancel: false },
                          { isDeleted: false },
                          { shippingCode: shipper.code },
                          {
                            $or: permissionCancelOrder.get('rules'),
                          },
                        ],
                      },
                    },
                  },
                  {
                    paymentType: 'paypal',
                  },
                ],
              },
              {
                $set: {
                  'items.$.isCancel': true,
                  'items.$.reason': reason,
                  'items.$.personCancel': 'shipper',
                  'items.$.isClientReject': true,
                },
              },
              {
                new: true,
              },
            )
            .lean(),
        ]);
        if (!orderItemCod && !orderItemPaypal)
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Order not found!',
            }),
          );

        if (orderItemCod) {
          await Promise.all(
            orderItemCod?.items?.map((product) => {
              return this.productModel.updateOne(
                {
                  _id: product.product,
                  variants: {
                    $elemMatch: {
                      _id: product?.variant,
                    },
                  },
                },
                {
                  $inc: {
                    'variants.$.quantity': +Number(product?.quantity),
                  },
                },
              );
            }),
          );
        }

        if (orderItemPaypal) {
          await Promise.all(
            orderItemPaypal?.items?.map((product) => {
              return this.productModel.updateOne(
                {
                  _id: product.product,
                  variants: {
                    $elemMatch: {
                      _id: product?.variant,
                    },
                  },
                },
                {
                  $inc: {
                    'variants.$.quantity': +Number(product?.quantity),
                  },
                },
              );
            }),
          );
        }
        const user = orderItemPaypal
          ? orderItemPaypal.user
          : orderItemCod
          ? orderItemCod.user
          : '';

        if (!user)
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: 'User not found',
            }),
          );
        await this.userModel.updateOne(
          {
            _id: user,
          },
          {
            $inc: {
              'meta.totalOrderReject': 1,
            },
          },
        );

        return resolve({
          status: HttpStatus.OK,
          message: 'Your order is canceled successfully',
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
  // shipper processing orders
  getOrdersShipping(
    shipperId: string,
    page: number,
    limit: number,
  ): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const shippingCode = await this.shippingModel
          .find({
            user: shipperId,
          })
          .select('-_id code')
          .lean();
        const codeList = shippingCode.map((code) => {
          return code.code;
        });

        const orders = await this.orderModel.aggregate([
          {
            $match: {
              items: { $elemMatch: { shippingCode: { $in: codeList } } },
            },
          },
          {
            $project: {
              items: {
                $filter: {
                  input: '$items',
                  as: 'item',
                  cond: {
                    $and: [
                      { $eq: ['$$item.isCancel', false] },
                      { $eq: ['$$item.isDeleted', false] },
                      { $gte: [{ $size: '$$item.orderStatus' }, 3] },
                    ],
                  },
                },
              },
              address: 1,
              paymentType: 1,
              createdAt: 1,
            },
          },
          { $match: { 'items.0': { $exists: true } } },
          { $sort: { createdAt: -1 } },
          { $unwind: '$items' },
          {
            $lookup: {
              from: 'products',
              localField: 'items.product',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    name: 1,
                    productPictures: 1,
                    quantity: 1,
                    variants: 1,
                  },
                },
              ],
              as: 'product',
            },
          },
          {
            $unwind: '$product',
          },
          {
            $set: {
              'items.product': '$product',
            },
          },
          {
            $group: {
              _id: '$_id',
              address: { $first: '$address' },
              paymentType: { $first: '$paymentType' },
              items: { $push: '$items' },
            },
          },
        ]);

        if (_.isEmpty(orders))
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Order not found!',
            }),
          );
        let payload = [];

        orders.forEach((item) => {
          let reservations = [];
          item.items.forEach((order) => {
            if (
              _.isEmpty(order) === false &&
              order.orderStatus.at(-1).isCompleted === false
            ) {
              reservations = [
                ...reservations,
                {
                  ...order,
                  orderId: item._id,
                  address: item.address,
                  paymentType: item.paymentType,
                },
              ];
            }
          });
          payload = [...payload, ...reservations];
        });

        return resolve({
          status: HttpStatus.OK,
          data: getPaginatedItems(payload, page, limit),
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

  getAllOrdersCompletedBySeller(
    sellerId: string,
    page: number,
    limit: number,
  ): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const ordered = await this.orderModel
          .find({
            $and: [
              { 'items.seller': sellerId },
              { 'items.orderStatus.3.isCompleted': true },
            ],
          })
          .populate({
            path: 'items.product',
          })
          .populate({
            path: 'user',
            select: 'info _id meta',
          })
          .lean();
        if (_.isEmpty(ordered)) {
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'order done empty!',
            }),
          );
        }
        let totalEarn = 0;

        const makeData: any = [];
        ordered.forEach((order) => {
          order.items.forEach((item: any) => {
            if (
              item.orderStatus.at(-1).type === 'delivered' &&
              item.orderStatus.at(-1).isCompleted === true
            ) {
              totalEarn += Number(item.totalPaid - item.shippingCost);
              makeData.push({
                ...order,
                items: [item],
              });
            }
          });
        });

        return resolve({
          status: HttpStatus.OK,
          data: {
            ...getPaginatedItems(makeData, page, limit),
            totalEarn: totalEarn.toFixed(2),
          },
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

  reviewProductByUser({
    userId,
    productId,
    rating,
    comment,
  }: any): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const [product, permission] = await Promise.all([
          this.productModel
            .findOne({
              _id: productId,
            })
            .lean(),
          this.permissionReviewModel
            .findOne({
              $and: [
                { product: productId },
                {
                  list: {
                    $elemMatch: {
                      user: userId,
                    },
                  },
                },
              ],
            })
            .lean(),
        ]);

        if (!product) {
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: 'Product not found',
            }),
          );
        }

        if (!permission) {
          return reject(
            errorResponse({
              status: HttpStatus.FORBIDDEN,
              message: 'Please buy the product to review',
            }),
          );
        }
        const reviewAlready = product?.reviews?.find(
          (user) => user.user.toString() === userId,
        );

        if (reviewAlready) {
          await this.productModel.findOneAndUpdate(
            {
              $and: [
                { _id: productId },
                {
                  reviews: {
                    $elemMatch: {
                      user: userId,
                    },
                  },
                },
              ],
            },
            {
              $set: {
                'reviews.$.rating': rating,
                'reviews.$.comment': comment,
                'reviews.$.updatedAt': Date.now(),
              },
            },
            { new: true },
          );

          return resolve({
            status: HttpStatus.OK,
            message: 'Review successfully',
            data: null,
          });
        }

        await this.productModel.findOneAndUpdate(
          {
            _id: productId,
          },
          {
            $push: {
              reviews: {
                user: userId,
                rating: rating,
                comment: comment,
              },
            },
          },
          { new: true, upsert: true },
        );
        return resolve({
          status: HttpStatus.OK,
          message: 'Review successfully',
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
