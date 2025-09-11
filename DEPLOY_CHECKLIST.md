# ✅ Чек-лист деплоя на сервер

## 🔧 Перед деплоем

### 1. Обновить конфигурацию
- [ ] Скопировать `.env.server` в `.env`
- [ ] Изменить `TELEGRAM_BOT_TOKEN` на реальный токен
- [ ] Изменить `SERVER_DOMAIN` на ваш домен
- [ ] Установить `SESSION_SECRET`

### 2. Проверить файлы
- [ ] `setup-colombia-funnel.js` использует переменную `SERVER_DOMAIN`
- [ ] `deploy-with-funnel.sh` имеет права на выполнение
- [ ] Папка `funnel-schemas/` существует
- [ ] JSON схема воронки на месте

## 🚀 Деплой

### 3. На сервере выполнить:
```bash
# Клонирование
git clone <repo-url> /var/www/chat-clone
cd /var/www/chat-clone

# Настройка
cp .env.server .env
nano .env  # Отредактировать

# Деплой с воронкой
chmod +x deploy-with-funnel.sh
./deploy-with-funnel.sh
```

## ✅ После деплоя

### 4. Проверить работу
- [ ] Сервер запущен: `pm2 status`
- [ ] API отвечает: `curl https://domain.com/api/automation-rules`
- [ ] Воронка загружена (5 правил)
- [ ] Админ панель доступна: `https://domain.com/admin/automation`

### 5. Настроить мониторинг
- [ ] Логи: `pm2 logs chat-clone`
- [ ] Автозапуск: `pm2 startup && pm2 save`
- [ ] Nginx (опционально)
- [ ] SSL сертификат

## 🔄 Обновление воронки

```bash
# Изменить схему
nano funnel-schemas/colombia-chicken-road.json

# Перезагрузить
node setup-colombia-funnel.js
```

## 🆘 Решение проблем

### Сервер не запускается:
```bash
pm2 logs chat-clone --lines 50
```

### Воронка не загружается:
```bash
# Проверить переменные окружения
echo $SERVER_DOMAIN

# Проверить API
curl -v http://localhost:3001/api/automation-rules
```

### Telegram бот не работает:
```bash
# Проверить токен
curl "https://api.telegram.org/bot<TOKEN>/getMe"

# Проверить webhook
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

## 📞 Контакты для поддержки

- Логи сервера: `/var/www/chat-clone/server.log`
- PM2 статус: `pm2 monit`
- Системные логи: `journalctl -u nginx -f`