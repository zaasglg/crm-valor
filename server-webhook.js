require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sequelize, Client, Message, User } = require('./models');
const TelegramWebhookService = require('./telegram-webhook');
const MessageClassifier = require('./message-classifier');
const AutomationEngine = require('./automation-engine');

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
const messageClassifier = new MessageClassifier();
const automationEngine = new AutomationEngine();
let automationRules = [];

// Webhook endpoint для Telegram
app.post('/webhook/:token', (req, res) => {
  const token = req.params.token;
  
  if (token !== process.env.TELEGRAM_BOT_TOKEN) {
    return res.status(401).send('Unauthorized');
  }
  
  if (telegramService && telegramService.getWebhookHandler) {
    telegramService.getWebhookHandler()(req, res);
  } else {
    res.status(500).send('Telegram service not initialized');
  }
});

// Routes (все остальные маршруты остаются такими же)
app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/logout', (req, res) => {
  res.redirect('/login');
});

app.get('/', (req, res) => {
  res.render('chat');
});

app.get('/old-chat', (req, res) => {
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

// Admin routes
app.get('/admin', (req, res) => {
  res.redirect('/admin/dashboard');
});

app.get('/admin/old', (req, res) => {
  res.render('admin');
});

app.get('/admin/dashboard', (req, res) => {
  res.render('layout', {
    title: 'Дашборд - CRM',
    page: 'dashboard',
    pageTitle: 'Дашборд',
    body: require('fs').readFileSync(path.join(__dirname, 'views/admin/dashboard.ejs'), 'utf8')
  });
});

app.get('/admin/users', (req, res) => {
  res.render('layout', {
    title: 'Сотрудники - CRM',
    page: 'users',
    pageTitle: 'Управление сотрудниками',
    body: require('fs').readFileSync(path.join(__dirname, 'views/admin/users.ejs'), 'utf8')
  });
});

app.get('/admin/clients', (req, res) => {
  res.render('layout', {
    title: 'Клиенты - CRM',
    page: 'clients',
    pageTitle: 'Управление клиентами',
    body: require('fs').readFileSync(path.join(__dirname, 'views/admin/clients.ejs'), 'utf8')
  });
});

app.get('/admin/broadcast', (req, res) => {
  res.render('layout', {
    title: 'Рассылка - CRM',
    page: 'broadcast',
    pageTitle: 'Массовая рассылка',
    body: require('fs').readFileSync(path.join(__dirname, 'views/admin/broadcast.ejs'), 'utf8')
  });
});

app.get('/admin/chats', (req, res) => {
  res.render('layout', {
    title: 'Чаты - CRM',
    page: 'chats',
    pageTitle: 'Статистика чатов',
    body: require('fs').readFileSync(path.join(__dirname, 'views/admin/chats.ejs'), 'utf8')
  });
});

app.get('/admin/settings', (req, res) => {
  res.render('layout', {
    title: 'Настройки - CRM',
    page: 'settings',
    pageTitle: 'Настройки системы',
    body: require('fs').readFileSync(path.join(__dirname, 'views/admin/settings.ejs'), 'utf8')
  });
});

app.get('/admin/classifier', (req, res) => {
  res.render('layout', {
    title: 'Классификатор - CRM',
    page: 'classifier',
    pageTitle: 'Классификатор сообщений',
    body: require('fs').readFileSync(path.join(__dirname, 'views/admin/classifier.ejs'), 'utf8')
  });
});

app.get('/admin/automation', (req, res) => {
  res.render('layout', {
    title: 'Автоматизация - CRM',
    page: 'automation',
    pageTitle: 'Правила автоматизации',
    body: require('fs').readFileSync(path.join(__dirname, 'views/admin/automation.ejs'), 'utf8')
  });
});

app.get('/user-card', (req, res) => {
  res.render('user_card');
});

app.get('/user-card-fragment', (req, res) => {
  fs.readFile(path.join(__dirname, 'views', 'user_card.ejs'), 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error loading user card');
    } else {
      res.send(data);
    }
  });
});

// API routes
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

app.post('/api/update-client-comment', async (req, res) => {
  try {
    const { client_id, comment } = req.body;
    await Client.update({ comment: comment }, { where: { id: client_id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/update-client-cluster', async (req, res) => {
  try {
    const { client_id, cluster } = req.body;
    await Client.update({ cluster: cluster }, { where: { id: client_id } });
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
      external_id: client.external_id,
      assigned_to: client.assigned_to,
      comment: client.comment,
      created_at: client.created_at,
      messages: []
    }));
    res.json(clientsWithMessages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clients/:id', async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({
      id: client.id,
      name: client.name,
      channel: client.channel,
      external_id: client.external_id,
      assigned_to: client.assigned_to,
      comment: client.comment,
      created_at: client.created_at
    });
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

app.post('/api/broadcast', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    if (!telegramService) {
      return res.status(500).json({ error: 'Telegram service not initialized' });
    }
    
    const clients = await Client.findAll();
    let sentCount = 0;
    
    for (const client of clients) {
      try {
        await telegramService.sendMessage(client.id, message, 'admin');
        sentCount++;
      } catch (error) {
        console.error(`Failed to send message to client ${client.id}:`, error);
      }
    }
    
    res.json({ success: true, sent: sentCount, total: clients.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/classify-message', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const result = messageClassifier.classify(message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/parse-rule', (req, res) => {
  try {
    const { instruction } = req.body;
    const rule = automationEngine.parseRuleFromText(instruction);
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/automation-rules', (req, res) => {
  res.json(automationRules);
});

app.post('/api/automation-rules', (req, res) => {
  try {
    const rule = req.body;
    const id = automationEngine.addRule(rule);
    automationRules.push({ ...rule, id });
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/automation-rules/:id', (req, res) => {
  try {
    const id = req.params.id;
    automationRules = automationRules.filter(rule => rule.id !== id);
    automationEngine.rules = automationEngine.rules.filter(rule => rule.id !== id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload-automation-file', upload.single('file'), (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({ 
      success: true, 
      filePath: `/uploads/${file.filename}`,
      fileName: file.originalname
    });
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
    
    await sequelize.sync({ force: false });
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
      telegramService = new TelegramWebhookService(process.env.TELEGRAM_BOT_TOKEN, io, automationEngine);
      automationEngine.setTelegramService(telegramService);
      console.log('Telegram webhook service initialized');
      
      // Если указан WEBHOOK_URL, автоматически настраиваем webhook
      if (process.env.WEBHOOK_URL) {
        console.log('Setting up webhook automatically...');
        const success = await telegramService.setupWebhook(process.env.WEBHOOK_URL);
        if (success) {
          console.log('✅ Webhook configured successfully');
        } else {
          console.log('❌ Failed to configure webhook');
        }
      } else {
        console.log('WEBHOOK_URL not set. Use setup-webhook.js to configure webhook manually');
      }
      
      console.log('Automation engine linked to telegram service');
    } else {
      console.warn('TELEGRAM_BOT_TOKEN not provided');
    }
    
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Webhook endpoint: http://localhost:${PORT}/webhook/${process.env.TELEGRAM_BOT_TOKEN}`);
    });
  } catch (error) {
    console.error('Initialization error:', error);
    process.exit(1);
  }
}

init();

// Корректное завершение процесса
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  if (telegramService) {
    await telegramService.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  if (telegramService) {
    await telegramService.stop();
  }
  process.exit(0);
});