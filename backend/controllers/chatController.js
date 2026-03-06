const Message = require('../models/Message');
const Room = require('../models/Room');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const {
  parsePositiveInt,
  isValidObjectId,
  toObjectId,
  normalizeText,
} = require('../utils/validators');

const getRoomAccess = async (roomName, userId) => {
  const room = await Room.findOne({ name: roomName }).select('type members').lean();

  if (!room) {
    if (roomName.startsWith('private_')) {
      return {
        allowed: false,
        status: 403,
        message: 'Bu odaya erisim yetkiniz yok',
      };
    }
    return { allowed: true, room: null };
  }

  if (room.type !== 'private') {
    return { allowed: true, room };
  }

  const isMember = room.members.some((memberId) => memberId.toString() === userId.toString());
  if (!isMember) {
    return {
      allowed: false,
      status: 403,
      message: 'Bu odaya erisim yetkiniz yok',
    };
  }

  return { allowed: true, room };
};

// GET /api/chat/messages?room=general&before=<messageId>&limit=30
exports.getMessages = asyncHandler(async (req, res) => {
  const room = String(req.query.room || 'general').trim();
  const before = req.query.before;
  const limitNum = parsePositiveInt(req.query.limit, 30, { min: 1, max: 50 });

  const access = await getRoomAccess(room, req.user._id);
  if (!access.allowed) {
    return res.status(access.status).json({ success: false, message: access.message });
  }

  const filter = { room, isDeleted: { $ne: true } };

  if (before) {
    if (!isValidObjectId(before)) {
      return res.status(400).json({ success: false, message: 'Gecersiz mesaj cursori' });
    }
    filter._id = { $lt: toObjectId(before) };
  }

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limitNum)
    .populate('sender', 'name avatar role')
    .lean();

  const baseUrl = process.env.BACKEND_URL || '';

  messages.forEach((msg) => {
    if (msg.sender && msg.sender.avatar && !msg.sender.avatar.startsWith('http')) {
      msg.sender.avatar = `${baseUrl}${msg.sender.avatar}`;
    }
    if (msg.fileUrl && !msg.fileUrl.startsWith('http')) {
      msg.fileUrl = `${baseUrl}${msg.fileUrl}`;
    }
  });

  messages.reverse();

  res.json({
    success: true,
    data: {
      messages,
      hasMore: messages.length === limitNum,
    },
  });
});

// Socket.io tarafindan cagrilir
exports.saveMessage = async (content, senderId, room = 'general', type = 'text', fileData = null) => {
  const roomName = String(room || 'general').trim();
  const access = await getRoomAccess(roomName, senderId);

  if (!access.allowed) {
    throw new Error(access.message || 'Bu odaya mesaj gonderme yetkiniz yok');
  }

  let normalizedContent = String(content || '').trim();

  if (type === 'text') {
    if (!normalizedContent) {
      throw new Error('Mesaj icerigi zorunludur');
    }
    if (normalizedContent.length > 1000) {
      throw new Error('Mesaj en fazla 1000 karakter olabilir');
    }
  } else {
    normalizedContent = normalizedContent || fileData?.fileName || 'Dosya';
    normalizedContent = normalizedContent.slice(0, 1000);
  }

  const msgData = {
    content: normalizedContent,
    sender: senderId,
    room: roomName,
    type,
  };

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

// PUT /api/chat/messages/:id
exports.editMessage = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Gecersiz mesaj ID' });
  }

  const content = String(req.body.content || '').trim();

  if (!content) {
    return res.status(400).json({ success: false, message: 'Mesaj icerigi zorunludur' });
  }

  if (content.length > 1000) {
    return res.status(400).json({ success: false, message: 'Mesaj en fazla 1000 karakter olabilir' });
  }

  const message = await Message.findById(req.params.id);
  if (!message) {
    return res.status(404).json({ success: false, message: 'Mesaj bulunamadi' });
  }

  if (message.isDeleted) {
    return res.status(400).json({ success: false, message: 'Silinmis mesaj duzenlenemez' });
  }

  if (message.sender.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Bu mesaji duzenleme yetkiniz yok' });
  }

  message.content = content;
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();
  await message.populate('sender', 'name avatar role');

  res.json({ success: true, data: { message } });
});

// DELETE /api/chat/messages/:id
exports.deleteMessage = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Gecersiz mesaj ID' });
  }

  const message = await Message.findById(req.params.id);
  if (!message) {
    return res.status(404).json({ success: false, message: 'Mesaj bulunamadi' });
  }

  const isOwner = message.sender.toString() === req.user._id.toString();
  const isAdminOrMod = ['admin', 'moderator'].includes(req.user.role);

  if (!isOwner && !isAdminOrMod) {
    return res.status(403).json({ success: false, message: 'Bu mesaji silme yetkiniz yok' });
  }

  if (!message.isDeleted) {
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = 'Bu mesaj silindi';
    await message.save();
  }

  res.json({ success: true, message: 'Mesaj silindi' });
});

// POST /api/chat/access
exports.accessChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'Kullanici ID (userId) gonderilmedi' });
  }

  if (!isValidObjectId(userId)) {
    return res.status(400).json({ success: false, message: 'Gecersiz kullanici ID' });
  }

  if (userId === req.user._id.toString()) {
    return res.status(400).json({ success: false, message: 'Kendinizle ozel sohbet acamazsiniz' });
  }

  const targetUser = await User.findById(userId).select('_id isActive');
  if (!targetUser || !targetUser.isActive) {
    return res.status(404).json({ success: false, message: 'Hedef kullanici bulunamadi' });
  }

  const ids = [req.user._id.toString(), userId].sort();
  const roomName = `private_${ids[0]}_${ids[1]}`;

  let existingRoom = await Room.findOne({ name: roomName })
    .populate('members', 'name email avatar role')
    .populate('createdBy', 'name email avatar');

  if (existingRoom) {
    return res.json({ success: true, data: { room: existingRoom } });
  }

  try {
    const createdRoom = await Room.create({
      name: roomName,
      type: 'private',
      description: 'Birebir Sohbet',
      icon: 'DM',
      createdBy: req.user._id,
      members: [req.user._id, userId],
    });

    const fullRoom = await Room.findById(createdRoom._id)
      .populate('members', 'name email avatar role')
      .populate('createdBy', 'name email avatar');

    res.status(200).json({ success: true, data: { room: fullRoom } });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// GET /api/chat/
exports.fetchChats = asyncHandler(async (req, res) => {
  try {
    const results = await Room.find({
      $or: [
        { type: { $in: ['general', 'random', 'tech', 'custom'] } },
        { type: 'private', members: req.user._id },
      ],
    })
      .populate('members', 'name email avatar role')
      .populate('createdBy', 'name email avatar')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, data: { rooms: results } });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// GET /api/chat/rooms
exports.getRooms = asyncHandler(async (req, res) => {
  let rooms = await Room.find({
    $or: [
      { type: { $ne: 'private' } },
      { type: 'private', members: req.user._id },
    ],
  })
    .sort({ isDefault: -1, name: 1 })
    .lean();

  if (rooms.length === 0) {
    const defaultRooms = [
      { name: 'general', description: 'Genel sohbet', type: 'general', icon: 'CHAT', isDefault: true },
      { name: 'random', description: 'Rastgele konusmalar', type: 'random', icon: 'RND', isDefault: true },
      { name: 'tech', description: 'Teknoloji tartismalari', type: 'tech', icon: 'TECH', isDefault: true },
    ];

    await Room.insertMany(defaultRooms, { ordered: false }).catch(() => null);

    rooms = await Room.find({
      $or: [
        { type: { $ne: 'private' } },
        { type: 'private', members: req.user._id },
      ],
    })
      .sort({ isDefault: -1, name: 1 })
      .lean();

    logger.info('Varsayilan chat odalari olusturuldu');
  }

  res.json({ success: true, data: { rooms } });
});

// POST /api/chat/rooms
exports.createRoom = asyncHandler(async (req, res) => {
  const rawName = normalizeText(req.body.name || '');
  const description = normalizeText(req.body.description || '');
  const icon = String(req.body.icon || '').trim();

  if (!rawName) {
    return res.status(400).json({ success: false, message: 'Oda adi zorunludur' });
  }

  const roomName = rawName.toLowerCase().replace(/\s+/g, '-');

  if (!/^[a-z0-9_-]{2,50}$/.test(roomName)) {
    return res.status(400).json({
      success: false,
      message: 'Oda adi 2-50 karakter olmali ve yalnizca harf, rakam, - veya _ icermeli',
    });
  }

  if (description.length > 200) {
    return res.status(400).json({ success: false, message: 'Aciklama en fazla 200 karakter olabilir' });
  }

  const existingRoom = await Room.findOne({ name: roomName });
  if (existingRoom) {
    return res.status(400).json({ success: false, message: 'Bu isimde bir oda zaten var' });
  }

  const room = await Room.create({
    name: roomName,
    description,
    icon: icon || 'CHAT',
    type: 'custom',
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: { room } });
});

// POST /api/chat/upload
exports.uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Dosya secilmedi' });
  }

  const fileUrl = req.file.path;

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
