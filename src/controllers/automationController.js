import { callGapGPT, buildSchoolAIRequest } from '../services/aiService.js';
import { sendSMS } from '../services/smsService.js';

function ok(res, data = {}, message = 'درخواست با موفقیت انجام شد') {
    return res.json({ success: true, data, message });
}

function fail(res, statusCode, message = 'خطا در پردازش درخواست') {
    return res.status(statusCode).json({ success: false, message });
}

function managementRoles() {
    return ['super_admin', 'admin', 'principal', 'executive_deputy'];
}

async function getStudentParents(query, studentId) {
    return query(`
        SELECT p.id, p.name, p.phone
        FROM parent_children pc
        JOIN users p ON p.id = pc.parent_id
        WHERE pc.student_id = ? AND p.role = 'parent' AND p.status = 'active' AND p.phone IS NOT NULL
    `, [studentId]);
}

async function notifyParents({ query, execute, queryOne, req, studentId, message, eventType }) {
    const parents = await getStudentParents(query, studentId);
    const results = [];
    for (const parent of parents) {
        results.push(await sendSMS({ recipientNumber: parent.phone, message, execute, queryOne, userId: req.user.id, eventType, requestId: req.requestId }));
    }
    return results;
}

export function createAutomationController(deps) {
    const { query, queryOne, execute, parentOwnsStudent, teacherCanAccessStudent, withTransaction } = deps;
    const runWriteTransaction = async (callback) => {
        if (withTransaction) return withTransaction(callback);
        return callback({ query, queryOne, execute });
    };

    return {
        async attendanceDrop(req, res) {
            try {
                const studentId = Number(req.params.studentId || req.body.student_id);
                if (!studentId) return fail(res, 400, 'شناسه دانش‌آموز الزامی است');
                if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user.id, studentId))) return fail(res, 403, 'دسترسی به این دانش‌آموز مجاز نیست');
                if (req.user.role === 'parent' && !(await parentOwnsStudent(req.user.id, studentId))) return fail(res, 403, 'دسترسی به این دانش‌آموز مجاز نیست');
                if (!['teacher', 'parent', ...managementRoles()].includes(req.user.role)) return fail(res, 403, 'دسترسی مجاز نیست');

                const [student, attendance] = await Promise.all([
                    queryOne('SELECT id, name, class_id FROM users WHERE id = ? AND role = "student"', [studentId]),
                    query(`SELECT status, COUNT(*) AS count FROM attendance WHERE student_id=? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY status`, [studentId])
                ]);
                if (!student) return fail(res, 404, 'دانش‌آموز یافت نشد');
                const total = attendance.reduce((sum, row) => sum + Number(row.count || 0), 0);
                const absentLike = attendance.filter(row => ['absent', 'late'].includes(row.status)).reduce((sum, row) => sum + Number(row.count || 0), 0);
                const ratio = total ? absentLike / total : 0;
                const threshold = Number(req.body.threshold || 0.2);
                const shouldNotify = ratio >= threshold || req.body.force === true;

                const prompt = buildSchoolAIRequest('attendance_risk', { student, attendance, total, absent_or_late: absentLike, ratio });
                const ai = await callGapGPT({ role: req.user.role, prompt, maxTokens: 350, userId: req.user.id, feature: 'attendance_risk', execute, queryOne, enforceRateLimit: true, requestId: req.requestId });
                const aiSummary = ai.success ? ai.data.content : `افت حضور/تاخیر برای ${student.name} نیازمند پیگیری است.`;
                const { smsResults } = await runWriteTransaction(async (tx) => {
                    let smsResults = [];
                    if (shouldNotify && req.body.send_sms !== false) {
                        const message = String(req.body.message || `ولی گرامی، وضعیت حضور و غیاب ${student.name} نیازمند پیگیری است. لطفاً پنل مدرسه را بررسی کنید.`).slice(0, 500);
                        smsResults = await notifyParents({ query: tx.query, execute: tx.execute, queryOne: tx.queryOne, req, studentId, message, eventType: 'attendance_drop_alert' });
                    }
                    await tx.execute(`INSERT INTO ai_automation_logs (user_id, automation_type, input_summary, ai_output, action_taken, status) VALUES (?, 'attendance_drop', ?, ?, ?, ?)`, [req.user.id, JSON.stringify({ studentId, ratio }).slice(0, 1000), aiSummary, shouldNotify ? 'parent_sms' : 'no_sms_threshold_not_met', shouldNotify ? 'sent' : 'skipped']);
                    return { smsResults };
                });
                return ok(res, { student, attendance, ratio, threshold, should_notify: shouldNotify, ai_summary: aiSummary, sms_results: smsResults }, 'بررسی افت حضور انجام شد');
            } catch (error) {
                console.error('attendance automation:', error);
                return fail(res, 500, 'خطا در اتوماسیون حضور و غیاب');
            }
        },

        async gradeDrop(req, res) {
            try {
                const studentId = Number(req.params.studentId || req.body.student_id);
                if (!studentId) return fail(res, 400, 'شناسه دانش‌آموز الزامی است');
                if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user.id, studentId))) return fail(res, 403, 'دسترسی به این دانش‌آموز مجاز نیست');
                if (req.user.role === 'parent' && !(await parentOwnsStudent(req.user.id, studentId))) return fail(res, 403, 'دسترسی به این دانش‌آموز مجاز نیست');
                if (!['teacher', 'parent', ...managementRoles()].includes(req.user.role)) return fail(res, 403, 'دسترسی مجاز نیست');

                const [student, grades] = await Promise.all([
                    queryOne('SELECT id, name, class_id FROM users WHERE id=? AND role="student"', [studentId]),
                    query(`SELECT g.average, g.term, g.updated_at, c.name AS course_name FROM grades g JOIN courses c ON c.id=g.course_id WHERE g.student_id=? AND g.average IS NOT NULL ORDER BY g.updated_at DESC LIMIT 20`, [studentId])
                ]);
                if (!student) return fail(res, 404, 'دانش‌آموز یافت نشد');
                const latest = Number(grades[0]?.average || 0);
                const previous = Number(grades[1]?.average || latest || 0);
                const drop = previous - latest;
                const threshold = Number(req.body.threshold || 2);
                const shouldNotify = drop >= threshold || latest < Number(req.body.minimum_average || 12) || req.body.force === true;
                const prompt = buildSchoolAIRequest('grade_drop_alert', { student, grades: grades.slice(0, 8), latest, previous, drop });
                const ai = await callGapGPT({ role: req.user.role, prompt, maxTokens: 350, userId: req.user.id, feature: 'grade_drop_alert', execute, queryOne, enforceRateLimit: true, requestId: req.requestId });
                const aiSummary = ai.success ? ai.data.content : `افت نمره ${student.name} نیازمند پیگیری آموزشی است.`;
                const { smsResults } = await runWriteTransaction(async (tx) => {
                    let smsResults = [];
                    if (shouldNotify && req.body.send_sms !== false) {
                        const message = String(req.body.message || `ولی گرامی، روند نمرات ${student.name} نیازمند توجه است. لطفاً گزارش تحصیلی را در پنل بررسی کنید.`).slice(0, 500);
                        smsResults = await notifyParents({ query: tx.query, execute: tx.execute, queryOne: tx.queryOne, req, studentId, message, eventType: 'grade_drop_alert' });
                    }
                    await tx.execute(`INSERT INTO ai_automation_logs (user_id, automation_type, input_summary, ai_output, action_taken, status) VALUES (?, 'grade_drop', ?, ?, ?, ?)`, [req.user.id, JSON.stringify({ studentId, latest, previous, drop }).slice(0, 1000), aiSummary, shouldNotify ? 'parent_sms' : 'no_sms_threshold_not_met', shouldNotify ? 'sent' : 'skipped']);
                    return { smsResults };
                });
                return ok(res, { student, grades, latest, previous, drop, threshold, should_notify: shouldNotify, ai_summary: aiSummary, sms_results: smsResults }, 'بررسی افت نمره انجام شد');
            } catch (error) {
                console.error('grade automation:', error);
                return fail(res, 500, 'خطا در اتوماسیون نمرات');
            }
        },

        async counselorRisk(req, res) {
            try {
                const sessionId = Number(req.params.sessionId || req.body.session_id);
                if (!sessionId) return fail(res, 400, 'شناسه جلسه مشاوره الزامی است');
                if (!['counselor', 'super_admin', 'admin', 'principal'].includes(req.user.role)) return fail(res, 403, 'دسترسی مشاوره‌ای مجاز نیست');
                const session = await queryOne(`
                    SELECT cs.id, cs.student_id, s.name AS student_name, cs.counselor_id, cs.public_summary, cs.risk_level, cs.follow_up_at, cs.created_at
                    FROM counseling_sessions cs
                    JOIN users s ON s.id = cs.student_id
                    WHERE cs.id = ?
                `, [sessionId]);
                if (!session) return fail(res, 404, 'جلسه مشاوره یافت نشد');
                if (req.user.role === 'counselor' && session.counselor_id !== req.user.id) return fail(res, 403, 'دسترسی به جلسه مشاوره مجاز نیست');
                const shouldNotify = ['medium', 'high'].includes(session.risk_level) || req.body.force === true;
                const prompt = buildSchoolAIRequest('counselor_risk_alert', { risk_level: session.risk_level, public_summary: session.public_summary, follow_up_at: session.follow_up_at });
                const ai = await callGapGPT({ role: 'counselor', prompt, maxTokens: 300, userId: req.user.id, feature: 'counselor_risk_alert', execute, queryOne, enforceRateLimit: true, requestId: req.requestId });
                const aiSummary = ai.success ? ai.data.content : `یک مورد مشاوره با ریسک ${session.risk_level} نیازمند توجه مدیریتی است.`;
                const { smsResults } = await runWriteTransaction(async (tx) => {
                    let smsResults = [];
                    if (shouldNotify && req.body.send_sms !== false) {
                        const managers = await tx.query(`SELECT id, name, phone FROM users WHERE role IN ('principal','admin','super_admin') AND status='active' AND phone IS NOT NULL`);
                        const message = String(req.body.message || `مدیریت محترم، یک مورد مشاوره با سطح ریسک ${session.risk_level} ثبت شده است. لطفاً پنل مشاوره را بررسی کنید.`).slice(0, 500);
                        for (const manager of managers) {
                            smsResults.push(await sendSMS({ recipientNumber: manager.phone, message, execute: tx.execute, queryOne: tx.queryOne, userId: req.user.id, eventType: 'counselor_risk_alert', requestId: req.requestId }));
                        }
                    }
                    await tx.execute(`INSERT INTO ai_automation_logs (user_id, automation_type, input_summary, ai_output, action_taken, status) VALUES (?, 'counselor_risk', ?, ?, ?, ?)`, [req.user.id, JSON.stringify({ sessionId, risk: session.risk_level }).slice(0, 1000), aiSummary, shouldNotify ? 'management_sms' : 'no_sms_threshold_not_met', shouldNotify ? 'sent' : 'skipped']);
                    return { smsResults };
                });
                return ok(res, { session: { ...session, private_notes: undefined }, should_notify: shouldNotify, ai_summary: aiSummary, sms_results: smsResults }, 'هشدار ریسک مشاوره بررسی شد');
            } catch (error) {
                console.error('counselor risk automation:', error);
                return fail(res, 500, 'خطا در اتوماسیون مشاوره');
            }
        },

        async announcementSummary(req, res) {
            try {
                if (!['super_admin', 'admin', 'principal', 'executive_deputy', 'cultural_deputy'].includes(req.user.role)) return fail(res, 403, 'دسترسی اطلاع‌رسانی مجاز نیست');
                const text = String(req.body.text || '').trim();
                if (!text) return fail(res, 400, 'متن اطلاعیه الزامی است');
                const prompt = buildSchoolAIRequest('announcement_sms_summary', { announcement: text });
                const ai = await callGapGPT({ role: req.user.role, prompt, maxTokens: 250, userId: req.user.id, feature: 'announcement_sms_summary', execute, queryOne, enforceRateLimit: true, requestId: req.requestId });
                const summary = ai.success ? ai.data.content : text.slice(0, 280);
                const { smsResults } = await runWriteTransaction(async (tx) => {
                    let smsResults = [];
                    if (req.body.send_sms === true) {
                        const targetRole = ['parent', 'student', 'teacher'].includes(req.body.target_role) ? req.body.target_role : 'parent';
                        const recipients = await tx.query(`SELECT id, phone FROM users WHERE role = ? AND status='active' AND phone IS NOT NULL LIMIT 500`, [targetRole]);
                        for (const recipient of recipients) {
                            smsResults.push(await sendSMS({ recipientNumber: recipient.phone, message: summary, execute: tx.execute, queryOne: tx.queryOne, userId: req.user.id, eventType: 'announcement_sms_summary', requestId: req.requestId }));
                        }
                    }
                    await tx.execute(`INSERT INTO ai_automation_logs (user_id, automation_type, input_summary, ai_output, action_taken, status) VALUES (?, 'announcement_sms_summary', ?, ?, ?, ?)`, [req.user.id, text.slice(0, 1000), summary, req.body.send_sms === true ? 'bulk_sms' : 'summary_created', req.body.send_sms === true ? 'sent' : 'created']);
                    return { smsResults };
                });
                return ok(res, { summary, sms_results: smsResults, ai_available: ai.success }, 'خلاصه اطلاعیه آماده شد');
            } catch (error) {
                console.error('announcement automation:', error);
                return fail(res, 500, 'خطا در خلاصه‌سازی اطلاعیه');
            }
        }
    };
}
