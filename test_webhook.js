require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: false });

async function testWebhook() {
  try {
    // Удаляем webhook если есть
    await bot.deleteWebHook();
    console.log('Webhook deleted');
    
    // Получаем информацию о боте
    const me = await bot.getMe();
    console.log('Bot info:', me);
    
    // Получаем обновления вручную
    const updates = await bot.getUpdates();
    console.log('Recent updates:', updates.length);
    
    if (updates.length > 0) {
      console.log('Last update:', JSON.stringify(updates[updates.length - 1], null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testWebhook();