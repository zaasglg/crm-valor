#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 Настройка воронки Колумбия Chicken Road...\n');

// Функция для ожидания
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Функция для проверки, запущен ли сервер
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3001/api/automation-rules');
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Функция для загрузки правил
async function loadRules() {
  try {
    const schemaPath = path.join(__dirname, 'funnel-schemas', 'colombia-chicken-road.json');
    const schemaData = fs.readFileSync(schemaPath, 'utf8');
    const rules = JSON.parse(schemaData);
    
    console.log(`📋 Загружаем ${rules.length} правил воронки...\n`);
    
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      try {
        const response = await fetch('http://localhost:3001/api/automation-rules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(rule)
        });
        
        const result = await response.json();
        if (result.success) {
          console.log(`✅ Правило ${i + 1}/5: "${rule.name}" загружено (ID: ${result.id})`);
        } else {
          console.log(`❌ Ошибка загрузки правила ${i + 1}: ${result.error || 'Неизвестная ошибка'}`);
        }
      } catch (error) {
        console.log(`❌ Ошибка при отправке правила ${i + 1}: ${error.message}`);
      }
      
      // Небольшая задержка между запросами
      await sleep(100);
    }
    
    console.log('\n🎉 Воронка успешно настроена!');
    console.log('\n📝 Настроенные этапы:');
    console.log('1. Старт → 1смс (при открытии чата)');
    console.log('2. Ответ на 1смс → 2смс (при любом ответе с тегом "1смс")');
    console.log('3. Ответ на 2смс → регистрация (при любом ответе с тегом "2смс")');
    console.log('4. Прошел регу → демо (при добавлении тега "Прошел регу Колумбия")');
    console.log('5. Переходная воронка ФД→РД (при добавлении тега "переход_к_рд")');
    console.log('\n🔧 Для управления правилами откройте: http://localhost:3001/admin/automation');
    
  } catch (error) {
    console.error('❌ Ошибка при загрузке схемы:', error.message);
  }
}

async function main() {
  // Проверяем, запущен ли сервер
  console.log('🔍 Проверяем статус сервера...');
  
  let serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('⚠️  Сервер не запущен. Запустите сервер командой:');
    console.log('   npm start');
    console.log('   или');
    console.log('   node server.js');
    console.log('\nЗатем запустите этот скрипт снова.');
    process.exit(1);
  }
  
  console.log('✅ Сервер запущен, загружаем правила...\n');
  await loadRules();
}

// Запускаем если файл вызван напрямую
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { loadRules, checkServer };