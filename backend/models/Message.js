const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'Mesaj içeriği zorunludur'],
      trim: true,
      maxlength: [1000, 'Mesaj en fazla 1000 karakter olabilir'],
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    room: {
      type: String,
      required: true,
      default: 'general',
    },
    type: {
      type: String,
      enum: ['text', 'system', 'file', 'image'],
      default: 'text',
    },
    // ─── Mesaj düzenleme ─────────────────────────────────────────
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    // ─── Mesaj silme (soft delete) ───────────────────────────────
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    // ─── Dosya paylaşımı ─────────────────────────────────────────
    fileUrl: {
      type: String,
    },
    fileName: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    fileType: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Mesajları hızlı getirmek için index
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

module.exports = mongoose.model('Message', messageSchema);
