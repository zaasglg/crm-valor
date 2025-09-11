#!/bin/bash

echo "🔧 Исправление проблем сервера..."

# Проверяем текущий статус
echo "📊 Текущий статус:"
pm2 list | grep chat-clone

# Останавливаем все процессы chat-clone
echo "🛑 Останавливаем все процессы chat-clone..."
pm2 stop chat-clone 2>/dev/null || true
pm2 delete chat-clone 2>/dev/null || true

# Проверяем, что порт свободен
echo "🔍 Проверяем порты..."
if lsof -i :3001 > /dev/null 2>&1; then
    echo "⚠️ Порт 3001 все еще занят:"
    lsof -i :3001
    echo "Останавливаем процесс на порту 3001..."
    lsof -ti :3001 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

if lsof -i :3002 > /dev/null 2>&1; then
    echo "⚠️ Порт 3002 занят:"
    lsof -i :3002
    echo "Останавливаем процесс на порту 3002..."
    lsof -ti :3002 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Проверяем конфигурацию ecosystem.config.js
echo "⚙️ Проверяем конфигурацию..."
if [ -f "ecosystem.config.js" ]; then
    echo "✅ ecosystem.config.js найден"
    cat ecosystem.config.js
else
    echo "❌ ecosystem.config.js не найден, создаем..."
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'chat-clone',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
EOF
fi

# Переключаемся на POLLING режим (отключаем webhook)
echo "📡 Переключаемся на POLLING режим..."
if [ -f ".env" ]; then
    BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN .env | cut -d'=' -f2)
    if [ -n "$BOT_TOKEN" ]; then
        echo "🗑️ Удаляем webhook..."
        curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/deleteWebhook"
        echo ""
        
        # Проверяем, что webhook удален
        sleep 2
        echo "🔍 Проверяем статус webhook..."
        curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo" | jq '.result.url' 2>/dev/null || echo "Webhook info получен"
    fi
fi

# Запускаем сервер заново
echo "���� Запускаем сервер..."
pm2 start ecosystem.config.js

# Ждем запуска
echo "⏳ Ожидание запуска (10 секунд)..."
sleep 10

# Проверяем статус
echo "📊 Статус после запуска:"
pm2 list | grep chat-clone

# Проверяем логи
echo "📋 Проверяем логи на ошибки..."
pm2 logs chat-clone --lines 15

# Проверяем API
echo "🔍 Проверяем API..."
if curl -f http://localhost:3001/api/automation-rules > /dev/null 2>&1; then
    echo "✅ API на порту 3001 работает"
    PORT=3001
elif curl -f http://localhost:3002/api/automation-rules > /dev/null 2>&1; then
    echo "✅ API на порту 3002 работает"
    PORT=3002
else
    echo "❌ API не отвечает ни на одном порту"
    echo "Проверьте логи: pm2 logs chat-clone"
    exit 1
fi

echo ""
echo "✅ Сервер запущен на порту $PORT"
echo ""
echo "📋 Следующие шаги:"
echo "1. Проверьте, что нет ошибок в логах: pm2 logs chat-clone -f"
echo "2. Загрузите воронку: node setup-colombia-funnel.js"
echo "3. Протестируйте бота в Telegram"
echo ""
echo "🔧 Если пробл��мы продолжаются:"
echo "   pm2 logs chat-clone --lines 50"