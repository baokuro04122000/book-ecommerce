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
      return res.json('hello');
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }
}
