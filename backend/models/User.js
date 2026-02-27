const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'İsim zorunludur'],
      trim: true,
      minlength: [2, 'İsim en az 2 karakter olmalıdır'],
      maxlength: [50, 'İsim en fazla 50 karakter olabilir'],
    },
    email: {
      type: String,
      required: [true, 'Email zorunludur'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: validator.isEmail,
        message: 'Geçerli bir email adresi giriniz',
      },
    },
    password: {
      type: String,
      required: [true, 'Şifre zorunludur'],
      minlength: [6, 'Şifre en az 6 karakter olmalıdır'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
      default: 'user',
    },
    avatar: {
      type: String,
      default: function () {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=random`;
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    // ─── Email doğrulama ───────────────────────────────────────────
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    // ─── Şifre sıfırlama ──────────────────────────────────────────
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    // ─── 2FA ───────────────────────────────────────────────────────
    twoFactorSecret: {
      type: String,
      select: false,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    // ─── Arama geçmişi ────────────────────────────────────────────
    searchHistory: [
      {
        query: { type: String, trim: true },
        searchedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ─── INDEX'LER ────────────────────────────────────────────────────
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isEmailVerified: 1 });

// ─── MIDDLEWARE: Kaydetmeden önce şifreyi hashle ──────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ─── METOD: Şifre karşılaştırma ───────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── METOD: Email doğrulama token'ı üret ──────────────────────────
userSchema.methods.generateEmailVerificationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 saat
  return token;
};

// ─── METOD: Şifre sıfırlama token'ı üret ─────────────────────────
userSchema.methods.generatePasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 saat
  return token;
};

// ─── Hassas alanları JSON'dan çıkar ───────────────────────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();

  // Avatar URL'ini mutlak hale getir (Eğer başında http yoksa ve BACKEND_URL tanımlıysa)
  if (obj.avatar && !obj.avatar.startsWith('http')) {
    const baseUrl = process.env.BACKEND_URL || '';
    obj.avatar = `${baseUrl}${obj.avatar}`;
  }

  delete obj.password;
  delete obj.__v;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.twoFactorSecret;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
