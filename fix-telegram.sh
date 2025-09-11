#!/bin/bash

echo "🔧 Исправление проблем с Telegram сообщениями..."

# Загружаем переменные окружения
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env файл не найден!"
    exit 1
fi

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ TELEGRAM_BOT_TOKEN не установлен в .env"
    exit 1
fi

echo "🤖 Токен бота: ${TELEGRAM_BOT_TOKEN:0:20}..."

# Проверяем статус бота
echo "📡 Проверяем бота..."
BOT_INFO=$(curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe")
if echo "$BOT_INFO" | grep -q '"ok":true'; then
    echo "✅ Бот активен"
    echo "$BOT_INFO" | grep -o '"username":"[^"]*"' | cut -d'"' -f4
else
    echo "❌ Проблема с ботом:"
    echo "$BOT_INFO"
    exit 1
fi

# Выбираем режим работы
echo ""
echo "🔧 Выберите режим работы:"
echo "1. POLLING (рекомендуется для тестирования)"
echo "2. WEBHOOK (для продакшена)"
echo ""
read -p "Введите номер (1 или 2): " mode

case $mode in
    1)
        echo "📡 Настраиваем POLLING режим..."
        
        # Удаляем webhook
        echo "🗑️ Удаляем webhook..."
        curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook"
        
        # Проверяем, что webhook удален
        sleep 2
        WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo")
        if echo "$WEBHOOK_INFO" | grep -q '"url":""'; then
            echo "✅ Webhook удален, используется polling"
        else
            echo "⚠️ Webhook все еще активен:"
            echo "$WEBHOOK_INFO"
        fi
        ;;
        
    2)
        echo "🔗 Настраиваем WEBHOOK режим..."
        
        if [ -z "$SERVER_DOMAIN" ]; then
            echo "❌ SERVER_DOMAIN не установлен в .env"
            echo "Добавьте: SERVER_DOMAIN=https://crm.valor-games.com"
            exit 1
        fi
        
        WEBHOOK_URL="$SERVER_DOMAIN/webhook/telegram"
        echo "🔗 Устанавливаем webhook: $WEBHOOK_URL"
        
        # Устанавливаем webhook
        WEBHOOK_RESULT=$(curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
            -d "url=$WEBHOOK_URL" \
            -d "allowed_updates=[\"message\",\"callback_query\",\"inline_query\"]")
        
        if echo "$WEBHOOK_RESULT" | grep -q '"ok":true'; then
            echo "✅ Webhook установлен успешно"
        else
            echo "❌ Ошибка установки webhook:"
            echo "$WEBHOOK_RESULT"
            exit 1
        fi
        
        # Проверяем доступность webhook URL
        echo "🔍 Проверяем доступность webhook..."
        if curl -I "$WEBHOOK_URL" 2>/dev/null | grep -q "200\|404\|405"; then
            echo "✅ Webhook URL доступен"
        else
            echo "❌ Webhook URL недоступен извне"
            echo "Проверьте:"
            echo "- SSL сертификат"
            echo "- Открыт ли порт в файрволе"
            echo "- Правильность домена"
        fi
        ;;
        
    *)
        echo "❌ Неверный выбор"
        exit 1
        ;;
esac

# Перезапускаем сервер
echo ""
echo "🔄 Перезапускаем сервер..."
pm2 restart chat-clone

# Ждем запуска
sleep 5

# Проверяем статус
echo "📊 Статус сервера:"
pm2 list | grep chat-clone

# Проверяем логи
echo ""
echo "📋 Последние логи (проверьте на ошибки):"
pm2 logs chat-clone --lines 15

echo ""
echo "✅ Настройка завершена!"
echo ""
echo "🧪 Для тестирования:"
echo "1. Напишите боту в Telegram"
echo "2. Проверьте логи: pm2 logs chat-clone -f"
echo "3. Проверьте админ панель: $SERVER_DOMAIN/admin"

if [ "$mode" = "2" ]; then
    echo ""
    echo "🔗 Webhook информация:"
    curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo" | jq '.' 2>/dev/null || curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
fi