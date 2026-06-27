import express from 'express';
import registrationController from '../controllers/parkingRegistrationController.js';
import { verifyToken } from '../middlewares/auth.js';


const router = express.Router();

// Router chạy toàn bộ luồng đăng ký khép kín
router.post('/register-monthly', verifyToken, registrationController.registerMonthlyTicket);

export default router;