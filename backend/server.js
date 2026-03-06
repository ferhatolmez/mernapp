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
const xss = require('xss-clean');
const dotenv = require('dotenv');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

dotenv.config();

const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const swaggerSpec = require('./config/swagger');
const { errorHandler } = require('./middleware/errorHandler');
const { saveMessage } = require('./controllers/chatController');
const logger = require('./utils/logger');

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'https://mernapp-ecru.vercel.app',
    credentials: true,
  },
  maxHttpBufferSize: 10 * 1024 * 1024,
});

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

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Cok fazla istek gonderildi. 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Cok fazla giris denemesi. 15 dakika sonra tekrar deneyin.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());
app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev', { stream: logger.stream }));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MERN App API Docs',
}));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API calisiyor',
    timestamp: new Date().toISOString(),
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: '2.1.0',
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route bulunamadi: ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorHandler);

const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Room = require('./models/Room');
const Message = require('./models/Message');
const Notification = require('./models/Notification');
const { isValidObjectId } = require('./utils/validators');

const onlineUsers = new Map();

const canAccessRoom = async (roomName, userId) => {
  const room = await Room.findOne({ name: roomName }).select('type members').lean();

  if (!room) {
    if (roomName.startsWith('private_')) {
      return false;
    }
    return true;
  }

  if (room.type !== 'private') {
    return true;
  }

  return room.members.some((memberId) => memberId.toString() === userId.toString());
};

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Token bulunamadi'));

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) return next(new Error('Kullanici bulunamadi'));

    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Kimlik dogrulama basarisiz'));
  }
});

io.on('connection', (socket) => {
  const user = socket.user;
  logger.info(`Kullanici baglandi: ${user.name} (${socket.id})`);

  const avatarUrl = (user.avatar && !user.avatar.startsWith('http'))
    ? `${process.env.BACKEND_URL || ''}${user.avatar}`
    : user.avatar;

  onlineUsers.set(user._id.toString(), {
    socketId: socket.id,
    name: user.name,
    avatar: avatarUrl,
    role: user.role,
  });

  io.emit('onlineUsers', Array.from(onlineUsers.entries()).map(([id, data]) => ({
    userId: id,
    ...data,
  })));

  socket.on('joinRoom', async (room) => {
    try {
      const roomName = String(room || '').trim();
      if (!roomName) return;

      const allowed = await canAccessRoom(roomName, user._id);
      if (!allowed) {
        socket.emit('error', { message: 'Bu odaya erisim yetkiniz yok' });
        return;
      }

      socket.join(roomName);
      logger.debug(`${user.name} -> ${roomName} odasina katildi`);
    } catch (err) {
      logger.warn('joinRoom kontrol hatasi:', err.message);
    }
  });

  socket.on('leaveRoom', (room) => {
    const roomName = String(room || '').trim();
    if (!roomName) return;

    socket.leave(roomName);
    logger.debug(`${user.name} -> ${roomName} odasindan ayrildi`);
  });

  socket.on('sendMessage', async ({ content, room = 'general', type = 'text', fileData = null }) => {
    try {
      const roomName = String(room || 'general').trim() || 'general';

      if (type === 'text') {
        const normalized = String(content || '').trim();
        if (!normalized || normalized.length > 1000) return;
      }

      const message = await saveMessage(
        type === 'text' ? String(content || '').trim() : (content || fileData?.fileName || 'Dosya'),
        user._id,
        roomName,
        type,
        fileData
      );

      io.to(roomName).emit('newMessage', {
        _id: message._id,
        content: message.content,
        sender: {
          _id: user._id,
          name: user.name,
          avatar: avatarUrl,
          role: user.role,
        },
        room: roomName,
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
      logger.error('Mesaj gonderme hatasi:', err);
      socket.emit('error', { message: err.message || 'Mesaj gonderilemedi' });
    }
  });

  socket.on('editMessage', async ({ messageId, content, room }) => {
    try {
      if (!isValidObjectId(messageId)) return;

      const normalizedContent = String(content || '').trim();
      if (!normalizedContent || normalizedContent.length > 1000) return;

      const message = await Message.findById(messageId);
      if (!message || message.isDeleted) return;
      if (message.sender.toString() !== user._id.toString()) return;

      message.content = normalizedContent;
      message.isEdited = true;
      message.editedAt = new Date();
      await message.save();

      const roomName = String(room || message.room || '').trim();
      if (!roomName) return;

      io.to(roomName).emit('messageEdited', {
        messageId,
        content: message.content,
        isEdited: true,
        editedAt: message.editedAt,
      });
    } catch (err) {
      logger.error('Mesaj duzenleme hatasi:', err);
    }
  });

  socket.on('deleteMessage', async ({ messageId, room }) => {
    try {
      if (!isValidObjectId(messageId)) return;

      const message = await Message.findById(messageId);
      if (!message) return;

      const isOwner = message.sender.toString() === user._id.toString();
      const isAdmin = ['admin', 'moderator'].includes(user.role);
      if (!isOwner && !isAdmin) return;

      if (!message.isDeleted) {
        message.isDeleted = true;
        message.deletedAt = new Date();
        message.content = 'Bu mesaj silindi';
        await message.save();
      }

      const roomName = String(room || message.room || '').trim();
      if (!roomName) return;

      io.to(roomName).emit('messageDeleted', { messageId });
    } catch (err) {
      logger.error('Mesaj silme hatasi:', err);
    }
  });

  socket.on('typing', async ({ room, isTyping }) => {
    try {
      const roomName = String(room || '').trim();
      if (!roomName) return;

      const allowed = await canAccessRoom(roomName, user._id);
      if (!allowed) return;

      socket.to(roomName).emit('userTyping', {
        userId: user._id,
        name: user.name,
        isTyping: Boolean(isTyping),
      });
    } catch {
      // Ignore typing errors
    }
  });

  socket.on('sendNotification', async ({ targetUserId, type, title, message: msg }) => {
    try {
      if (!isValidObjectId(targetUserId)) return;
      if (!title || !msg) return;

      const notification = await Notification.create({
        userId: targetUserId,
        type,
        title,
        message: msg,
      });

      const targetSocket = onlineUsers.get(targetUserId);
      if (targetSocket) {
        io.to(targetSocket.socketId).emit('newNotification', notification);
      }
    } catch (err) {
      logger.error('Bildirim gonderme hatasi:', err);
    }
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(user._id.toString());
    logger.info(`Kullanici ayrildi: ${user.name}`);

    io.emit('onlineUsers', Array.from(onlineUsers.entries()).map(([id, data]) => ({
      userId: id,
      ...data,
    })));
  });
});

const startServer = async () => {
  try {
    await connectDB();
    connectRedis();

    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      logger.info(`MERN Backend v2.1 basladi. Port: ${PORT}, Ortam: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Sunucu baslatma hatasi:', error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  httpServer.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = { app, io };




