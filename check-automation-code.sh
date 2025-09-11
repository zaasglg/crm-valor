#!/bin/bash

echo "🔍 Проверка кода автоматизации..."

# Проверяем основные файлы
echo "📁 Проверяем файлы автоматизации:"
[ -f "automation-engine.js" ] && echo "✅ automation-engine.js" || echo "❌ automation-engine.js отсутствует"
[ -f "server.js" ] && echo "✅ server.js" || echo "❌ server.js отсутствует"

# Проверяем импорт AutomationEngine
echo ""
echo "📦 Проверяем импорт AutomationEngine в server.js:"
if grep -n "require.*automation-engine" server.js; then
    echo "✅ AutomationEngine импортирован"
else
    echo "❌ AutomationEngine НЕ импортирован"
    echo "🔧 Добавляем импорт..."
    
    # Проверяем, есть ли уже строка с require
    if ! grep -q "AutomationEngine" server.js; then
        # Добавляем импорт в начало файла после других require
        sed -i '/const.*require/a const AutomationEngine = require("./automation-engine");' server.js
        echo "✅ Импорт добавлен"
    fi
fi

# Проверяем инициализацию
echo ""
echo "⚙️ Проверяем инициализацию AutomationEngine:"
if grep -n "new AutomationEngine\|automationEngine.*new" server.js; then
    echo "✅ AutomationEngine инициализирован"
else
    echo "❌ AutomationEngine НЕ инициализирован"
fi

# Проверяем обработку событий
echo ""
echo "📡 Проверяем обработку событий:"
if grep -n "processEvent\|chat_opened\|message_received" server.js; then
    echo "✅ События обрабатываются"
else
    echo "❌ События НЕ обрабатываются"
fi

# Проверяем связь с Telegram
echo ""
echo "🤖 Проверяем связь с Telegram сервисом:"
if grep -n "setTelegramService\|telegramService" server.js; then
    echo "✅ Telegram сервис связан"
else
    echo "❌ Telegram сервис НЕ связан"
fi

# Показываем ключевые части кода
echo ""
echo "📋 Ключевые части кода автоматизации:"
echo "===================================="

echo ""
echo "1. Импорт AutomationEngine:"
grep -n -A2 -B2 "AutomationEngine\|automation-engine" server.js || echo "Не найден"

echo ""
echo "2. Инициализация:"
grep -n -A3 -B1 "new AutomationEngine\|automationEngine.*=" server.js || echo "Не найдена"

echo ""
echo "3. Обработка сообщений:"
grep -n -A5 -B2 "message.*received\|processEvent.*message" server.js || echo "Не найдена"

echo ""
echo "4. Обработка открытия чата:"
grep -n -A5 -B2 "chat.*opened\|processEvent.*chat" server.js || echo "Не найдена"

# Проверяем automation-engine.js
echo ""
echo "🔧 Проверяем automation-engine.js:"
if [ -f "automation-engine.js" ]; then
    echo "Методы в AutomationEngine:"
    grep -n "^[[:space:]]*[a-zA-Z].*(" automation-engine.js | head -10
    
    echo ""
    echo "Поддерживаемые события:"
    grep -n "case.*:" automation-engine.js | grep -E "chat_opened|message_received|tag_added"
else
    echo "❌ automation-engine.js не найден!"
fi

echo ""
echo "🔧 РЕКОМЕНДАЦИИ:"
echo "==============="

if ! grep -q "AutomationEngine" server.js; then
    echo "1. ❌ Добавить импорт AutomationEngine в server.js"
fi

if ! grep -q "processEvent" server.js; then
    echo "2. ❌ Добавить вызовы processEvent для событий"
fi

if ! grep -q "setTelegramService" server.js; then
    echo "3. ❌ Связать AutomationEngine с Telegram сервисом"
fi

echo ""
echo "🛠️ Автоматическое исправление кода:"
read -p "Попытаться исправить код автоматически? (y/n): " fix_code

if [ "$fix_code" = "y" ] || [ "$fix_code" = "Y" ]; then
    echo "🔧 Исправляем код..."
    
    # Создаем backup
    cp server.js server.js.backup.$(date +%s)
    echo "📁 Backup создан"
    
    # Добавляем импорт если его нет
    if ! grep -q "AutomationEngine" server.js; then
        sed -i '/const.*require.*express/a const AutomationEngine = require("./automation-engine");' server.js
        echo "✅ Импорт AutomationEngine добавлен"
    fi
    
    echo "🔄 Перезапускаем сервер..."
    pm2 restart chat-clone
    
    echo "✅ Код обновлен, проверьте работу автоматизации"
fi