import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UsersService } from './users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginUserDto } from './dto/login-user.dto';
import * as jwt from 'jsonwebtoken';
import {
  ApiBody,
  ApiTags,
  ApiResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

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

@Controller('users')
export class UsersController {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return this.userModel.find().exec();
  }
}

@ApiTags('Auth')
@Controller()
export class RegisterController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiBadRequestResponse({
    description: 'Email and password are required or invalid',
  })
  @ApiConflictResponse({ description: 'User with this email already exists' })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<{ message: string; user: Partial<User> }> {
    const userDocument = await this.usersService.register(registerDto); // Получаем UserDocument

    const { password, ...result } = userDocument.toObject();

    return {
      message: 'Пользователь успешно зарегистрирован.',
      user: result,
    };
  }

  @Post('login')
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({
    status: 201,
    description: 'User logged in successfully, returns JWT token',
  })
  @ApiBadRequestResponse({
    description: 'Email and password are required or invalid',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  async login(@Body() body: LoginUserDto) {
    return this.usersService.login(body);
  }
}
