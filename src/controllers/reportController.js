import { query, queryOne, execute } from '../config/database.js';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.join(__dirname, '../../reports');

// اطمینان از وجود پوشه گزارشات
if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// ==========================================
// STUDENTS REPORT (گزارش دانش‌آموزان)
// ==========================================

export async function getStudentsReport(req, res) {
    try {
        const { class_id, grade, status, format = 'json' } = req.query;
        
        let sql = `
            SELECT 
                u.id,
                u.name,
                u.username,
                u.phone,
                u.email,
                u.class_name,
                u.status,
                u.created_at,
                COALESCE((
                    SELECT AVG(average) FROM grades WHERE student_id = u.id
                ), 0) as average_grade,
                COALESCE((
                    SELECT COUNT(*) FROM attendance WHERE student_id = u.id AND status = 'present'
                ), 0) as attendance_present,
                COALESCE((
                    SELECT COUNT(*) FROM attendance WHERE student_id = u.id
                ), 0) as attendance_total,
                COALESCE((
                    SELECT SUM(amount - paid_amount) FROM payments WHERE student_id = u.id AND status != 'paid'
                ), 0) as debt
            FROM users u
            WHERE u.role = 'student'
        `;
        const params = [];
        
        if (class_id) {
            sql += ` AND u.class_id = ?`;
            params.push(class_id);
        }
        
        if (grade) {
            sql += ` AND u.grade = ?`;
            params.push(grade);
        }
        
        if (status) {
            sql += ` AND u.status = ?`;
            params.push(status);
        }
        
        sql += ` ORDER BY u.name ASC`;
        
        const students = await query(sql, params);
        
        // محاسبه آمار کلی
        const stats = {
            total: students.length,
            active: students.filter(s => s.status === 'active').length,
            inactive: students.filter(s => s.status === 'inactive').length,
            avg_grade: (students.reduce((sum, s) => sum + parseFloat(s.average_grade || 0), 0) / students.length).toFixed(2),
            avg_attendance: (students.reduce((sum, s) => {
                const rate = s.attendance_total > 0 ? (s.attendance_present / s.attendance_total) * 100 : 0;
                return sum + rate;
            }, 0) / students.length).toFixed(1),
            total_debt: students.reduce((sum, s) => sum + parseFloat(s.debt || 0), 0)
        };
        
        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('دانش‌آموزان');
            
            // تنظیم ستون‌ها
            worksheet.columns = [
                { header: 'ردیف', key: 'row', width: 8 },
                { header: 'نام دانش‌آموز', key: 'name', width: 25 },
                { header: 'نام کاربری', key: 'username', width: 20 },
                { header: 'کلاس', key: 'class_name', width: 15 },
                { header: 'میانگین نمرات', key: 'average_grade', width: 15 },
                { header: 'نرخ حضور', key: 'attendance_rate', width: 15 },
                { header: 'بدهی (تومان)', key: 'debt', width: 20 },
                { header: 'وضعیت', key: 'status', width: 12 },
                { header: 'تاریخ ثبت‌نام', key: 'created_at', width: 20 }
            ];
            
            // استایل هدر
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF2563EB' }
            };
            worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' } };
            
            // اضافه کردن داده‌ها
            students.forEach((student, index) => {
                const attendanceRate = student.attendance_total > 0 
                    ? ((student.attendance_present / student.attendance_total) * 100).toFixed(1) + '%'
                    : '0%';
                    
                worksheet.addRow({
                    row: index + 1,
                    name: student.name,
                    username: student.username,
                    class_name: student.class_name || '-',
                    average_grade: parseFloat(student.average_grade || 0).toFixed(2),
                    attendance_rate: attendanceRate,
                    debt: parseFloat(student.debt || 0).toLocaleString(),
                    status: student.status === 'active' ? 'فعال' : 'غیرفعال',
                    created_at: new Date(student.created_at).toLocaleDateString('fa-IR')
                });
            });
            
            // تنظیم border برای همه سلول‌ها
            worksheet.eachRow((row, rowNumber) => {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });
            
            const filename = `students_report_${Date.now()}.xlsx`;
            const filepath = path.join(REPORTS_DIR, filename);
            await workbook.xlsx.writeFile(filepath);
            
            return res.download(filepath, filename, (err) => {
                if (err) console.error('خطا در دانلود:', err);
                setTimeout(() => {
                    fs.unlinkSync(filepath);
                }, 60000);
            });
        }
        
        res.json({
            success: true,
            stats,
            students
        });
    } catch (error) {
        console.error('خطا در گزارش دانش‌آموزان:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// PAYMENTS REPORT (گزارش مالی)
// ==========================================

export async function getPaymentsReport(req, res) {
    try {
        const { start_date, end_date, status, format = 'json' } = req.query;
        
        let sql = `
            SELECT 
                p.*,
                u.name as student_name,
                u.class_name,
                u.phone
            FROM payments p
            JOIN users u ON u.id = p.student_id
            WHERE 1=1
        `;
        const params = [];
        
        if (start_date) {
            sql += ` AND p.created_at >= ?`;
            params.push(start_date);
        }
        
        if (end_date) {
            sql += ` AND p.created_at <= ?`;
            params.push(end_date);
        }
        
        if (status) {
            sql += ` AND p.status = ?`;
            params.push(status);
        }
        
        sql += ` ORDER BY p.created_at DESC`;
        
        const payments = await query(sql, params);
        
        // محاسبه آمار مالی
        const stats = {
            total_income: payments.reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0),
            total_pending: payments.reduce((sum, p) => sum + parseFloat(p.amount - p.paid_amount || 0), 0),
            paid_count: payments.filter(p => p.status === 'paid').length,
            pending_count: payments.filter(p => p.status === 'pending').length,
            overdue_count: payments.filter(p => p.status === 'overdue').length
        };
        
        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('تراکنش‌های مالی');
            
            worksheet.columns = [
                { header: 'ردیف', key: 'row', width: 8 },
                { header: 'دانش‌آموز', key: 'student_name', width: 25 },
                { header: 'کلاس', key: 'class_name', width: 15 },
                { header: 'عنوان', key: 'title', width: 25 },
                { header: 'مبلغ کل', key: 'amount', width: 18 },
                { header: 'پرداختی', key: 'paid_amount', width: 18 },
                { header: 'بدهی', key: 'debt', width: 18 },
                { header: 'وضعیت', key: 'status', width: 15 },
                { header: 'تاریخ', key: 'created_at', width: 20 }
            ];
            
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF10B981' }
            };
            
            payments.forEach((payment, index) => {
                worksheet.addRow({
                    row: index + 1,
                    student_name: payment.student_name,
                    class_name: payment.class_name || '-',
                    title: payment.title,
                    amount: parseFloat(payment.amount).toLocaleString(),
                    paid_amount: parseFloat(payment.paid_amount || 0).toLocaleString(),
                    debt: parseFloat(payment.amount - (payment.paid_amount || 0)).toLocaleString(),
                    status: payment.status === 'paid' ? 'پرداخت شده' : (payment.status === 'pending' ? 'در انتظار' : 'منقضی'),
                    created_at: new Date(payment.created_at).toLocaleDateString('fa-IR')
                });
            });
            
            const filename = `payments_report_${Date.now()}.xlsx`;
            const filepath = path.join(REPORTS_DIR, filename);
            await workbook.xlsx.writeFile(filepath);
            
            return res.download(filepath, filename, (err) => {
                if (err) console.error('خطا در دانلود:', err);
                setTimeout(() => fs.unlinkSync(filepath), 60000);
            });
        }
        
        res.json({
            success: true,
            stats,
            payments
        });
    } catch (error) {
        console.error('خطا در گزارش مالی:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// ATTENDANCE REPORT (گزارش حضور و غیاب)
// ==========================================

export async function getAttendanceReport(req, res) {
    try {
        const { class_id, date_from, date_to, format = 'json' } = req.query;
        
        let sql = `
            SELECT 
                a.*,
                u.name as student_name,
                u.class_name,
                c.name as course_name
            FROM attendance a
            JOIN users u ON u.id = a.student_id
            JOIN courses c ON c.id = a.course_id
            WHERE 1=1
        `;
        const params = [];
        
        if (class_id) {
            sql += ` AND u.class_id = ?`;
            params.push(class_id);
        }
        
        if (date_from) {
            sql += ` AND a.date >= ?`;
            params.push(date_from);
        }
        
        if (date_to) {
            sql += ` AND a.date <= ?`;
            params.push(date_to);
        }
        
        sql += ` ORDER BY a.date DESC, u.name ASC`;
        
        const attendance = await query(sql, params);
        
        // آمار حضور
        const stats = {
            total: attendance.length,
            present: attendance.filter(a => a.status === 'present').length,
            absent: attendance.filter(a => a.status === 'absent').length,
            late: attendance.filter(a => a.status === 'late').length,
            present_rate: attendance.length > 0 
                ? ((attendance.filter(a => a.status === 'present').length / attendance.length) * 100).toFixed(1)
                : 0
        };
        
        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('حضور و غیاب');
            
            worksheet.columns = [
                { header: 'ردیف', key: 'row', width: 8 },
                { header: 'دانش‌آموز', key: 'student_name', width: 25 },
                { header: 'کلاس', key: 'class_name', width: 15 },
                { header: 'درس', key: 'course_name', width: 20 },
                { header: 'تاریخ', key: 'date', width: 15 },
                { header: 'وضعیت', key: 'status', width: 12 }
            ];
            
            worksheet.getRow(1).font = { bold: true };
            
            attendance.forEach((record, index) => {
                worksheet.addRow({
                    row: index + 1,
                    student_name: record.student_name,
                    class_name: record.class_name || '-',
                    course_name: record.course_name,
                    date: new Date(record.date).toLocaleDateString('fa-IR'),
                    status: record.status === 'present' ? 'حاضر' : (record.status === 'absent' ? 'غایب' : 'تاخیر')
                });
            });
            
            const filename = `attendance_report_${Date.now()}.xlsx`;
            const filepath = path.join(REPORTS_DIR, filename);
            await workbook.xlsx.writeFile(filepath);
            
            return res.download(filepath, filename, (err) => {
                if (err) console.error('خطا در دانلود:', err);
                setTimeout(() => fs.unlinkSync(filepath), 60000);
            });
        }
        
        res.json({
            success: true,
            stats,
            attendance
        });
    } catch (error) {
        console.error('خطا در گزارش حضور:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// SYSTEM HEALTH REPORT (گزارش سلامت سیستم)
// ==========================================

export async function getSystemHealthReport(req, res) {
    try {
        // آمار کاربران
        const userStats = await queryOne(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as students,
                SUM(CASE WHEN role = 'teacher' THEN 1 ELSE 0 END) as teachers,
                SUM(CASE WHEN role = 'parent' THEN 1 ELSE 0 END) as parents,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
            FROM users
        `);
        
        // آمار فعالیت 24 ساعت اخیر
        const recentActivity = await queryOne(`
            SELECT 
                COUNT(*) as total_requests,
                COUNT(DISTINCT user_id) as active_users
            FROM ai_logs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `);
        
        // آمار دیتابیس
        const dbStats = await query(`
            SELECT 
                table_name AS "Table",
                round(((data_length + index_length) / 1024 / 1024), 2) AS "Size(MB)"
            FROM information_schema.TABLES
            WHERE table_schema = 'smart_school'
            ORDER BY (data_length + index_length) DESC
        `);
        
        // آخرین لاگ‌های ادمین
        const recentAdminLogs = await query(`
            SELECT al.*, u.name as admin_name
            FROM admin_logs al
            JOIN users u ON u.id = al.admin_id
            ORDER BY al.created_at DESC
            LIMIT 20
        `);
        
        res.json({
            success: true,
            report: {
                generated_at: new Date().toISOString(),
                users: userStats,
                activity_24h: recentActivity,
                database_size: dbStats,
                recent_admin_logs: recentAdminLogs
            }
        });
    } catch (error) {
        console.error('خطا در گزارش سلامت:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// EXPORT TO EXCEL (گزارش جامع)
// ==========================================

export async function exportFullReport(req, res) {
    try {
        const workbook = new ExcelJS.Workbook();
        
        // صفحه دانش‌آموزان
        const studentsSheet = workbook.addWorksheet('دانش‌آموزان');
        const students = await query(`
            SELECT name, username, class_name, phone, email, status, created_at
            FROM users WHERE role = 'student' ORDER BY name ASC
        `);
        
        studentsSheet.columns = [
            { header: 'نام', key: 'name', width: 25 },
            { header: 'نام کاربری', key: 'username', width: 20 },
            { header: 'کلاس', key: 'class_name', width: 15 },
            { header: 'شماره تماس', key: 'phone', width: 18 },
            { header: 'ایمیل', key: 'email', width: 25 },
            { header: 'وضعیت', key: 'status', width: 12 },
            { header: 'تاریخ ثبت', key: 'created_at', width: 20 }
        ];
        
        students.forEach(student => {
            studentsSheet.addRow({
                name: student.name,
                username: student.username,
                class_name: student.class_name || '-',
                phone: student.phone || '-',
                email: student.email || '-',
                status: student.status === 'active' ? 'فعال' : 'غیرفعال',
                created_at: new Date(student.created_at).toLocaleDateString('fa-IR')
            });
        });
        
        // صفحه معلمان
        const teachersSheet = workbook.addWorksheet('معلمان');
        const teachers = await query(`
            SELECT name, username, phone, email, status, created_at
            FROM users WHERE role = 'teacher' ORDER BY name ASC
        `);
        
        teachersSheet.columns = [
            { header: 'نام', key: 'name', width: 25 },
            { header: 'نام کاربری', key: 'username', width: 20 },
            { header: 'شماره تماس', key: 'phone', width: 18 },
            { header: 'ایمیل', key: 'email', width: 25 },
            { header: 'وضعیت', key: 'status', width: 12 },
            { header: 'تاریخ ثبت', key: 'created_at', width: 20 }
        ];
        
        teachers.forEach(teacher => {
            teachersSheet.addRow({
                name: teacher.name,
                username: teacher.username,
                phone: teacher.phone || '-',
                email: teacher.email || '-',
                status: teacher.status === 'active' ? 'فعال' : 'غیرفعال',
                created_at: new Date(teacher.created_at).toLocaleDateString('fa-IR')
            });
        });
        
        // استایل دادن به هدرها
        [studentsSheet, teachersSheet].forEach(sheet => {
            const headerRow = sheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF2563EB' }
            };
        });
        
        const filename = `full_report_${Date.now()}.xlsx`;
        const filepath = path.join(REPORTS_DIR, filename);
        await workbook.xlsx.writeFile(filepath);
        
        res.download(filepath, filename, (err) => {
            if (err) console.error('خطا در دانلود:', err);
            setTimeout(() => fs.unlinkSync(filepath), 60000);
        });
    } catch (error) {
        console.error('خطا در خروجی جامع:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// CLEANUP OLD LOGS (پاکسازی لاگ‌های قدیمی)
// ==========================================

export async function cleanupOldLogs(req, res) {
    try {
        // حذف لاگ‌های AI قدیمی (بیشتر از 30 روز)
        const aiDeleted = await execute(`
            DELETE FROM ai_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        
        // حذف لاگ‌های ادمین قدیمی (بیشتر از 90 روز)
        const adminDeleted = await execute(`
            DELETE FROM admin_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
        `);
        
        await logAdminAction(
            req.user.id,
            'cleanup_logs',
            'system',
            null,
            { ai_deleted: aiDeleted.affectedRows, admin_deleted: adminDeleted.affectedRows },
            req.ip
        );
        
        res.json({
            success: true,
            message: 'لاگ‌های قدیمی با موفقیت پاکسازی شدند',
            deleted: {
                ai_logs: aiDeleted.affectedRows,
                admin_logs: adminDeleted.affectedRows
            }
        });
    } catch (error) {
        console.error('خطا در پاکسازی لاگ‌ها:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}