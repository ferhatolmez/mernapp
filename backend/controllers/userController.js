const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  parsePositiveInt,
  normalizeEmail,
  normalizeText,
  safeRegex,
  sanitizeSort,
  isValidObjectId,
} = require('../utils/validators');

// GET /api/users/search?q=ali
exports.searchUsers = asyncHandler(async (req, res) => {
  const keyword = normalizeText(req.query.q || '');
  if (keyword.length < 2) {
    return res.json({ success: true, data: { users: [] } });
  }

  const limitNum = parsePositiveInt(req.query.limit, 15, { min: 1, max: 30 });
  const queryRegex = safeRegex(keyword);

  const users = await User.find({
    _id: { $ne: req.user._id },
    isActive: true,
    $or: [{ name: queryRegex }, { email: queryRegex }],
  })
    .select('name email avatar role')
    .limit(limitNum)
    .lean();

  res.json({ success: true, data: { users } });
});

// GET /api/users?page=1&limit=10&search=ali&role=user&sort=-createdAt
exports.getUsers = asyncHandler(async (req, res) => {
  const pageNum = parsePositiveInt(req.query.page, 1, { min: 1, max: 100000 });
  const limitNum = parsePositiveInt(req.query.limit, 10, { min: 1, max: 50 });
  const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';
  const search = normalizeText(req.query.search || '');
  const sortQuery = sanitizeSort(
    req.query.sort,
    ['createdAt', 'name', 'email', 'role', 'lastLogin', 'isActive'],
    { createdAt: -1 }
  );

  const filter = {};

  if (search.length >= 2) {
    const queryRegex = safeRegex(search);
    filter.$or = [{ name: queryRegex }, { email: queryRegex }];
  }

  if (role && ['user', 'moderator', 'admin'].includes(role)) {
    filter.role = role;
  }

  const total = await User.countDocuments(filter);

  const users = await User.find(filter)
    .sort(sortQuery)
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .lean();

  const totalPages = Math.ceil(total / limitNum);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    },
  });
});

// GET /api/users/:id
exports.getUser = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Gecersiz kullanici ID' });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Kullanici bulunamadi' });
  }

  res.json({ success: true, data: { user } });
});

// PUT /api/users/:id
exports.updateUser = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Gecersiz kullanici ID' });
  }

  const { name, email, role, isActive } = req.body;
  const updateData = {};

  if (name !== undefined) {
    const normalizedName = normalizeText(name);
    if (normalizedName.length < 2) {
      return res.status(400).json({ success: false, message: 'Isim en az 2 karakter olmali' });
    }
    updateData.name = normalizedName;
  }

  if (email !== undefined) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Email zorunludur' });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.params.id },
    }).select('_id');

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Bu email adresi zaten kayitli' });
    }

    updateData.email = normalizedEmail;
  }

  if (role !== undefined) {
    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Gecersiz rol' });
    }
    updateData.role = role;
  }

  if (isActive !== undefined) {
    updateData.isActive = Boolean(isActive);
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ success: false, message: 'Guncellenecek alan bulunamadi' });
  }

  const user = await User.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return res.status(404).json({ success: false, message: 'Kullanici bulunamadi' });
  }

  res.json({ success: true, message: 'Kullanici guncellendi', data: { user } });
});

// DELETE /api/users/:id
exports.deleteUser = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Gecersiz kullanici ID' });
  }

  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ success: false, message: 'Kendi hesabinizi silemezsiniz' });
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Kullanici bulunamadi' });
  }

  res.json({ success: true, message: 'Kullanici silindi' });
});

// PUT /api/users/profile
exports.updateProfile = asyncHandler(async (req, res) => {
  const name = normalizeText(req.body.name || '');
  const email = normalizeEmail(req.body.email || '');

  if (!name || name.length < 2) {
    return res.status(400).json({ success: false, message: 'Isim en az 2 karakter olmali' });
  }

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email zorunludur' });
  }

  const existingUser = await User.findOne({
    email,
    _id: { $ne: req.user._id },
  }).select('_id');

  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Bu email adresi zaten kayitli' });
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, email },
    { new: true, runValidators: true }
  );

  res.json({ success: true, message: 'Profil guncellendi', data: { user } });
});

// PUT /api/users/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Mevcut sifre ve yeni sifre zorunludur',
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Sifre en az 6 karakter olmali',
    });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Yeni sifre mevcut sifre ile ayni olamaz',
    });
  }

  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Mevcut sifre hatali' });
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Sifre basariyla degistirildi' });
});

// PUT /api/users/avatar
exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Fotograf secilmedi' });
  }

  const avatarUrl = req.file.path;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: avatarUrl },
    { new: true }
  );

  res.json({
    success: true,
    message: 'Profil fotografi guncellendi',
    data: { user },
  });
});

// POST /api/users/search-history
exports.saveSearchHistory = asyncHandler(async (req, res) => {
  const query = normalizeText(req.body.query || '');

  if (query.length < 2) {
    return res.status(400).json({ success: false, message: 'Arama sorgusu en az 2 karakter olmali' });
  }

  if (query.length > 100) {
    return res.status(400).json({ success: false, message: 'Arama sorgusu cok uzun' });
  }

  const user = await User.findById(req.user._id);

  user.searchHistory = user.searchHistory.filter(
    (historyItem) => historyItem.query.toLowerCase() !== query.toLowerCase()
  );

  user.searchHistory.unshift({ query });
  if (user.searchHistory.length > 20) {
    user.searchHistory = user.searchHistory.slice(0, 20);
  }

  await user.save({ validateBeforeSave: false });

  res.json({ success: true, data: { searchHistory: user.searchHistory } });
});

// GET /api/users/search-history
exports.getSearchHistory = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('searchHistory');
  res.json({ success: true, data: { searchHistory: user.searchHistory || [] } });
});

// DELETE /api/users/search-history
exports.clearSearchHistory = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { searchHistory: [] });
  res.json({ success: true, message: 'Arama gecmisi temizlendi' });
});

// GET /api/users/stats
exports.getUserStats = asyncHandler(async (req, res) => {
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
