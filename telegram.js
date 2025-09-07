const TelegramBot = require('node-telegram-bot-api');
const { Client, Message } = require('./models');

class TelegramService {
  constructor(token, io) {
    this.bot = new TelegramBot(token, { polling: true });
    this.io = io;
    this.setupHandlers();
  }

  setupHandlers() {
    this.bot.on('message', async (msg) => {
      if (msg.text) {
        await this.handleIncomingMessage(msg);
      } else if (msg.document || msg.photo) {
        await this.handleIncomingFile(msg);
      }
    });
  }

  async handleIncomingMessage(msg) {
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

      const message = await Message.create({
        client_id: client.id,
        text: msg.text || '',
        direction: 'in'
      });

      this.io.emit('new_message', {
        client_id: client.id,
        client_name: client.name,
        client_assigned_to: client.assigned_to,
        message: {
          id: message.id,
          text: message.text,
          direction: message.direction,
          created_at: message.created_at
        }
      });
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
}

module.exports = TelegramService;