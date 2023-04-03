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
import { AdminService } from './admin.service';
import { UserLogoutDto } from './dto/admin.dto';

@Controller('api/v1/admin/')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('user/logout')
  async logout(@Body() { userId }: UserLogoutDto, @Res() res, @Req() req) {
    try {
      if (req.user.role !== 'admin') {
        res
          .status(HttpStatus.UNAUTHORIZED)
          .json(new HttpException('Bad request', HttpStatus.UNAUTHORIZED));
      }
      const payload = await this.adminService.logoutUser(userId);
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('user/all')
  async all(@Res() res, @Req() req) {
    try {
      if (req.user.role !== 'admin') {
        res
          .status(HttpStatus.UNAUTHORIZED)
          .json(new HttpException('Bad request', HttpStatus.UNAUTHORIZED));
      }
      const payload = await this.adminService.getAllUsers(req.query);
      return res.status(payload.status).json(payload);
    } catch (error) {
      console.log(error);
      return res.status(error.status).json(error);
    }
  }
}
