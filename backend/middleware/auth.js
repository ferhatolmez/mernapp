const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── Access token doğrulama middleware'i ──────────────────────────
const protect = async (req, res, next) => {
  try {
    // 1. Token'ı header'dan al
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Erişim token\'ı bulunamadı. Lütfen giriş yapın.',
      });
    }

    const token = authHeader.split(' ')[1];

    // 2. Token'ı doğrula
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token süresi doldu',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Geçersiz token',
      });
    }

    // 3. Kullanıcıyı veritabanından al (hesap silinmişse yakala)
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Bu token\'a ait kullanıcı bulunamadı',
      });
    }

    // 4. Kullanıcıyı request'e ekle
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = protect;
