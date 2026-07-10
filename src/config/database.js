import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { runFullSchemaMigration, runCompatibilityMigrations } from '../data/schemaRunner.js';

dotenv.config();

let pool = null;
const ROLE_VALUES = ['super_admin', 'admin', 'principal', 'executive_deputy', 'cultural_deputy', 'counselor', 'teacher', 'student', 'parent'];
const ROLE_ENUM_SQL = ROLE_VALUES.map(role => `'${role}'`).join(', ');

export async function connectDB() {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'smart_school',
            waitForConnections: true,
            connectionLimit: 15,
            queueLimit: 0,
            enableKeepAlive: true
        });
        
        try {
            const testConn = await pool.getConnection();
            console.log('✅ MySQL connected successfully');
            testConn.release();
        } catch (err) {
            console.error('❌ MySQL connection failed:', err.message);
            throw err;
        }
    }
    return pool;
}

export async function query(sql, params = []) {
    const conn = await connectDB();
    const [rows] = await conn.execute(sql, params);
    return rows;
}

export async function queryOne(sql, params = []) {
    const rows = await query(sql, params);
    return rows[0] || null;
}

export async function execute(sql, params = []) {
    const conn = await connectDB();
    const [result] = await conn.execute(sql, params);
    return result;
}

export async function createTables() {
    const conn = await connectDB();
    await runFullSchemaMigration(conn);
    await runCompatibilityMigrations(conn);
    console.log('✅ Full MySQL schema migration completed');
}

export async function seedInitialData() {
    const conn = await connectDB();
    const [existing] = await conn.execute('SELECT COUNT(*) as count FROM users');

    if (existing[0].count > 0) {
        console.log('✅ Database already has users; seed skipped');
        return;
    }

    console.log('📝 Seeding minimal initial data...');
    const hashPassword = (pass) => bcrypt.hashSync(pass, 10);

    await conn.execute(`
        INSERT IGNORE INTO roles (name, display_name, description) VALUES
        ('super_admin', 'مدیر کل سیستم', 'دسترسی کامل و قابل ممیزی به کل سامانه'),
        ('admin', 'مدیر سامانه', 'مدیریت عملیاتی سامانه'),
        ('principal', 'مدیر مدرسه', 'داشبورد مدیریتی و شاخص‌های مدرسه'),
        ('executive_deputy', 'معاون اجرایی', 'امور اجرایی، ثبت‌نام، کلاس‌ها و حضور و غیاب'),
        ('cultural_deputy', 'معاون پرورشی و فرهنگی', 'برنامه‌های فرهنگی، انضباطی و فعالیت‌ها'),
        ('counselor', 'مشاور', 'درخواست‌ها و جلسات مشاوره با سطح محرمانگی'),
        ('teacher', 'معلم', 'کلاس‌ها، تکالیف، نمرات و حضور و غیاب'),
        ('student', 'دانش‌آموز', 'برنامه، تکالیف، نمرات و منابع آموزشی'),
        ('parent', 'والد / سرپرست', 'پیگیری فرزند، پیام‌ها، نمرات و حضور و غیاب')
    `);

    const adminPassword = hashPassword('admin123');
    const teacherPassword = hashPassword('teacher123');
    const parentPassword = hashPassword('parent123');
    const studentPassword = hashPassword('student123');

    await conn.execute(`
        INSERT INTO users (username, password, name, role, phone, email, status) VALUES
        ('admin', ?, 'مدیر سیستم', 'admin', '09120000001', 'admin@school.local', 'active'),
        ('teacher_rezai', ?, 'رضا رضایی', 'teacher', '09120000002', 'rezai@school.local', 'active'),
        ('parent_ahmadi', ?, 'خانواده احمدی', 'parent', '09120000005', 'parent_ahmadi@school.local', 'active'),
        ('student_ahmadi', ?, 'علی احمدی', 'student', '09120000010', 'ahmadi@student.school.local', 'active')
    `, [adminPassword, teacherPassword, parentPassword, studentPassword]);

    await conn.execute(`
        INSERT INTO classes (name, grade, capacity, status) VALUES
        ('7/1', 7, 30, 'active'),
        ('8/1', 8, 30, 'active')
    `);

    await conn.execute(`
        UPDATE users SET class_id = 1 WHERE username = 'student_ahmadi'
    `);

    await conn.execute(`
        INSERT INTO class_students (class_id, student_id)
        SELECT 1, id FROM users WHERE username = 'student_ahmadi'
    `);

    await conn.execute(`
        INSERT INTO parent_children (parent_id, student_id, relation, is_primary)
        SELECT p.id, s.id, 'father', TRUE
        FROM users p JOIN users s
        WHERE p.username = 'parent_ahmadi' AND s.username = 'student_ahmadi'
    `);

    await conn.execute(`
        INSERT INTO courses (name, code, credits) VALUES
        ('ریاضی هفتم', 'MATH701', 4),
        ('علوم هفتم', 'SCI701', 3)
    `);

    await conn.execute(`
        INSERT INTO course_teachers (course_id, teacher_id, role)
        SELECT c.id, u.id, 'main'
        FROM courses c JOIN users u
        WHERE u.username = 'teacher_rezai'
    `);

    await conn.execute(`
        INSERT INTO enrollments (student_id, course_id, class_id, status)
        SELECT s.id, c.id, 1, 'active'
        FROM users s CROSS JOIN courses c
        WHERE s.username = 'student_ahmadi'
    `);

    await conn.execute(`
        INSERT INTO announcements (title, content, target_role, priority, is_active, created_by) VALUES
        ('شروع سال تحصیلی جدید', 'سال تحصیلی جدید با برنامه کامل آموزشی و فرهنگی آغاز می‌شود.', 'all', 'high', 1, 1)
    `);

    await conn.execute(`
        INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
        ('school_name', 'مدرسه هوشمند', 'string', 'نام مدرسه'),
        ('ai_enabled', 'true', 'boolean', 'فعال بودن قابلیت‌های هوش مصنوعی'),
        ('sms_enabled', 'true', 'boolean', 'فعال بودن اعلان‌های پیامکی')
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `);

    console.log('✅ Minimal initial data seeded successfully');
}

export default {
    connectDB,
    createTables,
    seedInitialData,
    query,
    queryOne,
    execute
};