require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const { sequelize, Client, Message, User } = require('./models');
const TelegramService = require('./telegram');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

let telegramService;

// Routes
app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/', (req, res) => {
  res.render('index');
});

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

app.get('/admin', (req, res) => {
  res.render('admin');
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'role', 'created_at']
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const user = await User.create({ username, password, role });
    res.json({ id: user.id, username: user.username, role: user.role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/assign-client', async (req, res) => {
  try {
    const { client_id, operator } = req.body;
    await Client.update({ assigned_to: operator }, { where: { id: client_id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clients', async (req, res) => {
  try {
    const clients = await Client.findAll({
      order: [['created_at', 'DESC']]
    });
    const clientsWithMessages = clients.map(client => ({
      id: client.id,
      name: client.name,
      channel: client.channel,
      assigned_to: client.assigned_to,
      messages: []
    }));
    res.json(clientsWithMessages);
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

app.post('/api/send-file', upload.single('file'), async (req, res) => {
  try {
    const { client_id, operator } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const message = await telegramService.sendFile(client_id, file, operator);
    
    io.emit('new_message', {
      client_id: client_id,
      message: {
        id: message.id,
        text: message.text,
        file_url: message.file_url,
        file_name: message.file_name,
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
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Initialize
async function init() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    await sequelize.sync({ alter: true });
    console.log('Database synced');
    
    // Создаем админа по умолчанию
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
      telegramService = new TelegramService(process.env.TELEGRAM_BOT_TOKEN, io);
      console.log('Telegram bot initialized');
    } else {
      console.warn('TELEGRAM_BOT_TOKEN not provided');
    }
    
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Initialization error:', error);
    process.exit(1);
  }
}

init();