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
  HttpException,
  HttpStatus,
  Delete,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CartService } from '../service/cart.service';

@Controller('api/v1/cart/')
export class CartController {
  constructor(private cartService: CartService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('/add')
  async add(@Body() cart: any, @Res() res, @Req() req) {
    try {
      const payload = await this.cartService.addToCart(req.user.userId, cart);
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/get')
  async get(@Body() cart: any, @Res() res, @Req() req) {
    try {
      const payload = await this.cartService.getCartItems(req.user.userId);
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('/delete/:productId/variant/:variantId')
  async delete(@Param() params: any, @Res() res, @Req() req) {
    try {
      const payload = await this.cartService.removeCartItem(
        req.user.userId,
        params,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('/delete-all')
  async deleteAll(@Res() res, @Req() req) {
    try {
      const payload = await this.cartService.deleteCartByUser(req.user.userId);
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }
}
