import { Injectable, HttpStatus, Inject, Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { Redis } from 'ioredis';
import { CreateUserDto, UserLoginDto, CreateSellerDto } from '../dto/user.dto';
import { TokenDto } from '../dto/auth.dto';
import { User, USER_MODEL } from '../model/user.model';
import { Token, TOKEN_MODEL } from '../model/token.model';
import { Seller, SELLER_MODEL } from '../model/seller.model';
import { errorResponse, handleRequest } from '../../utils/helpers.utils';
import { INotifyResponse } from '../../utils/generics.util';
import { IORedisKey } from '../../database/redis.module';
import { ITokenPayload, UserLoginPayload } from '../types/auth.type';
import Message from '../../lang/en.lang';

export const SEND_MAIL_TYPE = 'register_user';

@Injectable()
export class AuthService {
  private logger = new Logger('Auth service');
  constructor(
    @Inject(USER_MODEL) private readonly userModel: Model<User>,
    @Inject(TOKEN_MODEL) private readonly tokenModel: Model<Token>,
    @Inject(SELLER_MODEL) private readonly sellerModel: Model<Seller>,
    @Inject(IORedisKey) private readonly redisClient: Redis,
    private jwt: JwtService,
  ) {}

  signup(user: CreateUserDto): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      const checkExisted = await this.userModel.findOne({
        $or: [
          {
            $and: [
              { 'local.email': user.email },
              { 'google.email': user.email },
            ],
          },
          { 'local.email': user.email },
        ],
      });
      // when account is existed in database
      if (checkExisted) {
        return reject(
          errorResponse({
            status: HttpStatus.BAD_REQUEST,
            message: Message.email_existed,
          }),
        );
      }

      //when google is existed
      const token = uuidv4();
      const salt = await bcrypt.genSalt(Number(process.env.SALT_ROUND));
      const hashPassword = await bcrypt.hash(user.password, salt);
      let err, data;
      [err, data] = await handleRequest(
        this.userModel.findOneAndUpdate(
          { 'google.email': user.email },
          {
            $set: {
              'local.email': user.email,
              'local.password': hashPassword,
              'info.name': user.name,
              'info.gender': user.gender,
            },
          },
          {
            new: true,
          },
        ),
      );

      if (err) {
        this.logger.error(err.toString());
        return reject(
          errorResponse({
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: Message.internal_server_error,
          }),
        );
      }
      if (!data) {
        [err, data] = await handleRequest(
          new this.userModel({
            local: {
              email: user.email,
              password: user.password,
            },
            info: {
              name: user.name,
              gender: user.gender,
            },
          }).save(),
        );
        if (err) {
          this.logger.error(err.toString());
          return reject(
            errorResponse({
              status: HttpStatus.INTERNAL_SERVER_ERROR,
              message: Message.internal_server_error,
            }),
          );
        }
        try {
          (await this.tokenModel.find({ user: data._id })).map((token) =>
            token.remove(),
          );
          await new this.tokenModel({
            user: data._id,
            generatedToken: token,
          }).save();
          this.redisClient.publish(
            'send_mail',
            JSON.stringify({
              type: SEND_MAIL_TYPE,
              email: user.email,
              verifyToken: token,
              name: user.name,
            }),
          );
          return resolve({
            status: HttpStatus.CREATED,
            message: Message.register_success,
            data: null,
          });
        } catch (error) {
          this.logger.error(error.toString());
          return reject(
            errorResponse({
              status: HttpStatus.INTERNAL_SERVER_ERROR,
              message: Message.internal_server_error,
            }),
          );
        }
      }
      try {
        (await this.tokenModel.find({ user: data._id })).map((token) =>
          token.remove(),
        );
        await new this.tokenModel({
          user: data._id,
          generatedToken: token,
        }).save();

        this.redisClient.publish(
          'send_otp_register_mobile',
          JSON.stringify({
            type: SEND_MAIL_TYPE,
            email: user.email,
            verifyToken: token,
            name: user.name,
          }),
        );

        return resolve({
          status: HttpStatus.CREATED,
          message: Message.register_success,
          data: null,
        });
      } catch (error) {
        this.logger.error(JSON.stringify(error.toString()));
        return reject(
          errorResponse({
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: Message.internal_server_error,
          }),
        );
      }
    });
  }

  active({ token }: TokenDto): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      try {
        const existed = await this.tokenModel.findOne({
          generatedToken: token,
        });
        if (!existed) {
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: Message.token_register_not_match,
            }),
          );
        }
        await this.userModel.findOneAndUpdate(
          {
            $and: [{ _id: existed.user }, { 'local.verified': { $ne: true } }],
          },
          { 'local.verified': true },
        );
        existed.remove();
        return resolve({
          status: HttpStatus.OK,
          message: Message.active_success,
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

  checkTokenRedis(tokenPayload: ITokenPayload): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        const userId = await this.redisClient.get(tokenPayload.token);
        if (userId !== tokenPayload.userId) {
          this.logger.error('Bad User........');
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: 'Bad User',
            }),
          );
        }
        return resolve(true);
      } catch (error) {
        return reject(
          errorResponse({
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: Message.internal_server_error,
          }),
        );
      }
    });
  }

  async generateToken(
    payload: any,
    secret: string,
    ttl: string | number,
  ): Promise<string> {
    return this.jwt.sign(payload, { secret: secret, expiresIn: ttl });
  }

  async setRedis(key: string, value: string, ttl: number) {
    return this.redisClient.set(key, value, 'EX', ttl);
  }

  login({
    email,
    password,
  }: UserLoginDto): Promise<INotifyResponse<UserLoginPayload>> {
    return new Promise(async (resolve, reject) => {
      try {
        const account = await this.userModel
          .findOne({
            'local.email': email,
          })
          .populate('seller');
        if (!account) {
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: Message.login_wrong,
            }),
          );
        }
        const user = new this.userModel({
          'local.password': account.local.password,
        });
        const checkPassword = await user.isCheckPassword(password);
        if (!checkPassword) {
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: Message.login_wrong,
            }),
          );
        }

        if (!account.local.verified) {
          return reject(
            errorResponse({
              status: HttpStatus.FORBIDDEN,
              message: Message.account_inactive,
            }),
          );
        }

        if (account.status === 'blocked') {
          return reject(
            errorResponse({
              status: HttpStatus.FORBIDDEN,
              message: Message.account_locked,
            }),
          );
        }

        if (account.role === 'user') {
          const payload = {
            userId: account._id,
            nickName: account.info.nickName,
            name: account.info.name,
            avatar: account.info.avatar,
            gender: account.info.gender,
            role: account.role,
            special: account.specs,
            typeLogin: 'local',
          };
          try {
            const accessToken = await this.generateToken(
              {
                userId: account._id,
                role: account.role,
              },
              process.env.TOKEN_SECRET || 'dinhbao',
              process.env.TTL_TOKEN_SECRET || '1h',
            );
            const refreshToken = await this.generateToken(
              {
                userId: account._id,
              },
              process.env.REFRESH_TOKEN || 'dinhbaorefresh',
              process.env.TTL_REFRESH_TOKEN || '7d',
            );
            const setAccess = this.setRedis(
              accessToken,
              account._id,
              Number(process.env.TTL_REDIS_ACCESS_TOKEN || 3600),
            );

            const setRefresh = this.setRedis(
              refreshToken,
              account._id,
              Number(process.env.TTL_REDIS_ACCESS_TOKEN || 3600),
            );
            Promise.all([setAccess, setRefresh])
              .then((result) => {
                this.logger.log('access::', result[0]);
                this.logger.log('refresh::', result[1]);
              })
              .catch((err) => {
                this.logger.error('redis error:::', err);
              });

            return resolve({
              status: HttpStatus.OK,
              message: 'OK',
              data: {
                ...payload,
                accessToken,
                refreshToken,
              },
            });
          } catch (error) {
            this.logger.error(error.toString());
            return reject(
              errorResponse({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: Message.internal_server_error,
              }),
            );
          }
        }
        if (account.role === 'shipper') {
          const payload = {
            userId: account._id,
            nickName: account.info.nickName,
            name: account.info.name,
            avatar: account.info.avatar,
            gender: account.info.gender,
            role: account.role,
            special: account.specs,
            typeLogin: 'local',
          };
          try {
            const accessToken = await this.generateToken(
              {
                userId: account._id,
                role: account.role,
              },
              process.env.TOKEN_SECRET || 'dinhbao',
              process.env.TTL_TOKEN_SECRET || '1h',
            );
            const refreshToken = await this.generateToken(
              {
                userId: account._id,
              },
              process.env.REFRESH_TOKEN || 'dinhbaorefresh',
              process.env.TTL_REFRESH_TOKEN || '7d',
            );
            const setAccess = this.setRedis(
              accessToken,
              account._id,
              Number(process.env.TTL_REDIS_ACCESS_TOKEN || 3600),
            );

            const setRefresh = this.setRedis(
              refreshToken,
              account._id,
              Number(process.env.TTL_REDIS_ACCESS_TOKEN || 3600),
            );
            Promise.all([setAccess, setRefresh])
              .then((result) => {
                this.logger.log('access::', result[0]);
                this.logger.log('refresh::', result[1]);
              })
              .catch((err) => {
                this.logger.error('redis error:::', err);
              });
            return resolve({
              status: HttpStatus.OK,
              message: 'OK',
              data: {
                ...payload,
                accessToken,
                refreshToken,
              },
            });
          } catch (error) {
            this.logger.error(error.toString());
            return reject(
              errorResponse({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: Message.internal_server_error,
              }),
            );
          }
        }
        if (account.role === 'admin') {
          const payload = {
            userId: account._id,
            nickName: account.info.nickName,
            name: account.info.name,
            avatar: account.info.avatar,
            role: account.role,
            gender: account.info.gender,
            special: account.specs,
            typeLogin: 'local',
          };
          const accessToken = await this.generateToken(
            {
              userId: account._id,
              role: account.role,
            },
            process.env.TOKEN_SECRET || 'dinhbao',
            process.env.TTL_TOKEN_SECRET || '1h',
          );
          const refreshToken = await this.generateToken(
            {
              userId: account._id,
            },
            process.env.REFRESH_TOKEN || 'dinhbaorefresh',
            process.env.TTL_REFRESH_TOKEN || '7d',
          );
          const setAccess = this.setRedis(
            accessToken,
            account._id,
            Number(process.env.TTL_REDIS_ACCESS_TOKEN || 3600),
          );

          const setRefresh = this.setRedis(
            refreshToken,
            account._id,
            Number(process.env.TTL_REDIS_ACCESS_TOKEN || 3600),
          );
          Promise.all([setAccess, setRefresh])
            .then((result) => {
              this.logger.log('access::', result[0]);
              this.logger.log('refresh::', result[1]);
            })
            .catch((err) => {
              this.logger.error('redis error:::', err);
            });
          return resolve({
            status: HttpStatus.OK,
            message: 'OK',
            data: {
              ...payload,
              accessToken,
              refreshToken,
            },
          });
        }
        const payload = {
          userId: account._id,
          nickName: account.info.nickName,
          name: account.info.name,
          avatar: account.info.avatar,
          gender: account.info.gender,
          role: account.role,
          seller: account.seller,
          special: account.specs,
          typeLogin: 'local',
        };
        const accessToken = await this.generateToken(
          {
            userId: account._id,
            role: account.role,
          },
          process.env.TOKEN_SECRET || 'dinhbao',
          process.env.TTL_TOKEN_SECRET || '1h',
        );
        const refreshToken = await this.generateToken(
          {
            userId: account._id,
          },
          process.env.REFRESH_TOKEN || 'dinhbaorefresh',
          process.env.TTL_REFRESH_TOKEN || '7d',
        );
        const setAccess = this.setRedis(
          accessToken,
          account._id,
          Number(process.env.TTL_REDIS_ACCESS_TOKEN || 3600),
        );

        const setRefresh = this.setRedis(
          refreshToken,
          account._id,
          Number(process.env.TTL_REDIS_ACCESS_TOKEN || 3600),
        );
        Promise.all([setAccess, setRefresh])
          .then((result) => {
            this.logger.log('access::', result[0]);
            this.logger.log('refresh::', result[1]);
          })
          .catch((err) => {
            this.logger.error('redis error:::', err);
          });
        return resolve({
          status: HttpStatus.OK,
          message: 'OK',
          data: {
            ...payload,
            accessToken,
            refreshToken,
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

  sellerRegisterRequest(userId: string): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      try {
        const token = uuidv4();

        const user = await this.userModel
          .findOne({
            _id: userId,
          })
          .lean();

        if (!user) {
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: Message.user_not_found,
            }),
          );
        }

        if (user.role === 'seller') {
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: Message.seller_registed,
            }),
          );
        }

        const createToken = await new this.tokenModel({
          user: userId,
          generatedToken: token,
        }).save();

        if (!createToken) {
          return reject(
            errorResponse({
              status: HttpStatus.NOT_FOUND,
              message: Message.user_not_found,
            }),
          );
        }

        this.redisClient.publish(
          'send_mail',
          JSON.stringify({
            email: user.local.email,
            _id: user._id,
            verifyToken: createToken.generatedToken,
            name: user.info.name,
            type: 'register_seller',
          }),
        );
        return resolve({
          status: HttpStatus.OK,
          message: Message.register_seller_send_mail,
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

  checkTokenExists(token: string): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      try {
        const isExisted = await this.tokenModel
          .findOne({
            generatedToken: token,
          })
          .lean();
        if (!isExisted) {
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: Message.token_register_not_match,
            }),
          );
        }
        return resolve({
          status: HttpStatus.OK,
          message: Message.token_valid,
          data: null,
        });
      } catch (error) {
        this.logger.error(error.toString());
        return reject(
          errorResponse({
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: Message.internal_server_error,
          }),
        );
      }
    });
  }

  sellerRegister(seller: CreateSellerDto): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      try {
        const tokenValid = await this.tokenModel.findOne({
          generatedToken: seller.token,
        });
        if (!tokenValid) {
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: Message.token_invalid,
            }),
          );
        }
        const nameExisted = await this.sellerModel
          .findOne({
            'info.name': seller.name,
          })
          .lean();
        if (!nameExisted) {
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: Message.name_existed,
            }),
          );
        }
        let err, data;
        // eslint-disable-next-line prefer-const
        [err, data] = await handleRequest(
          new this.sellerModel({
            userId: tokenValid.user,
            info: {
              name: seller.name,
              phone: seller.phone,
            },
            slogan: seller.slogan,
            logo: seller.logo,
            proof: seller.proof,
          }).save(),
        );
        if (err) {
          this.logger.error(err.toString());
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: Message.internal_server_error,
            }),
          );
        }
        await this.userModel.findOneAndUpdate(
          {
            _id: tokenValid.user,
          },
          {
            $set: {
              seller: data._id,
              role: 'seller',
            },
          },
        );
        tokenValid.remove();
        return resolve({
          status: HttpStatus.CREATED,
          message: data.info.name + Message.seller_create_success,
          data: null,
        });
      } catch (error) {
        this.logger.error(error.toString());
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
