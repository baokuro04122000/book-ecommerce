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
  Put,
} from '@nestjs/common';
import { ProfileService } from '../service/profile.service';
import { AuthGuard } from '@nestjs/passport';
import { UpdateUserDto } from '../dto/user.dto';

@Controller('api/v1')
export class ProfileController {
  constructor(private usersService: ProfileService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('/user/profile')
  async getProfile(@Req() req, @Res() res) {
    try {
      const payload = await this.usersService.getProfile(
        req.user.userId as string,
      );
      return res.status(payload.status).json(payload);
    } catch (error: any) {
      return res.status(error.status).json(error);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('/user/profile')
  async updateProfile(@Req() req, @Res() res, @Body() body: any) {
    try {
      const { avatar, gender, name, birthDate } = req.body;
      const payload = await this.usersService.updateProfile({
        userId: req.user.userId,
        avatar,
        gender,
        name,
        birthDay: birthDate,
      });
      return res.status(payload.status).json(payload);
    } catch (error: any) {
      return res.status(error.status).json(error);
    }
  }
}
