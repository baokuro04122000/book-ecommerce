import { IsNotEmpty, IsString } from 'class-validator';

export class UserLogoutDto {
  @IsNotEmpty()
  @IsString()
  userId: string;
}

export class SetFeaturedProductDto {
  @IsNotEmpty()
  @IsString()
  productId: string;
}
