import express from 'express';
import { createAutomationController } from '../controllers/automationController.js';

export default function registerAutomationRoutes(app, deps) {
    const router = express.Router();
    const { authenticateToken, checkRole } = deps;
    const controller = createAutomationController(deps);

    router.use(authenticateToken);

    router.post('/attendance-drop/:studentId', checkRole('super_admin', 'admin', 'principal', 'executive_deputy', 'teacher', 'parent'), controller.attendanceDrop);
    router.post('/grade-drop/:studentId', checkRole('super_admin', 'admin', 'principal', 'executive_deputy', 'teacher', 'parent'), controller.gradeDrop);
    router.post('/counselor-risk/:sessionId', checkRole('super_admin', 'admin', 'principal', 'counselor'), controller.counselorRisk);
    router.post('/announcement-summary', checkRole('super_admin', 'admin', 'principal', 'executive_deputy', 'cultural_deputy'), controller.announcementSummary);

    app.use('/api/v1/automation', router);
}
