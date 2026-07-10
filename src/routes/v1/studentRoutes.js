import express from 'express';
import { authenticateToken, checkRole } from '../../middleware/auth.js';
import {
    getDashboard,
    getGrades,
    getAssignments,
    submitAssignment,
    getAttendance,
    requestLeave,
    getLeaveRequests,
    //getExams,
    getProfile,
    updateProfile
} from '../../controllers/studentController.js';

const router = express.Router();

// همه مسیرهای دانش‌آموز نیاز به احراز هویت و نقش دانش‌آموز دارند
router.use(authenticateToken, checkRole('student'));

// داشبورد
router.get('/dashboard', getDashboard);

// نمرات
router.get('/grades', getGrades);

// تکالیف
router.get('/assignments', getAssignments);
router.post('/assignments/:assignmentId/submit', submitAssignment);

// حضور و غیاب
router.get('/attendance', getAttendance);

// مرخصی
router.get('/leave-requests', getLeaveRequests);
router.post('/leave-requests', requestLeave);

// امتحانات
//router.get('/exams', getExams);

// پروفایل
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

export default router;