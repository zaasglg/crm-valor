#!/bin/bash

echo "🔍 Проверка логики обработки дубликатов..."

# Ищем код, отвечающий за проверку дубликатов
echo "📝 Поиск логики дубликатов в коде..."

if grep -n "Duplicate message detected" server.js; then
    echo "✅ Найдена логика дубликатов в server.js"
    echo ""
    echo "📋 Контекст кода:"
    grep -B 5 -A 5 "Duplicate message detected" server.js
elif grep -n "Duplicate message detected" telegram.js; then
    echo "✅ Найдена логика дубликатов в telegram.js"
    echo ""
    echo "📋 Контекст кода:"
    grep -B 5 -A 5 "Duplicate message detected" telegram.js
else
    echo "❌ Логика дубликатов не найдена в основных файлах"
    echo "Поиск во всех .js файлах..."
    find . -name "*.js" -exec grep -l "Duplicate message detected" {} \;
fi

echo ""
echo "🔧 Возможные решения:"
echo ""
echo "1. Временно отключить проверку дубликатов:"
echo "   - Закомментировать строку с 'Duplicate message detected'"
echo "   - Перезапустить сервер"
echo ""
echo "2. Очистить кэш message_id:"
echo "   - Удалить записи из БД или кэша"
echo "   - Перезапустить сервер"
echo ""
echo "3. Изменить логику проверки:"
echo "   - Проверять дубликаты только в течение короткого времени"
echo "   - Использовать комбинацию message_id + timestamp"

echo ""
echo "🛠️ Быстрое исправление - отключение проверки дубликатов:"
read -p "Отключить проверку дубликатов? (y/n): " disable_duplicates

if [ "$disable_duplicates" = "y" ] || [ "$disable_duplicates" = "Y" ]; then
    echo "🔧 Отключаем проверку дубликатов..."
    
    # Создаем backup
    cp server.js server.js.backup
    
    # Комментируем строку с проверкой дубликатов
    sed -i 's/.*Duplicate message detected.*/        \/\/ &/' server.js
    
    # Также комментируем return, который идет после этой проверки
    sed -i '/Duplicate message detected/,/return/ s/^[[:space:]]*return/        \/\/ return/' server.js
    
    echo "✅ Проверка дубликатов отключена"
    echo "📁 Backup сохранен как server.js.backup"
    
    # Перезапускаем сервер
    echo "🔄 Перезапускаем сервер..."
    pm2 restart chat-clone
    
    echo "✅ Готово! Теперь попробуйте отправить сообщение боту."
else
    echo "ℹ️ Проверка дубликатов оставлена включенной"
fi

echo ""
echo "🧪 Для тестирования:"
echo "1. Отправьте боту сообщение"
echo "2. Проверьте логи: pm2 logs chat-clone -f"
echo "3. Должно прийти приветствие от César Gómez"