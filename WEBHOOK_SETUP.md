# Настройка Webhook для Telegram бота

## Что такое Webhook?

Webhook - это способ получения обновлений от Telegram в реальном времени через HTTP POST запросы на ваш сервер, вместо постоянного опроса (polling). Это более эффективно для продакшен серверов.

## Преимущества Webhook над Polling:

- ✅ Мгновенная доставка сообщений
- ✅ Меньше нагрузки на сервер
- ✅ Более стабильная работа
- ✅ Нет конфликтов при множественных запусках

## Требования для Webhook:

1. **HTTPS сертификат** - Telegram требует HTTPS
2. **Публичный домен** - сервер должен быть доступен из интернета
3. **Открытый порт** - обычно 443 или 80

## Пошаговая настройка:

### 1. Настройка .env файла

Добавьте в ваш `.env` файл:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
WEBHOOK_URL=https://yourdomain.com
PORT=3001
```

### 2. Запуск сервера с поддержкой webhook

```bash
# Запуск в режиме webhook
npm run start:webhook

# Или для разработки
npm run dev:webhook
```

### 3. Настройка webhook

```bash
# Автоматическая настройка (если WEBHOOK_URL указан в .env)
npm run setup-webhook

# Проверка статуса webhook
npm run check-webhook
```

### 4. Проверка работы

После настройки webhook:

1. Отправьте сообщение боту в Telegram
2. Проверьте логи сервера - должны появиться сообщения о получении webhook
3. Сообщение должно появиться в интерфейсе CRM

## Структура Webhook URL:

Ваш webhook будет доступен по адресу:
```
https://yourdomain.com/webhook/YOUR_BOT_TOKEN
```

## Настройка Nginx (пример):

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Отладка проблем:

### Проверка webhook статуса:
```bash
npm run check-webhook
```

### Удаление webhook (возврат к polling):
```bash
node -e "
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {polling: false});
bot.deleteWebHook().then(() => console.log('Webhook deleted'));
"
```

### Типичные ошибки:

1. **"Wrong response from the webhook"** - проверьте, что сервер возвращает статус 200
2. **"SSL error"** - убедитесь, что SSL сертификат валидный
3. **"Connection timeout"** - проверьте доступность сервера из интернета

## Переключение между режимами:

### Polling режим (для разработки):
```bash
npm start
# или
npm run dev
```

### Webhook режим (для продакшена):
```bash
npm run start:webhook
# или
npm run dev:webhook
```

## Мониторинг:

Для мониторинга webhook можно использовать:

1. Логи сервера
2. `npm run check-webhook` - проверка статуса
3. Telegram Bot API для получения статистики

## Безопасность:

1. Webhook URL содержит токен бота для аутентификации
2. Проверяйте, что запросы приходят только от Telegram
3. Используйте HTTPS для защиты данных

## Производительность:

- Webhook обрабатывает до 100 обновлений в секунду
- Timeout для ответа - 60 секунд
- Рекомендуется отвечать быстро (< 1 секунды)