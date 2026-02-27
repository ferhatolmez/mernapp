const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { asyncHandler } = require('../middleware/errorHandler');

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

  // Validasyon
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Tüm alanlar zorunludur',
    });
  }

  // Email kullanımda mı?
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'Bu email adresi zaten kayıtlı',
    });
  }

  // Kullanıcı oluştur (şifre pre-save hook'ta hashlanır)
  const user = await User.create({ name, email, password });

  // Token'ları üret
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshTokenValue = generateRefreshToken(user._id);

  // Refresh token'ı DB'ye kaydet
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshToken.create({
    token: refreshTokenValue,
    userId: user._id,
    expiresAt,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  // Refresh token'ı HttpOnly cookie'ye koy (XSS koruması için)
  res.cookie('refreshToken', refreshTokenValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
  });

  res.status(201).json({
    success: true,
    message: 'Kayıt başarılı',
    data: {
      user,
      accessToken,
    },
  });
});

// ─── GİRİŞ ────────────────────────────────────────────────────────
// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email ve şifre zorunludur',
    });
  }

  // select('+password') — normalde gelmeyen şifre alanını dahil et
  const user = await User.findOne({ email }).select('+password');

  if (!user || !user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Email veya şifre hatalı',
    });
  }

  // Şifre kontrolü
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Email veya şifre hatalı',
    });
  }

  // Son giriş zamanını güncelle
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Token'ları üret
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshTokenValue = generateRefreshToken(user._id);

  // Eski refresh token'ları temizle (isteğe bağlı: max session limiti)
  await RefreshToken.deleteMany({ userId: user._id });

  // Yeni refresh token'ı kaydet
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

  // Token'ı DB'de ara
  const storedToken = await RefreshToken.findOne({ token: refreshToken });
  if (!storedToken) {
    return res.status(401).json({
      success: false,
      message: 'Geçersiz refresh token',
    });
  }

  // JWT doğrulama
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

  // Yeni access token üret
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
    // DB'den refresh token'ı sil
    await RefreshToken.deleteOne({ token: refreshToken });
  }

  // Cookie'yi temizle
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
// GET /api/auth/me  (protect middleware gerekir)
exports.getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user },
  });
});
