require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

async function checkWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not found in .env file');
    process.exit(1);
  }
  
  const bot = new TelegramBot(token, { polling: false });
  
  try {
    console.log('Checking webhook status...');
    
    const webhookInfo = await bot.getWebHookInfo();
    
    console.log('\n=== WEBHOOK STATUS ===');
    console.log('URL:', webhookInfo.url || 'Not set');
    console.log('Has custom certificate:', webhookInfo.has_custom_certificate);
    console.log('Pending update count:', webhookInfo.pending_update_count);
    console.log('Last error date:', webhookInfo.last_error_date ? new Date(webhookInfo.last_error_date * 1000) : 'None');
    console.log('Last error message:', webhookInfo.last_error_message || 'None');
    console.log('Max connections:', webhookInfo.max_connections);
    console.log('Allowed updates:', webhookInfo.allowed_updates);
    
    if (webhookInfo.url) {
      console.log('\n✅ Webhook is configured');
      if (webhookInfo.last_error_message) {
        console.log('⚠️  Last error:', webhookInfo.last_error_message);
      }
    } else {
      console.log('\n❌ Webhook is not configured');
      console.log('Use setup-webhook.js to configure webhook');
    }
    
  } catch (error) {
    console.error('Error checking webhook:', error.message);
  }
  
  process.exit(0);
}

checkWebhook();