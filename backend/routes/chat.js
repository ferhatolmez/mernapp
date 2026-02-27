const express = require('express');
const router = express.Router();
const { getMessages } = require('../controllers/chatController');
const protect = require('../middleware/auth');

// GET /api/chat/messages?room=general&before=<id>&limit=30
router.get('/messages', protect, getMessages);

module.exports = router;
