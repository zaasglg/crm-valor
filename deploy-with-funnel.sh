#!/bin/bash

# Скрипт деплоя Chat Clone с воронкой Колумбия
echo "🚀 Деплой Chat Clone с воронкой Колумбия..."

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Установите Node.js версии 16 или выше"
    exit 1
fi

# Проверяем наличие PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Устанавливаем PM2..."
    npm install -g pm2
fi

# Установка зависимостей
echo "📦 Установка зависимостей..."
npm install --production

# Создание необходимых папок
echo "📁 Создание папок..."
mkdir -p uploads
mkdir -p funnel-schemas

# Копирование конфигурационных файлов
echo "⚙️ Настройка конфигурации..."
if [ ! -f .env ]; then
    cp .env.production .env
    echo "✅ Скопирован .env файл"
fi

# Остановка старого процесса
echo "🛑 Остановка старого процесса..."
pm2 stop chat-clone 2>/dev/null || true
pm2 delete chat-clone 2>/dev/null || true

# Запуск через PM2
echo "🚀 Запуск приложения..."
pm2 start ecosystem.config.js

# Ожидание запуска сервера
echo "⏳ Ожидание запуска сервера..."
sleep 5

# Проверка статуса сервера
if curl -f http://localhost:3001/api/automation-rules > /dev/null 2>&1; then
    echo "✅ Сервер запущен успешно"
    
    # Загрузка воронки Колумбия
    echo "📋 Загрузка воронки Колумбия..."
    if [ -f "setup-colombia-funnel.js" ]; then
        node setup-colombia-funnel.js
        echo "✅ Воронка загружена"
    else
        echo "⚠️ Файл setup-colombia-funnel.js не найден, воронка не загружена"
    fi
else
    echo "❌ Ошибка запуска сервера"
    pm2 logs chat-clone --lines 20
    exit 1
fi

# Настройка автозапуска
pm2 save
pm2 startup

echo ""
echo "🎉 Деплой завершен успешно!"
echo ""
echo "📊 Статус приложения:"
pm2 status
echo ""
echo "🌐 Приложение ��оступно:"
echo "   - Основной интерфейс: http://localhost:3001"
echo "   - Админ панель: http://localhost:3001/admin"
echo "   - Автоматизация: http://localhost:3001/admin/automation"
echo ""
echo "📝 Полезные команды:"
echo "   pm2 status          - статус процессов"
echo "   pm2 logs chat-clone - логи приложения"
echo "   pm2 restart chat-clone - перезапуск"
echo "   pm2 stop chat-clone - остановка"
echo ""