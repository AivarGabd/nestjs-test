import { IsEmail, IsString } from 'class-validator';

export class LoginUserDto {
  @IsEmail({}, { message: 'Некорректный формат email.' })
  email: string;

  @IsString({ message: 'Пароль должен быть строкой.' })
  password: string;
}