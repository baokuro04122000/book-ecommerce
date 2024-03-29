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
  Query,
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
        req.user.sellerId,
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
  async detail(@Param('slug') slug: string, @Res() res) {
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

  @Get('/category/search')
  async getAllByCategoryName(@Req() req, @Res() res) {
    try {
      const payload = await this.productService.getProductByCategoryName(
        req.query,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @Get('/search/:keyword')
  async search(@Param('keyword') keyword: string, @Res() res) {
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
    const { sellerId, role } = req.user;
    if (role !== 'seller') {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json(new HttpException('Bad request', HttpStatus.UNAUTHORIZED));
    }
    try {
      const payload = await this.productService.updateProduct(
        body,
        slug,
        sellerId,
      );
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('delete/:id')
  async delete(@Param('id') id: string, @Req() req, @Res() res) {
    const { sellerId, role } = req.user;
    if (role !== 'seller') {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json(new HttpException('Bad request', HttpStatus.UNAUTHORIZED));
    }
    try {
      const payload = await this.productService.deleteProductById(id, sellerId);
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @Get('best-selling/get')
  async getBestSelling(@Req() req, @Res() res) {
    try {
      const payload = await this.productService.bestSelling();
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @Get('featured/get')
  async getFeaturedProduct(@Req() req, @Res() res) {
    try {
      const payload = await this.productService.featureProduct();
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @Get('new-release/get')
  async newReleaseProduct(@Query() query, @Res() res) {
    try {
      const payload = await this.productService.newReleaseProduct(query);
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @Get('related-product/get')
  async relatedProducts(@Query('categoryId') query, @Res() res) {
    try {
      const payload = await this.productService.relatedProducts(query);
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @Get('author/get')
  async productsByAuthor(@Query() query, @Res() res) {
    try {
      const payload = await this.productService.getProductsByAuthor(query);
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }

  @Get('migration/type')
  async migrationType(@Query() query, @Res() res) {
    try {
      const payload = await this.productService.updateTypeMigration();
      return res.status(payload.status).json(payload);
    } catch (error) {
      return res.status(error.status).json(error);
    }
  }
}
