const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/parkingRegistrationController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Router chạy toàn bộ luồng đăng ký khép kín
router.post('/register-monthly', verifyToken, registrationController.registerMonthlyTicket);

module.exports = router;