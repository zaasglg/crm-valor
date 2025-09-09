const TelegramBot = require('node-telegram-bot-api');
const { Client, Message } = require('./models');

class SimpleTelegramService {
  constructor(token, io) {
    this.token = token;
    this.io = io;
    this.bot = new TelegramBot(token, { polling: true });
    this.setupHandlers();
  }

  setupHandlers() {
    console.log('Setting up simple Telegram handlers...');
    
    this.bot.on('message', async (msg) => {
      console.log('=== NEW MESSAGE ===');
      console.log('From:', msg.from.first_name, msg.from.id);
      console.log('Text:', msg.text);
      
      try {
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
        
        console.log('Message processed and emitted');
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    this.bot.on('polling_error', (error) => {
      console.log('Polling error:', error.message);
    });
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
}

module.exports = SimpleTelegramService;