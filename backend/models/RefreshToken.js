const mongoose = require('mongoose');

// Refresh token'ları veritabanında saklıyoruz
// Böylece logout veya şüpheli aktivitede geçersiz kılabiliriz
const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    // Hangi cihaz/tarayıcıdan geldiğini izle
    userAgent: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: MongoDB süresi dolan token'ları otomatik siler
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ userId: 1 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
