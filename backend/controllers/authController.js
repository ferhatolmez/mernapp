const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');
const logger = require('../utils/logger');
const { normalizeEmail, normalizeText } = require('../utils/validators');

const buildRefreshCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
};

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const name = normalizeText(req.body.name || '');
  const email = normalizeEmail(req.body.email || '');
  const password = String(req.body.password || '');

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Tum alanlar zorunludur' });
  }

  if (name.length < 2) {
    return res.status(400).json({ success: false, message: 'Isim en az 2 karakter olmali' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Sifre en az 6 karakter olmali' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Bu email adresi zaten kayitli' });
  }

  const user = new User({ name, email, password });
  const verificationToken = user.generateEmailVerificationToken();

  await user.save();

  sendVerificationEmail(user.email, verificationToken)
    .then(() => logger.info(`Email dogrulama maili basariyla gonderildi: ${user.email}`))
    .catch((err) => logger.error(`Email gonderme hatasi (${user.email}):`, err));

  Notification.create({
    userId: user._id,
    type: 'welcome',
    title: 'Hos Geldiniz!',
    message: `Merhaba ${user.name}, lutfen email adresinizi dogrulayin.`,
  }).catch((err) => logger.error('Bildirim olusturma hatasi:', err));

  res.status(201).json({
    success: true,
    message: 'Kayit basarili. Lutfen giris yapmadan once email adresinizi dogrulayin.',
  });
});

// POST /api/auth/verify-email
exports.verifyEmail = asyncHandler(async (req, res) => {
  const token = String(req.body.token || '').trim();

  if (!token) {
    return res.status(400).json({ success: false, message: 'Token gereklidir' });
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Gecersiz veya suresi dolmus dogrulama linki',
    });
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  logger.info(`Email dogrulandi: ${user.email}`);

  res.json({ success: true, message: 'Email basariyla dogrulandi' });
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email || '');
  const password = String(req.body.password || '');
  const twoFactorCode = String(req.body.twoFactorCode || '').trim();

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email ve sifre zorunludur' });
  }

  if (process.env.NODE_ENV === 'test' && mongoose.connection.readyState !== 1) {
    return res.status(401).json({ success: false, message: 'Email veya sifre hatali' });
  }

  const user = await User.findOne({ email }).select('+password +twoFactorSecret');
  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: 'Email veya sifre hatali' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Email veya sifre hatali' });
  }

  if (!user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Lutfen giris yapmadan once email adresinizi dogrulayin.',
    });
  }

  if (user.twoFactorEnabled) {
    if (!twoFactorCode) {
      return res.status(200).json({
        success: true,
        requiresTwoFactor: true,
        message: 'Iki faktorlu dogrulama kodu gereklidir',
      });
    }

    if (!/^\d{6}$/.test(twoFactorCode)) {
      return res.status(401).json({ success: false, message: 'Gecersiz 2FA kodu' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: twoFactorCode,
      window: 2,
    });

    if (!verified) {
      return res.status(401).json({ success: false, message: 'Gecersiz 2FA kodu' });
    }
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshTokenValue = generateRefreshToken(user._id);

  await RefreshToken.deleteMany({ userId: user._id });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshToken.create({
    token: refreshTokenValue,
    userId: user._id,
    expiresAt,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  res.cookie('refreshToken', refreshTokenValue, buildRefreshCookieOptions());

  res.json({
    success: true,
    message: 'Giris basarili',
    data: { user, accessToken },
  });
});

// POST /api/auth/forgot-password
exports.forgotPassword = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email || '');

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email zorunludur' });
  }

  if (process.env.NODE_ENV === 'test' && mongoose.connection.readyState !== 1) {
    return res.json({
      success: true,
      message: 'Eger bu email kayitliysa, sifre sifirlama linki gonderildi',
    });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.json({
      success: true,
      message: 'Eger bu email kayitliysa, sifre sifirlama linki gonderildi',
    });
  }

  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  sendPasswordResetEmail(user.email, resetToken)
    .then(() => logger.info(`Sifre sifirlama maili gonderildi: ${user.email}`))
    .catch((err) => logger.error('Email gonderme fail:', err));

  res.json({
    success: true,
    message: 'Sifre sifirlama linki email adresinize gonderildi',
  });
});

// POST /api/auth/reset-password
exports.resetPassword = asyncHandler(async (req, res) => {
  const token = String(req.body.token || '').trim();
  const password = String(req.body.password || '');

  if (!token || !password) {
    return res.status(400).json({ success: false, message: 'Token ve yeni sifre zorunludur' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Sifre en az 6 karakter olmali' });
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Gecersiz veya suresi dolmus sifirlama linki',
    });
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await RefreshToken.deleteMany({ userId: user._id });

  logger.info(`Sifre sifirlandi: ${user.email}`);

  res.json({
    success: true,
    message: 'Sifre basariyla sifirlandi. Yeni sifrenizle giris yapabilirsiniz.',
  });
});

// POST /api/auth/2fa/setup
exports.setup2FA = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+twoFactorSecret');

  if (user.twoFactorEnabled) {
    return res.status(400).json({ success: false, message: '2FA zaten etkin' });
  }

  const secret = speakeasy.generateSecret({
    name: `MERN App (${user.email})`,
    issuer: 'MERN App',
  });

  user.twoFactorSecret = secret.base32;
  await user.save({ validateBeforeSave: false });

  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

  res.json({
    success: true,
    data: {
      secret: secret.base32,
      qrCode: qrCodeUrl,
    },
  });
});

// POST /api/auth/2fa/verify
exports.verify2FA = asyncHandler(async (req, res) => {
  const code = String(req.body.code || '').trim();

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ success: false, message: '2FA kodu 6 haneli olmalidir' });
  }

  const user = await User.findById(req.user._id).select('+twoFactorSecret');

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: code,
    window: 2,
  });

  if (!verified) {
    return res.status(400).json({
      success: false,
      message: 'Gecersiz kod. Lutfen tekrar deneyin.',
    });
  }

  user.twoFactorEnabled = true;
  await user.save({ validateBeforeSave: false });

  await Notification.create({
    userId: user._id,
    type: 'security',
    title: 'Iki Faktorlu Dogrulama Etkin',
    message: 'Hesabinizda 2FA basariyla etkinlestirildi.',
  });

  res.json({
    success: true,
    message: 'Iki faktorlu dogrulama basariyla etkinlestirildi',
  });
});

// POST /api/auth/2fa/disable
exports.disable2FA = asyncHandler(async (req, res) => {
  const password = String(req.body.password || '');

  if (!password) {
    return res.status(400).json({ success: false, message: 'Sifre zorunludur' });
  }

  const user = await User.findById(req.user._id).select('+password +twoFactorSecret');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Sifre hatali' });
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, message: '2FA devre disi birakildi' });
});

// POST /api/auth/refresh
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token bulunamadi' });
  }

  const storedToken = await RefreshToken.findOne({ token: refreshToken });
  if (!storedToken) {
    return res.status(401).json({ success: false, message: 'Gecersiz refresh token' });
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    await RefreshToken.deleteOne({ token: refreshToken });
    return res.status(401).json({
      success: false,
      message: 'Refresh token suresi doldu, lutfen tekrar giris yapin',
    });
  }

  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: 'Kullanici bulunamadi' });
  }

  const newAccessToken = generateAccessToken(user._id, user.role);

  res.json({ success: true, data: { accessToken: newAccessToken } });
});

// POST /api/auth/logout
exports.logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (refreshToken) {
    await RefreshToken.deleteOne({ token: refreshToken });
  }

  res.clearCookie('refreshToken', buildRefreshCookieOptions());

  res.json({ success: true, message: 'Cikis basarili' });
});

// GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

