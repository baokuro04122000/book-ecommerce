import {
  IsNotEmpty,
  IsEmail,
  Length,
  IsDateString,
  Matches,
  IsOptional,
  IsString,
  IsPhoneNumber,
} from 'class-validator';

import Message from '../../lang/en.lang';
export class CreateUserDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @Length(2, 30)
  name: string;

  @IsNotEmpty()
  @Length(3, 15)
  gender: string;

  @IsNotEmpty()
  @IsString()
  birthDay: string;

  @IsOptional()
  avatar?: string;

  @IsNotEmpty()
  @Matches(/^(?=.*[a-z])(?=.*\d)(?=.*[$@$!%*?&])[A-Za-z\d$@$!%*?&]{8,}$/, {
    message: Message.password_invalid,
  })
  password: string;
}

export class UpdateUserDto {
  @IsNotEmpty()
  @Matches(/^(0[1-9]|1[0-2])\/(0[1-9]|1\d|2[0-9]|3[0-1])\/(19|20)\d{2}$/)
  birthDate: string;

  @IsOptional()
  avatar?: string;

  @IsNotEmpty()
  @Length(3, 15)
  gender: string;

  @IsNotEmpty()
  @Length(2, 30)
  name: string;
}

export class UserLoginDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @Matches(/^(?=.*[a-z])(?=.*\d)(?=.*[$@$!%*?&])[A-Za-z\d$@$!%*?&]{8,}$/, {
    message: Message.password_invalid,
  })
  password: string;
}

export class CreateSellerDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @Length(2, 30)
  name: string;

  @IsNotEmpty()
  @IsPhoneNumber('VN')
  phone: string;

  @IsNotEmpty()
  address: Array<{
    location: string;
  }>;

  @IsNotEmpty()
  logo: string;

  @IsNotEmpty()
  slogan: string;

  @IsOptional()
  proof: Array<string>;

  @IsOptional()
  facebook: string;

  @IsOptional()
  instagram: string;

  @IsOptional()
  youtube: string;

  @IsOptional()
  linkedin: string;
}
