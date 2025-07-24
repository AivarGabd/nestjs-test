Хостинг backend приложения:
```bash
https://optimistic-illumination-production.up.railway.app
```
Дефолтный порт: 8080, запуск Docker

## Compile and run the project
```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit testsw
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

----


## User schema:
```bash
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  lastSignInAt: Date;
}
```
---

## /register:

Валидация вводимых данных:
```bash
import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail({}, { message: 'Некорректный формат email.' })
  @IsNotEmpty({ message: 'Email не может быть пустым.' })
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password', minLength: 6 })
  @IsString({ message: 'Пароль должен быть строкой.' })
  @IsNotEmpty({ message: 'Пароль не может быть пустым.' })
  @MinLength(6, { message: 'Пароль должен содержать не менее 6 символов.' })
  password: string;
}

```
---

## /login:

Валидация вводимых данных:
```bash
export class LoginUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail({}, { message: 'Некорректный формат email.' })
  email: string;
  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString({ message: 'Пароль должен быть строкой.' })
  password: string;
}
```

На удачный логин возращается Bearer accessToken который действительный только час:
```bash
const accessToken = jwt.sign(payload, process.env.JWT_SECRET_KEY, {
    expiresIn: '1h',
});
```
---
## /users:

Получение всех пользователей только после успешного логина и Header Authorization Bearer
```bash
class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader) throw new UnauthorizedException('No Authorization header');
    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token)
      throw new UnauthorizedException('Invalid Authorization header');
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET_KEY);
      request.user = payload;
      return true;
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
```
