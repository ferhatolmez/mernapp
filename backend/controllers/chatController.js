const Message = require('../models/Message');
const Room = require('../models/Room');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// ─── MESAJ GEÇMİŞİ (Cursor-based pagination) ─────────────────────
// GET /api/chat/messages?room=general&before=<messageId>&limit=30
exports.getMessages = asyncHandler(async (req, res) => {
  const { room = 'general', before, limit = 30 } = req.query;
  const limitNum = Math.min(parseInt(limit, 10), 50);

  const filter = { room, isDeleted: { $ne: true } };

  if (before) {
    filter._id = { $lt: before };
  }

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limitNum)
    .populate('sender', 'name avatar role')
    .lean();

  messages.reverse();

  res.json({
    success: true,
    data: {
      messages,
      hasMore: messages.length === limitNum,
    },
  });
});

// ─── MESAJ KAYDET (Socket.io tarafından çağrılır) ─────────────────
exports.saveMessage = async (content, senderId, room = 'general', type = 'text', fileData = null) => {
  const msgData = { content, sender: senderId, room, type };

  if (fileData) {
    msgData.fileUrl = fileData.fileUrl;
    msgData.fileName = fileData.fileName;
    msgData.fileSize = fileData.fileSize;
    msgData.fileType = fileData.fileType;
  }

  const message = await Message.create(msgData);
  await message.populate('sender', 'name avatar role');
  return message;
};

// ─── MESAJ DÜZENLE ────────────────────────────────────────────────
// PUT /api/chat/messages/:id
exports.editMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Mesaj içeriği zorunludur' });
  }

  const message = await Message.findById(req.params.id);

  if (!message) {
    return res.status(404).json({ success: false, message: 'Mesaj bulunamadı' });
  }

  // Sadece mesajın sahibi düzenleyebilir
  if (message.sender.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Bu mesajı düzenleme yetkiniz yok' });
  }

  message.content = content.trim();
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();
  await message.populate('sender', 'name avatar role');

  res.json({
    success: true,
    data: { message },
  });
});

// ─── MESAJ SİL (Soft Delete) ──────────────────────────────────────
// DELETE /api/chat/messages/:id
exports.deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    return res.status(404).json({ success: false, message: 'Mesaj bulunamadı' });
  }

  // Mesaj sahibi veya admin/mod silebilir
  const isOwner = message.sender.toString() === req.user._id.toString();
  const isAdminOrMod = ['admin', 'moderator'].includes(req.user.role);

  if (!isOwner && !isAdminOrMod) {
    return res.status(403).json({ success: false, message: 'Bu mesajı silme yetkiniz yok' });
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.content = 'Bu mesaj silindi';
  await message.save();

  res.json({ success: true, message: 'Mesaj silindi' });
});

// ─── ODALARI LİSTELE ─────────────────────────────────────────────
// GET /api/chat/rooms
exports.getRooms = asyncHandler(async (req, res) => {
  let rooms = await Room.find().sort({ isDefault: -1, name: 1 }).lean();

  // Varsayılan odalar yoksa oluştur
  if (rooms.length === 0) {
    const defaultRooms = [
      { name: 'general', description: 'Genel sohbet', type: 'general', icon: '💬', isDefault: true },
      { name: 'random', description: 'Rastgele konuşmalar', type: 'random', icon: '🎲', isDefault: true },
      { name: 'tech', description: 'Teknoloji tartışmaları', type: 'tech', icon: '💻', isDefault: true },
    ];
    rooms = await Room.insertMany(defaultRooms);
    logger.info('Varsayılan chat odaları oluşturuldu');
  }

  res.json({
    success: true,
    data: { rooms },
  });
});

// ─── YENİ ODA OLUŞTUR ────────────────────────────────────────────
// POST /api/chat/rooms
exports.createRoom = asyncHandler(async (req, res) => {
  const { name, description, icon } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Oda adı zorunludur' });
  }

  const existingRoom = await Room.findOne({ name: name.toLowerCase() });
  if (existingRoom) {
    return res.status(400).json({ success: false, message: 'Bu isimde bir oda zaten var' });
  }

  const room = await Room.create({
    name: name.toLowerCase(),
    description,
    icon: icon || '💬',
    type: 'custom',
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: { room },
  });
});

// ─── DOSYA YÜKLE ──────────────────────────────────────────────────
// POST /api/chat/upload
exports.uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Dosya seçilmedi' });
  }

  const fileUrl = `/uploads/chat/${req.file.filename}`;

  res.json({
    success: true,
    data: {
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
    },
  });
});
