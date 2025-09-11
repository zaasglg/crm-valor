const https = require('https');
const HttpsProxyAgent = require('https-proxy-agent');

// Список бесплатных прокси для тестирования
const proxyList = [
  'http://185.82.99.181:9091',
  'http://45.67.212.135:9091',
  'http://185.82.99.181:9091',
  'http://45.67.212.135:9091',
  'http://185.82.99.181:9091',
  'http://91.107.147.206:9091',
  'http://91.107.147.206:9091',
  'http://91.107.147.206:9091'
];

const token = '7389099274:AAHa_kv7O0hAt__b2xR2xflpO7YTZJ8kOWw';

async function testProxy(proxyUrl) {
  return new Promise((resolve) => {
    try {
      const agent = HttpsProxyAgent(proxyUrl);
      const url = `https://api.telegram.org/bot${token}/getMe`;

      const req = https.get(url, { agent, timeout: 10000 }, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.ok) {
              resolve({ proxy: proxyUrl, status: 'success', bot: response.result });
            } else {
              resolve({ proxy: proxyUrl, status: 'error', message: response.description });
            }
          } catch (error) {
            resolve({ proxy: proxyUrl, status: 'error', message: 'Invalid response' });
          }
        });
      });

      req.on('error', (error) => {
        resolve({ proxy: proxyUrl, status: 'error', message: error.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ proxy: proxyUrl, status: 'error', message: 'Timeout' });
      });

    } catch (error) {
      resolve({ proxy: proxyUrl, status: 'error', message: error.message });
    }
  });
}

async function testAllProxies() {
  console.log('🔍 Тестирование прокси-серверов для Telegram API...\n');

  const results = [];

  for (const proxy of proxyList) {
    console.log(`Testing proxy: ${proxy}`);
    const result = await testProxy(proxy);
    results.push(result);

    if (result.status === 'success') {
      console.log(`✅ ${proxy} - РАБОТАЕТ!`);
      console.log(`   Бот: @${result.bot.username} (ID: ${result.bot.id})`);
    } else {
      console.log(`❌ ${proxy} - ${result.message}`);
    }
    console.log('');
  }

  const workingProxies = results.filter(r => r.status === 'success');

  console.log('📊 РЕЗУЛЬТАТЫ:');
  console.log(`Всего протестировано: ${results.length}`);
  console.log(`Рабочих прокси: ${workingProxies.length}`);

  if (workingProxies.length > 0) {
    console.log('\n🎉 НАЙДЕНЫ РАБОЧИЕ ПРОКСИ:');
    workingProxies.forEach(proxy => {
      console.log(`   ${proxy.proxy}`);
    });

    console.log('\n💡 ДОБАВЬТЕ В .env ФАЙЛ:');
    console.log(`   PROXY_URL=${workingProxies[0].proxy}`);
  } else {
    console.log('\n❌ Рабочие прокси не найдены.');
    console.log('Попробуйте:');
    console.log('1. Найти другие прокси-сервера');
    console.log('2. Использовать платный прокси-сервис');
    console.log('3. Настроить собственный прокси-сервер');
  }
}

testAllProxies();
