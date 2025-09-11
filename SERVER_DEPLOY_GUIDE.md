# 🚀 Инструкция по деплою на сервер

## Что нужно изменить при деплое на сервер

### 1. 🔧 Конфигурация окружения

#### Обновить `.env` файл:
```bash
# Основные настройки
NODE_ENV=production
PORT=3001

# Telegram Bot (ОБЯЗАТЕЛЬНО ИЗМЕНИТЬ!)
TELEGRAM_BOT_TOKEN=ВАШ_РЕАЛЬНЫЙ_ТОКЕН_БОТА

# База данных (если используете внешнюю)
# DATABASE_URL=postgresql://user:password@host:port/database

# Домен сервера (для webhook)
SERVER_DOMAIN=https://your-domain.com

# Безопасность
SESSION_SECRET=ваш_секретный_ключ_для_сессий
```

### 2. 🌐 Настройка домена и портов

#### В файле `setup-colombia-funnel.js` изменить:
```javascript
// Заменить localhost на ваш домен
const SERVER_URL = process.env.SERVER_DOMAIN || 'http://localhost:3001';

// В функциях checkServer() и loadRules()
const response = await fetch(`${SERVER_URL}/api/automation-rules`);
```

#### В файле `FUNNEL_COLOMBIA_README.md` обновить ссылки:
```markdown
🔧 Для управления правилами откройте: https://your-domain.com/admin/automation
```

### 3. 🔒 Настройка безопасности

#### Добавить в `server.js` (если еще нет):
```javascript
// Настройка CORS для продакшена
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://your-domain.com'],
  credentials: true
}));

// Настройка безопасности заголовков
app.use(helmet());

// Ограничение запросов
const rateLimit = require('express-rate-limit');
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100 // максимум 100 запросов с одного IP
}));
```

### 4. 📁 Структура файлов на сервере

```
/var/www/chat-clone/
├── server.js
├── package.json
├── .env                          # ← ИЗМЕНИТЬ
├── ecosystem.config.js
├── deploy-with-funnel.sh         # ← НОВЫЙ ФАЙЛ
├── setup-colombia-funnel.js      # ← ОБНОВИТЬ URL
├── funnel-schemas/
│   └── colombia-chicken-road.json
├── uploads/
├── views/
└── public/
```

### 5. 🚀 Команды для деплоя

#### На сервере выполнить:
```bash
# 1. Клонирование репозитория
git clone <your-repo-url> /var/www/chat-clone
cd /var/www/chat-clone

# 2. Настройка окружения
cp .env.production .env
nano .env  # Отредактировать настройки

# 3. Установка зависимостей и запуск
chmod +x deploy-with-funnel.sh
./deploy-with-funnel.sh
```

### 6. 🌐 Настройка Nginx (опционально)

#### Создать `/etc/nginx/sites-available/chat-clone`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

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

#### Активировать конфигурацию:
```bash
sudo ln -s /etc/nginx/sites-available/chat-clone /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. 🔐 SSL сертификат (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 8. 📊 Мониторинг

#### Настройка логирования:
```bash
# Просмотр логов
pm2 logs chat-clone

# Мониторинг в реальном времени
pm2 monit

# Автозапуск при перезагрузке сервера
pm2 startup
pm2 save
```

### 9. 🔄 Обновление воронки на сервере

```bash
# Обновить JSON схему
nano funnel-schemas/colombia-chicken-road.json

# Перезагрузить воронку
node setup-colombia-funnel.js

# Или перезапустить весь сервис
pm2 restart chat-clone
```

### 10. ⚠️ Важные моменты

1. **Telegram Bot Token** - обязательно использовать реальный токен
2. **Домен** - заменить все localhost на реальный домен
3. **Порты** - убедиться что порт 3001 открыт в файрволе
4. **База данных** - создать backup перед деплоем
5. **Логи** - настроить ротацию логов для экономии места

### 11. 🧪 Тестирование после деплоя

```bash
# Проверить статус сервера
curl https://your-domain.com/api/automation-rules

# Проверить воронку
curl -X POST https://your-domain.com/api/automation-rules \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Проверить Telegram webhook (если используется)
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

## 📋 Чек-лист деплоя

- [ ] Обновлен `.env` файл с реальными данными
- [ ] Изменены URL с localhost на домен сервера
- [ ] Настроен Nginx (если используется)
- [ ] Установлен SSL сертификат
- [ ] Запущен сервер через PM2
- [ ] Загружена воронка Колумбия
- [ ] Протестированы основные функции
- [ ] Настроен мониторинг и логирование
- [ ] Создан backup базы данных

**После выполнения всех пунктов воронка будет работать на продакшен сервере! 🎉**