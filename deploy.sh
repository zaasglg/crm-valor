#!/bin/bash

# Скрипт деплоя на сервер
echo "Деплой Chat Clone..."

# Установка зависимостей
npm install --production

# Создание папки для загрузок
mkdir -p uploads

# Запуск через PM2
pm2 stop chat-clone 2>/dev/null || true
pm2 delete chat-clone 2>/dev/null || true
pm2 start ecosystem.config.js

echo "Деплой завершен!"
echo "Приложение доступно на порту 3001"