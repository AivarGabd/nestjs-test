import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module'; // Ваш основной модуль приложения
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose'; // Импортируем MongooseModule и getConnectionToken
import { Connection } from 'mongoose'; // Импортируем Connection из mongoose
import { ConfigService } from '@nestjs/config';

describe('Auth & Users (e2e)', () => {
  let app: INestApplication;
  let connection: Connection; // Для доступа к подключению к БД
  let accessToken: string; // Для последующих тестов аутентификации

  beforeAll(async () => {
    // Создаем мок ConfigService
    const mockConfigService = {
      get: jest.fn((key: string) => {
        return 'mongodb+srv://aivargabd:G2nWbt7wkNoW8wse@test.tkugk7g.mongodb.net/users-testing?retryWrites=true&w=majority';
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule], // Импортируем основной модуль приложения
    })
      .overrideProvider(ConfigService) // Переопределяем реальный ConfigService
      .useValue(mockConfigService) // Используем наш мок ConfigService
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    connection = moduleFixture.get<Connection>(getConnectionToken());
  });
  // Очищаем базу данных перед каждым тестом
  // beforeEach(async () => {
  //   if (connection && connection.db) {
  //     await connection.db.dropDatabase();
  //   }
  // });

  it('POST /register - should register user successfully', async () => {
    const email = `${crypto.randomUUID()}@example.com`;
    const password = 'password123';

    const res = await request(app.getHttpServer())
      .post('/register')
      .send({ email, password })
      .expect(HttpStatus.CREATED); // Ожидаем 201

    expect(res.body).toHaveProperty(
      'message',
      'Пользователь успешно зарегистрирован.',
    );
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('_id');
    expect(res.body.user).toHaveProperty('email', email);
    expect(res.body.user).not.toHaveProperty('password'); // Пароль не должен возвращаться
  });

  it('POST /register - should return 409 CONFLICT if user already exists', async () => {
    const email = 'existing@example.com';
    const password = 'password123';

    // Сначала регистрируем пользователя
    await request(app.getHttpServer())
      .post('/register')
      .send({ email, password })
      .expect(HttpStatus.CREATED);

    // Пытаемся зарегистрировать его снова
    const res = await request(app.getHttpServer())
      .post('/register')
      .send({ email, password })
      .expect(HttpStatus.CONFLICT); // Ожидаем 409

    expect(res.body).toHaveProperty('statusCode', HttpStatus.CONFLICT);
    expect(res.body).toHaveProperty('message', 'Пользователь с таким email уже зарегистрирован.');
  });

  it('POST /register - should return 400 BAD REQUEST for invalid email format', async () => {
    const res = await request(app.getHttpServer())
      .post('/register')
      .send({ email: 'invalid-email', password: 'password123' })
      .expect(HttpStatus.BAD_REQUEST);

    expect(res.body).toHaveProperty('statusCode', HttpStatus.BAD_REQUEST);
    expect(res.body.message).toContain('Некорректный формат email.');
  });

  it('POST /register - should return 400 BAD REQUEST for missing password', async () => {
    const res = await request(app.getHttpServer())
      .post('/register')
      .send({ email: 'test@example.com' })
      .expect(HttpStatus.BAD_REQUEST);

    expect(res.body).toHaveProperty('statusCode', HttpStatus.BAD_REQUEST);
    expect(res.body.message).toContain('Пароль не может быть пустым.');
  });

  // Раскомментируйте и используйте, когда у вас есть логин и users эндпоинты
  it('POST /login - should login and return JWT', async () => {
    const email = 'loginuser@example.com';
    const password = 'loginpassword123';

    // Сначала регистрируем пользователя для входа
    await request(app.getHttpServer())
      .post('/register')
      .send({ email, password })
      .expect(HttpStatus.CREATED);

    const res = await request(app.getHttpServer())
      .post('/login')
      .send({ email, password })
      .expect(HttpStatus.CREATED); // Или 200 OK, в зависимости от вашей реализации

    expect(res.body).toHaveProperty('accessToken');
    accessToken = res.body.accessToken;
  });

  it('GET /users - should return users array (with JWT)', async () => {
    // Убедитесь, что accessToken получен из предыдущего теста логина или зарегистрируйте пользователя здесь
    if (!accessToken) {
        // Если логин тест не запускался или провалился, зарегистрируем пользователя для этого теста
        await request(app.getHttpServer())
            .post('/register')
            .send({ email: 'anotheruser@example.com', password: 'anotherpassword' })
            .expect(HttpStatus.CREATED);
        const loginRes = await request(app.getHttpServer())
            .post('/login')
            .send({ email: 'anotheruser@example.com', password: 'anotherpassword' })
            .expect(HttpStatus.CREATED);
        accessToken = loginRes.body.accessToken;
    }

    const res = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(HttpStatus.OK); // Ожидаем 200

    expect(Array.isArray(res.body)).toBe(true);
    // Проверяем, что есть хотя бы один пользователь (тот, что зарегистрировали)
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body.some((u: any) => u.email === 'testuser@example.com' || u.email === 'loginuser@example.com' || u.email === 'anotheruser@example.com')).toBe(true);
  });

  afterAll(async () => {
    await connection.dropDatabase(); // Очистить БД после всех тестов
    await app.close();
  });
});
