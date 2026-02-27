const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

// ─── TÜM KULLANICILARI GETİR (Admin) ─────────────────────────────
// GET /api/users?page=1&limit=10&search=ali&role=user&sort=-createdAt
exports.getUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    role,
    sort = '-createdAt',
  } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 50); // Max 50

  // ─── Filtre oluştur ─────────────────────────────────────────
  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (role && ['user', 'moderator', 'admin'].includes(role)) {
    filter.role = role;
  }

  // ─── Toplam kayıt sayısı ─────────────────────────────────────
  const total = await User.countDocuments(filter);

  // ─── Cursor-based alternatifi olan offset pagination ─────────
  const users = await User.find(filter)
    .sort(sort)
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .lean(); // Plain JS object döner — Mongoose overhead yok

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1,
      },
    },
  });
});

// ─── TEK KULLANICI GETİR ──────────────────────────────────────────
// GET /api/users/:id
exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Kullanıcı bulunamadı',
    });
  }

  res.json({
    success: true,
    data: { user },
  });
});

// ─── KULLANICI GÜNCELLE (Admin) ───────────────────────────────────
// PUT /api/users/:id
exports.updateUser = asyncHandler(async (req, res) => {
  const { name, email, role, isActive } = req.body;

  // Şifre bu endpoint'ten güncellenmez
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { name, email, role, isActive },
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Kullanıcı bulunamadı',
    });
  }

  res.json({
    success: true,
    message: 'Kullanıcı güncellendi',
    data: { user },
  });
});

// ─── KULLANICI SİL (Admin) ────────────────────────────────────────
// DELETE /api/users/:id
exports.deleteUser = asyncHandler(async (req, res) => {
  // Kendi hesabını silemesin
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Kendi hesabınızı silemezsiniz',
    });
  }

  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Kullanıcı bulunamadı',
    });
  }

  res.json({
    success: true,
    message: 'Kullanıcı silindi',
  });
});

// ─── PROFİL GÜNCELLE (Kullanıcının kendisi) ───────────────────────
// PUT /api/users/profile
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, email },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Profil güncellendi',
    data: { user },
  });
});

// ─── ŞİFRE DEĞİŞTİR ──────────────────────────────────────────────
// PUT /api/users/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: 'Mevcut şifre hatalı',
    });
  }

  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Şifre başarıyla değiştirildi',
  });
});

// ─── İSTATİSTİKLER (Admin) ────────────────────────────────────────
// GET /api/users/stats
exports.getUserStats = asyncHandler(async (req, res) => {
  // Aggregation pipeline örneği
  const stats = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        activeCount: {
          $sum: { $cond: ['$isActive', 1, 0] },
        },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  const totalUsers = await User.countDocuments();
  const newToday = await User.countDocuments({
    createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
  });

  res.json({
    success: true,
    data: {
      total: totalUsers,
      newToday,
      byRole: stats,
    },
  });
});
