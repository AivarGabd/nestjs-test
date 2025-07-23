import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let userModel: any;

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn(),
    };
    // Proper mock for mongoose model constructor
    function UserModelMock(this: any, data: any) {
      Object.assign(this, data);
      this.save = jest.fn().mockResolvedValue({
        _id: 'id',
        email: data.email,
        createdAt: data.createdAt,
        lastSignInAt: data.lastSignInAt,
      });
    }
    Object.assign(UserModelMock, userModel);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: UserModelMock,
        },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      userModel.findOne.mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpass');
      const result = await service.register({ email: 'a@a.com', password: '123456' });
      expect(result).toHaveProperty('email', 'a@a.com');
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('lastSignInAt');
    });

    it('should throw ConflictException if user exists', async () => {
      userModel.findOne.mockResolvedValue({ email: 'a@a.com' });
      await expect(service.register({ email: 'a@a.com', password: '123456' }))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login and return accessToken', async () => {
      const saveMock = jest.fn().mockResolvedValue(true);
      userModel.findOne.mockResolvedValue({ email: 'a@a.com', password: 'hashed', save: saveMock });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      jest.spyOn(jwt, 'sign').mockReturnValue('token');
      const result = await service.login({ email: 'a@a.com', password: '123456' });
      expect(result).toHaveProperty('accessToken', 'token');
      expect(saveMock).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userModel.findOne.mockResolvedValue(null);
      await expect(service.login({ email: 'a@a.com', password: '123456' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      userModel.findOne.mockResolvedValue({ email: 'a@a.com', password: 'hashed', save: jest.fn() });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
      await expect(service.login({ email: 'a@a.com', password: 'wrong' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });
}); 