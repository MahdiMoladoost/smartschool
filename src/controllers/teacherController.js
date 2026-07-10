// ==========================================
// TEACHER CONTROLLER
// مسیر: src/controllers/teacherController.js
// ==========================================

import { query, queryOne, execute } from '../config/database.js';

// ==========================================
// HELPER FUNCTIONS
// ==========================================

async function logTeacherAction(teacherId, action, targetType, targetId, details, ipAddress) {
    try {
        await execute(`
            INSERT INTO teacher_logs (teacher_id, action, target_type, target_id, details, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, [teacherId, action, targetType, targetId, JSON.stringify(details), ipAddress]);
    } catch (error) {
        console.error('Error logging teacher action:', error);
    }
}

function calculateAverage(quiz, midterm, finalExam, homework, project) {
    const scores = [];
    if (quiz !== null && quiz !== undefined) scores.push(parseFloat(quiz));
    if (midterm !== null && midterm !== undefined) scores.push(parseFloat(midterm));
    if (finalExam !== null && finalExam !== undefined) scores.push(parseFloat(finalExam));
    if (homework !== null && homework !== undefined) scores.push(parseFloat(homework));
    if (project !== null && project !== undefined) scores.push(parseFloat(project));
    
    if (scores.length === 0) return null;
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(average * 10) / 10;
}

function getLetterGrade(average) {
    if (average === null) return null;
    if (average >= 17) return 'A';
    if (average >= 15) return 'B';
    if (average >= 12) return 'C';
    if (average >= 10) return 'D';
    return 'F';
}

// ==========================================
// DASHBOARD
// ==========================================

/**
 * دریافت آمار داشبورد معلم
 * GET /api/v1/teacher/dashboard/stats
 */
export async function getTeacherDashboardStats(req, res) {
    try {
        const teacherId = req.user.id;
        
        // تعداد دروس تدریسی
        const coursesCount = await queryOne(`
            SELECT COUNT(*) as count FROM courses 
            WHERE teacher_id = ? AND status = 'active'
        `, [teacherId]);
        
        // تعداد دانش‌آموزان
        const studentsCount = await queryOne(`
            SELECT COUNT(DISTINCT cs.student_id) as count
            FROM courses c
            JOIN classes cls ON cls.id = c.class_id
            JOIN class_students cs ON cs.class_id = cls.id
            WHERE c.teacher_id = ? AND cs.status = 'active'
        `, [teacherId]);
        
        // تعداد کلاس‌ها
        const classesCount = await queryOne(`
            SELECT COUNT(DISTINCT c.class_id) as count
            FROM courses c
            WHERE c.teacher_id = ? AND c.status = 'active'
        `, [teacherId]);
        
        // میانگین نمرات
        const avgGrade = await queryOne(`
            SELECT AVG(g.average) as avg
            FROM grades g
            JOIN courses c ON c.id = g.course_id
            WHERE c.teacher_id = ? AND g.average IS NOT NULL
        `, [teacherId]);
        
        // حضور امروز
        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = await queryOne(`
            SELECT 
                COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
                COUNT(*) as total
            FROM attendance a
            JOIN courses c ON c.class_id = a.class_id
            WHERE c.teacher_id = ? AND a.date = ?
        `, [teacherId, today]);
        
        const attendanceRate = todayAttendance?.total > 0 
            ? ((todayAttendance.present / todayAttendance.total) * 100).toFixed(1) 
            : 0;
        
        res.json({
            success: true,
            stats: {
                courses: coursesCount?.count || 0,
                students: studentsCount?.count || 0,
                classes: classesCount?.count || 0,
                avg_grade: parseFloat(avgGrade?.avg || 0).toFixed(2),
                attendance_rate: attendanceRate
            }
        });
    } catch (error) {
        console.error('Error in getTeacherDashboardStats:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// COURSE MANAGEMENT
// ==========================================

/**
 * دریافت لیست دروس تدریسی معلم
 * GET /api/v1/teacher/courses
 */
export async function getTeacherCourses(req, res) {
    try {
        const teacherId = req.user.id;
        
        const courses = await query(`
            SELECT 
                c.*,
                cls.name as class_name,
                cls.grade,
                COUNT(DISTINCT cs.student_id) as student_count
            FROM courses c
            JOIN classes cls ON cls.id = c.class_id
            LEFT JOIN class_students cs ON cs.class_id = cls.id AND cs.status = 'active'
            WHERE c.teacher_id = ? AND c.status = 'active'
            GROUP BY c.id
            ORDER BY c.name ASC
        `, [teacherId]);
        
        res.json({ success: true, courses });
    } catch (error) {
        console.error('Error in getTeacherCourses:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * دریافت اطلاعات یک درس خاص
 * GET /api/v1/teacher/courses/:id
 */
export async function getTeacherCourseById(req, res) {
    try {
        const teacherId = req.user.id;
        const { id } = req.params;
        
        const course = await queryOne(`
            SELECT 
                c.*,
                cls.name as class_name,
                cls.grade,
                cls.capacity,
                COUNT(DISTINCT cs.student_id) as student_count
            FROM courses c
            JOIN classes cls ON cls.id = c.class_id
            LEFT JOIN class_students cs ON cs.class_id = cls.id AND cs.status = 'active'
            WHERE c.id = ? AND c.teacher_id = ? AND c.status = 'active'
            GROUP BY c.id
        `, [id, teacherId]);
        
        if (!course) {
            return res.status(404).json({ error: 'درس یافت نشد یا شما دسترسی ندارید' });
        }
        
        res.json({ success: true, course });
    } catch (error) {
        console.error('Error in getTeacherCourseById:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// STUDENT MANAGEMENT
// ==========================================

/**
 * دریافت لیست دانش‌آموزان کلاس‌های معلم
 * GET /api/v1/teacher/students
 */
export async function getTeacherStudents(req, res) {
    try {
        const teacherId = req.user.id;
        const { course_id, search } = req.query;
        
        let sql = `
            SELECT DISTINCT 
                u.id, 
                u.name, 
                u.username, 
                u.phone, 
                u.email,
                cls.name as class_name,
                cls.grade
            FROM users u
            JOIN class_students cs ON cs.student_id = u.id
            JOIN classes cls ON cls.id = cs.class_id
            JOIN courses c ON c.class_id = cls.id
            WHERE c.teacher_id = ? 
                AND u.role = 'student' 
                AND u.status = 'active'
                AND cs.status = 'active'
        `;
        const params = [teacherId];
        
        if (course_id) {
            sql += ` AND c.id = ?`;
            params.push(course_id);
        }
        
        if (search) {
            sql += ` AND u.name LIKE ?`;
            params.push(`%${search}%`);
        }
        
        sql += ` ORDER BY u.name ASC`;
        
        const students = await query(sql, params);
        res.json({ success: true, students });
    } catch (error) {
        console.error('Error in getTeacherStudents:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * دریافت اطلاعات یک دانش‌آموز
 * GET /api/v1/teacher/students/:id
 */
export async function getTeacherStudentById(req, res) {
    try {
        const teacherId = req.user.id;
        const { id } = req.params;
        
        const student = await queryOne(`
            SELECT 
                u.id, u.name, u.username, u.phone, u.email,
                cls.name as class_name, cls.grade
            FROM users u
            JOIN class_students cs ON cs.student_id = u.id
            JOIN classes cls ON cls.id = cs.class_id
            JOIN courses c ON c.class_id = cls.id
            WHERE u.id = ? 
                AND u.role = 'student'
                AND c.teacher_id = ?
            LIMIT 1
        `, [id, teacherId]);
        
        if (!student) {
            return res.status(404).json({ error: 'دانش‌آموز یافت نشد یا شما دسترسی ندارید' });
        }
        
        res.json({ success: true, student });
    } catch (error) {
        console.error('Error in getTeacherStudentById:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// GRADE MANAGEMENT
// ==========================================

/**
 * دریافت نمرات دانش‌آموزان
 * GET /api/v1/teacher/grades
 */
export async function getTeacherGrades(req, res) {
    try {
        const teacherId = req.user.id;
        const { course_id, student_id, term } = req.query;
        
        let sql = `
            SELECT 
                g.*,
                u.name as student_name,
                u.id as student_id,
                c.name as course_name
            FROM grades g
            JOIN users u ON u.id = g.student_id
            JOIN courses c ON c.id = g.course_id
            WHERE c.teacher_id = ?
        `;
        const params = [teacherId];
        
        if (course_id) {
            sql += ` AND g.course_id = ?`;
            params.push(course_id);
        }
        
        if (student_id) {
            sql += ` AND g.student_id = ?`;
            params.push(student_id);
        }
        
        if (term) {
            sql += ` AND g.term = ?`;
            params.push(term);
        }
        
        sql += ` ORDER BY u.name ASC, c.name ASC`;
        
        const grades = await query(sql, params);
        res.json({ success: true, grades });
    } catch (error) {
        console.error('Error in getTeacherGrades:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ثبت یا ویرایش نمره
 * POST /api/v1/teacher/grades
 */
export async function createOrUpdateGrade(req, res) {
    try {
        const teacherId = req.user.id;
        const { student_id, course_id, quiz, midterm, final_exam, homework, project, term } = req.body;
        
        if (!student_id || !course_id) {
            return res.status(400).json({ error: 'دانش‌آموز و درس الزامی است' });
        }
        
        // بررسی دسترسی معلم به این درس
        const checkCourse = await queryOne(`
            SELECT id, name FROM courses 
            WHERE id = ? AND teacher_id = ? AND status = 'active'
        `, [course_id, teacherId]);
        
        if (!checkCourse) {
            return res.status(403).json({ error: 'شما دسترسی به این درس ندارید' });
        }
        
        // بررسی وجود دانش‌آموز در کلاس این درس
        const checkStudent = await queryOne(`
            SELECT u.id FROM users u
            JOIN class_students cs ON cs.student_id = u.id
            JOIN courses c ON c.class_id = cs.class_id
            WHERE u.id = ? AND c.id = ? AND u.role = 'student'
        `, [student_id, course_id]);
        
        if (!checkStudent) {
            return res.status(404).json({ error: 'دانش‌آموز در این کلاس وجود ندارد' });
        }
        
        // محاسبه میانگین
        const average = calculateAverage(quiz, midterm, final_exam, homework, project);
        const letterGrade = getLetterGrade(average);
        
        const finalTerm = term || 'ترم اول';
        
        await execute(`
            INSERT INTO grades (
                student_id, course_id, quiz, midterm, final_exam, 
                homework, project, average, letter_grade, term, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                quiz = VALUES(quiz),
                midterm = VALUES(midterm),
                final_exam = VALUES(final_exam),
                homework = VALUES(homework),
                project = VALUES(project),
                average = VALUES(average),
                letter_grade = VALUES(letter_grade),
                updated_at = CURRENT_TIMESTAMP
        `, [student_id, course_id, quiz || null, midterm || null, final_exam || null, 
            homework || null, project || null, average, letterGrade, finalTerm, teacherId]);
        
        await logTeacherAction(teacherId, 'grade_created', 'grade', null, {
            student_id, course_id, average, term: finalTerm
        }, req.ip);
        
        res.json({ 
            success: true, 
            message: 'نمره با موفقیت ثبت شد',
            average: average,
            letter_grade: letterGrade
        });
    } catch (error) {
        console.error('Error in createOrUpdateGrade:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ثبت گروهی نمرات
 * POST /api/v1/teacher/grades/bulk
 */
export async function createBulkGrades(req, res) {
    try {
        const teacherId = req.user.id;
        const { grades, term } = req.body;
        
        if (!grades || !Array.isArray(grades) || grades.length === 0) {
            return res.status(400).json({ error: 'لیست نمرات معتبر نیست' });
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const grade of grades) {
            try {
                const { student_id, course_id, quiz, midterm, final_exam, homework, project } = grade;
                
                // بررسی دسترسی معلم
                const checkCourse = await queryOne(`
                    SELECT id FROM courses WHERE id = ? AND teacher_id = ?
                `, [course_id, teacherId]);
                
                if (!checkCourse) continue;
                
                const average = calculateAverage(quiz, midterm, final_exam, homework, project);
                const letterGrade = getLetterGrade(average);
                const finalTerm = term || 'ترم اول';
                
                await execute(`
                    INSERT INTO grades (
                        student_id, course_id, quiz, midterm, final_exam,
                        homework, project, average, letter_grade, term, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        quiz = VALUES(quiz),
                        midterm = VALUES(midterm),
                        final_exam = VALUES(final_exam),
                        homework = VALUES(homework),
                        project = VALUES(project),
                        average = VALUES(average),
                        letter_grade = VALUES(letter_grade)
                `, [student_id, course_id, quiz || null, midterm || null, final_exam || null,
                    homework || null, project || null, average, letterGrade, finalTerm, teacherId]);
                
                successCount++;
            } catch (err) {
                errorCount++;
                console.error('Bulk grade error:', err);
            }
        }
        
        await logTeacherAction(teacherId, 'bulk_grades_created', 'grades', null, {
            success_count: successCount, error_count: errorCount, term
        }, req.ip);
        
        res.json({ 
            success: true, 
            message: `${successCount} نمره با موفقیت ثبت شد${errorCount > 0 ? `، ${errorCount} خطا` : ''}`,
            success_count: successCount,
            error_count: errorCount
        });
    } catch (error) {
        console.error('Error in createBulkGrades:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// ATTENDANCE MANAGEMENT
// ==========================================

/**
 * دریافت حضور و غیاب برای یک درس خاص
 * GET /api/v1/teacher/attendance
 */
export async function getTeacherAttendance(req, res) {
    try {
        const teacherId = req.user.id;
        const { course_id, date } = req.query;
        
        if (!course_id) {
            return res.status(400).json({ error: 'انتخاب درس الزامی است' });
        }
        
        // دریافت اطلاعات درس
        const course = await queryOne(`
            SELECT c.*, cls.id as class_id, cls.name as class_name
            FROM courses c
            JOIN classes cls ON cls.id = c.class_id
            WHERE c.id = ? AND c.teacher_id = ? AND c.status = 'active'
        `, [course_id, teacherId]);
        
        if (!course) {
            return res.status(403).json({ error: 'شما دسترسی به این درس ندارید' });
        }
        
        const selectedDate = date || new Date().toISOString().split('T')[0];
        
        // دریافت دانش‌آموزان کلاس
        const students = await query(`
            SELECT u.id, u.name
            FROM users u
            JOIN class_students cs ON cs.student_id = u.id
            WHERE cs.class_id = ? AND cs.status = 'active' AND u.status = 'active'
            ORDER BY u.name ASC
        `, [course.class_id]);
        
        // دریافت وضعیت حضور و غیاب
        const attendanceRecords = await query(`
            SELECT student_id, status, notes 
            FROM attendance 
            WHERE class_id = ? AND date = ?
        `, [course.class_id, selectedDate]);
        
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
            status: attendanceMap[student.id]?.status || 'present',
            note: attendanceMap[student.id]?.note || ''
        }));
        
        // آمار روزانه
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
            date: selectedDate,
            course_name: course.name,
            class_name: course.class_name,
            class_id: course.class_id
        });
    } catch (error) {
        console.error('Error in getTeacherAttendance:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ثبت حضور و غیاب توسط معلم
 * POST /api/v1/teacher/attendance
 */
export async function createTeacherAttendance(req, res) {
    try {
        const teacherId = req.user.id;
        const { student_id, class_id, date, status, note } = req.body;
        
        if (!student_id || !class_id || !date || !status) {
            return res.status(400).json({ error: 'اطلاعات ناقص است' });
        }
        
        // بررسی دسترسی معلم به این کلاس
        const checkAccess = await queryOne(`
            SELECT c.id FROM courses c
            WHERE c.class_id = ? AND c.teacher_id = ? AND c.status = 'active'
        `, [class_id, teacherId]);
        
        if (!checkAccess) {
            return res.status(403).json({ error: 'شما دسترسی به این کلاس ندارید' });
        }
        
        // بررسی وجود دانش‌آموز در کلاس
        const checkStudent = await queryOne(`
            SELECT * FROM class_students 
            WHERE class_id = ? AND student_id = ? AND status = 'active'
        `, [class_id, student_id]);
        
        if (!checkStudent) {
            return res.status(404).json({ error: 'دانش‌آموز در این کلاس وجود ندارد' });
        }
        
        // ثبت یا بروزرسانی حضور و غیاب
        await execute(`
            INSERT INTO attendance (student_id, class_id, date, status, notes, recorded_by) 
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                status = VALUES(status), 
                notes = VALUES(notes),
                recorded_by = VALUES(recorded_by)
        `, [student_id, class_id, date, status, note || null, teacherId]);
        
        await logTeacherAction(teacherId, 'attendance_created', 'attendance', null, {
            student_id, class_id, date, status
        }, req.ip);
        
        res.json({ success: true, message: 'وضعیت حضور با موفقیت ثبت شد' });
    } catch (error) {
        console.error('Error in createTeacherAttendance:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * ثبت گروهی حضور و غیاب
 * POST /api/v1/teacher/attendance/bulk
 */
export async function createBulkTeacherAttendance(req, res) {
    try {
        const teacherId = req.user.id;
        const { class_id, date, records } = req.body;
        
        if (!class_id || !date || !records || !Array.isArray(records)) {
            return res.status(400).json({ error: 'اطلاعات ناقص است' });
        }
        
        // بررسی دسترسی معلم به این کلاس
        const checkAccess = await queryOne(`
            SELECT c.id FROM courses c
            WHERE c.class_id = ? AND c.teacher_id = ?
        `, [class_id, teacherId]);
        
        if (!checkAccess) {
            return res.status(403).json({ error: 'شما دسترسی به این کلاس ندارید' });
        }
        
        let successCount = 0;
        
        for (const record of records) {
            try {
                await execute(`
                    INSERT INTO attendance (student_id, class_id, date, status, notes, recorded_by) 
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        status = VALUES(status), 
                        notes = VALUES(notes),
                        recorded_by = VALUES(recorded_by)
                `, [record.student_id, class_id, date, record.status, record.note || null, teacherId]);
                successCount++;
            } catch (err) {
                console.error('Bulk attendance error:', err);
            }
        }
        
        await logTeacherAction(teacherId, 'bulk_attendance_created', 'attendance', null, {
            class_id, date, count: successCount
        }, req.ip);
        
        res.json({ 
            success: true, 
            message: `${successCount} وضعیت حضور با موفقیت ثبت شد`
        });
    } catch (error) {
        console.error('Error in createBulkTeacherAttendance:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * گزارش حضور و غیاب معلم
 * GET /api/v1/teacher/attendance/report
 */
export async function getTeacherAttendanceReport(req, res) {
    try {
        const teacherId = req.user.id;
        const { course_id, month, year } = req.query;
        
        const selectedYear = year || new Date().getFullYear();
        const selectedMonth = month || new Date().getMonth() + 1;
        
        let sql = `
            SELECT 
                DATE(a.date) as date,
                COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
                COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
                COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
                COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as excused,
                COUNT(*) as total
            FROM attendance a
            JOIN courses c ON c.class_id = a.class_id
            WHERE c.teacher_id = ? 
                AND YEAR(a.date) = ? 
                AND MONTH(a.date) = ?
        `;
        const params = [teacherId, selectedYear, selectedMonth];
        
        if (course_id) {
            sql += ` AND c.id = ?`;
            params.push(course_id);
        }
        
        sql += ` GROUP BY DATE(a.date) ORDER BY a.date ASC`;
        
        const report = await query(sql, params);
        
        res.json({ 
            success: true, 
            report,
            year: selectedYear,
            month: selectedMonth
        });
    } catch (error) {
        console.error('Error in getTeacherAttendanceReport:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// PROFILE MANAGEMENT
// ==========================================

/**
 * دریافت پروفایل معلم
 * GET /api/v1/teacher/profile
 */
export async function getTeacherProfile(req, res) {
    try {
        const teacherId = req.user.id;
        
        const teacher = await queryOne(`
            SELECT id, name, username, email, phone, status, created_at, last_login
            FROM users 
            WHERE id = ? AND role = 'teacher'
        `, [teacherId]);
        
        if (!teacher) {
            return res.status(404).json({ error: 'معلم یافت نشد' });
        }
        
        // تعداد دروس تدریسی
        const coursesCount = await queryOne(`
            SELECT COUNT(*) as count FROM courses 
            WHERE teacher_id = ? AND status = 'active'
        `, [teacherId]);
        
        // تعداد دانش‌آموزان
        const studentsCount = await queryOne(`
            SELECT COUNT(DISTINCT cs.student_id) as count
            FROM courses c
            JOIN classes cls ON cls.id = c.class_id
            JOIN class_students cs ON cs.class_id = cls.id
            WHERE c.teacher_id = ? AND cs.status = 'active'
        `, [teacherId]);
        
        teacher.courses_count = coursesCount?.count || 0;
        teacher.students_count = studentsCount?.count || 0;
        
        res.json({ success: true, teacher });
    } catch (error) {
        console.error('Error in getTeacherProfile:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * بروزرسانی پروفایل معلم
 * PUT /api/v1/teacher/profile
 */
export async function updateTeacherProfile(req, res) {
    try {
        const teacherId = req.user.id;
        const { name, phone, email } = req.body;
        
        await execute(`
            UPDATE users SET 
                name = COALESCE(?, name),
                phone = COALESCE(?, phone),
                email = COALESCE(?, email)
            WHERE id = ? AND role = 'teacher'
        `, [name, phone, email, teacherId]);
        
        await logTeacherAction(teacherId, 'profile_updated', 'profile', teacherId, {
            name, phone, email
        }, req.ip);
        
        res.json({ success: true, message: 'پروفایل با موفقیت بروزرسانی شد' });
    } catch (error) {
        console.error('Error in updateTeacherProfile:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// STATISTICS
// ==========================================

/**
 * آمار نمرات معلم
 * GET /api/v1/teacher/stats/grades
 */
export async function getTeacherGradeStats(req, res) {
    try {
        const teacherId = req.user.id;
        const { course_id } = req.query;
        
        let sql = `
            SELECT 
                AVG(g.average) as avg_grade,
                MIN(g.average) as min_grade,
                MAX(g.average) as max_grade,
                COUNT(CASE WHEN g.average >= 17 THEN 1 END) as excellent,
                COUNT(CASE WHEN g.average >= 15 AND g.average < 17 THEN 1 END) as good,
                COUNT(CASE WHEN g.average >= 12 AND g.average < 15 THEN 1 END) as acceptable,
                COUNT(CASE WHEN g.average < 12 THEN 1 END) as weak,
                COUNT(*) as total
            FROM grades g
            JOIN courses c ON c.id = g.course_id
            WHERE c.teacher_id = ?
        `;
        const params = [teacherId];
        
        if (course_id) {
            sql += ` AND c.id = ?`;
            params.push(course_id);
        }
        
        const stats = await queryOne(sql, params);
        
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error in getTeacherGradeStats:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

/**
 * آمار حضور و غیاب معلم
 * GET /api/v1/teacher/stats/attendance
 */
export async function getTeacherAttendanceStats(req, res) {
    try {
        const teacherId = req.user.id;
        const { course_id } = req.query;
        
        let sql = `
            SELECT 
                a.status,
                COUNT(*) as count,
                COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
            FROM attendance a
            JOIN courses c ON c.class_id = a.class_id
            WHERE c.teacher_id = ?
        `;
        const params = [teacherId];
        
        if (course_id) {
            sql += ` AND c.id = ?`;
            params.push(course_id);
        }
        
        sql += ` GROUP BY a.status`;
        
        const stats = await query(sql, params);
        
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error in getTeacherAttendanceStats:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// EXPORT
// ==========================================

export default {
    // Dashboard
    getTeacherDashboardStats,
    
    // Courses
    getTeacherCourses,
    getTeacherCourseById,
    
    // Students
    getTeacherStudents,
    getTeacherStudentById,
    
    // Grades
    getTeacherGrades,
    createOrUpdateGrade,
    createBulkGrades,
    getTeacherGradeStats,
    
    // Attendance
    getTeacherAttendance,
    createTeacherAttendance,
    createBulkTeacherAttendance,
    getTeacherAttendanceReport,
    getTeacherAttendanceStats,
    
    // Profile
    getTeacherProfile,
    updateTeacherProfile
};