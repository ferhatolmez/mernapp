const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorHandler');
const { parsePositiveInt, isValidObjectId } = require('../utils/validators');

// GET /api/notifications?page=1&limit=20&unreadOnly=false
exports.getNotifications = asyncHandler(async (req, res) => {
  const pageNum = parsePositiveInt(req.query.page, 1, { min: 1, max: 100000 });
  const limitNum = parsePositiveInt(req.query.limit, 20, { min: 1, max: 50 });
  const unreadOnly = req.query.unreadOnly === 'true';

  const filter = { userId: req.user._id };
  if (unreadOnly) filter.isRead = false;

  const total = await Notification.countDocuments(filter);
  const unreadCount = await Notification.countDocuments({
    userId: req.user._id,
    isRead: false,
  });

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .lean();

  const totalPages = Math.ceil(total / limitNum);

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    },
  });
});

// PUT /api/notifications/:id/read
exports.markAsRead = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Gecersiz bildirim ID' });
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ success: false, message: 'Bildirim bulunamadi' });
  }

  res.json({ success: true, data: { notification } });
});

// PUT /api/notifications/read-all
exports.markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true }
  );

  res.json({ success: true, message: 'Tum bildirimler okundu olarak isaretlendi' });
});

// DELETE /api/notifications/:id
exports.deleteNotification = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Gecersiz bildirim ID' });
  }

  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!notification) {
    return res.status(404).json({ success: false, message: 'Bildirim bulunamadi' });
  }

  res.json({ success: true, message: 'Bildirim silindi' });
});

// GET /api/notifications/unread-count
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    userId: req.user._id,
    isRead: false,
  });

  res.json({ success: true, data: { count } });
});
