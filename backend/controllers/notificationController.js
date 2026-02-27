const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorHandler');

// ─── BİLDİRİMLERİ GETİR ──────────────────────────────────────────
// GET /api/notifications?page=1&limit=20&unreadOnly=false
exports.getNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 50);

    const filter = { userId: req.user._id };
    if (unreadOnly === 'true') filter.isRead = false;

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

    res.json({
        success: true,
        data: {
            notifications,
            unreadCount,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        },
    });
});

// ─── BİLDİRİMİ OKUNDU İŞARETLE ──────────────────────────────────
// PUT /api/notifications/:id/read
exports.markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        { isRead: true },
        { new: true }
    );

    if (!notification) {
        return res.status(404).json({ success: false, message: 'Bildirim bulunamadı' });
    }

    res.json({ success: true, data: { notification } });
});

// ─── TÜM BİLDİRİMLERİ OKUNDU İŞARETLE ──────────────────────────
// PUT /api/notifications/read-all
exports.markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { userId: req.user._id, isRead: false },
        { isRead: true }
    );

    res.json({ success: true, message: 'Tüm bildirimler okundu olarak işaretlendi' });
});

// ─── BİLDİRİM SİL ────────────────────────────────────────────────
// DELETE /api/notifications/:id
exports.deleteNotification = asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndDelete({
        _id: req.params.id,
        userId: req.user._id,
    });

    if (!notification) {
        return res.status(404).json({ success: false, message: 'Bildirim bulunamadı' });
    }

    res.json({ success: true, message: 'Bildirim silindi' });
});

// ─── OKUNMAMIŞ BİLDİRİM SAYISI ──────────────────────────────────
// GET /api/notifications/unread-count
exports.getUnreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({
        userId: req.user._id,
        isRead: false,
    });

    res.json({ success: true, data: { count } });
});
