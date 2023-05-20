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
import filter from 'validator';
import { Response } from 'express';
import { AuthService } from '../service/auth.service';
import { CreateUserDto, UserLoginDto, CreateSellerDto } from '../dto/user.dto';
import {
  TokenDto,
  EmailResetPasswordDto,
  ResetPasswordDto,
  GoogleLoginDto,
  LogoutDto,
  SignUpUserDto,
} from '../dto/auth.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/v1/auth/')
export class AuthController {
  constructor(private usersService: AuthService) {}

  @Post('signup')
  async signup(@Body() user: CreateUserDto, @Res() res: Response) {
    try {
      const payload = await this.usersService.signup({
        ...user,
        email: filter.escape(user.email),
        name: filter.escape(user.name),
        gender: filter.escape(user.gender),
      });
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
        return res.status(401).json(new UnauthorizedException());
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
  async checkToken(@Query() query, @Res() res) {
    const { token } = query;
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
      const payload = await this.usersService.sellerRegister({
        ...seller,
        name: filter.escape(seller.name),
        slogan: filter.escape(seller.slogan),
        facebook: seller.facebook
          ? filter.escape(seller.facebook)
          : seller.facebook,
        instagram: seller.instagram
          ? filter.escape(seller.instagram)
          : seller.instagram,
        linkedin: seller.linkedin
          ? filter.escape(seller.linkedin)
          : seller.linkedin,
        youtube: seller.youtube
          ? filter.escape(seller.youtube)
          : seller.youtube,
      });
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @Post('/password/email')
  async emailResetPassword(@Body() body: EmailResetPasswordDto, @Res() res) {
    const { email } = body;
    try {
      const payload = await this.usersService.sendEmailResetPassword(email);
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @Post('/password/reset')
  async resetPassword(@Body() body: ResetPasswordDto, @Res() res) {
    try {
      const payload = await this.usersService.resetPassword(body);
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @Post('/login/refresh')
  async relogin(@Body() body: TokenDto, @Req() req, @Res() res) {
    try {
      const { token } = body;
      console.log('token', token);
      const payload = await this.usersService.refreshToken(token);
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @Post('/oauth/google')
  async googleLogin(@Body() body: GoogleLoginDto, @Res() res) {
    try {
      console.log(body);
      const { accessToken } = body;
      const googleUser = await this.usersService.getGoogleUser(accessToken);
      const payload = await this.usersService.googleLogin(googleUser);
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/logout')
  async logout(@Req() req, @Res() res) {
    try {
      const payload = await this.usersService.logoutUser(
        req.user.userId as string,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }
}
