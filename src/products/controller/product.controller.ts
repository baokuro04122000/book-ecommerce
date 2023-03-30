import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Req,
  HttpStatus,
  HttpException,
  Get,
  Param,
  Put,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateProductDto } from '../dto/product.dto';
import { ProductService } from '../service/product.service';

@Controller('api/v1/product/')
export class ProductController {
  constructor(private productService: ProductService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('/add')
  async add(@Body() product: CreateProductDto, @Res() res, @Req() req) {
    if (req.user !== 'seller') {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json(new HttpException('Bad request', HttpStatus.BAD_REQUEST));
    }
    if (!product.specs.length) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json(new HttpException('Bad request', HttpStatus.BAD_REQUEST));
    }

    try {
      const payload = await this.productService.addProduct(product);
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @Get('/list')
  async all(@Req() req, @Res() res) {
    try {
      const payload = await this.productService.getProduct(req.query);
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @Get('/:slug')
  async detail(@Param() slug: string, @Res() res) {
    try {
      const payload = await this.productService.getProductBySlug(slug);
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @Get('/category')
  async list(@Req() req, @Res() res) {
    try {
      const payload = await this.productService.getProductsByCategorySlug(
        req.query,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @Get('/search/:keyword')
  async search(@Param() keyword: string, @Res() res) {
    try {
      const payload = await this.productService.searchFeature(keyword);
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('update')
  async update(@Body() body: CreateProductDto, @Req() Req, @Res() res) {
    return res.json('nothing');
  }
}
