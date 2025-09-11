const fs = require('fs');
const path = require('path');

// Загрузка схемы воронки в систему
function loadFunnelSchema(schemaPath) {
  try {
    const schemaData = fs.readFileSync(schemaPath, 'utf8');
    const rules = JSON.parse(schemaData);
    
    console.log(`Загружаем схему воронки из: ${schemaPath}`);
    console.log(`Найдено правил: ${rules.length}`);
    
    // Отправляем каждое правило в API
    rules.forEach(async (rule, index) => {
      try {
        const response = await fetch('http://localhost:3000/api/automation-rules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(rule)
        });
        
        const result = await response.json();
        if (result.success) {
          console.log(`✅ Правило ${index + 1} "${rule.name}" загружено успешно (ID: ${result.id})`);
        } else {
          console.log(`❌ Ошибка загрузки правила ${index + 1}: ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ Ошибка при отправке правила ${index + 1}: ${error.message}`);
      }
    });
    
  } catch (error) {
    console.error('Ошибка при загрузке схемы:', error.message);
  }
}

// Загружаем схему Колумбия Chicken Road
const schemaPath = path.join(__dirname, 'funnel-schemas', 'colombia-chicken-road.json');
loadFunnelSchema(schemaPath);