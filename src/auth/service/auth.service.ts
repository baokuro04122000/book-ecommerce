import { Injectable, HttpStatus, Inject, Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { Redis } from 'ioredis';
import axios from 'axios';
import { CreateUserDto, UserLoginDto, CreateSellerDto } from '../dto/user.dto';
import { TokenDto, ResetPasswordDto, LogoutDto } from '../dto/auth.dto';
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
        if (account.role === 'seller') {
          return resolve({
            status: HttpStatus.OK,
            message: 'OK',
            data: {
              ...payload,
              seller: account.seller,
              accessToken,
              refreshToken,
            },
          });
        }
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
        const token = await this.jwt.sign(
          { userId },
          {
            secret: process.env.IMAGE_TOKEN_SECRET || 'upload-image',
            expiresIn: '1d',
          },
        );

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
            verifyToken: encodeURIComponent(createToken.generatedToken),
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
        if (nameExisted) {
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
          message: data.info.name + ' ' + Message.seller_create_success,
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

  getGoogleUser(access_token: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const { data } = await axios.get(
          `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${access_token}`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              Accept: 'application/json',
            },
          },
        );
        return resolve(data);
      } catch (error) {
        this.logger.error(error.response.data.error);
        return reject(
          errorResponse({ status: 500, message: error.response.data.error }),
        );
      }
    });
  }

  googleLogin(googleUser: any): Promise<INotifyResponse<UserLoginPayload>> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!googleUser.verified_email) {
          return reject({
            status: 203,
            errors: {
              message: Message.account_inactive,
            },
          });
        }
        const accountExisted = await this.userModel.findOne({
          $or: [
            { 'google.uid': googleUser.id },
            { 'local.email': googleUser.email },
          ],
        });

        //account not exists
        if (!accountExisted) {
          const createUser = new this.userModel({
            google: {
              uid: googleUser.id,
              email: googleUser.email,
              picture: googleUser.picture,
              name: googleUser.name,
            },
          });
          const created = await createUser.save();
          const payload = {
            userId: created._id,
            email: created.google.email,
            name: created.google.name,
            avatar: created.google.picture,
            gender: 'male',
            role: created.role,
            meta: created.meta,
            typeLogin: 'google',
          };
          try {
            const accessToken = await this.generateToken(
              {
                userId: created._id,
                role: created.role,
              },
              process.env.TOKEN_SECRET || 'dinhbao',
              process.env.TTL_TOKEN_SECRET || '1h',
            );
            const refreshToken = await this.generateToken(
              {
                userId: created._id,
              },
              process.env.REFRESH_TOKEN || 'dinhbaorefresh',
              process.env.TTL_REFRESH_TOKEN || '7d',
            );
            const setAccess = this.setRedis(
              accessToken,
              created._id,
              Number(process.env.TTL_REDIS_ACCESS_TOKEN || 3600),
            );

            const setRefresh = this.setRedis(
              refreshToken,
              created._id,
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
            this.logger.error(error);
            return reject(
              errorResponse({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: Message.internal_server_error,
              }),
            );
          }
        }

        //account is existed
        if (accountExisted.status === 'blocked') {
          return reject(
            errorResponse({
              status: HttpStatus.FORBIDDEN,
              message: Message.account_locked,
            }),
          );
        }
        const updatedAccount = await this.userModel.findOneAndUpdate(
          {
            $or: [
              { 'google.uid': googleUser.id },
              { 'local.email': googleUser.email },
            ],
          },
          {
            $set: {
              'google.uid': googleUser.id,
              'google.email': googleUser.email,
              'google.picture': googleUser.picture,
              'google.name': googleUser.name,
            },
          },
          {
            upsert: true,
            new: true,
          },
        );

        if (updatedAccount.role === 'user') {
          const payload = {
            userId: updatedAccount._id,
            email: googleUser.email,
            name: googleUser.name,
            gender: 'male',
            avatar: googleUser.picture,
            role: updatedAccount.role,
            meta: updatedAccount.meta,
            typeLogin: 'google',
          };
          try {
            const accessToken = await this.generateToken(
              {
                userId: updatedAccount._id,
                role: updatedAccount.role,
              },
              process.env.TOKEN_SECRET || 'dinhbao',
              process.env.TTL_TOKEN_SECRET || '1h',
            );
            const refreshToken = await this.generateToken(
              {
                userId: updatedAccount._id,
              },
              process.env.REFRESH_TOKEN || 'dinhbaorefresh',
              process.env.TTL_REFRESH_TOKEN || '7d',
            );
            const setAccess = this.setRedis(
              accessToken,
              updatedAccount._id,
              Number(process.env.TTL_REDIS_ACCESS_TOKEN || 3600),
            );

            const setRefresh = this.setRedis(
              refreshToken,
              updatedAccount._id,
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
            this.logger.error(error);
            return reject(
              errorResponse({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: Message.internal_server_error,
              }),
            );
          }
        }
        const payload = {
          _id: updatedAccount._id,
          email: googleUser.email,
          name: googleUser.name,
          gender: 'male',
          avatar: googleUser.picture,
          role: updatedAccount.role,
          meta: updatedAccount.meta,
          seller: updatedAccount.seller,
          typeLogin: 'google',
        };
        const accessToken = await this.generateToken(
          {
            userId: updatedAccount._id,
            role: updatedAccount.role,
          },
          process.env.TOKEN_SECRET || 'dinhbao',
          process.env.TTL_TOKEN_SECRET || '1h',
        );
        const refreshToken = await this.generateToken(
          {
            userId: updatedAccount._id,
          },
          process.env.REFRESH_TOKEN || 'dinhbaorefresh',
          process.env.TTL_REFRESH_TOKEN || '7d',
        );
        const setAccess = this.setRedis(
          accessToken,
          updatedAccount._id,
          Number(process.env.TTL_REDIS_ACCESS_TOKEN || 3600),
        );

        const setRefresh = this.setRedis(
          refreshToken,
          updatedAccount._id,
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

  sendEmailResetPassword(email: string): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      try {
        const getUser = await this.userModel
          .findOne({
            'local.email': email,
          })
          .lean();
        if (!getUser) {
          return reject({
            status: 400,
            errors: {
              message: Message.email_not_exists,
            },
          });
        }
        if (!getUser.local.verified) {
          return reject(
            errorResponse({
              status: HttpStatus.FOUND,
              message: Message.account_inactive,
            }),
          );
        }
        const token = uuidv4();

        (await this.tokenModel.find({ user: getUser._id })).map((value) =>
          value.remove(),
        );
        await new this.tokenModel({
          user: getUser._id,
          generatedToken: token,
        }).save();
        this.redisClient.publish(
          'send_email_reset_password',
          JSON.stringify({
            email: email,
            token: token,
            name: getUser.info.name,
          }),
        );

        return resolve({
          status: HttpStatus.OK,
          message: Message.send_mail_reset_success,
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

  resetPassword({
    password,
    token,
  }: ResetPasswordDto): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      try {
        const existed = await this.tokenModel.findOne({
          generatedToken: token,
        });
        if (!existed) {
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: Message.token_invalid,
            }),
          );
        }
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);
        await this.userModel.updateOne(
          {
            _id: existed.user,
          },
          {
            $set: {
              'local.password': hashPassword,
            },
          },
        );
        existed.remove();
        return resolve({
          status: HttpStatus.OK,
          message: Message.reset_password_success,
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

  refreshToken(token: string): Promise<INotifyResponse<UserLoginPayload>> {
    return new Promise(async (resolve, reject) => {
      try {
        const encode = await this.jwt.verify(token, {
          secret: process.env.REFRESH_TOKEN || 'dinhbaorefresh',
        });
        if (!encode) {
          this.logger.error('bad user!!');
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: Message.token_invalid,
            }),
          );
        }
        //check token redis match or not
        await this.checkTokenRedis(encode);
        const account = await this.userModel
          .findOne({
            _id: encode.userId,
          })
          .populate('seller')
          .lean();
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
        if (account.role === 'seller') {
          return resolve({
            status: HttpStatus.OK,
            message: 'OK',
            data: {
              ...payload,
              seller: account.seller,
              accessToken,
              refreshToken,
            },
          });
        }
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
        this.logger.error(error);
        return reject(
          errorResponse({
            status: HttpStatus.BAD_REQUEST,
            message: Message.token_invalid,
          }),
        );
      }
    });
  }

  logout({
    accessToken,
    refreshToken,
  }: LogoutDto): Promise<INotifyResponse<null>> {
    return new Promise(async (resolve, reject) => {
      try {
        const clearTokenRedis = await this.redisClient.del(
          accessToken,
          refreshToken,
        );
        console.log(clearTokenRedis);
        return resolve({
          status: HttpStatus.OK,
          message: 'OK',
          data: null,
        });
      } catch (error) {
        this.logger.error(error);
        return reject(
          errorResponse({
            status: HttpStatus.BAD_REQUEST,
            message: Message.token_invalid,
          }),
        );
      }
    });
  }
}
