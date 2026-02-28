const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const dotenv = require('dotenv');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

// ─── Environment variables ────────────────────────────────────────
dotenv.config();

const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const swaggerSpec = require('./config/swagger');
const { errorHandler } = require('./middleware/errorHandler');
const { saveMessage } = require('./controllers/chatController');
const logger = require('./utils/logger');

// ─── Uygulama ve HTTP sunucusu ────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);

// ─── Socket.io başlat ─────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'https://mernapp-ecru.vercel.app',
    credentials: true,
  },
  maxHttpBufferSize: 10 * 1024 * 1024, // 10MB (dosya paylaşımı için)
});

// ─── Veritabanı bağlantısı ────────────────────────────────────────
connectDB();

// ─── Redis bağlantısı ─────────────────────────────────────────────
connectRedis();

// ─── GÜVENLİK MİDDLEWARE'LERİ ───────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Çok fazla istek gönderildi. 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── GENEL MİDDLEWARE'LER ────────────────────────────────────────
app.use(express.json({ limit: '10mb' })); // Dosya upload'ları için artırıldı
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(compression());

// Loglama — Winston + Morgan
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev', { stream: logger.stream }));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// ─── Static dosyalar (uploads) ────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── SWAGGER API Dokümantasyonu ───────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MERN App API Docs',
}));

// ─── ROUTES ───────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API çalışıyor',
    timestamp: new Date().toISOString(),
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: '2.0.0',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route bulunamadı: ${req.method} ${req.originalUrl}`,
  });
});

// ─── GLOBAL ERROR HANDLER ────────────────────────────────────────
app.use(errorHandler);

// ─── SOCKET.IO — GERÇEK ZAMANLI CHAT ─────────────────────────────
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');
const Notification = require('./models/Notification');

// Online kullanıcıları takip et
const onlineUsers = new Map();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Token bulunamadı'));

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return next(new Error('Kullanıcı bulunamadı'));

    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Kimlik doğrulama başarısız'));
  }
});

io.on('connection', (socket) => {
  const user = socket.user;
  logger.info(`🟢 Kullanıcı bağlandı: ${user.name} (${socket.id})`);

  // Online kullanıcı listesine ekle
  const avatarUrl = (user.avatar && !user.avatar.startsWith('http'))
    ? `${process.env.BACKEND_URL || ''}${user.avatar}`
    : user.avatar;

  onlineUsers.set(user._id.toString(), {
    socketId: socket.id,
    name: user.name,
    avatar: avatarUrl,
    role: user.role,
  });

  // Tüm kullanıcılara online listesini gönder
  io.emit('onlineUsers', Array.from(onlineUsers.entries()).map(([id, data]) => ({
    userId: id,
    ...data,
  })));

  // ─── Odaya katıl ──────────────────────────────────────────────
  socket.on('joinRoom', (room) => {
    socket.join(room);
    logger.debug(`${user.name} → ${room} odasına katıldı`);
  });

  // ─── Odadan ayrıl ─────────────────────────────────────────────
  socket.on('leaveRoom', (room) => {
    socket.leave(room);
    logger.debug(`${user.name} → ${room} odasından ayrıldı`);
  });

  // ─── Mesaj gönder ─────────────────────────────────────────────
  socket.on('sendMessage', async ({ content, room = 'general', type = 'text', fileData = null }) => {
    try {
      if (type === 'text' && (!content || content.trim().length === 0)) return;
      if (type === 'text' && content.length > 1000) return;

      const message = await saveMessage(
        type === 'text' ? content.trim() : (content || fileData?.fileName || 'Dosya'),
        user._id,
        room,
        type,
        fileData
      );

      io.to(room).emit('newMessage', {
        _id: message._id,
        content: message.content,
        sender: {
          _id: user._id,
          name: user.name,
          avatar: avatarUrl,
          role: user.role,
        },
        room,
        type: message.type,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
        fileType: message.fileType,
        isEdited: false,
        isDeleted: false,
        createdAt: message.createdAt,
      });
    } catch (err) {
      logger.error('Mesaj gönderme hatası:', err);
      socket.emit('error', { message: 'Mesaj gönderilemedi' });
    }
  });

  // ─── Mesaj düzenle ────────────────────────────────────────────
  socket.on('editMessage', async ({ messageId, content, room }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message || message.sender.toString() !== user._id.toString()) return;

      message.content = content.trim();
      message.isEdited = true;
      message.editedAt = new Date();
      await message.save();

      io.to(room).emit('messageEdited', {
        messageId,
        content: message.content,
        isEdited: true,
        editedAt: message.editedAt,
      });
    } catch (err) {
      logger.error('Mesaj düzenleme hatası:', err);
    }
  });

  // ─── Mesaj sil ────────────────────────────────────────────────
  socket.on('deleteMessage', async ({ messageId, room }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      const isOwner = message.sender.toString() === user._id.toString();
      const isAdmin = ['admin', 'moderator'].includes(user.role);
      if (!isOwner && !isAdmin) return;

      message.isDeleted = true;
      message.deletedAt = new Date();
      message.content = 'Bu mesaj silindi';
      await message.save();

      io.to(room).emit('messageDeleted', { messageId });
    } catch (err) {
      logger.error('Mesaj silme hatası:', err);
    }
  });

  // ─── Yazıyor bildirimi ────────────────────────────────────────
  socket.on('typing', ({ room, isTyping }) => {
    socket.to(room).emit('userTyping', {
      userId: user._id,
      name: user.name,
      isTyping,
    });
  });

  // ─── Bildirim gönder (real-time) ──────────────────────────────
  socket.on('sendNotification', async ({ targetUserId, type, title, message: msg }) => {
    try {
      const notification = await Notification.create({
        userId: targetUserId,
        type,
        title,
        message: msg,
      });

      // Hedef kullanıcı online ise anlık bildirim gönder
      const targetSocket = onlineUsers.get(targetUserId);
      if (targetSocket) {
        io.to(targetSocket.socketId).emit('newNotification', notification);
      }
    } catch (err) {
      logger.error('Bildirim gönderme hatası:', err);
    }
  });

  // ─── Bağlantı koptu ───────────────────────────────────────────
  socket.on('disconnect', () => {
    onlineUsers.delete(user._id.toString());
    logger.info(`🔴 Kullanıcı ayrıldı: ${user.name}`);

    io.emit('onlineUsers', Array.from(onlineUsers.entries()).map(([id, data]) => ({
      userId: id,
      ...data,
    })));
  });
});

// ─── SUNUCUYU BAŞLAT ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  logger.info(`
  ╔════════════════════════════════════════╗
  ║   🚀 MERN Backend v2.0 Başladı!       ║
  ║   Port: ${PORT}                           ║
  ║   Ortam: ${(process.env.NODE_ENV || 'development').padEnd(17)}    ║
  ║   API Docs: http://localhost:${PORT}/api-docs ║
  ╚════════════════════════════════════════╝
  `);
});

// ─── Beklenmedik hatalar ──────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  logger.error('❌ Unhandled Promise Rejection:', err);
  httpServer.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

module.exports = { app, io };
