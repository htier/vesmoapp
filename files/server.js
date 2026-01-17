// ========================================
// CIRCLESPACE BACKEND SERVER
// ========================================

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// ========================================
// ИНИЦИАЛИЗАЦИЯ
// ========================================

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

// ========================================
// MIDDLEWARE
// ========================================

// Безопасность
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Парсинг JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate Limiting (защита от спама)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // макс 100 запросов за 15 минут
  message: 'Слишком много запросов с этого IP, попробуйте позже'
});
app.use('/api/', limiter);

// ========================================
// ПОДКЛЮЧЕНИЕ К MONGODB
// ========================================

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB подключена'))
.catch(err => console.error('❌ Ошибка подключения к MongoDB:', err));

// ========================================
// ROUTES (API МАРШРУТЫ)
// ========================================

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const postRoutes = require('./routes/post');
const commentRoutes = require('./routes/comment');
const messageRoutes = require('./routes/message');
const friendRoutes = require('./routes/friend');
const callRoutes = require('./routes/call');
const reportRoutes = require('./routes/report');
const giftRoutes = require('./routes/gift');
const adminRoutes = require('./routes/admin');
const referralRoutes = require('./routes/referral');

app.use('/api/auth', authRoutes);          // Регистрация/Вход/Верификация
app.use('/api/user', userRoutes);          // Профиль
app.use('/api/posts', postRoutes);         // Посты
app.use('/api/comments', commentRoutes);   // Комментарии
app.use('/api/messages', messageRoutes);   // Сообщения
app.use('/api/friends', friendRoutes);     // Друзья
app.use('/api/calls', callRoutes);         // Звонки
app.use('/api/reports', reportRoutes);     // Жалобы
app.use('/api/gifts', giftRoutes);         // Подарки
app.use('/api/admin', adminRoutes);        // Админ-панель
app.use('/api/referral', referralRoutes);  // Реферальная система

// ========================================
// WEBSOCKET (SOCKET.IO)
// ========================================

const chatHandler = require('./socket/chatHandler');
const callHandler = require('./socket/callHandler');
const onlineStatus = require('./socket/onlineStatus');
const notificationsHandler = require('./socket/notifications');

io.on('connection', (socket) => {
  console.log('👤 Новый пользователь подключён:', socket.id);
  
  // Обработчики
  chatHandler(io, socket);           // Чат
  callHandler(io, socket);           // Звонки
  onlineStatus(io, socket);          // Онлайн статусы
  notificationsHandler(io, socket);  // Уведомления
  
  socket.on('disconnect', () => {
    console.log('👤 Пользователь отключён:', socket.id);
  });
});

// Передаём io в app для использования в routes
app.set('io', io);

// ========================================
// ГЛАВНЫЙ РОУТ
// ========================================

app.get('/', (req, res) => {
  res.json({
    message: '🌐 CircleSpace API v1.0',
    status: 'online',
    documentation: '/api/docs'
  });
});

// Обработка несуществующих роутов
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Роут не найден'
  });
});

// ========================================
// ОБРАБОТКА ОШИБОК
// ========================================

app.use((err, req, res, next) => {
  console.error('❌ Ошибка:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Внутренняя ошибка сервера',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ========================================
// ЗАПУСК СЕРВЕРА
// ========================================

server.listen(PORT, () => {
  console.log('');
  console.log('🚀 ========================================');
  console.log(`🚀 CircleSpace Server запущен на порту ${PORT}`);
  console.log('🚀 ========================================');
  console.log(`🌐 API: http://localhost:${PORT}`);
  console.log(`📝 Окружение: ${process.env.NODE_ENV || 'development'}`);
  console.log('🚀 ========================================');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM получен, закрываю сервер...');
  server.close(() => {
    console.log('✅ Сервер закрыт');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB отключена');
      process.exit(0);
    });
  });
});

module.exports = { app, server, io };
