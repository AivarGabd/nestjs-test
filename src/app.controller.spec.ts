import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController; // Объявляем переменную для экземпляра контроллера

  beforeEach(async () => {
    // Настройка тестового модуля перед каждым тестом
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController], // Указываем, какой контроллер тестируем
      providers: [AppService],    // Указываем, какие провайдеры (сервисы) нужны контроллеру
    }).compile();

    // Получаем экземпляр контроллера из тестового модуля
    appController = app.get<AppController>(AppController);
  });

  describe('root', () => { // Группа тестов для корневого пути
    it('should return an array of users', async () => {
      const result = await appController.getAllUsers();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});