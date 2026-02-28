const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
    getMessages,
    editMessage,
    deleteMessage,
    getRooms,
    createRoom,
    uploadFile,
    accessChat,
    fetchChats,
} = require('../controllers/chatController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const { chatStorage } = require('../config/cloudinary');

const chatUpload = multer({
    storage: chatStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'text/plain',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/zip', 'application/x-rar-compressed',
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Bu dosya tipi desteklenmiyor'));
        }
    },
});

/**
 * @swagger
 * /chat:
 *   get:
 *     tags: [Chat]
 *     summary: Kullanıcının dahil olduğu odaları listele
 *     security:
 *       - bearerAuth: []
 */
router.get('/', protect, fetchChats);

/**
 * @swagger
 * /chat/access:
 *   post:
 *     tags: [Chat]
 *     summary: Birebir sohbet odasına eriş veya oluştur
 *     security:
 *       - bearerAuth: []
 */
router.post('/access', protect, accessChat);

/**
 * @swagger
 * /chat/rooms:
 *   get:
 *     tags: [Chat]
 *     summary: Genel Chat odalarını listele
 *     security:
 *       - bearerAuth: []
 */
router.get('/rooms', protect, getRooms);

/**
 * @swagger
 * /chat/rooms:
 *   post:
 *     tags: [Chat]
 *     summary: Yeni chat odası oluştur (Admin/Mod)
 *     security:
 *       - bearerAuth: []
 */
router.post('/rooms', protect, authorize('admin', 'moderator'), createRoom);

/**
 * @swagger
 * /chat/messages:
 *   get:
 *     tags: [Chat]
 *     summary: Mesaj geçmişi
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: room
 *         in: query
 *         schema:
 *           type: string
 *       - name: before
 *         in: query
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 */
router.get('/messages', protect, getMessages);

/**
 * @swagger
 * /chat/messages/{id}:
 *   put:
 *     tags: [Chat]
 *     summary: Mesaj düzenle
 *     security:
 *       - bearerAuth: []
 */
router.put('/messages/:id', protect, editMessage);

/**
 * @swagger
 * /chat/messages/{id}:
 *   delete:
 *     tags: [Chat]
 *     summary: Mesaj sil
 *     security:
 *       - bearerAuth: []
 */
router.delete('/messages/:id', protect, deleteMessage);

/**
 * @swagger
 * /chat/upload:
 *   post:
 *     tags: [Chat]
 *     summary: Chat dosya yükle
 *     security:
 *       - bearerAuth: []
 */
router.post('/upload', protect, chatUpload.single('file'), uploadFile);

module.exports = router;
