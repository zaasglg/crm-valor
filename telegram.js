const TelegramBot = require('node-telegram-bot-api');
const { Client, Message } = require('./models');
const ChatDistributionService = require('./chatDistributionService');

class TelegramService {
  constructor(token, io, automationEngine = null) {
    this.token = token;
    this.io = io;
    this.bot = null;
    this.automationEngine = automationEngine;
    this.distributionService = new ChatDistributionService();
    this.initBot();
  }
  
  async stop() {
    if (this.bot) {
      try {
        await this.bot.stopPolling();
        console.log('Bot polling stopped');
      } catch (error) {
        console.log('Error stopping bot:', error.message);
      }
    }
  }

  async initBot() {
    try {
      console.log('Initializing Telegram bot...');

      // Создаем бота с простыми настройками
      this.bot = new TelegramBot(this.token, {
        polling: {
          interval: 3000,
          autoStart: true
        }
      });

      console.log('Bot polling started');
      this.setupHandlers();
      this.setupErrorHandling();
    } catch (error) {
      console.error('❌ Error initializing bot:', error.message);
      console.error('Error code:', error.code);

      if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND' || error.code === 'EFATAL') {
        console.log('⚠️  Telegram API недоступен в этой сети');
        console.log('💡 Возможные решения:');
        console.log('   1. Используйте VPN');
        console.log('   2. Подключитесь к другой сети');
        console.log('   3. Обратитесь к администратору сети');

        // Повторная попытка через 5 минут
        console.log('🔄 Повторная попытка через 5 минут...');
        setTimeout(() => this.initBot(), 300000);
      }
    }
  }  setupErrorHandling() {
    this.bot.on('polling_error', (error) => {
      if (error.code === 'ETELEGRAM' && error.message.includes('409')) {
        console.log('Conflict detected - waiting before retry...');
        // Просто ждем, не перезапускаем
      } else {
        console.log('Other polling error:', error.message);
      }
    });
    
    this.bot.on('error', (error) => {
      console.log('Bot error:', error.message);
    });
  }

  setupHandlers() {
    console.log('Setting up Telegram bot handlers...');
    
    this.bot.on('message', async (msg) => {
      console.log('Bot received message event');
      if (msg.text) {
        await this.handleIncomingMessage(msg);
      } else if (msg.document || msg.photo) {
        await this.handleIncomingFile(msg);
      }
    });
    
    console.log('Telegram bot handlers set up');
  }

  async handleIncomingMessage(msg) {
    try {
      console.log('=== INCOMING MESSAGE ===');
      console.log('From:', msg.from.id, msg.from.first_name, msg.from.last_name);
      console.log('Text:', msg.text);
      console.log('Chat ID:', msg.chat.id);
      console.log('Message ID:', msg.message_id);
      
      const [client, created] = await Client.findOrCreate({
        where: {
          channel: 'telegram',
          external_id: msg.from.id.toString()
        },
        defaults: {
          name: `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim() || 'Unknown',
          channel: 'telegram',
          external_id: msg.from.id.toString()
        }
      });

      console.log('Client found/created:', client.id, client.name, 'Created:', created);

      // Если клиент новый, назначаем ему менеджера
      if (created) {
        console.log('New client detected, assigning to manager...');
        const assignedManager = await this.distributionService.assignChatToManager(client.id);
        if (assignedManager) {
          client.assigned_to = assignedManager;
          console.log(`Client ${client.id} assigned to ${assignedManager}`);
        }
      }

      // Проверяем, нет ли уже такого сообщения
      const existingMessage = await Message.findOne({
        where: {
          client_id: client.id,
          text: msg.text || '',
          direction: 'in',
          created_at: {
            [require('sequelize').Op.gte]: new Date(Date.now() - 60000) // Последняя минута
          }
        }
      });
      
  // Отключено: фильтрация дубликатов
  // if (existingMessage) {
  //   console.log('Duplicate message detected, skipping');
  //   return;
  // }

      const message = await Message.create({
        client_id: client.id,
        text: msg.text || '',
        direction: 'in'
      });

      console.log('Message saved to DB:', message.id);

      const emitData = {
        client_id: client.id,
        client_name: client.name,
        client_assigned_to: client.assigned_to,
        message: {
          id: message.id,
          text: message.text,
          direction: message.direction,
          created_at: message.created_at
        }
      };
      
      console.log('Emitting to clients:', JSON.stringify(emitData, null, 2));
      this.io.emit('new_message', emitData);
      
      // Получаем клиента с актуальными тегами
      const clientData = await Client.findByPk(client.id);
      let clientTags = clientData && clientData.tags ? clientData.tags : [];
      
      // Проверяем и парсим теги если они строка
      if (typeof clientTags === 'string') {
        try {
          clientTags = JSON.parse(clientTags);
        } catch (e) {
          clientTags = [];
        }
      }
      
      // Убеждаемся что это массив
      if (!Array.isArray(clientTags)) {
        clientTags = [];
      }
      
      console.log(`Client ${client.id} current tags:`, clientTags);
      
      // Запускаем автоматизацию с тегами
      if (this.automationEngine) {
        console.log('Processing automation rules...');
        this.automationEngine.processEvent('message_received', {
          clientId: client.id,
          message: message,
          channel: 'telegram',
          tags: clientTags,
          client: clientData
        });
      }
      
      console.log('=== MESSAGE PROCESSED ===');
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }

  async handleIncomingFile(msg) {
    try {
      const [client] = await Client.findOrCreate({
        where: {
          channel: 'telegram',
          external_id: msg.from.id.toString()
        },
        defaults: {
          name: `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim() || 'Unknown',
          channel: 'telegram',
          external_id: msg.from.id.toString()
        }
      });

      let fileInfo;
      if (msg.document) {
        fileInfo = await this.bot.getFile(msg.document.file_id);
      } else if (msg.photo) {
        fileInfo = await this.bot.getFile(msg.photo[msg.photo.length - 1].file_id);
      }

      const message = await Message.create({
        client_id: client.id,
        text: msg.caption || 'Файл',
        file_url: `https://api.telegram.org/file/bot${this.bot.token}/${fileInfo.file_path}`,
        file_name: msg.document?.file_name || 'photo.jpg',
        direction: 'in'
      });

      this.io.emit('new_message', {
        client_id: client.id,
        client_name: client.name,
        client_assigned_to: client.assigned_to,
        message: {
          id: message.id,
          text: message.text,
          file_url: message.file_url,
          file_name: message.file_name,
          direction: message.direction,
          created_at: message.created_at
        }
      });
    } catch (error) {
      console.error('Error handling incoming file:', error);
    }
  }

  async sendMessage(clientId, text, operator = 'System') {
    try {
      const client = await Client.findByPk(clientId);
      if (!client) throw new Error('Client not found');

      await this.bot.sendMessage(client.external_id, text);

      const message = await Message.create({
        client_id: clientId,
        text,
        direction: 'out',
        operator
      });

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async sendFile(clientId, file, operator = 'System') {
    try {
      const client = await Client.findByPk(clientId);
      if (!client) throw new Error('Client not found');

      await this.bot.sendDocument(client.external_id, file.path);

      const message = await Message.create({
        client_id: clientId,
        text: `Файл: ${file.originalname}`,
        file_url: `/uploads/${file.filename}`,
        file_name: file.originalname,
        direction: 'out',
        operator
      });

      return message;
    } catch (error) {
      console.error('Error sending file:', error);
      throw error;
    }
  }

  async sendFileByPath(clientId, filePath, fileName, operator = 'System') {
    try {
      const client = await Client.findByPk(clientId);
      if (!client) throw new Error('Client not found');

      await this.bot.sendDocument(client.external_id, filePath);

      const message = await Message.create({
        client_id: clientId,
        text: `Файл: ${fileName}`,
        file_url: filePath,
        file_name: fileName,
        direction: 'out',
        operator
      });

      return message;
    } catch (error) {
      console.error('Error sending file by path:', error);
      throw error;
    }
  }
}

module.exports = TelegramService;