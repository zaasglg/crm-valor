#!/bin/bash

echo "🧪 Тестирование воронки Колумбия..."

# Проверяем, запущен ли сервер
if ! curl -f http://localhost:3001/api/automation-rules > /dev/null 2>&1; then
    if ! curl -f http://localhost:3002/api/automation-rules > /dev/null 2>&1; then
        echo "❌ Сервер не отвечает ни на порту 3001, ни на 3002"
        echo "Запустите: pm2 restart chat-clone"
        exit 1
    else
        PORT=3002
        echo "✅ Сервер работает на порту 3002"
    fi
else
    PORT=3001
    echo "✅ Сервер работает на порту 3001"
fi

# Проверяем правила автоматизации
echo ""
echo "📋 Проверяем правила воронки..."
RULES=$(curl -s http://localhost:$PORT/api/automation-rules)
RULES_COUNT=$(echo "$RULES" | jq '. | length' 2>/dev/null || echo "0")

echo "Найдено правил: $RULES_COUNT"

if [ "$RULES_COUNT" -eq "0" ]; then
    echo "❌ Правила воронки не загружены!"
    echo "🔧 Загружаем воронку..."
    
    if [ "$PORT" = "3002" ]; then
        SERVER_DOMAIN=http://localhost:3002 node setup-colombia-funnel.js
    else
        node setup-colombia-funnel.js
    fi
else
    echo "✅ Правила воронки загружены"
    echo "$RULES" | jq -r '.[] | "- " + .name' 2>/dev/null || echo "$RULES"
fi

# Проверяем Telegram бота
echo ""
echo "🤖 Проверяем Telegram бота..."

if [ -f ".env" ]; then
    BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN .env | cut -d'=' -f2)
    if [ -n "$BOT_TOKEN" ]; then
        BOT_INFO=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getMe")
        if echo "$BOT_INFO" | grep -q '"ok":true'; then
            BOT_USERNAME=$(echo "$BOT_INFO" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
            echo "✅ Бот активен: @$BOT_USERNAME"
            
            # Проверяем режим получения сообщений
            WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo")
            WEBHOOK_URL=$(echo "$WEBHOOK_INFO" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
            
            if [ -n "$WEBHOOK_URL" ] && [ "$WEBHOOK_URL" != "" ]; then
                echo "📡 Режим: WEBHOOK ($WEBHOOK_URL)"
            else
                echo "📡 Режим: POLLING"
            fi
        else
            echo "❌ Проблема с ботом: $BOT_INFO"
        fi
    else
        echo "❌ TELEGRAM_BOT_TOKEN не найден в .env"
    fi
else
    echo "❌ .env файл не найден"
fi

# Проверяем логи на ошибки
echo ""
echo "🔍 Проверяем логи на ошибки..."
if pm2 logs chat-clone --lines 20 2>/dev/null | grep -i "error\|exception\|failed"; then
    echo "⚠️ Найдены ошибки в логах (см. выше)"
else
    echo "✅ Критических ошибок в логах не найдено"
fi

echo ""
echo "📊 Статус системы:"
pm2 list | grep chat-clone

echo ""
echo "🧪 Инструкции по тестированию:"
echo ""
echo "1. Напишите боту в Telegram любое сообщение"
echo "2. Проверьте логи в реальном времени:"
echo "   pm2 logs chat-clone -f"
echo ""
echo "3. Ожидаемое поведение:"
echo "   - При первом сообщении: приветствие от César Gómez"
echo "   - При втором сообщении: информация о метод��"
echo "   - При третьем сообщении: ссылка на регистрацию"
echo ""
echo "4. Админ панель:"
echo "   http://localhost:$PORT/admin/automation"
echo ""
echo "5. Если сообщения не приходят:"
echo "   ./fix-telegram.sh"