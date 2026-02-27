// ─── Global Error Handler ─────────────────────────────────────────
// Express'te 4 parametreli middleware otomatik olarak error handler sayılır

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Geliştirme modunda stack trace'i logla
  if (process.env.NODE_ENV === 'development') {
    console.error('🔴 HATA:', err);
  }

  // ─── Mongoose: Geçersiz ObjectId ─────────────────────────────
  if (err.name === 'CastError') {
    error = {
      message: 'Geçersiz kaynak ID\'si',
      statusCode: 400,
    };
  }

  // ─── Mongoose: Duplicate key (unique constraint) ──────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = {
      message: `Bu ${field} zaten kayıtlı`,
      statusCode: 400,
    };
  }

  // ─── Mongoose: Validation hatası ─────────────────────────────
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    error = {
      message: messages.join('. '),
      statusCode: 400,
    };
  }

  // ─── JWT hataları ─────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    error = { message: 'Geçersiz token', statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    error = { message: 'Token süresi doldu', statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Sunucu hatası',
    // Sadece development modunda stack trace göster
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// ─── Async handler wrapper ────────────────────────────────────────
// Her async controller'ı try-catch'e sarmak yerine bu kullanılır
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, asyncHandler };
