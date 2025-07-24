# --- СТАДИЯ СБОРКИ (BUILD STAGE) ---
# Используем официальный образ Node.js в качестве базового для сборки
FROM node:20-alpine AS build

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# Копируем файлы package.json и package-lock.json (или yarn.lock)
# Это позволяет Docker кэшировать установку зависимостей
COPY package*.json ./

# Устанавливаем зависимости проекта
# --omit=dev исключает devDependencies, если вы хотите более легкий образ на этом этапе
RUN npm install

# Копируем остальной исходный код приложения
COPY . .

# Собираем TypeScript проект в JavaScript
# Убедитесь, что у вас есть команда `npm run build` в package.json
RUN npm run build

# --- ПРОДАКШН СТАДИЯ (PRODUCTION STAGE) ---
# Используем более легковесный образ Node.js для продакшена
FROM node:20-alpine AS production

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем только продакшн-зависимости из стадии сборки
# Это важно для безопасности и размера образа: мы не копируем devDependencies
COPY --from=build /app/node_modules ./node_modules

# Копируем скомпилированное приложение из стадии сборки
COPY --from=build /app/dist ./dist

# Копируем package.json для запуска приложения
# Это нужно, если ваш скрипт запуска использует информацию из package.json
# или если вы хотите установить production зависимости здесь (хотя мы их уже скопировали)
COPY package.json ./

# Устанавливаем переменные окружения для продакшена (если необходимо)
ENV NODE_ENV production

# Открываем порт, на котором будет работать ваше приложение (по умолчанию 3000 для NestJS)
EXPOSE 8080

# Команда для запуска приложения
# Убедитесь, что у вас есть команда `npm run start:prod` в package.json
# которая запускает скомпилированный код (например, `node dist/main`)
CMD ["npm", "run", "start:prod"]

# Пример команды start:prod в package.json:
# "scripts": {
#   "start:prod": "node dist/main"
# }
