#!/bin/bash

echo "🔄 Перезагрузка воронки Колумбия..."

# Перезапускаем сервер
echo "🔄 Перезапускаем сервер..."
pm2 restart chat-clone

# Ждем запуска
sleep 5

# Загружаем воронку
echo "📋 Загружаем воронку..."
node setup-colombia-funnel.js

# Проверяем результат
echo ""
echo "✅ Проверяем результат:"
RULES_COUNT=$(curl -s http://localhost:3001/api/automation-rules | jq '. | length' 2>/dev/null || echo "0")
echo "Правил загружено: $RULES_COUNT"

if [ "$RULES_COUNT" -gt "0" ]; then
    echo "✅ Воронка загружена успешно!"
    
    echo ""
    echo "🧪 Тестирование:"
    echo "1. Напишите боту: 'привет' или 'hello'"
    echo "2. Должно прийти приветствие от César Gómez"
    echo "3. Логи: pm2 logs chat-clone -f"
else
    echo "❌ Воронка не загрузилась"
    echo "Попробуйте: ./fix-rules-sync.sh"
fi