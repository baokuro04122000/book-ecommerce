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
import { OrderService } from '../service/order.service';

@Controller('api/v1/order/')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('/add')
  async add(@Body() order: any, @Res() res, @Req() req) {
    try {
      return res.json('hello');
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }
}
