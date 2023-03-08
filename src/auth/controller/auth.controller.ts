import 'reflect-metadata';
import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  Query,
  ValidationPipe,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from '../service/auth.service';
import { CreateUserDto, UserLoginDto, CreateSellerDto } from '../dto/user.dto';
import { TokenDto } from '../dto/auth.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/v1/auth/')
export class AuthController {
  constructor(private usersService: AuthService) {}

  @Post('signup')
  async signup(@Body() user: CreateUserDto, @Res() res: Response) {
    try {
      const payload = await this.usersService.signup(user);
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @Get('signup/active')
  async ative(
    @Query(
      new ValidationPipe({
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        forbidNonWhitelisted: true,
      }),
    )
    query: TokenDto,
    @Res() res: Response,
  ) {
    try {
      const { token } = query;
      const payload = await this.usersService.active({ token });
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @Post('/login')
  async login(@Body() user: UserLoginDto, @Res() res: Response) {
    try {
      const payload = await this.usersService.login(user);
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/seller/register')
  async requestRegister(@Req() req, @Res() res) {
    try {
      if (req.user.role !== 'user') {
        return new UnauthorizedException();
      }
      const payload = await this.usersService.sellerRegisterRequest(
        req.user.userId,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @Get('/token/check')
  async checkToken(@Query() token: string, @Res() res) {
    try {
      const payload = await this.usersService.checkTokenExists(token);
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @Post('/seller/create')
  async createSeller(@Body() seller: CreateSellerDto, @Res() res) {
    try {
      const payload = await this.usersService.sellerRegister(seller);
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }
}
