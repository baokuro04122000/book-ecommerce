import { HttpException, HttpStatus } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './service/auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.TOKEN_SECRET || 'dinhbao',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const bearer = req.headers['authorization'];
    const token = bearer.slice(7, bearer.length);
    try {
      await this.authService.checkTokenRedis({
        token,
        key: `userId-accessToken-${payload.userId}-${payload.timeCreated}`,
      });
      return {
        userId: payload.userId,
        role: payload.role,
        sellerId: payload.sellerId,
        timeCreated: payload.timeCreated,
      };
    } catch (error) {
      console.log(error);
      throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
    }
  }
}
