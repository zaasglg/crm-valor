#!/bin/bash

echo "🔍 Диагностика автоматизации..."

# 1. Проверяем статус сервера
echo "📊 1. Статус сервера:"
pm2 list | grep chat-clone

# 2. Проверяем API автоматизации
echo ""
echo "🔧 2. Проверяем API автоматизации:"
if curl -f http://localhost:3001/api/automation-rules > /dev/null 2>&1; then
    RULES=$(curl -s http://localhost:3001/api/automation-rules)
    RULES_COUNT=$(echo "$RULES" | jq '. | length' 2>/dev/null || echo "0")
    echo "✅ API работает, правил: $RULES_COUNT"
    
    if [ "$RULES_COUNT" -gt "0" ]; then
        echo "📋 Загруженные правила:"
        echo "$RULES" | jq -r '.[] | "- " + .name + " (событие: " + .event + ")"' 2>/dev/null || echo "$RULES"
    else
        echo "❌ Правила не загружены!"
    fi
else
    echo "❌ API не отвечает"
fi

# 3. Проверяем логи на события автоматизации
echo ""
echo "📋 3. Проверяем логи автоматизации (последние 30 строк):"
pm2 logs chat-clone --lines 30 | grep -E "(automation|rule|event|processEvent|executeAction)" || echo "Нет логов автоматизации"

# 4. Проверяем обработку сообщений
echo ""
echo "💬 4. Проверяем обработку сообщений:"
pm2 logs chat-clone --lines 20 | grep -E "(message|chat_opened|message_received)" || echo "Нет логов сообщений"

# 5. Проверяем теги клиентов
echo ""
echo "🏷️ 5. Проверяем теги клиентов в БД:"
if [ -f "chat_clone.db" ]; then
    echo "Клиенты с тегами:"
    sqlite3 chat_clone.db "SELECT id, name, tags FROM clients WHERE tags IS NOT NULL AND tags != '';" 2>/dev/null || echo "Не удалось прочитать БД"
    
    echo ""
    echo "Последние сообщения:"
    sqlite3 chat_clone.db "SELECT m.id, c.name, m.message_text, m.created_at FROM messages m JOIN clients c ON m.client_id = c.id ORDER BY m.created_at DESC LIMIT 5;" 2>/dev/null || echo "Не удалось прочитать сообщения"
else
    echo "❌ База данных не найдена"
fi

# 6. Проверяем automation-engine
echo ""
echo "⚙️ 6. Проверяем automation-engine в коде:"
if grep -q "automationEngine" server.js; then
    echo "✅ AutomationEngine найден в server.js"
    
    # Проверяем инициализацию
    if grep -q "processEvent" server.js; then
        echo "✅ processEvent найден"
    else
        echo "❌ processEvent не найден"
    fi
    
    # Проверяем события
    echo ""
    echo "События в коде:"
    grep -n "processEvent\|chat_opened\|message_received" server.js || echo "События не найдены"
else
    echo "❌ AutomationEngine не найден в server.js"
fi

# 7. Проверяем конкретные проблемы
echo ""
echo "🚨 7. Поиск ошибок:"
pm2 logs chat-clone --lines 50 | grep -i "error\|exception\|failed\|undefined" || echo "Критических ошибок не найдено"

echo ""
echo "📝 ДИАГНОЗ:"
echo "=========="

# Анализируем результаты
if [ "$RULES_COUNT" = "0" ] || [ "$RULES_COUNT" = "null" ]; then
    echo "❌ ПРОБЛЕМА 1: Правила автоматизации не загружены"
    echo "   РЕШЕНИЕ: node setup-colombia-funnel.js"
fi

if ! pm2 logs chat-clone --lines 20 | grep -q "processEvent"; then
    echo "❌ ПРОБЛЕМА 2: События автоматизации не обрабатываются"
    echo "   РЕШЕНИЕ: Проверить код обработки сообщений"
fi

if ! pm2 logs chat-clone --lines 20 | grep -q "automation"; then
    echo "❌ ПРОБЛЕМА 3: AutomationEngine не активен"
    echo "   РЕШЕНИЕ: Проверить инициализацию в server.js"
fi

echo ""
echo "🔧 БЫСТРЫЕ ИСПРАВЛЕНИЯ:"
echo "====================="
echo "1. Загрузить правила: node setup-colombia-funnel.js"
echo "2. Перезапустить сервер: pm2 restart chat-clone"
echo "3. Проверить логи: pm2 logs chat-clone -f"
echo "4. Отправить тестовое сообщение боту"

echo ""
echo "🧪 ТЕСТ АВТОМАТИЗАЦИИ:"
echo "====================="
read -p "Запустить автоматическое исправление? (y/n): " auto_fix

if [ "$auto_fix" = "y" ] || [ "$auto_fix" = "Y" ]; then
    echo "🔧 Автоматическо�� исправление..."
    
    # Загружаем правила
    echo "📋 Загружаем правила воронки..."
    node setup-colombia-funnel.js
    
    # Перезапускаем сервер
    echo "🔄 Перезапускаем сервер..."
    pm2 restart chat-clone
    
    sleep 5
    
    # Проверяем результат
    echo "✅ Проверяем результат..."
    RULES_COUNT_NEW=$(curl -s http://localhost:3001/api/automation-rules | jq '. | length' 2>/dev/null || echo "0")
    echo "Правил загружено: $RULES_COUNT_NEW"
    
    if [ "$RULES_COUNT_NEW" -gt "0" ]; then
        echo "✅ Автоматизация должна работать!"
        echo "🧪 Отправьте боту сообщение для тестирования"
    else
        echo "❌ Проблема не решена, нужна ручная диагностика"
    fi
fi