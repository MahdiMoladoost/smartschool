// ==========================================
// PARENT CONTROLLER
// مسیر: src/controllers/parentController.js
// ==========================================

import { query, queryOne, execute } from '../config/database.js';

// ==========================================
// HELPER FUNCTIONS
// ==========================================

async function logParentAction(parentId, action, targetType, targetId, details, ipAddress) {
    try {
        await execute(`
            INSERT INTO parent_logs (parent_id, action, target_type, target_id, details, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, [parentId, action, targetType, targetId, JSON.stringify(details), ipAddress]);
    } catch (error) {
        console.error('Error logging parent action:', error);
    }
}

function calculateAverage(grades) {
    if (!grades || grades.length === 0) return 0;
    const sum = grades.reduce((a, b) => a + (b.average || 0), 0);
    return (sum / grades.length).toFixed(2);
}

// ==========================================
// DASHBOARD STATISTICS
// ==========================================

/**
 * دریافت آمار داشبورد والدین
 * GET /api/v1/parent/dashboard/stats
 */
export async function getParentDashboardStats(req, res) {
    try {
        const parentId = req.user.id;
        
        // دریافت اطلاعات والدین
        const parent = await queryOne(`
            SELECT id, name, username, phone, email
            FROM users 
            WHERE id = ? AND role = 'parent'
        `, [parentId]);
        
        if (!parent) {
            return res.status(404).json({ error: 'والدین یافت نشد' });
        }
        
        // دریافت لیست فرزندان
        const children = await query(`
            SELECT u.id, u.name, u.username, u.class_id, c.name as class_name, c.grade,
                   (SELECT COUNT(*) FROM attendance WHERE student_id = u.id AND status = 'present') as present_count,
                   (SELECT COUNT(*) FROM attendance WHERE student_id = u.id AND status = 'absent') as absent_count,
                   (SELECT AVG(average) FROM grades WHERE student_id = u.id AND average IS NOT NULL) as avg_grade
            FROM users u
            LEFT JOIN classes c ON c.id = u.class_id
            WHERE u.role = 'student' 
                AND (u.parent_phone = ? OR u.parent_email = ? OR u.phone = ?)
        `, [parent.phone, parent.email, parent.phone]);
        
        // آمار کلی برای هر فرزند
        const childrenStats = await Promise.all(children.map(async (child) => {
            const totalAttendance = await queryOne(`
                SELECT 
                    COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                    COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
                    COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
                    COUNT(*) as total
                FROM attendance 
                WHERE student_id = ?
            `, [child.id]);
            
            const attendanceRate = totalAttendance?.total > 0 
                ? ((totalAttendance.present / totalAttendance.total) * 100).toFixed(1)
                : 0;
            
            const debtInfo = await queryOne(`
                SELECT SUM(amount - paid_amount) as debt
                FROM payments 
                WHERE student_id = ? AND status != 'cancelled' AND status != 'paid'
            `, [child.id]);
            
            return {
                ...child,
                attendance_rate: attendanceRate,
                total_present: totalAttendance?.present || 0,
                total_absent: totalAttendance?.absent || 0,
                total_late: totalAttendance?.late || 0,
                debt: debtInfo?.debt || 0
            };
        }));
        
        res.json({
            success: true,
            parent,
            children: childrenStats,
            summary: {
                total_children: children.length,
                total_debt: childrenStats.reduce((sum, c) => sum + c.debt, 0),
                avg_attendance: childrenStats.length > 0 
                    ? (childrenStats.reduce((sum, c) => sum + parseFloat(c.attendance_rate), 0) / childrenStats.length).toFixed(1)
                    : 0
            }
        });
    } catch (error) {
        console.error('Error in getParentDashboardStats:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// CHILDREN MANAGEMENT
// ==========================================

/**
 * دریافت لیست فرزندان
 * GET /api/v1/parent/children
 */
export async function getParentChildren(req, res) {
    try {
        const parentId = req.user.id;
        
        const parent = await queryOne('SELECT phone, email FROM users WHERE id = ?', [parentId]);
        
        let sql = `
            SELECT u.id, u.name, u.username, u.phone, u.email, u.class_id, 
                   c.name as class_name, c.grade,
                   u.created_at, u.last_login
            FROM users u
            LEFT JOIN classes c ON c.id = u.class_id
            WHERE u.role = 'student'
        `;
        const params = [];
        
        if (parent.phone || parent.email) {
            sql += ` AND (`;
            if (parent.phone) {
                sql += `u.parent_phone = ? OR u.phone = ?`;
                params.push(parent.phone, parent.phone);
            }
            if (parent.email) {
                if (parent.phone) sql += ` OR `;
                sql += `u.parent_email = ?`;
                params.push(parent.email);
            }
            sql += `)`;
        } else {
            return res.json({ success: true, children: [] });
        }
        
        const children = await query(sql, params);
        
        // اضافه کردن آمار هر فرزند
        for (const child of children) {
            const stats = await queryOne(`
                SELECT 
                    COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                    COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
                    COUNT(*) as total
                FROM attendance 
                WHERE student_id = ?
            `, [child.id]);
            
            child.present_count = stats?.present || 0;
            child.absent_count = stats?.absent || 0;
            child.attendance_rate = stats?.total > 0 
                ? ((stats.present / stats.total) * 100).toFixed(1)
                : 0;
            
            const avgGrade = await queryOne(`
                SELECT AVG(average) as avg FROM grades 
                WHERE student_id = ? AND average IS NOT NULL
            `, [child.id]);
            
            child.avg_grade = avgGrade?.avg ? parseFloat(avgGrade.avg).toFixed(2) : 0;
            
            const debtInfo = await queryOne(`
                SELECT SUM(amount - paid_amount) as debt
                FROM payments 
                WHERE student_id = ? AND status != 'cancelled'
            `, [child.id]);
            
            child.debt = debtInfo?.debt || 0;
        }
        
        res.json({ success: true, children });
    } catch (error) {
        console.error('Error in getParentChildren:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * دریافت اطلاعات یک فرزند
 * GET /api/v1/parent/children/:id
 */
export async function getParentChildById(req, res) {
    try {
        const parentId = req.user.id;
        const { id } = req.params;
        
        const parent = await queryOne('SELECT phone, email FROM users WHERE id = ?', [parentId]);
        
        const child = await queryOne(`
            SELECT u.id, u.name, u.username, u.phone, u.email, u.class_id, 
                   c.name as class_name, c.grade,
                   u.national_id, u.birth_date, u.father_name, u.address,
                   u.created_at, u.last_login
            FROM users u
            LEFT JOIN classes c ON c.id = u.class_id
            WHERE u.id = ? AND u.role = 'student'
                AND (u.parent_phone = ? OR u.parent_email = ? OR u.phone = ?)
        `, [id, parent.phone, parent.email, parent.phone]);
        
        if (!child) {
            return res.status(404).json({ error: 'فرزند یافت نشد یا شما دسترسی ندارید' });
        }
        
        res.json({ success: true, child });
    } catch (error) {
        console.error('Error in getParentChildById:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// GRADES MANAGEMENT (FOR CHILDREN)
// ==========================================

/**
 * دریافت نمرات فرزند
 * GET /api/v1/parent/children/:id/grades
 */
export async function getParentChildGrades(req, res) {
    try {
        const parentId = req.user.id;
        const { id } = req.params;
        const { term } = req.query;
        
        // بررسی دسترسی والدین به این فرزند
        const parent = await queryOne('SELECT phone, email FROM users WHERE id = ?', [parentId]);
        const hasAccess = await queryOne(`
            SELECT id FROM users 
            WHERE id = ? AND role = 'student'
                AND (parent_phone = ? OR parent_email = ? OR phone = ?)
        `, [id, parent.phone, parent.email, parent.phone]);
        
        if (!hasAccess) {
            return res.status(403).json({ error: 'شما دسترسی به این دانش‌آموز ندارید' });
        }
        
        let sql = `
            SELECT 
                g.*,
                c.name as course_name,
                c.credits,
                c.code as course_code,
                u.name as teacher_name
            FROM grades g
            JOIN courses c ON c.id = g.course_id
            LEFT JOIN users u ON u.id = c.teacher_id
            WHERE g.student_id = ?
        `;
        const params = [id];
        
        if (term && term !== 'all') {
            sql += ` AND g.term = ?`;
            params.push(term);
        }
        
        sql += ` ORDER BY c.name ASC`;
        
        const grades = await query(sql, params);
        
        // محاسبه معدل
        let totalPoints = 0;
        let totalCredits = 0;
        let passedCourses = 0;
        let failedCourses = 0;
        
        grades.forEach(g => {
            if (g.average !== null && g.average !== undefined) {
                const credits = g.credits || 3;
                totalPoints += g.average * credits;
                totalCredits += credits;
                
                if (g.average >= 10) {
                    passedCourses++;
                } else {
                    failedCourses++;
                }
            }
        });
        
        const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 0;
        
        res.json({
            success: true,
            grades,
            summary: {
                gpa: gpa,
                total_credits: totalCredits,
                passed_courses: passedCourses,
                failed_courses: failedCourses,
                total_courses: grades.length
            }
        });
    } catch (error) {
        console.error('Error in getParentChildGrades:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * دریافت کارنامه فرزند
 * GET /api/v1/parent/children/:id/report-card
 */
export async function getParentChildReportCard(req, res) {
    try {
        const parentId = req.user.id;
        const { id } = req.params;
        const { term, year } = req.query;
        
        // بررسی دسترسی
        const parent = await queryOne('SELECT phone, email FROM users WHERE id = ?', [parentId]);
        const hasAccess = await queryOne(`
            SELECT id FROM users 
            WHERE id = ? AND role = 'student'
                AND (parent_phone = ? OR parent_email = ? OR phone = ?)
        `, [id, parent.phone, parent.email, parent.phone]);
        
        if (!hasAccess) {
            return res.status(403).json({ error: 'شما دسترسی به این دانش‌آموز ندارید' });
        }
        
        const selectedYear = year || new Date().getFullYear();
        const selectedTerm = term || 'all';
        
        let sql = `
            SELECT 
                g.*,
                c.name as course_name,
                c.credits,
                u.name as teacher_name
            FROM grades g
            JOIN courses c ON c.id = g.course_id
            LEFT JOIN users u ON u.id = c.teacher_id
            WHERE g.student_id = ?
        `;
        const params = [id];
        
        if (selectedTerm !== 'all') {
            sql += ` AND g.term = ?`;
            params.push(selectedTerm);
        }
        
        sql += ` ORDER BY c.name ASC`;
        
        const grades = await query(sql, params);
        
        // اطلاعات دانش‌آموز
        const student = await queryOne(`
            SELECT u.name, u.national_id, c.name as class_name, c.grade
            FROM users u
            LEFT JOIN classes c ON c.id = u.class_id
            WHERE u.id = ?
        `, [id]);
        
        // محاسبه مجموع
        let totalPoints = 0;
        let totalCredits = 0;
        
        grades.forEach(g => {
            if (g.average !== null) {
                const credits = g.credits || 3;
                totalPoints += g.average * credits;
                totalCredits += credits;
            }
        });
        
        const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 0;
        
        res.json({
            success: true,
            student_info: student,
            grades,
            summary: {
                gpa: gpa,
                total_credits: totalCredits,
                total_courses: grades.length,
                term: selectedTerm !== 'all' ? selectedTerm : 'کل سال تحصیلی',
                year: selectedYear
            }
        });
    } catch (error) {
        console.error('Error in getParentChildReportCard:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// ATTENDANCE MANAGEMENT (FOR CHILDREN)
// ==========================================

/**
 * دریافت حضور و غیاب فرزند
 * GET /api/v1/parent/children/:id/attendance
 */
export async function getParentChildAttendance(req, res) {
    try {
        const parentId = req.user.id;
        const { id } = req.params;
        const { month, year, from_date, to_date, limit = 50 } = req.query;
        
        // بررسی دسترسی
        const parent = await queryOne('SELECT phone, email FROM users WHERE id = ?', [parentId]);
        const hasAccess = await queryOne(`
            SELECT id FROM users 
            WHERE id = ? AND role = 'student'
                AND (parent_phone = ? OR parent_email = ? OR phone = ?)
        `, [id, parent.phone, parent.email, parent.phone]);
        
        if (!hasAccess) {
            return res.status(403).json({ error: 'شما دسترسی به این دانش‌آموز ندارید' });
        }
        
        let sql = `
            SELECT 
                a.*,
                c.name as class_name,
                u.name as teacher_name
            FROM attendance a
            JOIN classes c ON c.id = a.class_id
            LEFT JOIN users u ON u.id = a.recorded_by
            WHERE a.student_id = ?
        `;
        const params = [id];
        
        if (year) {
            sql += ` AND YEAR(a.date) = ?`;
            params.push(year);
        }
        
        if (month) {
            sql += ` AND MONTH(a.date) = ?`;
            params.push(month);
        }
        
        if (from_date) {
            sql += ` AND a.date >= ?`;
            params.push(from_date);
        }
        
        if (to_date) {
            sql += ` AND a.date <= ?`;
            params.push(to_date);
        }
        
        sql += ` ORDER BY a.date DESC LIMIT ?`;
        params.push(parseInt(limit));
        
        const attendance = await query(sql, params);
        
        // آمار کلی
        const stats = await queryOne(`
            SELECT 
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
                COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
                COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused,
                COUNT(*) as total
            FROM attendance 
            WHERE student_id = ?
        `, [id]);
        
        const attendanceRate = stats?.total > 0 
            ? ((stats.present / stats.total) * 100).toFixed(1)
            : 0;
        
        // آمار ماهانه
        const monthlyStats = await query(`
            SELECT 
                DATE_FORMAT(date, '%Y-%m') as month,
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
                COUNT(*) as total
            FROM attendance 
            WHERE student_id = ?
            GROUP BY DATE_FORMAT(date, '%Y-%m')
            ORDER BY month DESC
            LIMIT 12
        `, [id]);
        
        res.json({
            success: true,
            attendance,
            stats: {
                present: stats?.present || 0,
                absent: stats?.absent || 0,
                late: stats?.late || 0,
                excused: stats?.excused || 0,
                total: stats?.total || 0,
                attendance_rate: attendanceRate
            },
            monthly_stats: monthlyStats
        });
    } catch (error) {
        console.error('Error in getParentChildAttendance:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// PAYMENTS MANAGEMENT (FOR CHILDREN)
// ==========================================

/**
 * دریافت وضعیت مالی فرزند
 * GET /api/v1/parent/children/:id/payments
 */
export async function getParentChildPayments(req, res) {
    try {
        const parentId = req.user.id;
        const { id } = req.params;
        const { status } = req.query;
        
        // بررسی دسترسی
        const parent = await queryOne('SELECT phone, email FROM users WHERE id = ?', [parentId]);
        const hasAccess = await queryOne(`
            SELECT id FROM users 
            WHERE id = ? AND role = 'student'
                AND (parent_phone = ? OR parent_email = ? OR phone = ?)
        `, [id, parent.phone, parent.email, parent.phone]);
        
        if (!hasAccess) {
            return res.status(403).json({ error: 'شما دسترسی به این دانش‌آموز ندارید' });
        }
        
        let sql = `
            SELECT 
                p.*,
                u.name as student_name
            FROM payments p
            JOIN users u ON u.id = p.student_id
            WHERE p.student_id = ?
        `;
        const params = [id];
        
        if (status && status !== 'all') {
            sql += ` AND p.status = ?`;
            params.push(status);
        }
        
        sql += ` ORDER BY p.created_at DESC`;
        
        const payments = await query(sql, params);
        
        // محاسبه بدهی
        const debtInfo = await queryOne(`
            SELECT 
                SUM(amount - COALESCE(paid_amount, 0)) as total_debt,
                SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
                SUM(CASE WHEN status = 'overdue' THEN amount - COALESCE(paid_amount, 0) ELSE 0 END) as overdue_amount
            FROM payments 
            WHERE student_id = ? AND status != 'cancelled'
        `, [id]);
        
        res.json({
            success: true,
            payments,
            summary: {
                total_debt: debtInfo?.total_debt || 0,
                pending_amount: debtInfo?.pending_amount || 0,
                overdue_amount: debtInfo?.overdue_amount || 0,
                total_payments: payments.length,
                paid_count: payments.filter(p => p.status === 'paid').length,
                pending_count: payments.filter(p => p.status === 'pending').length
            }
        });
    } catch (error) {
        console.error('Error in getParentChildPayments:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// COURSES (FOR CHILDREN)
// ==========================================

/**
 * دریافت دروس فرزند
 * GET /api/v1/parent/children/:id/courses
 */
export async function getParentChildCourses(req, res) {
    try {
        const parentId = req.user.id;
        const { id } = req.params;
        
        // بررسی دسترسی
        const parent = await queryOne('SELECT phone, email FROM users WHERE id = ?', [parentId]);
        const hasAccess = await queryOne(`
            SELECT id FROM users 
            WHERE id = ? AND role = 'student'
                AND (parent_phone = ? OR parent_email = ? OR phone = ?)
        `, [id, parent.phone, parent.email, parent.phone]);
        
        if (!hasAccess) {
            return res.status(403).json({ error: 'شما دسترسی به این دانش‌آموز ندارید' });
        }
        
        // دریافت کلاس دانش‌آموز
        const student = await queryOne(`
            SELECT class_id FROM users WHERE id = ? AND role = 'student'
        `, [id]);
        
        if (!student?.class_id) {
            return res.json({ success: true, courses: [] });
        }
        
        const courses = await query(`
            SELECT 
                c.*,
                u.name as teacher_name,
                u.phone as teacher_phone,
                u.email as teacher_email
            FROM courses c
            LEFT JOIN users u ON u.id = c.teacher_id
            WHERE c.class_id = ? AND c.status = 'active'
            ORDER BY c.name ASC
        `, [student.class_id]);
        
        // اضافه کردن نمره هر درس
        for (const course of courses) {
            const grade = await queryOne(`
                SELECT average, letter_grade FROM grades 
                WHERE student_id = ? AND course_id = ?
                ORDER BY created_at DESC LIMIT 1
            `, [id, course.id]);
            
            if (grade) {
                course.grade = grade.average;
                course.letter_grade = grade.letter_grade;
            } else {
                course.grade = null;
                course.letter_grade = null;
            }
        }
        
        res.json({ success: true, courses });
    } catch (error) {
        console.error('Error in getParentChildCourses:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// PROFILE MANAGEMENT
// ==========================================

/**
 * دریافت پروفایل والدین
 * GET /api/v1/parent/profile
 */
export async function getParentProfile(req, res) {
    try {
        const parentId = req.user.id;
        
        const parent = await queryOne(`
            SELECT id, name, username, email, phone, status, created_at, last_login
            FROM users 
            WHERE id = ? AND role = 'parent'
        `, [parentId]);
        
        if (!parent) {
            return res.status(404).json({ error: 'والدین یافت نشد' });
        }
        
        // دریافت تعداد فرزندان
        const childrenCount = await queryOne(`
            SELECT COUNT(*) as count
            FROM users 
            WHERE role = 'student' 
                AND (parent_phone = ? OR parent_email = ? OR phone = ?)
        `, [parent.phone, parent.email, parent.phone]);
        
        parent.children_count = childrenCount?.count || 0;
        
        res.json({ success: true, parent });
    } catch (error) {
        console.error('Error in getParentProfile:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * بروزرسانی پروفایل والدین
 * PUT /api/v1/parent/profile
 */
export async function updateParentProfile(req, res) {
    try {
        const parentId = req.user.id;
        const { phone, email, address } = req.body;
        
        await execute(`
            UPDATE users SET 
                phone = COALESCE(?, phone),
                email = COALESCE(?, email),
                address = COALESCE(?, address)
            WHERE id = ? AND role = 'parent'
        `, [phone, email, address, parentId]);
        
        await logParentAction(parentId, 'profile_updated', 'profile', parentId, {
            phone, email, address
        }, req.ip);
        
        res.json({ success: true, message: 'پروفایل با موفقیت بروزرسانی شد' });
    } catch (error) {
        console.error('Error in updateParentProfile:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// MEETING REQUESTS
// ==========================================

/**
 * دریافت لیست درخواست‌های ملاقات
 * GET /api/v1/parent/meetings
 */
export async function getParentMeetings(req, res) {
    try {
        const parentId = req.user.id;
        const { status } = req.query;
        
        let sql = `
            SELECT m.*, 
                   t.name as teacher_name,
                   s.name as student_name
            FROM meetings m
            LEFT JOIN users t ON t.id = m.teacher_id
            LEFT JOIN users s ON s.id = m.student_id
            WHERE m.parent_id = ?
        `;
        const params = [parentId];
        
        if (status && status !== 'all') {
            sql += ` AND m.status = ?`;
            params.push(status);
        }
        
        sql += ` ORDER BY m.requested_date DESC`;
        
        const meetings = await query(sql, params);
        
        res.json({ success: true, meetings });
    } catch (error) {
        console.error('Error in getParentMeetings:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ثبت درخواست ملاقات جدید
 * POST /api/v1/parent/meetings
 */
export async function createParentMeeting(req, res) {
    try {
        const parentId = req.user.id;
        const { teacher_id, student_id, requested_date, requested_time, reason } = req.body;
        
        if (!teacher_id || !requested_date || !requested_time) {
            return res.status(400).json({ error: 'اطلاعات ناقص است' });
        }
        
        const result = await execute(`
            INSERT INTO meetings (parent_id, teacher_id, student_id, requested_date, requested_time, reason, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
        `, [parentId, teacher_id, student_id || null, requested_date, requested_time, reason || null]);
        
        await logParentAction(parentId, 'meeting_requested', 'meeting', result.insertId, {
            teacher_id, student_id, requested_date, requested_time
        }, req.ip);
        
        res.json({ success: true, message: 'درخواست ملاقات با موفقیت ثبت شد', meeting_id: result.insertId });
    } catch (error) {
        console.error('Error in createParentMeeting:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * لغو درخواست ملاقات
 * PUT /api/v1/parent/meetings/:id/cancel
 */
export async function cancelParentMeeting(req, res) {
    try {
        const parentId = req.user.id;
        const { id } = req.params;
        
        const meeting = await queryOne(`
            SELECT * FROM meetings WHERE id = ? AND parent_id = ?
        `, [id, parentId]);
        
        if (!meeting) {
            return res.status(404).json({ error: 'درخواست ملاقات یافت نشد' });
        }
        
        if (meeting.status !== 'pending') {
            return res.status(400).json({ error: 'این درخواست قابل لغو نیست' });
        }
        
        await execute(`UPDATE meetings SET status = 'cancelled' WHERE id = ?`, [id]);
        
        await logParentAction(parentId, 'meeting_cancelled', 'meeting', id, {}, req.ip);
        
        res.json({ success: true, message: 'درخواست ملاقات با موفقیت لغو شد' });
    } catch (error) {
        console.error('Error in cancelParentMeeting:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// MESSAGES
// ==========================================

/**
 * دریافت پیام‌ها
 * GET /api/v1/parent/messages
 */
export async function getParentMessages(req, res) {
    try {
        const parentId = req.user.id;
        const { limit = 50 } = req.query;
        
        const messages = await query(`
            SELECT m.*, 
                   u_sender.name as sender_name,
                   u_sender.role as sender_role,
                   u_receiver.name as receiver_name
            FROM messages m
            JOIN users u_sender ON u_sender.id = m.sender_id
            LEFT JOIN users u_receiver ON u_receiver.id = m.receiver_id
            WHERE m.receiver_id = ? OR m.sender_id = ?
            ORDER BY m.created_at DESC
            LIMIT ?
        `, [parentId, parentId, parseInt(limit)]);
        
        res.json({ success: true, messages });
    } catch (error) {
        console.error('Error in getParentMessages:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ارسال پیام به معلم
 * POST /api/v1/parent/messages
 */
export async function sendParentMessage(req, res) {
    try {
        const parentId = req.user.id;
        const { receiver_id, message } = req.body;
        
        if (!receiver_id || !message) {
            return res.status(400).json({ error: 'گیرنده و متن پیام الزامی است' });
        }
        
        const result = await execute(`
            INSERT INTO messages (sender_id, receiver_id, message, is_read, created_at)
            VALUES (?, ?, ?, FALSE, NOW())
        `, [parentId, receiver_id, message]);
        
        await logParentAction(parentId, 'message_sent', 'message', result.insertId, {
            receiver_id, message_length: message.length
        }, req.ip);
        
        res.json({ success: true, message: 'پیام با موفقیت ارسال شد' });
    } catch (error) {
        console.error('Error in sendParentMessage:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// ANNOUNCEMENTS
// ==========================================

/**
 * دریافت اطلاعیه‌های مربوط به والدین
 * GET /api/v1/parent/announcements
 */
export async function getParentAnnouncements(req, res) {
    try {
        const parentId = req.user.id;
        
        const announcements = await query(`
            SELECT 
                a.*,
                u.name as created_by_name
            FROM announcements a
            LEFT JOIN users u ON u.id = a.created_by
            WHERE a.is_active = 1 
                AND (a.target_role = 'all' OR a.target_role = 'parent')
            ORDER BY 
                CASE a.priority 
                    WHEN 'urgent' THEN 1 
                    WHEN 'high' THEN 2 
                    ELSE 3 
                END,
                a.created_at DESC
        `);
        
        // علامت‌گذاری به عنوان خوانده شده
        for (const ann of announcements) {
            const read = await queryOne(`
                SELECT id FROM announcements_read 
                WHERE announcement_id = ? AND user_id = ?
            `, [ann.id, parentId]);
            
            ann.is_read = !!read;
        }
        
        res.json({ success: true, announcements });
    } catch (error) {
        console.error('Error in getParentAnnouncements:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * علامت‌گذاری اطلاعیه به عنوان خوانده شده
 * POST /api/v1/parent/announcements/:id/read
 */
export async function markParentAnnouncementAsRead(req, res) {
    try {
        const parentId = req.user.id;
        const { id } = req.params;
        
        await execute(`
            INSERT INTO announcements_read (announcement_id, user_id, read_at)
            VALUES (?, ?, NOW())
            ON DUPLICATE KEY UPDATE read_at = NOW()
        `, [id, parentId]);
        
        res.json({ success: true, message: 'اطلاعیه به عنوان خوانده شده علامت‌گذاری شد' });
    } catch (error) {
        console.error('Error in markParentAnnouncementAsRead:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// TEACHERS LIST
// ==========================================

/**
 * دریافت لیست معلمان برای درخواست ملاقات
 * GET /api/v1/parent/teachers
 */
export async function getParentTeachersList(req, res) {
    try {
        const teachers = await query(`
            SELECT id, name, phone, email, subjects
            FROM users 
            WHERE role = 'teacher' AND status = 'active'
            ORDER BY name ASC
        `);
        
        res.json({ success: true, teachers });
    } catch (error) {
        console.error('Error in getParentTeachersList:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// STATISTICS
// ==========================================

/**
 * آمار کلی والدین
 * GET /api/v1/parent/stats
 */
export async function getParentStats(req, res) {
    try {
        const parentId = req.user.id;
        const parent = await queryOne('SELECT phone, email FROM users WHERE id = ?', [parentId]);
        
        const children = await query(`
            SELECT id, name FROM users 
            WHERE role = 'student' 
                AND (parent_phone = ? OR parent_email = ? OR phone = ?)
        `, [parent.phone, parent.email, parent.phone]);
        
        let totalDebt = 0;
        let totalPresent = 0;
        let totalAbsent = 0;
        let totalGrades = 0;
        let gradeSum = 0;
        
        for (const child of children) {
            const debt = await queryOne(`
                SELECT SUM(amount - paid_amount) as debt
                FROM payments 
                WHERE student_id = ? AND status != 'cancelled'
            `, [child.id]);
            totalDebt += debt?.debt || 0;
            
            const attendance = await queryOne(`
                SELECT 
                    COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                    COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent
                FROM attendance 
                WHERE student_id = ?
            `, [child.id]);
            totalPresent += attendance?.present || 0;
            totalAbsent += attendance?.absent || 0;
            
            const grades = await query(`
                SELECT average FROM grades 
                WHERE student_id = ? AND average IS NOT NULL
            `, [child.id]);
            totalGrades += grades.length;
            gradeSum += grades.reduce((sum, g) => sum + (g.average || 0), 0);
        }
        
        const avgGrade = totalGrades > 0 ? (gradeSum / totalGrades).toFixed(2) : 0;
        const attendanceRate = (totalPresent + totalAbsent) > 0 
            ? ((totalPresent / (totalPresent + totalAbsent)) * 100).toFixed(1)
            : 0;
        
        res.json({
            success: true,
            stats: {
                total_children: children.length,
                total_debt: totalDebt,
                total_present: totalPresent,
                total_absent: totalAbsent,
                attendance_rate: attendanceRate,
                avg_grade: avgGrade,
                total_grades: totalGrades
            }
        });
    } catch (error) {
        console.error('Error in getParentStats:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// EXPORT
// ==========================================

export default {
    // Dashboard
    getParentDashboardStats,
    
    // Children
    getParentChildren,
    getParentChildById,
    
    // Grades
    getParentChildGrades,
    getParentChildReportCard,
    
    // Attendance
    getParentChildAttendance,
    
    // Payments
    getParentChildPayments,
    
    // Courses
    getParentChildCourses,
    
    // Profile
    getParentProfile,
    updateParentProfile,
    
    // Meetings
    getParentMeetings,
    createParentMeeting,
    cancelParentMeeting,
    getParentTeachersList,
    
    // Messages
    getParentMessages,
    sendParentMessage,
    
    // Announcements
    getParentAnnouncements,
    markParentAnnouncementAsRead,
    
    // Statistics
    getParentStats
};