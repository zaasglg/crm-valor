const TelegramBot = require('node-telegram-bot-api');

const token = '8297331661:AAGMrp3piKSpoU8ERnpVISwsi82vqEJm9c0';
const bot = new TelegramBot(token, { polling: true });

console.log('Testing Telegram bot...');

bot.on('message', (msg) => {
  console.log('Received message:', msg);
  bot.sendMessage(msg.chat.id, 'Тест получен!');
});

bot.on('polling_error', (error) => {
  console.log('Polling error:', error);
});

console.log('Bot started. Send a message to @Monica_Lopez_Bot');