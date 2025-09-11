#!/bin/bash

echo "🔧 Исправление синхронизации правил автоматизации..."

echo "📊 Текущая ситуация:"
echo "- AutomationEngine имеет правила (видно в логах)"
echo "- API возвращает 0 правил"
echo "- Нужно синхронизировать правила"

# Проверяем текущие правила через API
echo ""
echo "🔍 Проверяем API правил:"
RULES_API=$(curl -s http://localhost:3001/api/automation-rules)
echo "API правил: $(echo "$RULES_API" | jq '. | length' 2>/dev/null || echo "0")"

# Проверяем логи на наличие правил в памяти
echo ""
echo "📋 Правила в памяти (из логов):"
pm2 logs chat-clone --lines 50 | grep -E "(rule:|Checking rule)" | tail -10

# Загружаем правила заново
echo ""
echo "🔄 Перезагружаем правила воронки..."

# Сначала очищаем существующие правила
echo "🧹 Очищаем существующие правила..."
curl -s -X DELETE http://localhost:3001/api/automation-rules/all 2>/dev/null || echo "Метод очистки не найден"

# Загружаем правила
echo "📋 Загружаем правила воронки Колумбия..."
node setup-colombia-funnel.js

# Проверяем результат
echo ""
echo "✅ Проверяем результат:"
sleep 2
RULES_NEW=$(curl -s http://localhost:3001/api/automation-rules)
RULES_COUNT=$(echo "$RULES_NEW" | jq '. | length' 2>/dev/null || echo "0")

echo "Правил в API: $RULES_COUNT"

if [ "$RULES_COUNT" -gt "0" ]; then
    echo "✅ Правила успешно загружены!"
    echo ""
    echo "📋 Загруженные правила:"
    echo "$RULES_NEW" | jq -r '.[] | "  - " + .name + " (событие: " + .event + ")"' 2>/dev/null
    
    # Перезапускаем сервер для синхронизации
    echo ""
    echo "🔄 Перезапускаем сервер для полной синхронизации..."
    pm2 restart chat-clone
    
    sleep 5
    
    echo "��� Финальная проверка:"
    pm2 logs chat-clone --lines 10
    
else
    echo "❌ Правила не загрузились, попробуем альтернативный способ..."
    
    # Альтернативный способ - загрузка правил напрямую
    echo "🔧 Загружаем правила напрямую через API..."
    
    # Правило 1: Старт
    curl -X POST http://localhost:3001/api/automation-rules \
      -H "Content-Type: application/json" \
      -d '{
        "id": "step1_start",
        "name": "Старт → 1смс",
        "event": "chat_opened",
        "condition": {},
        "action": {
          "auto_reply": [
            {"text": "Hola! Me llamo César Gómez y me complace presentarte una oportunidad única que podría cambiar tu vida. Te has preguntado alguna vez cómo algunos jugadores ganan constantemente en Chicken Road? No es suerte, sino el resultado de usar tecnología avanzada! Mi aplicación utiliza algoritmos complejos para analizar datos y predecir los resultados de las apuestas.", "delay": 0},
            {"text": "Quieres saber cómo funciona mi aplicación?", "delay": 2000}
          ],
          "add_tag": "1смс"
        }
      }'
    
    echo ""
    echo "✅ Правило 1 загружено"
    
    # Проверяем снова
    sleep 1
    RULES_FINAL=$(curl -s http://localhost:3001/api/automation-rules)
    RULES_COUNT_FINAL=$(echo "$RULES_FINAL" | jq '. | length' 2>/dev/null || echo "0")
    echo "Правил после ручной загрузки: $RULES_COUNT_FINAL"
fi

echo ""
echo "🧪 ТЕСТИРОВАНИЕ:"
echo "==============="
echo "1. Отправьте боту НОВОЕ сообщение (не /start)"
echo "2. Например: 'привет', 'hello', 'test'"
echo "3. Следите за логами: pm2 logs chat-clone -f"
echo ""
echo "Ожидаемое поведение:"
echo "- Должно прийти приветствие от César Gómez"
echo "- В логах должно быть: 'Rule matched, executing actions...'"

echo ""
echo "📱 Мониторинг:"
pm2 logs chat-clone -f