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
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { validateObjectId } from 'src/utils/helpers.utils';
import { CreateProductDto } from '../dto/product.dto';
import { ProductService } from '../service/product.service';

@Controller('api/v1/product/')
export class ProductController {
  constructor(private productService: ProductService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('/add')
  async add(@Body() product: CreateProductDto, @Res() res, @Req() req) {
    console.log(req.user);
    if (req.user.role !== 'seller') {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json(new HttpException('Bad request', HttpStatus.UNAUTHORIZED));
    }
    if (!product.specs.length) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json(new HttpException('Bad request', HttpStatus.BAD_REQUEST));
    }

    if (!validateObjectId(product.category)) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json(new HttpException('Bad request', HttpStatus.BAD_REQUEST));
    }

    try {
      const payload = await this.productService.addProduct(
        product,
        req.user.userId,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @Get('/list')
  async all(@Req() req, @Res() res) {
    try {
      const payload = await this.productService.getProducts(req.query);
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
  async update(@Body() body: CreateProductDto, @Req() req, @Res() res) {
    const { slug } = req.query;
    const { userId, role } = req.user;
    if (role !== 'seller') {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json(new HttpException('Bad request', HttpStatus.UNAUTHORIZED));
    }
    try {
      const payload = await this.productService.updateProduct(
        body,
        slug,
        userId,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('delete/:id')
  async delete(@Param() id: string, @Req() req, @Res() res) {
    const { userId, role } = req.user;
    if (role !== 'seller') {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json(new HttpException('Bad request', HttpStatus.UNAUTHORIZED));
    }
    try {
      const payload = await this.productService.deleteProductById(id, userId);
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }
}
