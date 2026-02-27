const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateProfile,
  changePassword,
  getUserStats,
} = require('../controllers/userController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// ─── Kendi profilini yönetme (giriş yapmış herkes) ──────────────
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

// ─── Admin istatistikleri ────────────────────────────────────────
router.get('/stats', protect, authorize('admin'), getUserStats);

// ─── Kullanıcı listesi — Admin ve moderatör görebilir ───────────
router.get('/', protect, authorize('admin', 'moderator'), getUsers);

// ─── Tekil kullanıcı — Admin ve moderatör ───────────────────────
router.get('/:id', protect, authorize('admin', 'moderator'), getUser);

// ─── Güncelle — Sadece admin ────────────────────────────────────
router.put('/:id', protect, authorize('admin'), updateUser);

// ─── Sil — Sadece admin ─────────────────────────────────────────
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
