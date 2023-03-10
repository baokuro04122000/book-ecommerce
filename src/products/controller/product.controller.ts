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
import { AuthGuard } from '@nestjs/passport';
import { CreateProductDto } from '../dto/product.dto';
import { ProductService } from '../service/product.service';

@Controller('api/v1/product/')
export class ProductController {
  constructor(private productService: ProductService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('/add')
  async add(@Body() product: CreateProductDto, @Res() res) {
    try {
      return res.json('hello world');
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }
}
