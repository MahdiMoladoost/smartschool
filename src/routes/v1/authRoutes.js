import express from 'express';
import { login, sendOTP, verifyOTPAndLogin, getMe } from '../../controllers/authController.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = express.Router();

// مسیرهای عمومی
router.post('/login', login);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTPAndLogin);

// مسیرهای محافظت شده
router.get('/me', authenticateToken, getMe);

export default router;