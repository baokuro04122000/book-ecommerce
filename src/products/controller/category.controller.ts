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
import { CreateCategoryDto } from '../dto/category.dto';
import { CategoryService } from '../service/category.service';

@Controller('api/v1/category/')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('/add')
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
}
