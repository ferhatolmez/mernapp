const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');
const logger = require('../utils/logger');

// ─── JWT Token üretici yardımcılar ───────────────────────────────
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

// ─── KAYIT ────────────────────────────────────────────────────────
// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Tüm alanlar zorunludur',
    });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'Bu email adresi zaten kayıtlı',
    });
  }

  // Kullanıcıyı oluştur (henüz kaydetme)
  const user = new User({ name, email, password });

  // Email doğrulama token'ı üret
  const verificationToken = user.generateEmailVerificationToken();

  // Tek seferde veritabanına kaydet (Hashing pre-save hook'ta yapılıyor)
  await user.save();

  // Email gönderimini arka plana al
  sendVerificationEmail(user.email, verificationToken)
    .then(() => logger.info(`Email doğrulama maili gönderildi: ${user.email}`))
    .catch((err) => logger.error('Email gönderme hatası:', err));

  // Hoşgeldin bildirimini arka plana al
  Notification.create({
    userId: user._id,
    type: 'welcome',
    title: 'Hoş Geldiniz! 🎉',
    message: `Merhaba ${user.name}, MERN App ailesine kayıt oldunuz. Lütfen email adresinizi doğrulayın.`,
  }).catch((err) => logger.error('Bildirim oluşturma hatası:', err));

  res.status(201).json({
    success: true,
    message: 'Kayıt başarılı. Lütfen giriş yapmadan önce email adresinizi doğrulayın.',
  });
});

// ─── EMAIL DOĞRULAMA ──────────────────────────────────────────────
// POST /api/auth/verify-email
exports.verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

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
      message: 'Geçersiz veya süresi dolmuş doğrulama linki',
    });
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  logger.info(`Email doğrulandı: ${user.email}`);

  res.json({
    success: true,
    message: 'Email başarıyla doğrulandı!',
  });
});

// ─── GİRİŞ ────────────────────────────────────────────────────────
// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password, twoFactorCode } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email ve şifre zorunludur',
    });
  }

  const user = await User.findOne({ email }).select('+password +twoFactorSecret');

  if (!user || !user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Email veya şifre hatalı',
    });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Email veya şifre hatalı',
    });
  }

  if (!user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Lütfen giriş yapmadan önce email adresinizi doğrulayın.',
    });
  }

  // 2FA kontrolü
  if (user.twoFactorEnabled) {
    if (!twoFactorCode) {
      return res.status(200).json({
        success: true,
        requiresTwoFactor: true,
        message: 'İki faktörlü doğrulama kodu gereklidir',
      });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: twoFactorCode,
      window: 2,
    });

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz 2FA kodu',
      });
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

  res.cookie('refreshToken', refreshTokenValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    message: 'Giriş başarılı',
    data: {
      user,
      accessToken,
    },
  });
});

// ─── ŞİFREMİ UNUTTUM ─────────────────────────────────────────────
// POST /api/auth/forgot-password
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email zorunludur' });
  }

  const user = await User.findOne({ email });

  // Güvenlik: Kullanıcı bulunamasa bile başarılı mesajı gönder
  if (!user) {
    return res.json({
      success: true,
      message: 'Eğer bu email kayıtlıysa, şifre sıfırlama linki gönderildi',
    });
  }

  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // Email gönderimini arka plana al
  sendPasswordResetEmail(user.email, resetToken)
    .then(() => logger.info(`Şifre sıfırlama maili gönderildi: ${user.email}`))
    .catch(async (err) => {
      logger.error('Email gönderme hatası:', err);
      // Not: Artık asenkron olduğu için kullanıcıya hata dönmek mümkün değil, 
      // ancak email servisinin başarısız olduğu durumlarda loglara bakılmalı.
    });

  res.json({
    success: true,
    message: 'Şifre sıfırlama linki email adresinize gönderildi',
  });
});

// ─── ŞİFRE SIFIRLA ───────────────────────────────────────────────
// POST /api/auth/reset-password
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ success: false, message: 'Token ve yeni şifre zorunludur' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Şifre en az 6 karakter olmalıdır' });
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Geçersiz veya süresi dolmuş sıfırlama linki',
    });
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Güvenlik: Tüm refresh token'ları sil
  await RefreshToken.deleteMany({ userId: user._id });

  logger.info(`Şifre sıfırlandı: ${user.email}`);

  res.json({
    success: true,
    message: 'Şifre başarıyla sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz.',
  });
});

// ─── 2FA KURULUMU ─────────────────────────────────────────────────
// POST /api/auth/2fa/setup (protect middleware gerekir)
exports.setup2FA = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+twoFactorSecret');

  if (user.twoFactorEnabled) {
    return res.status(400).json({
      success: false,
      message: '2FA zaten etkin',
    });
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

// ─── 2FA DOĞRULAMA (İlk kurulumda) ───────────────────────────────
// POST /api/auth/2fa/verify (protect middleware gerekir)
exports.verify2FA = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, message: '2FA kodu zorunludur' });
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
      message: 'Geçersiz kod. Lütfen tekrar deneyin.',
    });
  }

  user.twoFactorEnabled = true;
  await user.save({ validateBeforeSave: false });

  // Bildirim
  await Notification.create({
    userId: user._id,
    type: 'security',
    title: 'İki Faktörlü Doğrulama Etkin 🔐',
    message: 'Hesabınızda 2FA başarıyla etkinleştirildi.',
  });

  res.json({
    success: true,
    message: 'İki faktörlü doğrulama başarıyla etkinleştirildi!',
  });
});

// ─── 2FA DEVRE DIŞI BIRAK ────────────────────────────────────────
// POST /api/auth/2fa/disable (protect middleware gerekir)
exports.disable2FA = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, message: 'Şifre zorunludur' });
  }

  const user = await User.findById(req.user._id).select('+password +twoFactorSecret');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Şifre hatalı' });
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    message: '2FA devre dışı bırakıldı',
  });
});

// ─── TOKEN YENİLE ─────────────────────────────────────────────────
// POST /api/auth/refresh
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token bulunamadı',
    });
  }

  const storedToken = await RefreshToken.findOne({ token: refreshToken });
  if (!storedToken) {
    return res.status(401).json({
      success: false,
      message: 'Geçersiz refresh token',
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    await RefreshToken.deleteOne({ token: refreshToken });
    return res.status(401).json({
      success: false,
      message: 'Refresh token süresi doldu, lütfen tekrar giriş yapın',
    });
  }

  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: 'Kullanıcı bulunamadı' });
  }

  const newAccessToken = generateAccessToken(user._id, user.role);

  res.json({
    success: true,
    data: { accessToken: newAccessToken },
  });
});

// ─── ÇIKIŞ ────────────────────────────────────────────────────────
// POST /api/auth/logout
exports.logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (refreshToken) {
    await RefreshToken.deleteOne({ token: refreshToken });
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  res.json({
    success: true,
    message: 'Çıkış başarılı',
  });
});

// ─── MEVCUT KULLANICI ─────────────────────────────────────────────
// GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user },
  });
});
