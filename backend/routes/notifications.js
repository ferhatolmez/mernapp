const express = require('express');
const router = express.Router();
const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
} = require('../controllers/notificationController');
const protect = require('../middleware/auth');

/**
 * @swagger
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Bildirimleri getir
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *       - name: unreadOnly
 *         in: query
 *         schema:
 *           type: boolean
 */
router.get('/', protect, getNotifications);

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Okunmamış bildirim sayısı
 *     security:
 *       - bearerAuth: []
 */
router.get('/unread-count', protect, getUnreadCount);

/**
 * @swagger
 * /notifications/read-all:
 *   put:
 *     tags: [Notifications]
 *     summary: Tüm bildirimleri okundu işaretle
 *     security:
 *       - bearerAuth: []
 */
router.put('/read-all', protect, markAllAsRead);

/**
 * @swagger
 * /notifications/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Bildirimi okundu işaretle
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id/read', protect, markAsRead);

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Bildirim sil
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', protect, deleteNotification);

module.exports = router;
