NestJS Backend Application
Описание
Это базовое приложение на NestJS, разработанное для демонстрации основных функций бэкенда, таких как аутентификация пользователей (регистрация и вход), управление пользователями и интеграция с базой данных MongoDB. Приложение построено с использованием современных практик и готово к развертыванию в Docker.

Особенности
Аутентификация пользователей: Регистрация и вход с использованием JWT (JSON Web Tokens).

Управление пользователями: Получение списка пользователей.

Валидация данных: Использование class-validator и ValidationPipe для строгой валидации входящих данных.

Mongoose: ORM для взаимодействия с MongoDB.

Конфигурация: Использование @nestjs/config для безопасного управления переменными окружения.

Локальная разработка с Docker Compose: Удобное развертывание приложения и базы данных MongoDB в контейнерах.

Тестирование: Юнит-тесты для сервисов и E2E-тесты для контроллеров и интеграции с БД.

Технологии
NestJS: Прогрессивный фреймворк Node.js для создания эффективных, надежных и масштабируемых серверных приложений.

TypeScript: Язык программирования, обеспечивающий строгую типизацию.

MongoDB: Документоориентированная база данных NoSQL.

Mongoose: Объектно-ориентированное моделирование данных (ODM) для MongoDB в Node.js.

bcrypt: Библиотека для хеширования паролей.

jsonwebtoken: Для работы с JWT.

Docker / Docker Compose: Для контейнеризации и оркестрации локальной среды разработки.

Jest: Фреймворк для тестирования.

Supertest: Для HTTP-тестирования в E2E-тестах.

Начало работы
Предварительные требования
Убедитесь, что у вас установлено следующее:

Node.js (версия 20.x или выше)

npm (обычно поставляется с Node.js) или Yarn

Docker и Docker Compose (для запуска в контейнерах)

MongoDB (если вы хотите запускать его локально без Docker Compose, но рекомендуется Docker Compose)

Установка
Клонируйте репозиторий:

git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ>
cd <ИМЯ_ВАШЕЙ_ПАПКИ_ПРОЕКТА>

Установите зависимости:

npm install
# или
yarn install

Создайте файл .env в корне проекта и добавьте необходимые переменные окружения.
Пример .env:

MONGO_DB_URL=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority
JWT_SECRET_KEY=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ_ДЛЯ_JWT

Замените <username>, <password>, <cluster-url>, <database-name> на данные вашего кластера MongoDB Atlas.

JWT_SECRET_KEY должен быть длинной, случайной строкой.

Запуск в режиме разработки (без Docker)
npm run start:dev
# или
yarn start:dev

Приложение будет доступно по адресу http://localhost:8080.

Запуск в продакшене (с Docker Compose)
Этот метод рекомендуется для локальной разработки, так как он запускает ваше приложение и локальную базу данных MongoDB в контейнерах.

Убедитесь, что Docker Desktop запущен.

Перейдите в корневую директорию проекта, где находится docker-compose.yml.

Запустите контейнеры:

docker-compose up --build -d

--build пересобирает образы, если есть изменения в коде или Dockerfile.

-d запускает контейнеры в фоновом режиме.

Приложение будет доступно по адресу http://localhost:8080.

Чтобы остановить контейнеры:

docker-compose down

API Эндпоинты
Базовый URL: http://localhost:8080

1. Регистрация пользователя
URL: /register

Метод: POST

Тело запроса (JSON):

{
  "email": "user@example.com",
  "password": "strongpassword123"
}

Успешный ответ (201 Created):

{
  "message": "Пользователь успешно зарегистрирован.",
  "user": {
    "_id": "60c72b2f9b1d8c001c8e4d3a",
    "email": "user@example.com"
  }
}

Ошибки:

400 Bad Request: Некорректные данные (например, неверный формат email, отсутствующий пароль).

409 Conflict: Пользователь с таким email уже зарегистрирован.

500 Internal Server Error: Непредвиденная ошибка сервера.

2. Вход пользователя
URL: /login

Метод: POST

Тело запроса (JSON):

{
  "email": "user@example.com",
  "password": "strongpassword123"
}

Успешный ответ (200 OK):

{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJzdWIiOiI2MGM3MmIyZjliMWQ4YzAwMWM4ZTRkM2EiLCJpYXQiOjE2NzgyNjU2MDAsImV4cCI6MTY3ODI2OTIwMH0...."
}

Ошибки:

401 Unauthorized: Неверные учетные данные (email или пароль).

400 Bad Request: Некорректные данные.

500 Internal Server Error: Непредвиденная ошибка сервера.

3. Получение всех пользователей (требуется аутентификация)
URL: /users

Метод: GET

Заголовки:

Authorization: Bearer <accessToken> (полученный после входа)

Успешный ответ (200 OK):

[
  {
    "_id": "60c72b2f9b1d8c001c8e4d3a",
    "email": "user1@example.com"
  },
  {
    "_id": "60c72b2f9b1d8c001c8e4d3b",
    "email": "user2@example.com"
  }
]

Ошибки:

401 Unauthorized: Отсутствует или недействительный токен.

500 Internal Server Error: Непредвиденная ошибка сервера.

Тестирование
Запуск всех тестов
npm run test
# или
yarn test

Юнит-тесты
Для запуска только юнит-тестов:

npm run test:unit
# или
yarn test:unit

E2E-тесты
E2E-тесты используют отдельную тестовую базу данных MongoDB. Убедитесь, что Docker запущен.

npm run test:e2e
# или
yarn test:e2e

Лицензия