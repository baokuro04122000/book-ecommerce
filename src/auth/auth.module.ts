import { Module } from '@nestjs/common';
import { Connection } from 'mongoose';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './service/auth.service';
import { AuthController } from './controller/auth.controller';
import { jwtModule, redisModule } from '../module.config';
import { USER_MODEL, UserSchema } from './model/user.model';
import { TOKEN_MODEL, TokenSchema } from './model/token.model';
import { SELLER_MODEL, SellerSchema } from './model/seller.model';
import { JwtStrategy } from './jwt.strategy';
import {
  DATABASE_CONNECTION,
  DatabaseModule,
} from '../database/mongodb.module';
import { ProfileController } from './controller/profile.controller';
import { ProfileService } from './service/profile.service';

@Module({
  imports: [
    jwtModule,
    redisModule,
    PassportModule.register({
      defaultStrategy: 'jwt',
      property: 'user',
      session: false,
    }),
    DatabaseModule,
  ],
  providers: [
    AuthService,
    ProfileService,
    {
      provide: USER_MODEL,
      useFactory: (connect: Connection) => connect.model('users', UserSchema),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: TOKEN_MODEL,
      useFactory: (connect: Connection) => connect.model('tokens', TokenSchema),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: SELLER_MODEL,
      useFactory: (connect: Connection) =>
        connect.model('sellers', SellerSchema),
      inject: [DATABASE_CONNECTION],
    },
    JwtStrategy,
  ],
  controllers: [AuthController, ProfileController],
})
export class AuthModule {}
