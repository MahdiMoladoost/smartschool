import express from 'express';
import authRoutes from './authRoutes.js';
import studentRoutes from './studentRoutes.js';

const router = express.Router();

// ثبت مسیرها - این خط حتماً باید باشه
router.use('/auth', authRoutes);
router.use('/student', studentRoutes);

router.get('/health', (req, res) => {
    res.json({ status: 'OK', version: '1.0.0', timestamp: new Date() });
});

export default router;