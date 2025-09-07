# Chat Clone - Минимальный клон Chat2Desk

Минимальный MVP клона Chat2Desk с поддержкой Telegram.

## Возможности

- Получение сообщений из Telegram
- Веб-интерфейс для операторов
- Отправка ответов через Telegram
- Реальное время через Socket.IO
- База данных PostgreSQL

## Быстрый запуск

1. Перейдите в директорию:
```bash
cd chat_clone
```

2. Установите зависимости и запустите:
```bash
npm run setup
```

3. Откройте http://localhost:3000

Или поэтапно:
```bash
npm install
npm start
```

## Получение Telegram Bot Token

1. Найдите @BotFather в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Скопируйте токен в .env файл

## Структура проекта

- `server.js` - основной сервер
- `models/` - модели базы данных (Sequelize)
- `telegram.js` - интеграция с Telegram
- `views/` - веб-интерфейс (EJS)
- `docker-compose.yml` - конфигурация Docker

## API

- `GET /` - веб-интерфейс
- `GET /api/clients` - список клиентов
- `GET /api/messages/:clientId` - сообщения клиента
- `POST /api/send` - отправка сообщения