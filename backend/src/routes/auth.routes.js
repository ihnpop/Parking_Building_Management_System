const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// Public auth endpoints
router.post('/login', authController.login);

// Protected auth endpoints (requires valid JWT token authorization)
router.post('/logout', authMiddleware.protect, authController.logout);
router.get('/me', authMiddleware.protect, authController.getMe);

module.exports = router;
