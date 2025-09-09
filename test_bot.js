require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN not found in .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });

bot.getMe().then(me => {
  console.log('Bot connected successfully:');
  console.log('Username:', me.username);
  console.log('First name:', me.first_name);
  console.log('ID:', me.id);
}).catch(err => {
  console.error('Bot connection failed:', err.message);
  console.error('Error code:', err.code);
});
