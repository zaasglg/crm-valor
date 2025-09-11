#!/bin/bash

echo "🔍 Диагностика проблем с получением сообщений Telegram..."

# Проверяем переменные окружения
echo "⚙️ Проверяем конфигурацию:"
if [ -f ".env" ]; then
    echo "✅ .env файл найден"
    BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN .env | cut -d'=' -f2)
    SERVER_DOMAIN=$(grep SERVER_DOMAIN .env | cut -d'=' -f2)
    echo "BOT_TOKEN: ${BOT_TOKEN:0:20}..."
    echo "SERVER_DOMAIN: $SERVER_DOMAIN"
else
    echo "❌ .env файл не найден!"
    exit 1
fi

# Проверяем статус бота
echo ""
echo "🤖 Проверяем статус Telegram бота:"
if [ -n "$BOT_TOKEN" ]; then
    curl -s "https://api.telegram.org/bot$BOT_TOKEN/getMe" | jq '.' 2>/dev/null || curl -s "https://api.telegram.org/bot$BOT_TOKEN/getMe"
else
    echo "❌ TELEGRAM_BOT_TOKEN не установлен"
fi

# Проверяем webhook
echo ""
echo "🔗 Проверяем webhook:"
if [ -n "$BOT_TOKEN" ]; then
    curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo" | jq '.' 2>/dev/null || curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"
else
    echo "❌ Не могу проверить webhook без токена"
fi

# Проверяем, какой режим используется (polling или webhook)
echo ""
echo "📡 Проверяем режим получения сообщений:"
if grep -q "webhook" server.js; then
    echo "🔗 Используется WEBHOOK режим"
    
    # Проверяем доступность webhook URL
    if [ -n "$SERVER_DOMAIN" ]; then
        WEBHOOK_URL="$SERVER_DOMAIN/webhook/telegram"
        echo "Проверяем доступность: $WEBHOOK_URL"
        curl -I "$WEBHOOK_URL" 2>/dev/null || echo "❌ Webhook URL недоступен"
    fi
else
    echo "📡 Используется POLLING режим"
fi

# Проверяем логи сервера
echo ""
echo "📋 Последние логи chat-clone:"
pm2 logs chat-clone --lines 10 2>/dev/null || echo "❌ Не удалось получить логи PM2"

# Проверяем процессы
echo ""
echo "📊 Статус процессов:"
pm2 list | grep chat-clone

echo ""
echo "🔧 Возможные решения:"
echo ""
echo "1. Если используется POLLING:"
echo "   - Убедитесь, что webhook отключен"
echo "   - Проверьте, что бот не заблокирован"
echo ""
echo "2. Если используется WEBHOOK:"
echo "   - Проверьте доступность домена извне"
echo "   - Убедитесь, что SSL сертификат валиден"
echo "   - Проверьте, что порт открыт в файрволе"
echo ""
echo "3. Общие проблемы:"
echo "   - Неверный токен бота"
echo "   - Бот не добавлен в чат"
echo "   - Проблемы с сетью"

echo ""
echo "🛠️ Команды для исправления:"
echo ""
echo "# Отключить webhook и включить polling:"
echo "curl -X POST \"https://api.telegram.org/bot$BOT_TOKEN/deleteWebhook\""
echo ""
echo "# Установить webhook (замените на ваш домен):"
echo "curl -X POST \"https://api.telegram.org/bot$BOT_TOKEN/setWebhook\" -d \"url=https://crm.valor-games.com/webhook/telegram\""
echo ""
echo "# Перезапустить сервер:"
echo "pm2 restart chat-clone"