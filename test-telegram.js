const https = require('https');

const token = '7389099274:AAHa_kv7O0hAt__b2xR2xflpO7YTZJ8kOWw';
const url = `https://api.telegram.org/bot${token}/getMe`;

console.log('Testing Telegram API connection...');

const req = https.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.ok) {
        console.log('✅ Bot connected successfully!');
        console.log('Bot info:', response.result);
      } else {
        console.log('❌ Bot connection failed:', response.description);
      }
    } catch (error) {
      console.log('❌ Error parsing response:', error.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Network error:', error.message);
});

req.setTimeout(10000, () => {
  console.log('❌ Request timeout');
  req.destroy();
});