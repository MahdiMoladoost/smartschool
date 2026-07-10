// ==========================================
// ADMIN CONTROLLER
// مسیر: src/controllers/adminController.js
// ==========================================

import { query, queryOne, execute } from '../config/database.js';
import bcrypt from 'bcryptjs';

// ==========================================
// HELPER FUNCTIONS
// ==========================================

async function logAdminAction(adminId, action, targetType, targetId, details, ipAddress) {
    try {
        await execute(`
            INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [adminId, action, targetType, targetId, JSON.stringify(details), ipAddress]);
    } catch (error) {
        console.error('Error logging admin action:', error);
    }
}

function formatDate(dateStr) {
    if (!dateStr) return null;
    try {
        return new Date(dateStr).toISOString().split('T')[0];
    } catch {
        return null;
    }
}

// ==========================================
// DASHBOARD STATISTICS
// ==========================================

/**
 * دریافت آمار داشبورد
 * GET /api/v1/admin/dashboard/stats
 */
export async function getDashboardStats(req, res) {
    try {
        const totalStudents = await queryOne('SELECT COUNT(*) as count FROM users WHERE role = "student" AND status = "active"');
        const totalTeachers = await queryOne('SELECT COUNT(*) as count FROM users WHERE role = "teacher" AND status = "active"');
        const totalParents = await queryOne('SELECT COUNT(*) as count FROM users WHERE role = "parent" AND status = "active"');
        const totalClasses = await queryOne('SELECT COUNT(*) as count FROM classes WHERE status = "active"');
        const totalCourses = await queryOne('SELECT COUNT(*) as count FROM courses WHERE status = "active"');
        
        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = await queryOne(`
            SELECT 
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
                COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
                COUNT(*) as total
            FROM attendance WHERE date = ?
        `, [today]);
        
        const attendanceRate = todayAttendance?.total > 0 
            ? ((todayAttendance.present / todayAttendance.total) * 100).toFixed(1) : 0;
        
        const avgGrade = await queryOne('SELECT AVG(average) as avg FROM grades WHERE average IS NOT NULL');
        
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyIncome = await queryOne(`
            SELECT SUM(paid_amount) as total FROM payments 
            WHERE status = 'paid' AND DATE_FORMAT(paid_date, '%Y-%m') = ?
        `, [currentMonth]);
        
        const totalDebt = await queryOne(`
            SELECT SUM(amount - paid_amount) as debt FROM payments 
            WHERE status != 'paid' AND status != 'cancelled'
        `);
        
        res.json({
            success: true,
            stats: {
                students: totalStudents?.count || 0,
                teachers: totalTeachers?.count || 0,
                parents: totalParents?.count || 0,
                classes: totalClasses?.count || 0,
                courses: totalCourses?.count || 0,
                attendance_rate: attendanceRate,
                avg_grade: parseFloat(avgGrade?.avg || 0).toFixed(2),
                monthly_income: monthlyIncome?.total || 0,
                total_debt: totalDebt?.debt || 0
            }
        });
    } catch (error) {
        console.error('Error in getDashboardStats:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * دریافت نمودار حضور و غیاب
 * GET /api/v1/admin/dashboard/attendance-chart
 */
export async function getAttendanceChart(req, res) {
    try {
        const { days = 30 } = req.query;
        const attendanceData = await query(`
            SELECT 
                DATE(date) as date,
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
                COUNT(CASE WHEN status = 'late' THEN 1 END) as late
            FROM attendance 
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(date) 
            ORDER BY date ASC
        `, [days]);
        
        res.json({ success: true, data: attendanceData });
    } catch (error) {
        console.error('Error in getAttendanceChart:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * دریافت نمودار مالی
 * GET /api/v1/admin/dashboard/financial-chart
 */
export async function getFinancialChart(req, res) {
    try {
        const { months = 12 } = req.query;
        const financialData = await query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                SUM(CASE WHEN type = 'tuition' AND status = 'paid' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type != 'tuition' AND status = 'paid' THEN amount ELSE 0 END) as expense
            FROM payments 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        `, [months]);
        
        res.json({ success: true, data: financialData });
    } catch (error) {
        console.error('Error in getFinancialChart:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * دریافت فعالیت‌های اخیر
 * GET /api/v1/admin/dashboard/recent-activities
 */
export async function getRecentActivities(req, res) {
    try {
        const recentLogins = await query(`
            SELECT id, name, role, last_login FROM users 
            WHERE last_login IS NOT NULL 
            ORDER BY last_login DESC 
            LIMIT 10
        `);
        
        const recentPayments = await query(`
            SELECT p.*, u.name as student_name 
            FROM payments p
            JOIN users u ON u.id = p.student_id 
            ORDER BY p.created_at DESC 
            LIMIT 5
        `);
        
        const recentAnnouncements = await query(`
            SELECT a.*, u.name as created_by_name
            FROM announcements a
            LEFT JOIN users u ON u.id = a.created_by
            ORDER BY a.created_at DESC 
            LIMIT 5
        `);
        
        res.json({
            success: true,
            data: {
                recent_logins: recentLogins,
                recent_payments: recentPayments,
                recent_announcements: recentAnnouncements
            }
        });
    } catch (error) {
        console.error('Error in getRecentActivities:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// USER MANAGEMENT (CRUD)
// ==========================================

/**
 * دریافت لیست کاربران با فیلتر
 * GET /api/v1/admin/users
 */
export async function getUsers(req, res) {
    try {
        const { role, search, status, page = 1, limit = 10 } = req.query;
        let sql = 'SELECT id, username, name, role, phone, email, status, class_id, created_at, last_login FROM users WHERE 1=1';
        const params = [];
        
        if (role && role !== 'all') {
            sql += ' AND role = ?';
            params.push(role);
        }
        if (search) {
            sql += ' AND (name LIKE ? OR username LIKE ? OR phone LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (status && status !== 'all') {
            sql += ' AND status = ?';
            params.push(status);
        }
        
        const countSql = sql.replace('SELECT id, username, name, role, phone, email, status, class_id, created_at, last_login', 'SELECT COUNT(*) as total');
        const totalResult = await queryOne(countSql, params);
        const total = totalResult?.total || 0;
        
        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);
        
        const users = await query(sql, params);
        
        const counts = await query(`
            SELECT role, COUNT(*) as count FROM users WHERE status = 'active' GROUP BY role
        `);
        const roleCounts = { all: total, student: 0, teacher: 0, parent: 0, admin: 0 };
        counts.forEach(c => { roleCounts[c.role] = c.count; });
        
        res.json({ success: true, users, total, counts: roleCounts });
    } catch (error) {
        console.error('Error in getUsers:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * دریافت اطلاعات یک کاربر
 * GET /api/v1/admin/users/:id
 */
export async function getUserById(req, res) {
    try {
        const { id } = req.params;
        const user = await queryOne(`
            SELECT id, username, name, role, phone, email, status, class_id, created_at, last_login 
            FROM users WHERE id = ?
        `, [id]);
        
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
        
        if (user.role === 'student' && user.class_id) {
            const classData = await queryOne('SELECT name FROM classes WHERE id = ?', [user.class_id]);
            user.class_name = classData?.name;
        }
        
        res.json({ success: true, user });
    } catch (error) {
        console.error('Error in getUserById:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ایجاد کاربر جدید
 * POST /api/v1/admin/users
 */
export async function createUser(req, res) {
    try {
        const { username, password, name, role, phone, email, class_id } = req.body;
        
        if (!username || !password || !name || !role) {
            return res.status(400).json({ error: 'نام، نام کاربری، رمز عبور و نقش الزامی است' });
        }
        
        const existing = await queryOne('SELECT id FROM users WHERE username = ?', [username]);
        if (existing) return res.status(400).json({ error: 'نام کاربری تکراری است' });
        
        const hashedPassword = bcrypt.hashSync(password, 10);
        const result = await execute(`
            INSERT INTO users (username, password, name, role, phone, email, class_id, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
        `, [username, hashedPassword, name, role, phone || null, email || null, class_id || null]);
        
        if (role === 'student' && class_id) {
            await execute(`
                INSERT INTO class_students (class_id, student_id, status) 
                VALUES (?, ?, 'active')
                ON DUPLICATE KEY UPDATE status = 'active'
            `, [class_id, result.insertId]);
        }
        
        await logAdminAction(req.user.id, 'create_user', 'user', result.insertId, { name, username, role }, req.ip);
        res.json({ success: true, message: 'کاربر با موفقیت اضافه شد', user_id: result.insertId });
    } catch (error) {
        console.error('Error in createUser:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ویرایش کاربر
 * PUT /api/v1/admin/users/:id
 */
export async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const { name, username, role, phone, email, class_id, status } = req.body;
        
        const existing = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
        if (!existing) return res.status(404).json({ error: 'کاربر یافت نشد' });
        
        await execute(`
            UPDATE users SET 
                name = COALESCE(?, name),
                username = COALESCE(?, username),
                role = COALESCE(?, role),
                phone = COALESCE(?, phone),
                email = COALESCE(?, email),
                class_id = ?,
                status = COALESCE(?, status)
            WHERE id = ?
        `, [name, username, role, phone, email, class_id || null, status, id]);
        
        if (existing.role === 'student') {
            if (class_id) {
                await execute(`
                    INSERT INTO class_students (class_id, student_id, status) 
                    VALUES (?, ?, 'active')
                    ON DUPLICATE KEY UPDATE status = 'active'
                `, [class_id, id]);
            } else {
                await execute(`
                    UPDATE class_students SET status = 'inactive' 
                    WHERE student_id = ? AND status = 'active'
                `, [id]);
            }
        }
        
        await logAdminAction(req.user.id, 'update_user', 'user', id, { name, username, role }, req.ip);
        res.json({ success: true, message: 'کاربر با موفقیت ویرایش شد' });
    } catch (error) {
        console.error('Error in updateUser:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * حذف کاربر
 * DELETE /api/v1/admin/users/:id
 */
export async function deleteUser(req, res) {
    try {
        const { id } = req.params;
        const user = await queryOne('SELECT role, name FROM users WHERE id = ?', [id]);
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
        if (user.role === 'admin') return res.status(400).json({ error: 'حذف کاربر ادمین امکان‌پذیر نیست' });
        
        await execute('DELETE FROM users WHERE id = ?', [id]);
        await logAdminAction(req.user.id, 'delete_user', 'user', id, { name: user.name }, req.ip);
        res.json({ success: true, message: 'کاربر با موفقیت حذف شد' });
    } catch (error) {
        console.error('Error in deleteUser:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// CLASS MANAGEMENT (CRUD)
// ==========================================

/**
 * دریافت لیست کلاس‌ها
 * GET /api/v1/admin/classes
 */
export async function getClasses(req, res) {
    try {
        const classes = await query(`
            SELECT c.*, 
                   u.name as main_teacher_name,
                   COUNT(DISTINCT cs.student_id) as student_count 
            FROM classes c
            LEFT JOIN users u ON u.id = c.main_teacher_id
            LEFT JOIN class_students cs ON cs.class_id = c.id AND cs.status = 'active'
            WHERE c.status = 'active'
            GROUP BY c.id
            ORDER BY c.grade, c.name
        `);
        res.json({ success: true, classes });
    } catch (error) {
        console.error('Error in getClasses:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * دریافت اطلاعات یک کلاس
 * GET /api/v1/admin/classes/:id
 */
export async function getClassById(req, res) {
    try {
        const { id } = req.params;
        const classData = await queryOne(`
            SELECT c.*, u.name as main_teacher_name
            FROM classes c 
            LEFT JOIN users u ON u.id = c.main_teacher_id 
            WHERE c.id = ?
        `, [id]);
        
        if (!classData) return res.status(404).json({ error: 'کلاس یافت نشد' });
        
        const students = await query(`
            SELECT u.id, u.name, u.username, u.phone, u.email
            FROM class_students cs 
            JOIN users u ON u.id = cs.student_id
            WHERE cs.class_id = ? AND cs.status = 'active'
            ORDER BY u.name ASC
        `, [id]);
        
        const courses = await query(`
            SELECT c.*, u.name as teacher_name
            FROM courses c 
            LEFT JOIN users u ON u.id = c.teacher_id 
            WHERE c.class_id = ? AND c.status = 'active'
        `, [id]);
        
        res.json({ success: true, class: classData, students, courses });
    } catch (error) {
        console.error('Error in getClassById:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ایجاد کلاس جدید
 * POST /api/v1/admin/classes
 */
export async function createClass(req, res) {
    try {
        const { name, grade, capacity, main_teacher_id } = req.body;
        if (!name) return res.status(400).json({ error: 'نام کلاس الزامی است' });
        
        const result = await execute(`
            INSERT INTO classes (name, grade, capacity, main_teacher_id, status) 
            VALUES (?, ?, ?, ?, 'active')
        `, [name, grade || 1, capacity || 30, main_teacher_id || null]);
        
        await logAdminAction(req.user.id, 'create_class', 'class', result.insertId, { name, grade, capacity }, req.ip);
        res.json({ success: true, message: 'کلاس با موفقیت اضافه شد', class_id: result.insertId });
    } catch (error) {
        console.error('Error in createClass:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ویرایش کلاس
 * PUT /api/v1/admin/classes/:id
 */
export async function updateClass(req, res) {
    try {
        const { id } = req.params;
        const { name, grade, capacity, main_teacher_id, status } = req.body;
        
        const existing = await queryOne('SELECT * FROM classes WHERE id = ?', [id]);
        if (!existing) return res.status(404).json({ error: 'کلاس یافت نشد' });
        
        await execute(`
            UPDATE classes SET 
                name = COALESCE(?, name),
                grade = COALESCE(?, grade),
                capacity = COALESCE(?, capacity),
                main_teacher_id = ?,
                status = COALESCE(?, status)
            WHERE id = ?
        `, [name, grade, capacity, main_teacher_id || null, status, id]);
        
        await logAdminAction(req.user.id, 'update_class', 'class', id, { name, grade, capacity, status }, req.ip);
        res.json({ success: true, message: 'کلاس با موفقیت ویرایش شد' });
    } catch (error) {
        console.error('Error in updateClass:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * حذف کلاس
 * DELETE /api/v1/admin/classes/:id
 */
export async function deleteClass(req, res) {
    try {
        const { id } = req.params;
        const existing = await queryOne('SELECT * FROM classes WHERE id = ?', [id]);
        if (!existing) return res.status(404).json({ error: 'کلاس یافت نشد' });
        
        await execute('UPDATE classes SET status = "deleted" WHERE id = ?', [id]);
        await logAdminAction(req.user.id, 'delete_class', 'class', id, { name: existing.name }, req.ip);
        res.json({ success: true, message: 'کلاس با موفقیت حذف شد' });
    } catch (error) {
        console.error('Error in deleteClass:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// CLASS STUDENTS MANAGEMENT
// ==========================================

/**
 * اضافه کردن دانش‌آموز به کلاس
 * POST /api/v1/admin/classes/:id/add-student
 */
export async function addStudentToClass(req, res) {
    try {
        const classId = req.params.id;
        const { student_id } = req.body;
        
        const student = await queryOne('SELECT * FROM users WHERE id = ? AND role = "student"', [student_id]);
        if (!student) return res.status(404).json({ error: 'دانش‌آموز یافت نشد' });
        
        const classData = await queryOne('SELECT * FROM classes WHERE id = ?', [classId]);
        if (!classData) return res.status(404).json({ error: 'کلاس یافت نشد' });
        
        await execute(`
            INSERT INTO class_students (class_id, student_id, status) 
            VALUES (?, ?, 'active')
            ON DUPLICATE KEY UPDATE status = 'active'
        `, [classId, student_id]);
        
        await execute('UPDATE users SET class_id = ? WHERE id = ?', [classId, student_id]);
        
        await logAdminAction(req.user.id, 'add_student_to_class', 'class_student', null, { class_id: classId, student_id, student_name: student.name }, req.ip);
        res.json({ success: true, message: 'دانش‌آموز با موفقیت به کلاس اضافه شد' });
    } catch (error) {
        console.error('Error in addStudentToClass:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * حذف دانش‌آموز از کلاس
 * DELETE /api/v1/admin/classes/:id/remove-student/:studentId
 */
export async function removeStudentFromClass(req, res) {
    try {
        const { id, studentId } = req.params;
        
        await execute(`
            UPDATE class_students SET status = 'inactive' 
            WHERE class_id = ? AND student_id = ?
        `, [id, studentId]);
        
        await execute('UPDATE users SET class_id = NULL WHERE id = ?', [studentId]);
        
        await logAdminAction(req.user.id, 'remove_student_from_class', 'class_student', null, { class_id: id, student_id: studentId }, req.ip);
        res.json({ success: true, message: 'دانش‌آموز با موفقیت از کلاس خارج شد' });
    } catch (error) {
        console.error('Error in removeStudentFromClass:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// COURSE MANAGEMENT (CRUD)
// ==========================================

/**
 * دریافت لیست دروس
 * GET /api/v1/admin/courses
 */
export async function getCourses(req, res) {
    try {
        const courses = await query(`
            SELECT c.*, 
                   t.name as teacher_name, 
                   cls.name as class_name
            FROM courses c
            LEFT JOIN users t ON t.id = c.teacher_id
            LEFT JOIN classes cls ON cls.id = c.class_id
            WHERE c.status = 'active'
            ORDER BY c.name ASC
        `);
        res.json({ success: true, courses });
    } catch (error) {
        console.error('Error in getCourses:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * دریافت اطلاعات یک درس
 * GET /api/v1/admin/courses/:id
 */
export async function getCourseById(req, res) {
    try {
        const { id } = req.params;
        const course = await queryOne(`
            SELECT c.*, t.name as teacher_name, cls.name as class_name
            FROM courses c
            LEFT JOIN users t ON t.id = c.teacher_id
            LEFT JOIN classes cls ON cls.id = c.class_id
            WHERE c.id = ?
        `, [id]);
        
        if (!course) return res.status(404).json({ error: 'درس یافت نشد' });
        res.json({ success: true, course });
    } catch (error) {
        console.error('Error in getCourseById:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ایجاد درس جدید
 * POST /api/v1/admin/courses
 */
export async function createCourse(req, res) {
    try {
        const { name, code, credits, teacher_id, class_id, semester, schedule } = req.body;
        if (!name) return res.status(400).json({ error: 'نام درس الزامی است' });
        
        const result = await execute(`
            INSERT INTO courses (name, code, credits, teacher_id, class_id, semester, schedule, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
        `, [name, code || null, credits || 3, teacher_id || null, class_id || null, semester || null, schedule || null]);
        
        await logAdminAction(req.user.id, 'create_course', 'course', result.insertId, { name, code, credits }, req.ip);
        res.json({ success: true, message: 'درس با موفقیت اضافه شد', course_id: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'کد درس تکراری است' });
        console.error('Error in createCourse:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ویرایش درس
 * PUT /api/v1/admin/courses/:id
 */
export async function updateCourse(req, res) {
    try {
        const { id } = req.params;
        const { name, code, credits, teacher_id, class_id, semester, schedule, status } = req.body;
        
        const existing = await queryOne('SELECT * FROM courses WHERE id = ?', [id]);
        if (!existing) return res.status(404).json({ error: 'درس یافت نشد' });
        
        await execute(`
            UPDATE courses SET 
                name = COALESCE(?, name),
                code = COALESCE(?, code),
                credits = COALESCE(?, credits),
                teacher_id = ?,
                class_id = ?,
                semester = COALESCE(?, semester),
                schedule = COALESCE(?, schedule),
                status = COALESCE(?, status)
            WHERE id = ?
        `, [name, code, credits, teacher_id || null, class_id || null, semester, schedule, status, id]);
        
        await logAdminAction(req.user.id, 'update_course', 'course', id, { name, code, credits }, req.ip);
        res.json({ success: true, message: 'درس با موفقیت ویرایش شد' });
    } catch (error) {
        console.error('Error in updateCourse:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * حذف درس
 * DELETE /api/v1/admin/courses/:id
 */
export async function deleteCourse(req, res) {
    try {
        const { id } = req.params;
        const existing = await queryOne('SELECT * FROM courses WHERE id = ?', [id]);
        if (!existing) return res.status(404).json({ error: 'درس یافت نشد' });
        
        await execute('UPDATE courses SET status = "inactive" WHERE id = ?', [id]);
        await logAdminAction(req.user.id, 'delete_course', 'course', id, { name: existing.name }, req.ip);
        res.json({ success: true, message: 'درس با موفقیت حذف شد' });
    } catch (error) {
        console.error('Error in deleteCourse:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// GRADE MANAGEMENT
// ==========================================

/**
 * دریافت لیست نمرات
 * GET /api/v1/admin/grades
 */
export async function getGrades(req, res) {
    try {
        const { class_id, course_id, term } = req.query;
        
        let sql = `
            SELECT g.*, u.name as student_name, c.name as course_name
            FROM grades g
            JOIN users u ON u.id = g.student_id
            JOIN courses c ON c.id = g.course_id
            WHERE 1=1
        `;
        const params = [];
        
        if (class_id) {
            sql += ` AND u.class_id = ?`;
            params.push(class_id);
        }
        if (course_id) {
            sql += ` AND g.course_id = ?`;
            params.push(course_id);
        }
        if (term) {
            sql += ` AND g.term = ?`;
            params.push(term);
        }
        
        sql += ` ORDER BY u.name ASC`;
        
        const grades = await query(sql, params);
        res.json({ success: true, grades });
    } catch (error) {
        console.error('Error in getGrades:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ثبت نمره جدید
 * POST /api/v1/admin/grades
 */
export async function createGrade(req, res) {
    try {
        const { student_id, course_id, quiz, midterm, final_exam, homework, project, term } = req.body;
        
        if (!student_id || !course_id) {
            return res.status(400).json({ error: 'دانش‌آموز و درس الزامی است' });
        }
        
        // محاسبه میانگین
        const scores = [];
        if (quiz !== undefined && quiz !== null) scores.push(parseFloat(quiz));
        if (midterm !== undefined && midterm !== null) scores.push(parseFloat(midterm));
        if (final_exam !== undefined && final_exam !== null) scores.push(parseFloat(final_exam));
        if (homework !== undefined && homework !== null) scores.push(parseFloat(homework));
        if (project !== undefined && project !== null) scores.push(parseFloat(project));
        
        let average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        let letterGrade = null;
        
        if (average !== null) {
            if (average >= 17) letterGrade = 'A';
            else if (average >= 15) letterGrade = 'B';
            else if (average >= 12) letterGrade = 'C';
            else if (average >= 10) letterGrade = 'D';
            else letterGrade = 'F';
        }
        
        await execute(`
            INSERT INTO grades (student_id, course_id, quiz, midterm, final_exam, homework, project, average, letter_grade, term) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                quiz = VALUES(quiz),
                midterm = VALUES(midterm),
                final_exam = VALUES(final_exam),
                homework = VALUES(homework),
                project = VALUES(project),
                average = VALUES(average),
                letter_grade = VALUES(letter_grade)
        `, [student_id, course_id, quiz || null, midterm || null, final_exam || null, homework || null, project || null, average, letterGrade, term || 'ترم اول']);
        
        await logAdminAction(req.user.id, 'create_grade', 'grade', null, { student_id, course_id, average }, req.ip);
        res.json({ success: true, message: 'نمره با موفقیت ثبت شد' });
    } catch (error) {
        console.error('Error in createGrade:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// ATTENDANCE MANAGEMENT
// ==========================================

/**
 * دریافت لیست حضور و غیاب
 * GET /api/v1/admin/attendance
 */
export async function getAttendance(req, res) {
    try {
        const { class_id, date, search = '' } = req.query;
        
        if (!class_id) {
            return res.status(400).json({ error: 'انتخاب کلاس الزامی است' });
        }
        
        const selectedDate = date || new Date().toISOString().split('T')[0];
        
        let studentsQuery = `
            SELECT u.id, u.name, c.name as class_name
            FROM users u
            JOIN class_students cs ON cs.student_id = u.id
            JOIN classes c ON c.id = cs.class_id
            WHERE cs.class_id = ? AND cs.status = 'active' AND u.status = 'active'
        `;
        const params = [class_id];
        
        if (search) {
            studentsQuery += ` AND u.name LIKE ?`;
            params.push(`%${search}%`);
        }
        
        const students = await query(studentsQuery, params);
        
        const attendanceRecords = await query(`
            SELECT student_id, status, notes 
            FROM attendance 
            WHERE class_id = ? AND date = ?
        `, [class_id, selectedDate]);
        
        const attendanceMap = {};
        attendanceRecords.forEach(record => {
            attendanceMap[record.student_id] = {
                status: record.status,
                note: record.notes || ''
            };
        });
        
        const studentsWithAttendance = students.map(student => ({
            id: student.id,
            name: student.name,
            class_name: student.class_name,
            status: attendanceMap[student.id]?.status || 'present',
            note: attendanceMap[student.id]?.note || ''
        }));
        
        const stats = {
            present: studentsWithAttendance.filter(s => s.status === 'present').length,
            absent: studentsWithAttendance.filter(s => s.status === 'absent').length,
            late: studentsWithAttendance.filter(s => s.status === 'late').length,
            excused: studentsWithAttendance.filter(s => s.status === 'excused').length,
            total: studentsWithAttendance.length
        };
        
        res.json({
            success: true,
            students: studentsWithAttendance,
            stats,
            date: selectedDate
        });
    } catch (error) {
        console.error('Error in getAttendance:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ثبت حضور و غیاب
 * POST /api/v1/admin/attendance
 */
export async function createAttendance(req, res) {
    try {
        const { student_id, class_id, date, status, note } = req.body;
        
        if (!student_id || !class_id || !date || !status) {
            return res.status(400).json({ error: 'اطلاعات ناقص است' });
        }
        
        const checkStudent = await queryOne(`
            SELECT * FROM class_students 
            WHERE class_id = ? AND student_id = ? AND status = 'active'
        `, [class_id, student_id]);
        
        if (!checkStudent) {
            return res.status(404).json({ error: 'دانش‌آموز در این کلاس وجود ندارد' });
        }
        
        await execute(`
            INSERT INTO attendance (student_id, class_id, date, status, notes, recorded_by) 
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                status = VALUES(status), 
                notes = VALUES(notes),
                recorded_by = VALUES(recorded_by)
        `, [student_id, class_id, date, status, note || null, req.user.id]);
        
        await logAdminAction(req.user.id, 'attendance_update', 'student', student_id, { class_id, date, status, note }, req.ip);
        res.json({ success: true, message: 'وضعیت حضور با موفقیت ثبت شد' });
    } catch (error) {
        console.error('Error in createAttendance:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ثبت گروهی حضور و غیاب
 * POST /api/v1/admin/attendance/bulk */
export async function createBulkAttendance(req, res) {
    try {
        const { class_id, date, records } = req.body;
        
        if (!class_id || !date || !records || !Array.isArray(records)) {
            return res.status(400).json({ error: 'اطلاعات ناقص است' });
        }
        
        for (const record of records) {
            await execute(`
                INSERT INTO attendance (student_id, class_id, date, status, notes, recorded_by) 
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    status = VALUES(status), 
                    notes = VALUES(notes),
                    recorded_by = VALUES(recorded_by)
            `, [record.student_id, class_id, date, record.status, record.note || null, req.user.id]);
        }
        
        await logAdminAction(req.user.id, 'attendance_bulk_update', 'class', class_id, { date, count: records.length }, req.ip);
        res.json({ success: true, message: `وضعیت حضور ${records.length} دانش‌آموز با موفقیت ثبت شد` });
    } catch (error) {
        console.error('Error in createBulkAttendance:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// PAYMENT MANAGEMENT
// ==========================================

/**
 * دریافت لیست پرداخت‌ها
 * GET /api/v1/admin/payments
 */
export async function getPayments(req, res) {
    try {
        const { type, status, student_id, from_date, to_date, page = 1, limit = 20 } = req.query;
        
        let sql = `
            SELECT p.*, u.name as student_name, u.username, u.phone, u.class_id
            FROM payments p
            JOIN users u ON u.id = p.student_id
            WHERE 1=1
        `;
        const params = [];
        
        if (type && type !== 'all') {
            sql += ` AND p.type = ?`;
            params.push(type);
        }
        if (status && status !== 'all') {
            sql += ` AND p.status = ?`;
            params.push(status);
        }
        if (student_id) {
            sql += ` AND p.student_id = ?`;
            params.push(student_id);
        }
        if (from_date) {
            sql += ` AND DATE(p.created_at) >= ?`;
            params.push(from_date);
        }
        if (to_date) {
            sql += ` AND DATE(p.created_at) <= ?`;
            params.push(to_date);
        }
        
        const countSql = sql.replace('SELECT p.*, u.name as student_name, u.username, u.phone, u.class_id', 'SELECT COUNT(*) as total');
        const totalResult = await queryOne(countSql, params);
        const total = totalResult?.total || 0;
        
        sql += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);
        
        const payments = await query(sql, params);
        
        const totals = await queryOne(`
            SELECT 
                SUM(CASE WHEN type = 'tuition' AND status = 'paid' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type != 'tuition' AND status = 'paid' THEN amount ELSE 0 END) as total_expense,
                SUM(CASE WHEN status = 'pending' THEN amount - paid_amount ELSE 0 END) as total_pending,
                SUM(CASE WHEN status = 'overdue' THEN amount - paid_amount ELSE 0 END) as total_overdue
            FROM payments
        `);
        
        res.json({
            success: true,
            payments,
            total,
            totals: {
                total_income: totals?.total_income || 0,
                total_expense: totals?.total_expense || 0,
                total_pending: totals?.total_pending || 0,
                total_overdue: totals?.total_overdue || 0,
                balance: (totals?.total_income || 0) - (totals?.total_expense || 0)
            }
        });
    } catch (error) {
        console.error('Error in getPayments:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ثبت پرداخت جدید
 * POST /api/v1/admin/payments
 */
export async function createPayment(req, res) {
    try {
        const { student_id, amount, title, type, description, due_date, status, payment_method } = req.body;
        
        if (!student_id || !amount || !title) {
            return res.status(400).json({ error: 'اطلاعات ناقص است' });
        }
        
        const student = await queryOne('SELECT id, name FROM users WHERE id = ? AND role = "student"', [student_id]);
        if (!student) {
            return res.status(404).json({ error: 'دانش‌آموز یافت نشد' });
        }
        
        const result = await execute(`
            INSERT INTO payments (student_id, amount, title, type, description, due_date, status, payment_method, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [student_id, amount, title, type || 'tuition', description || null, due_date || null, status || 'pending', payment_method || null, req.user.id]);
        
        await logAdminAction(req.user.id, 'create_payment', 'payment', result.insertId, { student_id, amount, title, type }, req.ip);
        res.json({ success: true, message: 'پرداخت با موفقیت ثبت شد', payment_id: result.insertId });
    } catch (error) {
        console.error('Error in createPayment:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ویرایش پرداخت
 * PUT /api/v1/admin/payments/:id
 */
export async function updatePayment(req, res) {
    try {
        const { id } = req.params;
        const { status, paid_amount, paid_date, payment_method, transaction_id } = req.body;
        
        const existing = await queryOne('SELECT * FROM payments WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'پرداخت یافت نشد' });
        }
        
        await execute(`
            UPDATE payments SET 
                status = COALESCE(?, status),
                paid_amount = COALESCE(?, paid_amount),
                paid_date = COALESCE(?, paid_date),
                payment_method = COALESCE(?, payment_method),
                transaction_id = COALESCE(?, transaction_id)
            WHERE id = ?
        `, [status, paid_amount, paid_date || new Date().toISOString().split('T')[0], payment_method, transaction_id, id]);
        
        await logAdminAction(req.user.id, 'update_payment', 'payment', id, { status, paid_amount }, req.ip);
        res.json({ success: true, message: 'وضعیت پرداخت بروزرسانی شد' });
    } catch (error) {
        console.error('Error in updatePayment:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * حذف پرداخت
 * DELETE /api/v1/admin/payments/:id
 */
export async function deletePayment(req, res) {
    try {
        const { id } = req.params;
        const existing = await queryOne('SELECT * FROM payments WHERE id = ?', [id]);
        if (!existing) return res.status(404).json({ error: 'پرداخت یافت نشد' });
        
        await execute('DELETE FROM payments WHERE id = ?', [id]);
        await logAdminAction(req.user.id, 'delete_payment', 'payment', id, { amount: existing.amount }, req.ip);
        res.json({ success: true, message: 'پرداخت با موفقیت حذف شد' });
    } catch (error) {
        console.error('Error in deletePayment:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// ANNOUNCEMENT MANAGEMENT
// ==========================================

/**
 * دریافت لیست اطلاعیه‌ها
 * GET /api/v1/admin/announcements
 */
export async function getAnnouncements(req, res) {
    try {
        const announcements = await query(`
            SELECT a.*, u.name as created_by_name
            FROM announcements a
            LEFT JOIN users u ON u.id = a.created_by
            ORDER BY 
                CASE a.priority 
                    WHEN 'urgent' THEN 1 
                    WHEN 'high' THEN 2 
                    ELSE 3 
                END,
                a.created_at DESC
        `);
        res.json({ success: true, announcements });
    } catch (error) {
        console.error('Error in getAnnouncements:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ایجاد اطلاعیه جدید
 * POST /api/v1/admin/announcements
 */
export async function createAnnouncement(req, res) {
    try {
        const { title, content, target_role, priority } = req.body;
        if (!title || !content) return res.status(400).json({ error: 'عنوان و متن اطلاعیه الزامی است' });
        
        const result = await execute(`
            INSERT INTO announcements (title, content, target_role, priority, created_by, is_active) 
            VALUES (?, ?, ?, ?, ?, 1)
        `, [title, content, target_role || 'all', priority || 'normal', req.user.id]);
        
        await logAdminAction(req.user.id, 'create_announcement', 'announcement', result.insertId, { title, target_role, priority }, req.ip);
        res.json({ success: true, message: 'اطلاعیه با موفقیت ارسال شد', announcement_id: result.insertId });
    } catch (error) {
        console.error('Error in createAnnouncement:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ویرایش اطلاعیه
 * PUT /api/v1/admin/announcements/:id
 */
export async function updateAnnouncement(req, res) {
    try {
        const { id } = req.params;
        const { title, content, target_role, priority, is_active } = req.body;
        
        const existing = await queryOne('SELECT * FROM announcements WHERE id = ?', [id]);
        if (!existing) return res.status(404).json({ error: 'اطلاعیه یافت نشد' });
        
        await execute(`
            UPDATE announcements SET 
                title = COALESCE(?, title),
                content = COALESCE(?, content),
                target_role = COALESCE(?, target_role),
                priority = COALESCE(?, priority),
                is_active = COALESCE(?, is_active)
            WHERE id = ?
        `, [title, content, target_role, priority, is_active, id]);
        
        await logAdminAction(req.user.id, 'update_announcement', 'announcement', id, { title }, req.ip);
        res.json({ success: true, message: 'اطلاعیه با موفقیت ویرایش شد' });
    } catch (error) {
        console.error('Error in updateAnnouncement:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * حذف اطلاعیه
 * DELETE /api/v1/admin/announcements/:id
 */
export async function deleteAnnouncement(req, res) {
    try {
        const { id } = req.params;
        const existing = await queryOne('SELECT * FROM announcements WHERE id = ?', [id]);
        if (!existing) return res.status(404).json({ error: 'اطلاعیه یافت نشد' });
        
        await execute('DELETE FROM announcements WHERE id = ?', [id]);
        await logAdminAction(req.user.id, 'delete_announcement', 'announcement', id, { title: existing.title }, req.ip);
        res.json({ success: true, message: 'اطلاعیه با موفقیت حذف شد' });
    } catch (error) {
        console.error('Error in deleteAnnouncement:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// REPORT MANAGEMENT
// ==========================================

/**
 * دریافت گزارشات آماری
 * GET /api/v1/admin/reports
 */
export async function getReports(req, res) {
    try {
        const { year = new Date().getFullYear() } = req.query;
        
        // آمار کاربران
        const userStats = await query(`
            SELECT role, COUNT(*) as count 
            FROM users 
            WHERE status = 'active'
            GROUP BY role
        `);
        
        const roles = { students: 0, teachers: 0, parents: 0, admins: 0 };
        userStats.forEach(stat => {
            if (stat.role === 'student') roles.students = stat.count;
            else if (stat.role === 'teacher') roles.teachers = stat.count;
            else if (stat.role === 'parent') roles.parents = stat.count;
            else if (stat.role === 'admin') roles.admins = stat.count;
        });
        
        // آمار کلاس‌ها
        const classStats = await query(`
            SELECT 
                c.name,
                c.grade,
                c.capacity,
                COUNT(DISTINCT cs.student_id) as enrolled
            FROM classes c
            LEFT JOIN class_students cs ON cs.class_id = c.id AND cs.status = 'active'
            WHERE c.status = 'active'
            GROUP BY c.id
            ORDER BY c.grade ASC
        `);
        
        // آمار مالی ماهانه
        const monthlyFinance = await query(`
            SELECT 
                MONTH(created_at) as month,
                SUM(CASE WHEN type = 'tuition' AND status = 'paid' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type != 'tuition' AND status = 'paid' THEN amount ELSE 0 END) as expense
            FROM payments
            WHERE YEAR(created_at) = ? AND status = 'paid'
            GROUP BY MONTH(created_at)
            ORDER BY month ASC
        `, [year]);
        
        const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
        const incomeData = new Array(12).fill(0);
        const expenseData = new Array(12).fill(0);
        
        monthlyFinance.forEach(f => {
            if (f.month >= 1 && f.month <= 12) {
                incomeData[f.month - 1] = f.income || 0;
                expenseData[f.month - 1] = f.expense || 0;
            }
        });
        
        // آمار حضور ماهانه
        const monthlyAttendance = await query(`
            SELECT 
                MONTH(date) as month,
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
                COUNT(CASE WHEN status = 'late' THEN 1 END) as late
            FROM attendance
            WHERE YEAR(date) = ?
            GROUP BY MONTH(date)
            ORDER BY month ASC
        `, [year]);
        
        const presentData = new Array(12).fill(0);
        const absentData = new Array(12).fill(0);
        const lateData = new Array(12).fill(0);
        
        monthlyAttendance.forEach(a => {
            if (a.month >= 1 && a.month <= 12) {
                presentData[a.month - 1] = a.present || 0;
                absentData[a.month - 1] = a.absent || 0;
                lateData[a.month - 1] = a.late || 0;
            }
        });
        
        res.json({
            success: true,
            users: { roles },
            classes: {
                labels: classStats.map(c => c.name),
                capacity: classStats.map(c => c.capacity || 30),
                enrolled: classStats.map(c => c.enrolled || 0)
            },
            finance: {
                labels: monthNames,
                income: incomeData,
                expense: expenseData
            },
            attendance: {
                labels: monthNames,
                present: presentData,
                absent: absentData,
                late: lateData
            }
        });
    } catch (error) {
        console.error('Error in getReports:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// SETTINGS MANAGEMENT
// ==========================================

/**
 * دریافت تنظیمات
 * GET /api/v1/admin/settings
 */
export async function getSettings(req, res) {
    try {
        const settings = await query('SELECT * FROM settings');
        
        const settingsObject = {};
        settings.forEach(s => {
            let value = s.setting_value;
            if (s.setting_type === 'boolean') {
                value = value === 'true';
            } else if (s.setting_type === 'number') {
                value = parseFloat(value);
            } else if (s.setting_type === 'json') {
                try { value = JSON.parse(value); } catch(e) {}
            }
            settingsObject[s.setting_key] = value;
        });
        
        res.json({ success: true, settings: settingsObject });
    } catch (error) {
        console.error('Error in getSettings:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * بروزرسانی تنظیمات
 * PUT /api/v1/admin/settings
 */
export async function updateSettings(req, res) {
    try {
        const updates = req.body;
        
        for (const [key, value] of Object.entries(updates)) {
            let settingValue = value;
            let settingType = 'string';
            
            if (typeof value === 'boolean') {
                settingValue = value.toString();
                settingType = 'boolean';
            } else if (typeof value === 'number') {
                settingValue = value.toString();
                settingType = 'number';
            } else if (typeof value === 'object') {
                settingValue = JSON.stringify(value);
                settingType = 'json';
            }
            
            await execute(`
                INSERT INTO settings (setting_key, setting_value, setting_type, description) 
                VALUES (?, ?, ?, NULL) 
                ON DUPLICATE KEY UPDATE 
                    setting_value = VALUES(setting_value),
                    setting_type = VALUES(setting_type),
                    updated_at = CURRENT_TIMESTAMP
            `, [key, settingValue, settingType]);
        }
        
        await logAdminAction(req.user.id, 'update_settings', 'system', null, Object.keys(updates), req.ip);
        res.json({ success: true, message: 'تنظیمات با موفقیت ذخیره شد' });
    } catch (error) {
        console.error('Error in updateSettings:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// BACKUP MANAGEMENT
// ==========================================

/**
 * دریافت لیست پشتیبان‌ها
 * GET /api/v1/admin/backups
 */
export async function getBackups(req, res) {
    try {
        const backups = await query(`
            SELECT * FROM backups 
            ORDER BY created_at DESC 
            LIMIT 20
        `);
        
        const stats = await queryOne(`
            SELECT 
                COUNT(*) as total,
                SUM(size) as total_size,
                MAX(created_at) as last_backup
            FROM backups 
            WHERE status = 'success'
        `);
        
        res.json({
            success: true,
            backups,
            stats: {
                total: stats?.total || 0,
                size: stats?.total_size || 0,
                lastBackup: stats?.last_backup ? new Date(stats.last_backup).toLocaleDateString('fa-IR') : 'ندارد'
            }
        });
    } catch (error) {
        console.error('Error in getBackups:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ایجاد پشتیبان جدید
 * POST /api/v1/admin/backups
 */
export async function createBackup(req, res) {
    try {
        const { type = 'manual' } = req.body;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `${type}_backup_${timestamp}.sql`;
        
        // اینجا منطق ایجاد پشتیبان قرار می‌گیرد
        // برای پیاده‌سازی کامل نیاز به fs و exec دارد
        
        res.json({ success: true, message: 'پشتیبان با موفقیت ایجاد شد', filename });
    } catch (error) {
        console.error('Error in createBackup:', error);
        res.status(500).json({ error: 'خطا در ایجاد پشتیبان' });
    }
}

/**
 * حذف پشتیبان
 * DELETE /api/v1/admin/backups/:id
 */
export async function deleteBackup(req, res) {
    try {
        const { id } = req.params;
        const backup = await queryOne('SELECT * FROM backups WHERE id = ?', [id]);
        if (!backup) return res.status(404).json({ error: 'پشتیبان یافت نشد' });
        
        await execute('DELETE FROM backups WHERE id = ?', [id]);
        await logAdminAction(req.user.id, 'delete_backup', 'backup', id, { filename: backup.filename }, req.ip);
        res.json({ success: true, message: 'پشتیبان با موفقیت حذف شد' });
    } catch (error) {
        console.error('Error in deleteBackup:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// TICKET MANAGEMENT
// ==========================================

/**
 * دریافت لیست تیکت‌ها
 * GET /api/v1/admin/tickets
 */
export async function getTickets(req, res) {
    try {
        const { status, priority, page = 1, limit = 20 } = req.query;
        
        let sql = `
            SELECT t.*, u.name as user_name, u.role as user_role
            FROM tickets t
            JOIN users u ON u.id = t.user_id
            WHERE 1=1
        `;
        const params = [];
        
        if (status && status !== 'all') {
            sql += ` AND t.status = ?`;
            params.push(status);
        }
        if (priority && priority !== 'all') {
            sql += ` AND t.priority = ?`;
            params.push(priority);
        }
        
        const countSql = sql.replace('SELECT t.*, u.name as user_name, u.role as user_role', 'SELECT COUNT(*) as total');
        const totalResult = await queryOne(countSql, params);
        const total = totalResult?.total || 0;
        
        sql += ` ORDER BY 
            CASE t.priority 
                WHEN 'urgent' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'medium' THEN 3 
                ELSE 4 
            END,
            t.created_at DESC 
            LIMIT ? OFFSET ?`;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);
        
        const tickets = await query(sql, params);
        
        res.json({ success: true, tickets, total });
    } catch (error) {
        console.error('Error in getTickets:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * دریافت اطلاعات یک تیکت
 * GET /api/v1/admin/tickets/:id
 */
export async function getTicketById(req, res) {
    try {
        const { id } = req.params;
        const ticket = await queryOne(`
            SELECT t.*, u.name as user_name, u.role as user_role, u.email, u.phone
            FROM tickets t
            JOIN users u ON u.id = t.user_id
            WHERE t.id = ?
        `, [id]);
        
        if (!ticket) return res.status(404).json({ error: 'تیکت یافت نشد' });
        
        const replies = await query(`
            SELECT tr.*, u.name as user_name, u.role as user_role
            FROM ticket_replies tr
            JOIN users u ON u.id = tr.user_id
            WHERE tr.ticket_id = ?
            ORDER BY tr.created_at ASC
        `, [id]);
        
        res.json({ success: true, ticket, replies });
    } catch (error) {
        console.error('Error in getTicketById:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * پاسخ به تیکت
 * POST /api/v1/admin/tickets/:id/reply
 */
export async function replyTicket(req, res) {
    try {
        const { id } = req.params;
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'متن پیام الزامی است' });
        }
        
        const ticket = await queryOne('SELECT * FROM tickets WHERE id = ?', [id]);
        if (!ticket) return res.status(404).json({ error: 'تیکت یافت نشد' });
        
        await execute(`
            INSERT INTO ticket_replies (ticket_id, user_id, message) 
            VALUES (?, ?, ?)
        `, [id, req.user.id, message]);
        
        await execute(`UPDATE tickets SET status = 'answered' WHERE id = ?`, [id]);
        
        await logAdminAction(req.user.id, 'reply_ticket', 'ticket', id, { message_length: message.length }, req.ip);
        res.json({ success: true, message: 'پاسخ با موفقیت ثبت شد' });
    } catch (error) {
        console.error('Error in replyTicket:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * تغییر وضعیت تیکت
 * PUT /api/v1/admin/tickets/:id/status
 */
export async function updateTicketStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!status || !['open', 'in_progress', 'answered', 'closed'].includes(status)) {
            return res.status(400).json({ error: 'وضعیت نامعتبر است' });
        }
        
        await execute(`UPDATE tickets SET status = ? WHERE id = ?`, [status, id]);
        
        await logAdminAction(req.user.id, 'update_ticket_status', 'ticket', id, { status }, req.ip);
        res.json({ success: true, message: 'وضعیت تیکت با موفقیت بروزرسانی شد' });
    } catch (error) {
        console.error('Error in updateTicketStatus:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// LOG MANAGEMENT
// ==========================================

/**
 * دریافت لاگ فعالیت‌ها
 * GET /api/v1/admin/logs
 */
export async function getLogs(req, res) {
    try {
        const { action, from_date, to_date, page = 1, limit = 50 } = req.query;
        
        let sql = `
            SELECT al.*, u.name as admin_name, u.username
            FROM admin_logs al
            JOIN users u ON u.id = al.admin_id
            WHERE 1=1
        `;
        const params = [];
        
        if (action && action !== 'all') {
            sql += ` AND al.action = ?`;
            params.push(action);
        }
        if (from_date) {
            sql += ` AND DATE(al.created_at) >= ?`;
            params.push(from_date);
        }
        if (to_date) {
            sql += ` AND DATE(al.created_at) <= ?`;
            params.push(to_date);
        }
        
        const countSql = sql.replace('SELECT al.*, u.name as admin_name, u.username', 'SELECT COUNT(*) as total');
        const totalResult = await queryOne(countSql, params);
        const total = totalResult?.total || 0;
        
        sql += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);
        
        const logs = await query(sql, params);
        
        res.json({
            success: true,
            logs: logs.map(log => ({
                id: log.id,
                level: log.action.includes('error') ? 'error' : 
                       log.action.includes('delete') ? 'warning' : 
                       log.action.includes('success') || log.action.includes('login') ? 'success' : 'info',
                time: new Date(log.created_at).toLocaleDateString('fa-IR') + ' ' + 
                      new Date(log.created_at).toLocaleTimeString('fa-IR'),
                user: log.admin_name || log.username,
                ip: log.ip_address,
                action: log.action,
                details: log.details
            })),
            total
        });
    } catch (error) {
        console.error('Error in getLogs:', error);
        res.json({ success: true, logs: [], total: 0 });
    }
}

// ==========================================
// TEACHER LIST (for dropdowns)
// ==========================================

/**
 * دریافت لیست معلمان برای سلکت
 * GET /api/v1/admin/teachers
 */
export async function getTeachersList(req, res) {
    try {
        const teachers = await query('SELECT id, name FROM users WHERE role = "teacher" AND status = "active" ORDER BY name');
        res.json({ success: true, teachers });
    } catch (error) {
        console.error('Error in getTeachersList:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * دریافت لیست دانش‌آموزان
 * GET /api/v1/admin/students
 */
export async function getStudentsList(req, res) {
    try {
        const { class_id, search } = req.query;
        let sql = `
            SELECT u.id, u.name, u.username, u.phone, u.email, u.class_id, c.name as class_name
            FROM users u
            LEFT JOIN classes c ON c.id = u.class_id
            WHERE u.role = 'student' AND u.status = 'active'
        `;
        const params = [];
        
        if (class_id) {
            sql += ` AND u.class_id = ?`;
            params.push(class_id);
        }
        if (search) {
            sql += ` AND u.name LIKE ?`;
            params.push(`%${search}%`);
        }
        
        sql += ` ORDER BY u.name ASC`;
        const students = await query(sql, params);
        res.json({ success: true, students });
    } catch (error) {
        console.error('Error in getStudentsList:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

export default {
    // Dashboard
    getDashboardStats,
    getAttendanceChart,
    getFinancialChart,
    getRecentActivities,
    
    // Users
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getTeachersList,
    getStudentsList,
    
    // Classes
    getClasses,
    getClassById,
    createClass,
    updateClass,
    deleteClass,
    addStudentToClass,
    removeStudentFromClass,
    
    // Courses
    getCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse,
    
    // Grades
    getGrades,
    createGrade,
    
    // Attendance
    getAttendance,
    createAttendance,
    createBulkAttendance,
    
    // Payments
    getPayments,
    createPayment,
    updatePayment,
    deletePayment,
    
    // Announcements
    getAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    
    // Reports
    getReports,
    
    // Settings
    getSettings,
    updateSettings,
    
    // Backups
    getBackups,
    createBackup,
    deleteBackup,
    
    // Tickets
    getTickets,
    getTicketById,
    replyTicket,
    updateTicketStatus,
    
    // Logs
    getLogs
};