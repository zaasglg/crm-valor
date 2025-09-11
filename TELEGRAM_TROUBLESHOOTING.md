# 🔧 Решение проблем с Telegram сообщениями

## 🚨 Проблема: Сообщения не приходят на сервер

### Быстрая диагностика:
```bash
# 1. Проверить статус процессов
pm2 list

# 2. Проверить логи
pm2 logs chat-clone --lines 20

# 3. Запустить диагностику
chmod +x diagnose-telegram.sh
./diagnose-telegram.sh
```

### Основные причины:

#### 1. 🔗 Конфликт портов (EADDRINUSE)
**Симптом:** `Error: bind EADDRINUSE 0.0.0.0:3001`

**Решение:**
```bash
# Проверить, что использует порт 3001
lsof -i :3001

# Остановить конфликтующий процесс
pm2 stop server  # если это процесс 'server'

# Или изменить порт для chat-clone
sed -i 's/PORT: 3001/PORT: 3002/g' ecosystem.config.js
sed -i 's/PORT=3001/PORT=3002/g' .env
```

#### 2. 🤖 Проблемы с Telegram ботом
**Симптомы:** Бот не отвечает, сообщ��ния не обрабатываются

**Решение:**
```bash
# Запустить автоматическое исправление
chmod +x fix-telegram.sh
./fix-telegram.sh
```

#### 3. 📡 Проблемы с Webhook/Polling
**Симптом:** Бот не получает сообщения

**Для POLLING (рекомендуется):**
```bash
# Отключить webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"

# Перезапустить сервер
pm2 restart chat-clone
```

**Для WEBHOOK:**
```bash
# Установить webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://crm.valor-games.com/webhook/telegram"
```

#### 4. ⚙️ Неправильная конфигурация
**Проверить .env файл:**
```bash
# Должны быть установлены:
TELEGRAM_BOT_TOKEN=ваш_токен_бота
SERVER_DOMAIN=https://crm.valor-games.com
PORT=3001
NODE_ENV=production
```

### Пошаговое решение:

#### Шаг 1: Исправить конфликт портов
```bash
pm2 stop chat-clone
pm2 delete chat-clone
pm2 stop server  # если мешает
pm2 start ecosystem.config.js
```

#### Шаг 2: Настроить Telegram бота
```bash
./fix-telegram.sh
# Выбрать режим 1 (POLLING) для простоты
```

#### Шаг 3: Загрузить воронку
```bash
# Если сервер на порту 3001:
node setup-colombia-funnel.js

# Если сервер на порту 3002:
SERVER_DOMAIN=http://localhost:3002 node setup-colombia-funnel.js
```

#### Шаг 4: Протестировать
```bash
./test-funnel.sh
```

### Проверка работы:

1. **Статус процессов:**
   ```bash
   pm2 list
   # chat-clone должен быть 'online'
   ```

2. **API отвечает:**
   ```bash
   curl http://localhost:3001/api/automation-rules
   # Должен вернуть JSON с правилами
   ```

3. **Бот активен:**
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getMe"
   # Должен вернуть информацию о боте
   ```

4. **Тест сообщения:**
   - Напишите боту в Telegram
   - Проверьте логи: `pm2 logs chat-clone -f`
   - Должно прийти приветствие от César Gómez

### Если ничего не помогает:

```bash
# Полная переустановка
pm2 stop chat-clone
pm2 delete chat-clone
rm -rf node_modules
npm install --production
pm2 start ecosystem.config.js

# Перезагрузка воронки
node setup-colombia-funnel.js
```

### Контакты для поддержки:
- Логи: `pm2 logs chat-clone -f`
- Статус: `pm2 monit`
- Конфигурация: `cat .env`