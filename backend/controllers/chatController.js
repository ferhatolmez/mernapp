const Message = require('../models/Message');
const { asyncHandler } = require('../middleware/errorHandler');

// ─── MESAJ GEÇMİŞİ (Cursor-based pagination) ─────────────────────
// GET /api/chat/messages?room=general&before=<messageId>&limit=30
exports.getMessages = asyncHandler(async (req, res) => {
  const { room = 'general', before, limit = 30 } = req.query;
  const limitNum = Math.min(parseInt(limit, 10), 50);

  const filter = { room };

  // Cursor-based: belirtilen mesajdan öncekini getir (sonsuz scroll için)
  if (before) {
    filter._id = { $lt: before };
  }

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 }) // En yeniden eskiye
    .limit(limitNum)
    .populate('sender', 'name avatar role')
    .lean();

  // Sırayı ters çevir (eskiden yeniye)
  messages.reverse();

  res.json({
    success: true,
    data: {
      messages,
      hasMore: messages.length === limitNum,
    },
  });
});

// ─── MESAJ KAYDET (Socket.io tarafından çağrılır, API olarak da var) ──
exports.saveMessage = async (content, senderId, room = 'general') => {
  const message = await Message.create({ content, sender: senderId, room });
  await message.populate('sender', 'name avatar role');
  return message;
};
