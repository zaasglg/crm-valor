const TelegramBot = require('node-telegram-bot-api');
const { Client, Message } = require('./models');

class TelegramWebhookService {
  constructor(token, io, automationEngine = null) {
    this.token = token;
    this.io = io;
    this.bot = null;
    this.automationEngine = automationEngine;
    this.webhookUrl = null;
    this.initBot();
  }

  async initBot() {
    try {
      // Создаем бота без polling для webhook
      this.bot = new TelegramBot(this.token, { polling: false });
      
      console.log('Telegram bot initialized for webhook mode');
      this.setupErrorHandling();
    } catch (error) {
      console.error('Error initializing bot:', error.message);
    }
  }

  async setupWebhook(webhookUrl, port = 3001) {
    try {
      this.webhookUrl = webhookUrl;
      
      // Удаляем старый webhook
      await this.bot.deleteWebHook();
      console.log('Old webhook deleted');
      
      // Устанавливаем новый webhook
      const result = await this.bot.setWebHook(`${webhookUrl}/webhook/${this.token}`, {
        allowed_updates: ['message', 'callback_query']
      });
      
      if (result) {
        console.log(`Webhook set successfully: ${webhookUrl}/webhook/${this.token}`);
        
        // Проверяем статус webhook
        const webhookInfo = await this.bot.getWebHookInfo();
        console.log('Webhook info:', webhookInfo);
        
        return true;
      } else {
        throw new Error('Failed to set webhook');
      }
    } catch (error) {
      console.error('Error setting webhook:', error.message);
      return false;
    }
  }

  // Обработчик для Express маршрута webhook
  getWebhookHandler() {
    return async (req, res) => {
      try {
        const update = req.body;
        
        if (update.message) {
          if (update.message.text) {
            await this.handleIncomingMessage(update.message);
          } else if (update.message.document || update.message.photo) {
            await this.handleIncomingFile(update.message);
          }
        }
        
        res.status(200).send('OK');
      } catch (error) {
        console.error('Webhook handler error:', error);
        res.status(500).send('Error');
      }
    };
  }

  setupErrorHandling() {
    this.bot.on('error', (error) => {
      console.log('Bot error:', error.message);
    });
  }

  async handleIncomingMessage(msg) {
    try {
      console.log('=== INCOMING MESSAGE (WEBHOOK) ===');
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
      
      if (existingMessage) {
        console.log('Duplicate message detected, skipping');
        return;
      }

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
      
      // Запускаем автоматизацию
      if (this.automationEngine) {
        console.log('Processing automation rules...');
        this.automationEngine.processEvent('message_received', {
          clientId: client.id,
          message: message,
          channel: 'telegram',
          client: client
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

  async stop() {
    if (this.bot) {
      try {
        await this.bot.deleteWebHook();
        console.log('Webhook deleted');
      } catch (error) {
        console.log('Error deleting webhook:', error.message);
      }
    }
  }
}

module.exports = TelegramWebhookService;