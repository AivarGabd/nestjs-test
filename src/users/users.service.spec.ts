import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import {
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('UsersService', () => {
  let service: UsersService;
  let userModel: Model<UserDocument>;

  // Мок для экземпляра Mongoose Document, который будет создаваться при вызове `new userModel()`
  const mockUserDocument = {
    email: 'test@example.com',
    password: 'hashedPassword',
    _id: 'mockId',
    createdAt: new Date(), // Добавляем поле createdAt
    lastSignInAt: new Date(), // Добавляем поле lastSignInAt
    save: jest.fn(),
    toObject: jest.fn().mockReturnValue({
      email: 'test@example.com',
      _id: 'mockId',
      createdAt: new Date(), // Возвращаем дату в toObject
      lastSignInAt: new Date(), // Возвращаем дату в toObject
    }),
  };

  // Мок для Mongoose Model (конструктора), который будет инжектирован
  const mockMongooseModel = jest.fn(() => mockUserDocument) as any;

  // Имитируем, что findOne возвращает объект с методом exec
  mockMongooseModel.findOne = jest.fn((query?: any) => ({
    exec: jest.fn().mockResolvedValue(null), // По умолчанию findOne.exec() ничего не находит
  }));

  // Имитируем, что find возвращает объект с методом exec
  mockMongooseModel.find = jest.fn((query?: any) => ({
    exec: jest.fn().mockResolvedValue([]), // По умолчанию find.exec() возвращает пустой массив
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockMongooseModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));

    jest.clearAllMocks(); // Сброс моков перед каждым тестом
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'register@example.com',
      password: 'password123',
    };
    const hashedPassword = 'hashedPassword123';
    // Мок для успешно созданного и сохраненного пользователя
    const mockCreatedUserDoc = {
      email: registerDto.email,
      password: hashedPassword,
      _id: 'newUserId',
      createdAt: new Date(), // Добавляем поле createdAt
      lastSignInAt: new Date(), // Добавляем поле lastSignInAt
      toObject: jest.fn().mockReturnValue({
        email: registerDto.email,
        _id: 'newUserId',
        createdAt: new Date(), // Возвращаем дату в toObject
        lastSignInAt: new Date(), // Возвращаем дату в toObject
      }),
    };

    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      mockMongooseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null), // По умолчанию findOne.exec() ничего не находит
      });

      // Мокаем метод save на экземпляре документа, который будет создан
      mockUserDocument.save.mockResolvedValue(mockCreatedUserDoc);

      // Убедимся, что конструктор модели возвращает объект с моковым методом save
      mockMongooseModel.mockImplementation(() => mockUserDocument);
    });

    // Сценарий 1: Успешная регистрация
    it('should successfully register a new user', async () => {
      const result = await service.register(registerDto);

      expect(mockMongooseModel.findOne).toHaveBeenCalledWith({
        email: registerDto.email,
      });
      expect(mockMongooseModel.findOne().exec).toHaveBeenCalled(); // Проверяем вызов exec()
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);

      // Проверяем аргументы, переданные конструктору
      expect(mockMongooseModel).toHaveBeenCalledTimes(1);
      expect(mockMongooseModel.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          email: registerDto.email,
          password: hashedPassword,
          // createdAt и lastSignInAt будут автоматически добавлены Mongoose,
          // поэтому мы не проверяем их здесь напрямую, но они будут в result.toObject()
        }),
      );

      expect(mockUserDocument.save).toHaveBeenCalled(); // Проверяем, что метод save был вызван на экземпляре

      // Проверяем возвращаемый объект, включая новые поля даты
      expect(result.toObject()).toEqual(
        expect.objectContaining({
          email: registerDto.email,
          _id: 'newUserId',
          createdAt: expect.any(Date), // Проверяем, что это объект Date
          lastSignInAt: expect.any(Date), // Проверяем, что это объект Date
        }),
      );
      expect(result.password).toBe(hashedPassword);
    });

    // Сценарий 2: Попытка зарегистрировать существующего пользователя
    it('should throw ConflictException if user already exists', async () => {
      // Имитируем, что findOne().exec() находит существующего пользователя
      mockMongooseModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUserDocument),
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Пользователь с таким email уже зарегистрирован.',
      );

      expect(mockMongooseModel.findOne).toHaveBeenCalledWith({
        email: registerDto.email,
      });
      expect(mockMongooseModel.findOne().exec).toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserDocument.save).not.toHaveBeenCalled();
    });

    // Сценарий 3: Непредвиденная ошибка при сохранении в БД
    it('should throw InternalServerErrorException on database save error', async () => {
      // Имитируем ошибку при сохранении документа
      mockUserDocument.save.mockRejectedValue(
        new Error('DB connection failed'),
      );

      await expect(service.register(registerDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Произошла непредвиденная ошибка при регистрации.',
      );

      expect(mockMongooseModel.findOne).toHaveBeenCalledWith({
        email: registerDto.email,
      });
      expect(mockMongooseModel.findOne().exec).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(mockUserDocument.save).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginUserDto = { email: 'test@example.com', password: 'password123' };
    const hashedPassword = 'hashedPassword123';
    const mockUserFoundDocument = {
      // Переименовал для ясности
      email: loginUserDto.email,
      password: hashedPassword,
      _id: 'someId',
      createdAt: new Date(), // Старая дата для проверки обновления
      lastSignInAt: new Date(), // Старая дата для проверки обновления
      save: jest.fn(), // Добавляем save для этого мок-объекта
      toObject: jest.fn().mockImplementation(function () {
        return { ...this };
      }), // toObject для этого мока
    };

    const mockAccessToken = 'mockAccessToken';

    beforeEach(() => {
      // Сбрасываем моки для save и toObject на mockUserFoundDocument
      mockUserFoundDocument.save.mockClear();
      mockUserFoundDocument.toObject.mockClear();
      // Важно: Сбрасываем lastSignInAt к исходному значению для каждого теста
      mockUserFoundDocument.lastSignInAt = new Date('2023-01-01T00:00:00.000Z');

      // Мокаем, что findOne().exec() находит пользователя
      mockMongooseModel.findOne().exec.mockResolvedValue(mockUserFoundDocument);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue(mockAccessToken);

      // Implement the mock save method: it should update lastSignInAt on the *mockUserFoundDocument* itself
      // and return the updated document.
      mockUserFoundDocument.save.mockImplementation(async function () {
        // Simulate the service's behavior: update lastSignInAt
        this.lastSignInAt = new Date(); // Assign a real Date object
        return this; // Return the updated document
      });
    });

    // Сценарий 1: Успешный вход
    it('should successfully log in a user, update lastSignInAt, and return an access token', async () => {
      const initialLastSignInAt = mockUserFoundDocument.lastSignInAt; // Запоминаем начальную дату

      const result = await service.login(loginUserDto);

      expect(mockMongooseModel.findOne).toHaveBeenCalledWith({
        email: loginUserDto.email,
      });
      expect(mockMongooseModel.findOne().exec).toHaveBeenCalled();
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginUserDto.password,
        hashedPassword,
      );

      // Проверяем, что lastSignInAt был обновлен и save() был вызван
      expect(mockUserFoundDocument.lastSignInAt).toBeInstanceOf(Date); // Убедимся, что это объект Date
      expect(mockUserFoundDocument.lastSignInAt.getTime()).toBeGreaterThan(
        initialLastSignInAt.getTime(),
      ); // Убедимся, что это более новая дата
      expect(mockUserFoundDocument.save).toHaveBeenCalledTimes(1); // Убедимся, что save был вызван

      expect(jwt.sign).toHaveBeenCalledWith(
        { email: mockUserFoundDocument.email, sub: mockUserFoundDocument._id }, // Используем mockUserFoundDocument здесь
        process.env.JWT_SECRET_KEY,
        { expiresIn: '1h' },
      );
      expect(result).toEqual({ accessToken: mockAccessToken });
    });
    // Сценарий 2: Пользователь не найден
    it('should throw UnauthorizedException if user not found', async () => {
      mockMongooseModel.findOne().exec.mockResolvedValue(null);

      await expect(service.login(loginUserDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginUserDto)).rejects.toThrow(
        'Неверные учетные данные (email или пароль).',
      );
      expect(mockUserFoundDocument.save).not.toHaveBeenCalled(); // save не должен вызываться
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    // Сценарий 3: Неверный пароль
    it('should throw UnauthorizedException if password is incorrect', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginUserDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginUserDto)).rejects.toThrow(
        'Неверные учетные данные (email или пароль).',
      );
      expect(mockUserFoundDocument.save).not.toHaveBeenCalled(); // save не должен вызываться
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    // Сценарий 4: Непредвиденная ошибка при поиске пользователя
    it('should throw InternalServerErrorException on database find error', async () => {
      mockMongooseModel
        .findOne()
        .exec.mockRejectedValue(new Error('DB read error'));

      await expect(service.login(loginUserDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.login(loginUserDto)).rejects.toThrow(
        'Произошла непредвиденная ошибка при входе.',
      );
      expect(mockUserFoundDocument.save).not.toHaveBeenCalled(); // save не должен вызываться
    });
  });

  describe('findAll', () => {
    const mockUsersData = [
      { email: 'user1@example.com', password: 'hashed1', _id: 'id1' },
      { email: 'user2@example.com', password: 'hashed2', _id: 'id2' },
    ];

    let mockUserDocuments: UserDocument[];

    beforeEach(() => {
      mockUserDocuments = mockUsersData.map(
        (user) =>
          ({
            ...user,
            save: jest.fn(),
            toObject: jest.fn().mockReturnValue(user),
          }) as any as UserDocument,
      );

      mockMongooseModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUserDocuments),
      });
    });

    // Сценарий 1: Успешное получение списка пользователей
    it('should return an array of users', async () => {
      const result = await service.findAll();
      expect(mockMongooseModel.find).toHaveBeenCalled();
      expect(mockMongooseModel.find().exec).toHaveBeenCalled();

      expect(result).toEqual(mockUserDocuments);

      result.forEach((doc) => {
        expect(doc.toObject()).toEqual(
          expect.objectContaining({ email: doc.email }),
        );
      });
    });

    // Сценарий 2: Ошибка при получении пользователей
    it('should throw InternalServerErrorException on database find error', async () => {
      mockMongooseModel.find.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB find all error')),
      });

      await expect(service.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.findAll()).rejects.toThrow(
        'Не удалось получить список пользователей.',
      );
    });
  });
});
