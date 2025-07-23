import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './users/schemas/user.schema';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  @Get()
  async getAllUsers() {
    return this.userModel.find().exec();
  }
}
