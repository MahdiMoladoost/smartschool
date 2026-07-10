import { callGapGPT, buildSchoolAIRequest } from '../services/aiService.js';

function ok(res, data = {}, message = 'درخواست با موفقیت انجام شد') {
    return res.json({ success: true, data, message });
}

function fail(res, statusCode, message = 'خطا در پردازش درخواست') {
    return res.status(statusCode).json({ success: false, message });
}

function cleanText(value, max = 4000) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function roleIn(user, roles) {
    return user && roles.includes(user.role);
}

export function createAIFeatureController(deps) {
    const { query, queryOne, execute, parentOwnsStudent, teacherCanAccessStudent } = deps;

    async function runFeature(req, res, feature, payload, { maxTokens = 700, role = req.user.role, structuredOutput = false } = {}) {
        const prompt = req.body.prompt ? cleanText(req.body.prompt, 6000) : buildSchoolAIRequest(feature, payload);
        const aiResult = await callGapGPT({
            role,
            prompt,
            messages: req.body.history || [],
            maxTokens,
            userId: req.user.id,
            feature,
            execute,
            queryOne,
            enforceRateLimit: true,
            structuredOutput,
            requestId: req.requestId
        });
        await execute(`
            INSERT INTO ai_logs (user_id, user_role, feature, question, response, tokens_used, provider_status, provider_response)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            req.user.id,
            req.user.role,
            feature,
            prompt.slice(0, 4000),
            aiResult.data?.content || aiResult.message || '',
            aiResult.data?.usage?.total_tokens || null,
            aiResult.providerStatus || aiResult.statusCode || null,
            aiResult.providerResponse || aiResult.error || null
        ]).catch(() => null);

        if (!aiResult.success) return fail(res, aiResult.statusCode || 502, aiResult.message || 'خطا در سرویس هوش مصنوعی');
        return ok(res, {
            feature,
            response: aiResult.data.content,
            structured: aiResult.data.structured || null,
            usage: aiResult.data.usage,
            model: aiResult.data.model,
            response_time: aiResult.data.responseTime
        }, 'پاسخ هوش مصنوعی آماده شد');
    }

    return {
        async assist(req, res) {
            try {
                const feature = cleanText(req.body.feature || 'chat', 100) || 'chat';
                const payload = req.body.payload || { text: cleanText(req.body.prompt || '', 4000) };
                return runFeature(req, res, feature, payload);
            } catch (error) {
                console.error('ai assist:', error);
                return fail(res, 500, 'خطا در پردازش هوش مصنوعی');
            }
        },

        async studentHomeworkAssistant(req, res) {
            try {
                const payload = {
                    subject: cleanText(req.body.subject, 120),
                    question: cleanText(req.body.question || req.body.prompt, 3000),
                    grade: cleanText(req.body.grade, 40),
                    rule: 'راهنمایی آموزشی بده؛ پاسخ کامل آماده تقلب تولید نکن.'
                };
                if (!payload.question) return fail(res, 400, 'متن سؤال یا تکلیف الزامی است');
                return runFeature(req, res, 'homework_help', payload, { role: 'student' });
            } catch (error) {
                console.error('student homework ai:', error);
                return fail(res, 500, 'خطا در دستیار تکلیف');
            }
        },

        async studentLessonExplanation(req, res) {
            try {
                const payload = {
                    subject: cleanText(req.body.subject, 120),
                    lesson: cleanText(req.body.lesson || req.body.topic || req.body.prompt, 3000),
                    level: cleanText(req.body.level || 'متوسط', 80)
                };
                if (!payload.lesson) return fail(res, 400, 'موضوع درس الزامی است');
                return runFeature(req, res, 'lesson_explanation', payload, { role: 'student' });
            } catch (error) {
                console.error('student lesson ai:', error);
                return fail(res, 500, 'خطا در توضیح درس');
            }
        },

        async studentStudyPlanner(req, res) {
            try {
                const student = await queryOne(`
                    SELECT u.id, u.name, c.name AS class_name, c.grade
                    FROM users u LEFT JOIN classes c ON c.id = u.class_id
                    WHERE u.id = ? AND u.role = 'student'
                `, [req.user.id]);
                const upcomingAssignments = await query(`
                    SELECT a.title, a.deadline, co.name AS course_name
                    FROM assignments a JOIN courses co ON co.id = a.course_id
                    JOIN class_students cs ON cs.class_id = co.class_id AND cs.student_id = ? AND cs.status='active'
                    WHERE a.deadline >= NOW()
                    ORDER BY a.deadline ASC LIMIT 10
                `, [req.user.id]);
                const exams = await query(`
                    SELECT e.title, e.start_time, co.name AS course_name
                    FROM exams e JOIN courses co ON co.id = e.course_id
                    JOIN class_students cs ON cs.class_id = co.class_id AND cs.student_id = ? AND cs.status='active'
                    WHERE e.start_time >= NOW() AND e.is_published = 1
                    ORDER BY e.start_time ASC LIMIT 10
                `, [req.user.id]);
                const payload = {
                    student,
                    available_hours: cleanText(req.body.available_hours || 'روزانه ۲ ساعت', 120),
                    goals: cleanText(req.body.goals || req.body.prompt || '', 1500),
                    assignments: upcomingAssignments,
                    exams
                };
                return runFeature(req, res, 'study_planner', payload, { role: 'student', maxTokens: 900 });
            } catch (error) {
                console.error('study planner ai:', error);
                return fail(res, 500, 'خطا در برنامه‌ریزی مطالعه');
            }
        },

        async teacherQuizGenerator(req, res) {
            try {
                const payload = {
                    subject: cleanText(req.body.subject, 160),
                    lesson: cleanText(req.body.lesson || req.body.topic, 1600),
                    question_count: Math.min(Number(req.body.question_count || 5), 20),
                    difficulty: cleanText(req.body.difficulty || 'medium', 50),
                    grade: cleanText(req.body.grade, 50)
                };
                if (!payload.subject && !payload.lesson) return fail(res, 400, 'موضوع آزمون الزامی است');
                return runFeature(req, res, 'quiz_generation', payload, { role: 'teacher', maxTokens: 1100 });
            } catch (error) {
                console.error('teacher quiz ai:', error);
                return fail(res, 500, 'خطا در تولید آزمون');
            }
        },

        async teacherAssignmentGenerator(req, res) {
            try {
                const payload = {
                    subject: cleanText(req.body.subject, 160),
                    learning_goal: cleanText(req.body.learning_goal || req.body.prompt, 2000),
                    grade: cleanText(req.body.grade, 50),
                    duration: cleanText(req.body.duration || 'یک هفته', 80)
                };
                if (!payload.learning_goal && !payload.subject) return fail(res, 400, 'هدف یا موضوع تکلیف الزامی است');
                return runFeature(req, res, 'assignment_generation', payload, { role: 'teacher', maxTokens: 1000 });
            } catch (error) {
                console.error('teacher assignment ai:', error);
                return fail(res, 500, 'خطا در تولید تکلیف');
            }
        },

        async teacherPerformanceSummary(req, res) {
            try {
                const studentId = Number(req.body.student_id || req.query.student_id);
                if (!studentId) return fail(res, 400, 'شناسه دانش‌آموز الزامی است');
                if (!(await teacherCanAccessStudent(req.user.id, studentId))) return fail(res, 403, 'دسترسی به این دانش‌آموز مجاز نیست');
                const [student, grades, attendance] = await Promise.all([
                    queryOne('SELECT id, name, class_id FROM users WHERE id = ? AND role = "student"', [studentId]),
                    query(`SELECT c.name AS course_name, g.quiz, g.midterm, g.final_exam, g.homework, g.project, g.average, g.term FROM grades g JOIN courses c ON c.id=g.course_id WHERE g.student_id=? ORDER BY g.updated_at DESC LIMIT 20`, [studentId]),
                    query(`SELECT status, COUNT(*) AS count FROM attendance WHERE student_id=? AND date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) GROUP BY status`, [studentId])
                ]);
                if (!student) return fail(res, 404, 'دانش‌آموز یافت نشد');
                return runFeature(req, res, 'performance_summary', { student, grades, attendance }, { role: 'teacher', maxTokens: 900 });
            } catch (error) {
                console.error('teacher performance ai:', error);
                return fail(res, 500, 'خطا در خلاصه عملکرد');
            }
        },

        async parentProgressSummary(req, res) {
            try {
                const studentId = Number(req.params.studentId || req.body.student_id);
                if (!studentId) return fail(res, 400, 'شناسه دانش‌آموز الزامی است');
                if (!(await parentOwnsStudent(req.user.id, studentId))) return fail(res, 403, 'دسترسی به این دانش‌آموز مجاز نیست');
                const [student, grades, attendance, assignments] = await Promise.all([
                    queryOne('SELECT id, name, class_id FROM users WHERE id = ? AND role = "student"', [studentId]),
                    query(`SELECT c.name AS course_name, g.average, g.term, g.updated_at FROM grades g JOIN courses c ON c.id=g.course_id WHERE g.student_id=? ORDER BY g.updated_at DESC LIMIT 20`, [studentId]),
                    query(`SELECT status, COUNT(*) AS count FROM attendance WHERE student_id=? AND date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) GROUP BY status`, [studentId]),
                    query(`SELECT a.title, a.deadline, s.submitted_at, s.grade FROM assignments a JOIN courses c ON c.id=a.course_id JOIN class_students cs ON cs.class_id=c.class_id AND cs.student_id=? LEFT JOIN submissions s ON s.assignment_id=a.id AND s.student_id=? ORDER BY a.deadline DESC LIMIT 20`, [studentId, studentId])
                ]);
                if (!student) return fail(res, 404, 'دانش‌آموز یافت نشد');
                return runFeature(req, res, 'parent_progress_summary', { student, grades, attendance, assignments }, { role: 'parent', maxTokens: 900 });
            } catch (error) {
                console.error('parent progress ai:', error);
                return fail(res, 500, 'خطا در خلاصه پیشرفت');
            }
        },

        async adminAnalyticsSummary(req, res) {
            try {
                if (!roleIn(req.user, ['super_admin', 'admin', 'principal'])) return fail(res, 403, 'دسترسی مدیریتی الزامی است');
                const [users, classes, attendance, grades, sms, ai] = await Promise.all([
                    query('SELECT role, COUNT(*) AS count FROM users GROUP BY role'),
                    query('SELECT grade, COUNT(*) AS count FROM classes WHERE status="active" GROUP BY grade'),
                    query(`SELECT status, COUNT(*) AS count FROM attendance WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY status`),
                    query(`SELECT ROUND(AVG(average),2) AS average_grade, COUNT(*) AS records FROM grades`),
                    query('SELECT status, COUNT(*) AS count FROM sms_logs GROUP BY status'),
                    query('SELECT feature, COUNT(*) AS count FROM ai_logs GROUP BY feature ORDER BY count DESC LIMIT 10')
                ]);
                return runFeature(req, res, 'admin_analytics_summary', { users, classes, attendance, grades, sms, ai }, { role: req.user.role, maxTokens: 1000, structuredOutput: true });
            } catch (error) {
                console.error('admin analytics ai:', error);
                return fail(res, 500, 'خطا در تحلیل مدیریتی');
            }
        }
    };
}
