const express = require('express');
const router = express.Router();
const {
  register,
  login,
  refreshToken,
  logout,
  getMe,
} = require('../controllers/authController');
const protect = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/refresh  — cookie'deki refresh token ile yeni access token al
router.post('/refresh', refreshToken);

// POST /api/auth/logout  — token'ları geçersiz kıl
router.post('/logout', logout);

// GET /api/auth/me  — giriş yapmış kullanıcı bilgileri
router.get('/me', protect, getMe);

module.exports = router;
