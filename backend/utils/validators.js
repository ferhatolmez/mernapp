const mongoose = require('mongoose');

const parsePositiveInt = (value, defaultValue, { min = 1, max = 100 } = {}) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
};

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

const normalizeText = (value = '') => String(value).trim().replace(/\s+/g, ' ');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const safeRegex = (value, flags = 'i') => new RegExp(escapeRegex(value), flags);

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

const sanitizeSort = (sortInput, allowedFields, fallback = { createdAt: -1 }) => {
  if (!sortInput || typeof sortInput !== 'string') return fallback;

  const raw = sortInput.trim();
  if (!raw) return fallback;

  const direction = raw.startsWith('-') ? -1 : 1;
  const field = raw.replace(/^[-+]/, '');

  if (!allowedFields.includes(field)) return fallback;
  return { [field]: direction };
};

module.exports = {
  parsePositiveInt,
  normalizeEmail,
  normalizeText,
  safeRegex,
  isValidObjectId,
  toObjectId,
  sanitizeSort,
};
