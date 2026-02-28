const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateProfile,
  changePassword,
  getUserStats,
  uploadAvatar,
  saveSearchHistory,
  getSearchHistory,
  clearSearchHistory,
  searchUsers,
} = require('../controllers/userController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const cacheMiddleware = require('../middleware/cache');

const { avatarStorage } = require('../config/cloudinary');

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir (JPEG, PNG, GIF, WebP)'));
    }
  },
});

// ─── Kendi profilini yönetme (giriş yapmış herkes) ──────────────
/**
 * @swagger
 * /users/profile:
 *   put:
 *     tags: [Users]
 *     summary: Profil güncelle
 *     security:
 *       - bearerAuth: []
 */
router.put('/profile', protect, updateProfile);

/**
 * @swagger
 * /users/change-password:
 *   put:
 *     tags: [Users]
 *     summary: Şifre değiştir
 *     security:
 *       - bearerAuth: []
 */
router.put('/change-password', protect, changePassword);

/**
 * @swagger
 * /users/avatar:
 *   put:
 *     tags: [Users]
 *     summary: Avatar yükle
 *     security:
 *       - bearerAuth: []
 */
router.put('/avatar', protect, avatarUpload.single('avatar'), uploadAvatar);

// ─── Arama geçmişi ──────────────────────────────────────────────
/**
 * @swagger
 * /users/search-history:
 *   get:
 *     tags: [Users]
 *     summary: Arama geçmişini getir
 *     security:
 *       - bearerAuth: []
 */
router.get('/search-history', protect, getSearchHistory);

/**
 * @swagger
 * /users/search-history:
 *   post:
 *     tags: [Users]
 *     summary: Arama geçmişine ekle
 *     security:
 *       - bearerAuth: []
 */
router.post('/search-history', protect, saveSearchHistory);

/**
 * @swagger
 * /users/search-history:
 *   delete:
 *     tags: [Users]
 *     summary: Arama geçmişini temizle
 *     security:
 *       - bearerAuth: []
 */
router.delete('/search-history', protect, clearSearchHistory);

// ─── Admin istatistikleri ────────────────────────────────────────
/**
 * @swagger
 * /users/stats:
 *   get:
 *     tags: [Users]
 *     summary: Kullanıcı istatistikleri (Admin)
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', protect, authorize('admin', 'moderator'), cacheMiddleware(60), getUserStats);

// ─── Kullanıcı arama (giriş yapmış herkes) ──────────────────────
router.get('/search', protect, searchUsers);

// ─── Kullanıcı listesi — Admin ve moderatör görebilir ───────────
/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Kullanıcı listesi (Admin/Mod)
 *     security:
 *       - bearerAuth: []
 */
router.get('/', protect, authorize('admin', 'moderator'), getUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Tekil kullanıcı getir (Admin/Mod)
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', protect, authorize('admin', 'moderator'), getUser);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Kullanıcı güncelle (Admin)
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', protect, authorize('admin'), updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Kullanıcı sil (Admin)
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
