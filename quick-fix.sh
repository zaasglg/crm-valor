#!/bin/bash

echo "⚡ Быстрое исправление проблемы с сообщениями..."

echo "🔄 Перезапускаем сервер для сброса кэша..."
pm2 restart chat-clone

sleep 3

echo "📋 Загружаем воронку..."
node setup-colombia-funnel.js

echo ""
echo "✅ Готово!"
echo ""
echo "🧪 Тестирование:"
echo "1. Напишите боту НОВОЕ сообщение (например: 'test' или 'привет')"
echo "2. НЕ используйте /start - он может кэшироваться"
echo "3. Следите за логами:"
echo ""
pm2 logs chat-clone -f