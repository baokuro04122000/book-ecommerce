import { Injectable, HttpStatus, Inject, Logger } from '@nestjs/common';
import { INotifyResponse } from 'src/utils/generics.util';
import { IORedisKey } from 'src/database/redis.module';
import Redis from 'ioredis';
import Message from '../lang/en.lang';
import { errorResponse } from 'src/utils/helpers.utils';
import { USER_MODEL, User } from 'src/auth/model/user.model';
import { Model } from 'mongoose';
import APIFeatures from 'src/utils/apiFeatures';

@Injectable()
export class AdminService {
  private logger = new Logger('Category service');
  constructor(
    @Inject(IORedisKey) private readonly redisClient: Redis,
    @Inject(USER_MODEL) private readonly userModel: Model<User>,
  ) {}

  logoutUser(userId: string): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      try {
        const accessTokenList = await this.redisClient.keys(
          `userId-accessToken-${userId}-*`,
        );

        const refreshTokenList = await this.redisClient.keys(
          `userId-refreshToken-${userId}-*`,
        );

        if (!accessTokenList.length && !refreshTokenList.length) {
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: Message.user_not_login,
            }),
          );
        }

        const delList = [...accessTokenList, ...refreshTokenList];

        if (refreshTokenList)
          Promise.all(
            delList.map((key) => {
              return this.redisClient.del(key);
            }),
          )
            .then((result) => {
              this.logger.log('success::', ...result);
              return resolve({
                status: HttpStatus.OK,
                message: 'Logout successfully',
                data: null,
              });
            })
            .catch((err) => {
              this.logger.error(err);
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

  getAllUsers(query: any): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const apiFeaturesCountDocuments = new APIFeatures(this.userModel, query) // (1)
          .userSearch()
          .filter()
          .query.countDocuments();

        const apiFeatures = new APIFeatures(this.userModel, query) // (2)
          .userSearch()
          .filter()
          .pagination(query.limit)
          .query.populate({
            path: 'seller',
            select: 'info',
          })
          .lean();

        const [totalUsers, users] = await Promise.all([
          apiFeaturesCountDocuments,
          apiFeatures,
        ]);

        if (!users) {
          return reject(
            errorResponse({
              status: 404,
              message: Message.user_empty,
            }),
          );
        }

        return resolve({
          status: HttpStatus.OK,
          message: '',
          data: users,
          total: totalUsers,
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

  blockAccountById(userId: string): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      try {
        const accessTokenList = await this.redisClient.keys(
          `userId-accessToken-${userId}-*`,
        );

        const refreshTokenList = await this.redisClient.keys(
          `userId-refreshToken-${userId}-*`,
        );

        if (!accessTokenList.length && !refreshTokenList.length) {
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: Message.user_not_login,
            }),
          );
        }

        const delList = [...accessTokenList, ...refreshTokenList];

        if (refreshTokenList)
          Promise.all(
            delList.map((key) => {
              return this.redisClient.del(key);
            }),
          )
            .then(async (result) => {
              this.logger.log('success::', ...result);

              await this.userModel.updateOne(
                {
                  _id: userId,
                },
                {
                  $set: {
                    status: 'blocked',
                  },
                },
              );
              return resolve({
                status: HttpStatus.OK,
                message: 'block successfully',
                data: null,
              });
            })
            .catch((err) => {
              this.logger.error(err);
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

  unBlockAccountById(userId: string): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.userModel.updateOne(
          {
            _id: userId,
          },
          {
            $set: {
              status: 'normal',
            },
          },
        );
        return resolve({
          status: HttpStatus.OK,
          message: 'block successfully',
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
