class AutomationEngine {
  constructor(telegramService = null) {
    this.rules = [];
    this.telegramService = telegramService;
  }
  
  setTelegramService(telegramService) {
    this.telegramService = telegramService;
  }

  addRule(rule) {
    if (!rule.id || rule.id === 'auto') {
      rule.id = Date.now().toString();
    }
    this.rules.push(rule);
    return rule.id;
  }

  async processEvent(eventType, data) {
    const matchingRules = this.rules.filter(rule => rule.event === eventType);
    console.log(`Found ${matchingRules.length} matching rules for event: ${eventType}`);
    
    for (const rule of matchingRules) {
      console.log(`Checking rule: ${rule.name}`);
      if (this.checkCondition(rule.condition, data)) {
        console.log(`Rule matched, executing actions...`);
        await this.executeAction(rule.action, data);
      } else {
        console.log(`Rule condition not met`);
      }
    }
  }

  checkCondition(condition, data) {
    if (!condition) return true;
    
    console.log('Checking condition:', condition, 'with data tags:', data.tags);

    for (const [key, value] of Object.entries(condition)) {
      console.log(`Checking condition key: ${key}, value: ${value}`);
      switch (key) {
        case 'text_contains':
          const text = (data.message?.text || '').toLowerCase();
          const keywords = Array.isArray(value) ? value : [value];
          if (!keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
            return false;
          }
          break;

        case 'text_not_contains':
          const textNotContains = (data.message?.text || '').toLowerCase();
          const excludeKeywords = Array.isArray(value) ? value : [value];
          if (excludeKeywords.some(keyword => textNotContains.includes(keyword.toLowerCase()))) {
            console.log(`Text contains excluded keyword: ${value}`);
            return false;
          }
          break;

        case 'has_tag':
          let tags = data.tags || [];
          
          // Парсим теги если они строка
          if (typeof tags === 'string') {
            try {
              tags = JSON.parse(tags);
              // Двойной парсинг если нужно
              if (typeof tags === 'string') {
                tags = JSON.parse(tags);
              }
            } catch (e) {
              tags = [];
            }
          }
          
          // Убеждаемся что это массив
          if (!Array.isArray(tags)) {
            tags = [];
          }
          
          // Фильтруем только валидные теги
          tags = tags.filter(tag => typeof tag === 'string' && tag.length > 1);
          
          const requiredTags = Array.isArray(value) ? value : [value];
          console.log(`Checking tags: client has [${tags.join(', ')}], required [${requiredTags.join(', ')}]`);
          
          if (!requiredTags.some(tag => tags.includes(tag))) {
            console.log('Tag condition not met');
            return false;
          }
          console.log('Tag condition met');
          break;

        case 'from_channel':
          const channels = Array.isArray(value) ? value : [value];
          if (!channels.includes(data.channel)) {
            return false;
          }
          break;

        case 'time_since_last_reply_gt':
          const timeSince = data.timeSinceLastReply || 0;
          if (timeSince <= value) {
            return false;
          }
          break;

        case 'file_type':
          const fileTypes = Array.isArray(value) ? value : [value];
          if (!data.file || !fileTypes.includes(data.file.type)) {
            return false;
          }
          break;
      }
    }

    return true;
  }

  async executeAction(action, data) {
    for (const [key, value] of Object.entries(action)) {
      switch (key) {
        case 'add_tag':
          const tagsToAdd = Array.isArray(value) ? value : [value];
          await this.addTags(data.clientId, tagsToAdd);
          break;

        case 'remove_tag':
          const tagsToRemove = Array.isArray(value) ? value : [value];
          await this.removeTags(data.clientId, tagsToRemove);
          break;

        case 'auto_reply':
          await this.sendAutoReply(data.clientId, value);
          break;

        case 'send_file':
          await this.sendAutoFile(data.clientId, value);
          break;

        case 'assign_to_queue':
          await this.assignToQueue(data.clientId, value);
          break;

        case 'create_task':
          await this.createTask(value);
          break;

        case 'call_outbound_api':
          await this.callAPI(value);
          break;
      }
    }
  }

  async addTags(clientId, tags) {
    console.log(`Adding tags ${tags.join(', ')} to client ${clientId}`);
    try {
      const { Client } = require('./models');
      const client = await Client.findByPk(clientId);
      if (client) {
        let currentTags = client.tags || [];
        // Проверяем, если tags это строка, парсим её
        if (typeof currentTags === 'string') {
          try {
            currentTags = JSON.parse(currentTags);
          } catch (e) {
            currentTags = [];
          }
        }
        // Убеждаемся что это массив
        if (!Array.isArray(currentTags)) {
          currentTags = [];
        }
        const newTags = [...new Set([...currentTags, ...tags])];
        console.log(`Before update - current: [${currentTags.join(', ')}], adding: [${tags.join(', ')}], result: [${newTags.join(', ')}]`);
        await client.update({ tags: JSON.stringify(newTags) });
        console.log(`Tags updated for client ${clientId}:`, newTags);
        
        // Сохраняем системное сообщение в базу данных
        if (this.telegramService) {
          try {
            const { Message } = require('./models');
            const systemMessage = await Message.create({
              client_id: clientId,
              text: `Система присвоила клиенту теги: "${tags.join(', ')}".`,
              direction: 'system',
              operator: 'automation'
            });
            
            // Отправляем через socket
            this.telegramService.io.emit('system_message', {
              client_id: clientId,
              client_name: client.name,
              message: {
                id: systemMessage.id,
                text: systemMessage.text,
                direction: 'system',
                created_at: systemMessage.created_at
              }
            });
          } catch (error) {
            console.error('Error saving system message:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error adding tags:', error);
    }
  }

  async removeTags(clientId, tags) {
    console.log(`Removing tags ${tags.join(', ')} from client ${clientId}`);
    try {
      const { Client } = require('./models');
      const client = await Client.findByPk(clientId);
      if (client) {
        let currentTags = client.tags || [];
        // Проверяем, если tags это строка, парсим её
        if (typeof currentTags === 'string') {
          try {
            currentTags = JSON.parse(currentTags);
          } catch (e) {
            currentTags = [];
          }
        }
        // Убеждаемся что это массив
        if (!Array.isArray(currentTags)) {
          currentTags = [];
        }
        const newTags = currentTags.filter(tag => !tags.includes(tag));
        await client.update({ tags: JSON.stringify(newTags) });
        console.log(`Tags updated for client ${clientId}:`, newTags);
        
        // Сохраняем системное сообщение в базу данных
        if (this.telegramService) {
          try {
            const { Message } = require('./models');
            const systemMessage = await Message.create({
              client_id: clientId,
              text: `Система удалила у клиента теги: "${tags.join(', ')}".`,
              direction: 'system',
              operator: 'automation'
            });
            
            // Отправляем через socket
            this.telegramService.io.emit('system_message', {
              client_id: clientId,
              client_name: client.name,
              message: {
                id: systemMessage.id,
                text: systemMessage.text,
                direction: 'system',
                created_at: systemMessage.created_at
              }
            });
          } catch (error) {
            console.error('Error saving system message:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error removing tags:', error);
    }
  }

  async sendAutoReply(clientId, messages) {
    // Поддержка как строки, так и массива сообщений с задержками
    const messageArray = Array.isArray(messages) ? messages : [{ text: messages, delay: 0 }];
    
    for (const messageObj of messageArray) {
      const message = typeof messageObj === 'string' ? messageObj : messageObj.text;
      const delay = typeof messageObj === 'object' ? messageObj.delay || 0 : 0;
      
      // Задержка перед отправкой
      if (delay > 0) {
        console.log(`Waiting ${delay}ms before sending message...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      console.log(`Sending auto-reply to client ${clientId}: ${message}`);
      if (this.telegramService) {
        try {
          await this.telegramService.sendMessage(clientId, message, 'automation');
          console.log('Auto-reply sent successfully');
          
          // Отправляем уведомление в веб-интерфейс
          const { Client } = require('./models');
          const client = await Client.findByPk(clientId);
          if (client && this.telegramService.io) {
            this.telegramService.io.emit('automation_notification', {
              client_id: clientId,
              client_name: client.name,
              action: 'auto_reply',
              message: `Отправлено автосообщение: ${message.substring(0, 50)}...`,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error sending auto-reply:', error);
        }
      }
    }
  }

  async sendAutoFile(clientId, fileData) {
    console.log(`Sending auto-file to client ${clientId}: ${fileData.name}`);
    if (this.telegramService) {
      try {
        await this.telegramService.sendFileByPath(clientId, fileData.path, fileData.name, 'automation');
        console.log('Auto-file sent successfully');
        
        // Отправляем уведомление в веб-интерфейс
        const { Client } = require('./models');
        const client = await Client.findByPk(clientId);
        if (client && this.telegramService.io) {
          this.telegramService.io.emit('automation_notification', {
            client_id: clientId,
            client_name: client.name,
            action: 'send_file',
            message: `Отправлен файл: ${fileData.name}`,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error sending auto-file:', error);
      }
    }
  }

  assignToQueue(clientId, queue) {
    console.log(`Assigning client ${clientId} to queue ${queue}`);
  }

  createTask(taskData) {
    console.log(`Creating task: ${taskData.title}`);
  }

  callAPI(apiData) {
    console.log(`Calling API: ${apiData.method} ${apiData.url}`);
  }

  parseRuleFromText(instruction) {
    // Простой парсер инструкций - можно расширить
    const rule = {
      id: "auto",
      name: "Автоправило",
      event: "message_received",
      condition: {},
      action: {}
    };

    const text = instruction.toLowerCase();

    // Определяем событие
    if (text.includes('получен файл') || text.includes('прислал файл')) {
      rule.event = 'file_received';
    } else if (text.includes('открыт чат') || text.includes('начал диалог')) {
      rule.event = 'chat_opened';
    } else if (text.includes('закрыт чат') || text.includes('завершен диалог')) {
      rule.event = 'chat_closed';
    } else if (text.includes('добавлен тег')) {
      rule.event = 'tag_added';
    } else if (text.includes('нет ответа') || text.includes('без ответа')) {
      rule.event = 'no_reply_timeout';
    }

    // Определяем условия
    if (text.includes('содержит') || text.includes('пишет')) {
      const match = text.match(/["']([^"']+)["']/);
      if (match) {
        rule.condition.text_contains = match[1];
      }
    }

    if (text.includes('telegram')) rule.condition.from_channel = 'telegram';
    if (text.includes('whatsapp')) rule.condition.from_channel = 'whatsapp';

    // Определяем действия
    if (text.includes('ответить') || text.includes('отправить сообщение')) {
      const match = text.match(/ответить\s+["']([^"']+)["']/i);
      if (match) {
        rule.action.auto_reply = match[1];
      }
    }
    
    if (text.includes('отправить файл')) {
      const match = text.match(/файл\s+["']([^"']+)["']/i);
      if (match) {
        rule.action.send_file = {
          path: match[1],
          name: match[1].split('/').pop()
        };
      }
    }

    if (text.includes('добавить тег')) {
      const match = text.match(/тег\s+["']([^"']+)["']/i);
      if (match) {
        rule.action.add_tag = match[1];
      }
    }

    if (text.includes('назначить')) {
      if (text.includes('поддержк')) rule.action.assign_to_queue = 'support';
      if (text.includes('продаж')) rule.action.assign_to_queue = 'sales';
      if (text.includes('биллинг')) rule.action.assign_to_queue = 'billing';
    }

    return rule;
  }
}

module.exports = AutomationEngine;