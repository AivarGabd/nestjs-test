import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Auth & Users (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  it('POST /register - should register user', async () => {
    const res = await request(app.getHttpServer())
      .post('/register')
      .send({ email: 'testuser@example.com', password: 'password123' })
      .expect(201);

    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('email', 'testuser@example.com');
  });

  it('POST /login - should login and return JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/login')
      .send({ email: 'testuser@example.com', password: 'password123' })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    accessToken = res.body.accessToken;
  });

  it('GET /users - should return users array (with JWT)', async () => {
    const res = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((u: any) => u.email === 'testuser@example.com')).toBe(true);
  });

  afterAll(async () => {
    await app.close();
  });
});