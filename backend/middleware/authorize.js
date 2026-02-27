// ─── Rol tabanlı yetkilendirme middleware'i ───────────────────────
// Kullanım: router.delete('/users/:id', protect, authorize('admin'), handler)
// Kullanım: router.get('/reports', protect, authorize('admin', 'moderator'), handler)

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Önce giriş yapmanız gerekiyor',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Bu işlem için yetkiniz yok. Gerekli rol: ${roles.join(' veya ')}`,
      });
    }

    next();
  };
};

module.exports = authorize;
