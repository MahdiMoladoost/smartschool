import express from 'express';
import { createAIFeatureController } from '../controllers/aiFeatureController.js';

export default function registerAIRoutes(app, deps) {
    const router = express.Router();
    const { authenticateToken, checkRole } = deps;
    const controller = createAIFeatureController(deps);

    router.use(authenticateToken);

    router.post('/assist', controller.assist);

    router.post('/student/homework-assistant', checkRole('student'), controller.studentHomeworkAssistant);
    router.post('/student/lesson-explanation', checkRole('student'), controller.studentLessonExplanation);
    router.post('/student/study-planner', checkRole('student'), controller.studentStudyPlanner);

    router.post('/teacher/quiz-generator', checkRole('teacher'), controller.teacherQuizGenerator);
    router.post('/teacher/assignment-generator', checkRole('teacher'), controller.teacherAssignmentGenerator);
    router.post('/teacher/performance-summary', checkRole('teacher'), controller.teacherPerformanceSummary);

    router.post('/parent/student/:studentId/progress-summary', checkRole('parent'), controller.parentProgressSummary);
    router.post('/admin/analytics-summary', checkRole('super_admin', 'admin', 'principal'), controller.adminAnalyticsSummary);

    app.use('/api/v1/ai', router);
}
