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

// ─── Environment variables ────────────────────────────────────────
dotenv.config();

const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const { saveMessage } = require('./controllers/chatController');

// ─── Uygulama ve HTTP sunucusu ────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);

// ─── Socket.io başlat ─────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
});

// ─── Veritabanı bağlantısı ────────────────────────────────────────
connectDB();

// ─── GÜVENLİK MİDDLEWARE'LERİ ───────────────────────────────────

// HTTP başlıklarını güvenli yap
app.use(helmet({
  crossOriginEmbedderPolicy: false,
}));

// CORS konfigürasyonu
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true, // Cookie'lere izin ver
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting — DDoS ve brute force koruması
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100,
  message: { success: false, message: 'Çok fazla istek gönderildi. 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
});
app.use('/api', limiter);

// Auth endpoint'lerine daha sıkı limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── GENEL MİDDLEWARE'LER ────────────────────────────────────────

// JSON ve URL-encoded body parse et
app.use(express.json({ limit: '10kb' })); // Büyük payload'ları reddet
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// NoSQL injection koruması: { $gt: '' } gibi saldırıları temizle
app.use(mongoSanitize());

// Gzip sıkıştırma
app.use(compression());

// Loglama (sadece development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── ROUTES ───────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/chat', require('./routes/chat'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API çalışıyor',
    timestamp: new Date().toISOString(),
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route bulunamadı: ${req.method} ${req.originalUrl}`,
  });
});

// ─── GLOBAL ERROR HANDLER (EN SONA) ──────────────────────────────
app.use(errorHandler);

// ─── SOCKET.IO — GERÇEK ZAMANLI CHAT ─────────────────────────────
const jwt = require('jsonwebtoken');
const User = require('./models/User');

// Online kullanıcıları takip et
const onlineUsers = new Map(); // userId → socketId

io.use(async (socket, next) => {
  // Socket bağlantısında JWT doğrulama
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
  console.log(`🟢 Kullanıcı bağlandı: ${user.name} (${socket.id})`);

  // Online kullanıcı listesine ekle
  onlineUsers.set(user._id.toString(), {
    socketId: socket.id,
    name: user.name,
    avatar: user.avatar,
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
    console.log(`${user.name} → ${room} odasına katıldı`);
  });

  // ─── Mesaj gönder ─────────────────────────────────────────────
  socket.on('sendMessage', async ({ content, room = 'general' }) => {
    try {
      if (!content || content.trim().length === 0) return;
      if (content.length > 1000) return;

      // Mesajı veritabanına kaydet
      const message = await saveMessage(content.trim(), user._id, room);

      // Odadaki herkese gönder
      io.to(room).emit('newMessage', {
        _id: message._id,
        content: message.content,
        sender: {
          _id: user._id,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
        },
        room,
        createdAt: message.createdAt,
      });
    } catch (err) {
      socket.emit('error', { message: 'Mesaj gönderilemedi' });
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

  // ─── Bağlantı koptu ───────────────────────────────────────────
  socket.on('disconnect', () => {
    onlineUsers.delete(user._id.toString());
    console.log(`🔴 Kullanıcı ayrıldı: ${user.name}`);

    io.emit('onlineUsers', Array.from(onlineUsers.entries()).map(([id, data]) => ({
      userId: id,
      ...data,
    })));
  });
});

// ─── SUNUCUYU BAŞLAT ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════╗
  ║   🚀 MERN Backend Başladı!         ║
  ║   Port: ${PORT}                       ║
  ║   Ortam: ${process.env.NODE_ENV || 'development'}            ║
  ╚════════════════════════════════════╝
  `);
});

// ─── Beklenmedik hatalar ──────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  httpServer.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

module.exports = { app, io };
