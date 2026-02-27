const express = require('express');
const router = express.Router();
const {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  verifyEmail,
  forgotPassword,
  resetPassword,
  setup2FA,
  verify2FA,
  disable2FA,
} = require('../controllers/authController');
const protect = require('../middleware/auth');

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Yeni kullanıcı kaydı
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201:
 *         description: Kayıt başarılı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
router.post('/register', register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Kullanıcı girişi
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               twoFactorCode: { type: string }
 *     responses:
 *       200:
 *         description: Giriş başarılı
 */
router.post('/login', login);

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Email doğrulama
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200:
 *         description: Email doğrulandı
 */
router.post('/verify-email', verifyEmail);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Şifre sıfırlama maili gönder
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Şifre sıfırla (token ile)
 */
router.post('/reset-password', resetPassword);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Access token yenile
 */
router.post('/refresh', refreshToken);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Çıkış yap
 */
router.post('/logout', logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Mevcut kullanıcı bilgileri
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', protect, getMe);

// ─── 2FA Endpoints ───────────────────────────────────────────────
/**
 * @swagger
 * /auth/2fa/setup:
 *   post:
 *     tags: [Auth]
 *     summary: 2FA kurulumu (QR kodu üret)
 *     security:
 *       - bearerAuth: []
 */
router.post('/2fa/setup', protect, setup2FA);

/**
 * @swagger
 * /auth/2fa/verify:
 *   post:
 *     tags: [Auth]
 *     summary: 2FA doğrulama (ilk kurulumda)
 *     security:
 *       - bearerAuth: []
 */
router.post('/2fa/verify', protect, verify2FA);

/**
 * @swagger
 * /auth/2fa/disable:
 *   post:
 *     tags: [Auth]
 *     summary: 2FA devre dışı bırak
 *     security:
 *       - bearerAuth: []
 */
router.post('/2fa/disable', protect, disable2FA);

module.exports = router;
