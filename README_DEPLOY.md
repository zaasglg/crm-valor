# Деплой на сервер

## 1. Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PM2
sudo npm install -g pm2

# Установка Nginx
sudo apt install nginx -y
```

## 2. Загрузка проекта

```bash
# Клонирование или загрузка проекта
git clone <your-repo> /var/www/chat-clone
# или
scp -r chat_clone/ user@server:/var/www/chat-clone

cd /var/www/chat-clone
```

## 3. Настройка проекта

```bash
# Создание .env файла
cp .env.example .env
nano .env

# Добавить:
TELEGRAM_BOT_TOKEN=ваш_токен_бота
PORT=3001
```

## 4. Запуск приложения

```bash
# Установка зависимостей и запуск
chmod +x deploy.sh
./deploy.sh
```

## 5. Настройка Nginx

```bash
# Копирование конфигурации
sudo cp nginx.conf /etc/nginx/sites-available/chat-clone
sudo ln -s /etc/nginx/sites-available/chat-clone /etc/nginx/sites-enabled/

# Редактирование конфигурации
sudo nano /etc/nginx/sites-available/chat-clone
# Замените chat.yourdomain.com на ваш субдомен

# Перезапуск Nginx
sudo nginx -t
sudo systemctl restart nginx
```

## 6. SSL сертификат (опционально)

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получение SSL сертификата
sudo certbot --nginx -d chat.yourdomain.com
```

## 7. Автозапуск

```bash
# PM2 автозапуск
pm2 startup
pm2 save
```

## Управление

```bash
# Просмотр логов
pm2 logs chat-clone

# Перезапуск
pm2 restart chat-clone

# Остановка
pm2 stop chat-clone

# Статус
pm2 status
```

## Доступ

После настройки приложение будет доступно по адресу:
- http://chat.yourdomain.com (или ваш субдомен)
- Админ панель: http://chat.yourdomain.com/admin
- Логин: admin / admin123