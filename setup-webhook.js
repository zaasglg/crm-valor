require('dotenv').config();
const TelegramWebhookService = require('./telegram-webhook');

async function setupWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookUrl = process.env.WEBHOOK_URL; // например: https://yourdomain.com
  
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not found in .env file');
    process.exit(1);
  }
  
  if (!webhookUrl) {
    console.error('WEBHOOK_URL not found in .env file');
    console.log('Please add WEBHOOK_URL=https://yourdomain.com to your .env file');
    process.exit(1);
  }
  
  console.log('Setting up webhook...');
  console.log('Bot Token:', token.substring(0, 10) + '...');
  console.log('Webhook URL:', webhookUrl);
  
  const telegramService = new TelegramWebhookService(token);
  
  try {
    const success = await telegramService.setupWebhook(webhookUrl);
    
    if (success) {
      console.log('✅ Webhook setup completed successfully!');
      console.log(`Webhook endpoint: ${webhookUrl}/webhook/${token}`);
      console.log('Make sure your server is running and accessible from the internet');
    } else {
      console.log('❌ Failed to setup webhook');
    }
  } catch (error) {
    console.error('Error setting up webhook:', error.message);
  }
  
  process.exit(0);
}

setupWebhook();