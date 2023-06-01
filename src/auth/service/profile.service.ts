import { Injectable, HttpStatus, Inject, Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { Redis } from 'ioredis';
import axios from 'axios';
import { CreateUserDto, UserLoginDto, CreateSellerDto } from '../dto/user.dto';
import {
  TokenDto,
  ResetPasswordDto,
  LogoutDto,
  SignUpUserDto,
} from '../dto/auth.dto';
import { User, USER_MODEL } from '../model/user.model';
import { Token, TOKEN_MODEL } from '../model/token.model';
import { Seller, SELLER_MODEL } from '../model/seller.model';
import { errorResponse, handleRequest } from '../../utils/helpers.utils';
import { INotifyResponse } from '../../utils/generics.util';
import { IORedisKey } from '../../database/redis.module';
import { ITokenPayload, UserLoginPayload } from '../types/auth.type';
import Message from '../../lang/en.lang';

@Injectable()
export class ProfileService {
  private logger = new Logger('Auth service');
  constructor(
    @Inject(USER_MODEL) private readonly userModel: Model<User>,
    @Inject(TOKEN_MODEL) private readonly tokenModel: Model<Token>,
    @Inject(SELLER_MODEL) private readonly sellerModel: Model<Seller>,
    @Inject(IORedisKey) private readonly redisClient: Redis,
    private jwt: JwtService,
  ) {}

  getProfile(userId: string): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const user = await this.userModel
          .findOne({
            _id: userId,
          })
          .lean();

        if (!user) {
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: 'Bad accessing',
            }),
          );
        }
        return resolve({
          status: HttpStatus.OK,
          message: '',
          data: {
            info: user.info,
            email: user.local.email,
          },
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

  updateProfile(profile: any): Promise<INotifyResponse<any>> {
    return new Promise(async (resolve, reject) => {
      try {
        const user = await this.userModel
          .findOne({
            _id: profile.userId,
          })
          .lean();

        if (!user) {
          return reject(
            errorResponse({
              status: HttpStatus.BAD_REQUEST,
              message: 'Bad accessing',
            }),
          );
        }
        const updated = await this.userModel.findOneAndUpdate(
          {
            _id: profile.userId,
          },
          {
            $set: {
              'info.name': profile.name,
              'info.avatar':
                'https://cdn3.vectorstock.com/i/1000x1000/70/12/school-boy-avatar-vector-45067012.jpg',
              'info.birthDay': profile.birthDay,
              'info.gender': profile.gender,
            },
          },
          {
            new: true,
            upsert: true,
          },
        );
        if (!updated) {
          return reject(
            errorResponse({
              status: HttpStatus.INTERNAL_SERVER_ERROR,
              message: Message.internal_server_error,
            }),
          );
        }
        return resolve({
          status: HttpStatus.OK,
          message: 'Updated successfully',
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
}
