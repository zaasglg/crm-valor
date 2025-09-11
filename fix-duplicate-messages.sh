#!/bin/bash

echo "🔧 Исправление проблемы с дубликатами сообщений..."

# Проверяем текущие логи
echo "📋 Текущие логи (последние 20 строк):"
pm2 logs chat-clone --lines 20

echo ""
echo "🔍 Анализ проблемы:"
echo "Сообщения приходят, но система считает их дубликатами."
echo "Это может быть из-за:"
echo "1. Неправильной логики проверки дубликатов"
echo "2. Проблем с базой данных"
echo "3. Кэширования message_id"

# Проверяем базу данных
echo ""
echo "🗄️ Проверяем базу данных..."
if [ -f "chat_clone.db" ]; then
    echo "✅ База данных найдена"
    echo "Размер: $(ls -lh chat_clone.db | awk '{print $5}')"
    
    # Проверяем последние сообщения
    echo "📨 Последние сообщения в БД:"
    sqlite3 chat_clone.db "SELECT id, client_id, message_text, created_at FROM messages ORDER BY created_at DESC LIMIT 5;" 2>/dev/null || echo "Не удалось прочитать БД"
else
    echo "❌ База данных не найдена"
fi

# Очищаем кэш дубликатов (если есть)
echo ""
echo "🧹 Очищаем возможные кэши..."

# Перезапускаем сервер для сброса кэша в памяти
echo "🔄 Перезапускаем сервер для сброса кэша..."
pm2 restart chat-clone

# Ждем запуска
sleep 5

echo ""
echo "📊 Статус после перезапуска:"
pm2 list | grep chat-clone

# Проверяем воронку
echo ""
echo "📋 Проверяем правила воронки..."
RULES_COUNT=$(curl -s http://localhost:3001/api/automation-rules | jq '. | length' 2>/dev/null || echo "0")
echo "Правил в системе: $RULES_COUNT"

if [ "$RULES_COUNT" = "0" ] || [ "$RULES_COUNT" = "null" ]; then
    echo "❌ Правила воронки не загружены!"
    echo "🔧 Загружаем воронку..."
    node setup-colombia-funnel.js
else
    echo "✅ Правила воронки загружены"
fi

echo ""
echo "🧪 Тестирование:"
echo "1. На��ишите боту НОВОЕ сообщение (не /start)"
echo "2. Например: 'Привет' или 'Hello'"
echo "3. Следите за логами: pm2 logs chat-clone -f"
echo ""
echo "Ожидаемое поведение:"
echo "- Должно прийти приветствие от César Gómez"
echo "- Не должно быть 'Duplicate message detected'"

echo ""
echo "🔍 Мониторинг логов (нажмите Ctrl+C для выхода):"
pm2 logs chat-clone -f