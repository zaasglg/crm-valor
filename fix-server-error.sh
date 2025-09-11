#!/bin/bash

echo "🔍 Диагностика ошибки chat-clone на сервере..."

# Проверяем логи PM2
echo "📋 Логи PM2:"
pm2 logs chat-clone --lines 20

echo ""
echo "📊 Детальная информация о процессе:"
pm2 describe chat-clone

echo ""
echo "🔧 Попытка исправления..."

# Останавливаем и удаляем процесс
pm2 stop chat-clone
pm2 delete chat-clone

# Проверяем, свободен ли порт 3001
echo "🔍 Проверяем порт 3001:"
netstat -tlnp | grep :3001 || echo "Порт 3001 свободен"

# Проверяем конфигурацию
echo "⚙️ Проверяем конфигурацию:"
if [ -f ".env" ]; then
    echo "✅ .env файл найден"
    echo "NODE_ENV: $(grep NODE_ENV .env || echo 'не установлен')"
    echo "PORT: $(grep PORT .env || echo 'не установлен')"
    echo "TELEGRAM_BOT_TOKEN: $(grep TELEGRAM_BOT_TOKEN .env | cut -c1-30)..."
else
    echo "❌ .env файл не найде��!"
    echo "Создаем .env из .env.production..."
    cp .env.production .env
fi

# Проверяем зависимости
echo "📦 Проверяем зависимости:"
if [ -d "node_modules" ]; then
    echo "✅ node_modules найден"
else
    echo "❌ node_modules не найден, устанавливаем..."
    npm install --production
fi

# Проверяем основные файлы
echo "📁 Проверяем файлы:"
[ -f "server.js" ] && echo "✅ server.js" || echo "❌ server.js отсутствует"
[ -f "ecosystem.config.js" ] && echo "✅ ecosystem.config.js" || echo "❌ ecosystem.config.js отсутствует"
[ -f "package.json" ] && echo "✅ package.json" || echo "❌ package.json отсутствует"

# Создаем необходимые папки
mkdir -p uploads
mkdir -p funnel-schemas

# Проверяем синтаксис server.js
echo "🔍 Проверяем синтаксис server.js:"
node -c server.js && echo "✅ Синтаксис корректен" || echo "❌ Ошибка синтаксиса"

# Запускаем заново
echo "🚀 Запускаем chat-clone заново..."
pm2 start ecosystem.config.js

# Ждем запуска
sleep 5

# Проверяем статус
echo "��� Статус после перезапуска:"
pm2 list | grep chat-clone

echo ""
echo "🔧 Если проблема не решена, выполните:"
echo "   pm2 logs chat-clone --lines 50"
echo "   pm2 describe chat-clone"