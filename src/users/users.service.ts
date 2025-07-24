import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { User, UserDocument } from './schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async register(registerDto: RegisterDto): Promise<UserDocument> {
    const { email, password } = registerDto;

    try {
      const existingUser = await this.userModel.findOne({ email }).exec();
      if (existingUser) {
        throw new ConflictException(
          'Пользователь с таким email уже зарегистрирован.',
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const now = new Date();

      const newUser = new this.userModel({
        email,
        password: hashedPassword,
        createdAt: now,
        lastSignInAt: now,
      });
      return await newUser.save();
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      console.error('Ошибка при регистрации пользователя:', error);
      throw new InternalServerErrorException(
        'Произошла непредвиденная ошибка при регистрации.',
      );
    }
  }

  async login(loginUserDto: LoginUserDto): Promise<{ accessToken: string }> {
    const { email, password } = loginUserDto;

    try {
      const user = await this.userModel.findOne({ email }).exec();
      if (!user) {
        throw new UnauthorizedException(
          'Неверные учетные данные (email или пароль).',
        );
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException(
          'Неверные учетные данные (email или пароль).',
        );
      }

      user.lastSignInAt = new Date();
      await user.save();

      const payload = { email: user.email, sub: user._id };
      const accessToken = jwt.sign(payload, process.env.JWT_SECRET_KEY, {
        expiresIn: '1h',
      });

      return { accessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.log(error);
      console.error('Ошибка при входе пользователя:', error);
      throw new InternalServerErrorException(
        'Произошла непредвиденная ошибка при входе.',
      );
    }
  }

  async findAll(): Promise<UserDocument[]> {
    try {
      return await this.userModel.find().exec();
    } catch (error) {
      console.error('Ошибка при получении всех пользователей:', error);
      throw new InternalServerErrorException(
        'Не удалось получить список пользователей.',
      );
    }
  }
}
