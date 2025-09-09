#!/bin/bash

# Останавливаем все процессы node server.js
pkill -f "node server.js"
pkill -f "npm start"

# Ждем немного
sleep 2

# Запускаем сервер
cd /Users/erdaulet/Desktop/crm/chat_clone
npm start