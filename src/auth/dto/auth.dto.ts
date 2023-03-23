import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';
import Message from '../../lang/en.lang';
export class TokenDto {
  @IsNotEmpty()
  @IsString()
  token: string;
}

export class GoogleLoginDto {
  @IsNotEmpty()
  @IsString()
  accessToken: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @Matches(/^(?=.*[a-z])(?=.*\d)(?=.*[$@$!%*?&])[A-Za-z\d$@$!%*?&]{8,}$/, {
    message: Message.password_invalid,
  })
  password: string;
}

export class EmailResetPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class LogoutDto {
  @IsNotEmpty()
  @IsString()
  accessToken: string;

  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
