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
  Param,
  Put,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateCategoryDto } from '../dto/category.dto';
import { CategoryService } from '../service/category.service';

@Controller('api/v1')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('/category/add')
  async add(@Body() category: CreateCategoryDto, @Res() res, @Req() req) {
    try {
      if (req.user.role !== 'admin') {
        res
          .status(400)
          .json(new HttpException('Bad request', HttpStatus.BAD_REQUEST));
      }
      const payload = await this.categoryService.addCategory(category);
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('/category/edit')
  async edit(
    @Body() category: CreateCategoryDto,
    @Res() res,
    @Query('slug') slug: string,
    @Req() req,
  ) {
    try {
      if (req.user.role !== 'admin') {
        res
          .status(400)
          .json(new HttpException('Bad request', HttpStatus.BAD_REQUEST));
      }
      const payload = await this.categoryService.editCategory(category, slug);
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @Get('/category/all')
  async all(@Res() res, @Req() req) {
    try {
      const payload = await this.categoryService.getAllCategories();
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @Get('/category/all-amount')
  async allCategoriesWithProduct(@Res() res, @Req() req) {
    try {
      const payload =
        await this.categoryService.getAllCategoriesWithAmountProducts();
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @Get('/sellers')
  async getSellers(@Res() res, @Req() req) {
    try {
      const payload = await this.categoryService.getSellers();
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @Get('/sellers/top3')
  async getSellersTop3(@Res() res, @Req() req) {
    try {
      const payload = await this.categoryService.getSellersTop3();
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }
}
