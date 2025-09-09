require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { sequelize, Client, Message, User } = require('./models');
const SimpleTelegramService = require('./telegram-simple');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

let telegramService;

// Routes
app.get('/login', (req, res) => res.render('login'));
app.get('/', (req, res) => res.render('chat'));

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username, password } });
    
    if (user) {
      res.json({ 
        success: true, 
        user: { id: user.id, username: user.username, role: user.role } 
      });
    } else {
      res.json({ success: false, error: 'Неверный логин или пароль' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/clients', async (req, res) => {
  try {
    const clients = await Client.findAll({ order: [['created_at', 'DESC']] });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages/:clientId', async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: { client_id: req.params.clientId },
      order: [['created_at', 'ASC']]
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/send', async (req, res) => {
  try {
    const { client_id, text, operator } = req.body;
    const message = await telegramService.sendMessage(client_id, text, operator);
    
    io.emit('new_message', {
      client_id: client_id,
      message: {
        id: message.id,
        text: message.text,
        direction: message.direction,
        created_at: message.created_at,
        operator: message.operator
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected');
  socket.on('disconnect', () => console.log('Client disconnected'));
});

// Initialize
async function init() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    await sequelize.sync({ force: false });
    console.log('Database synced');
    
    const adminExists = await User.findOne({ where: { role: 'admin' } });
    if (!adminExists) {
      await User.create({
        username: 'admin',
        password: 'admin123',
        role: 'admin'
      });
      console.log('Default admin created: admin/admin123');
    }
    
    if (process.env.TELEGRAM_BOT_TOKEN) {
      telegramService = new SimpleTelegramService(process.env.TELEGRAM_BOT_TOKEN, io);
      console.log('Telegram bot initialized');
    }
    
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Initialization error:', error);
    process.exit(1);
  }
}

init();