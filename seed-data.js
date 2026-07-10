// ============================================
// MYSQL SEED DATA SCRIPT - SMART SCHOOL MANAGEMENT
// ============================================

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { runFullSchemaMigration, runCompatibilityMigrations } from './src/data/schemaRunner.js';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'smart_school';
const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4'
};

const hashPassword = password => bcrypt.hashSync(password, 10);
const ROLE_VALUES = ['super_admin', 'admin', 'principal', 'executive_deputy', 'cultural_deputy', 'counselor', 'teacher', 'student', 'parent'];
const ROLE_ENUM_SQL = ROLE_VALUES.map(role => `'${role}'`).join(', ');

async function ensureColumn(conn, tableName, columnName, columnDefinition) {
    const [rows] = await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
    `, [tableName, columnName]);
    if (!rows.length) {
        await conn.execute(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDefinition}`);
    }
}

async function connect() {
    const bootstrap = await mysql.createConnection(DB_CONFIG);
    await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci`);
    await bootstrap.end();
    return mysql.createConnection({ ...DB_CONFIG, database: DB_NAME });
}

async function createTables(conn) {
    console.log('📋 اجرای migration کامل و هماهنگ با runtime schema...');
    await runFullSchemaMigration(conn);
    await runCompatibilityMigrations(conn);
}

async function seed(conn) {
    console.log('🌱 درج داده‌های تست...');
    const passwords = {
        super_admin: hashPassword('superadmin123'),
        admin: hashPassword('admin123'),
        principal: hashPassword('principal123'),
        executive_deputy: hashPassword('deputy123'),
        cultural_deputy: hashPassword('cultural123'),
        counselor: hashPassword('counselor123'),
        teacher: hashPassword('teacher123'),
        student: hashPassword('student123'),
        parent: hashPassword('parent123')
    };

    const users = [
        [1, 'admin', passwords.admin, 'مدیر سیستم', 'admin', '09120000001', 'admin@school.local', null, null, 'active'],
        [2, 'teacher_rezai', passwords.teacher, 'رضا رضایی', 'teacher', '09120000002', 'rezai@school.local', null, null, 'active'],
        [3, 'teacher_karimi', passwords.teacher, 'سارا کریمی', 'teacher', '09120000003', 'karimi@school.local', null, null, 'active'],
        [4, 'parent_ahmadi', passwords.parent, 'خانواده احمدی', 'parent', '09120000020', 'parent_ahmadi@school.local', null, null, 'active'],
        [5, 'parent_mohammadi', passwords.parent, 'خانواده محمدی', 'parent', '09120000021', 'parent_mohammadi@school.local', null, null, 'active'],
        [6, 'student_ahmadi', passwords.student, 'علی احمدی', 'student', '09120000010', 'ahmadi@school.local', 1, '0012345601', 'active'],
        [7, 'student_mohammadi', passwords.student, 'سارا محمدی', 'student', '09120000011', 'mohammadi@school.local', 1, '0012345602', 'active'],
        [8, 'student_hosseini', passwords.student, 'رضا حسینی', 'student', '09120000012', 'hosseini@school.local', 2, '0012345603', 'active'],
        [9, 'student_karimi', passwords.student, 'مریم کریمی', 'student', '09120000013', 'karimi.student@school.local', 2, '0012345604', 'active'],
        [10, 'student_rezaei', passwords.student, 'امیر رضایی', 'student', '09120000014', 'rezaei@school.local', 3, '0012345605', 'active'],
        [11, 'super_admin', passwords.super_admin, 'راهبر ارشد سامانه', 'super_admin', '09120000030', 'superadmin@school.local', null, null, 'active'],
        [12, 'principal', passwords.principal, 'مدیر مدرسه', 'principal', '09120000031', 'principal@school.local', null, null, 'active'],
        [13, 'executive_deputy', passwords.executive_deputy, 'معاون اجرایی', 'executive_deputy', '09120000032', 'executive@school.local', null, null, 'active'],
        [14, 'cultural_deputy', passwords.cultural_deputy, 'معاون پرورشی و فرهنگی', 'cultural_deputy', '09120000033', 'cultural@school.local', null, null, 'active'],
        [15, 'counselor', passwords.counselor, 'مشاور مدرسه', 'counselor', '09120000034', 'counselor@school.local', null, null, 'active']
    ];

    for (const user of users) {
        await conn.execute(`
            INSERT INTO users (id, username, password, name, role, phone, email, class_id, national_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role), phone=VALUES(phone), email=VALUES(email), class_id=VALUES(class_id), national_id=VALUES(national_id), status=VALUES(status)
        `, user);
    }

    const roleRows = [
        ['super_admin', 'راهبر ارشد', 'دسترسی کامل فنی و امنیتی'],
        ['admin', 'ادمین سامانه', 'مدیریت عملیاتی سامانه'],
        ['principal', 'مدیر مدرسه', 'نظارت کلان و KPIها'],
        ['executive_deputy', 'معاون اجرایی', 'امور اجرایی، ثبت‌نام، کلاس و حضور'],
        ['cultural_deputy', 'معاون پرورشی و فرهنگی', 'رویدادها، فعالیت‌ها و سوابق فرهنگی'],
        ['counselor', 'مشاور', 'درخواست‌ها و جلسات مشاوره محرمانه'],
        ['teacher', 'معلم', 'کلاس، نمره، حضور و تکلیف'],
        ['student', 'دانش‌آموز', 'داده‌های شخصی آموزشی'],
        ['parent', 'ولی/سرپرست', 'مشاهده فرزندان متصل']
    ];
    for (const role of roleRows) {
        await conn.execute('INSERT INTO roles (name, title, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description)', role);
    }

    const permissions = [
        ['view_school_kpis', 'مشاهده شاخص‌های کلان مدرسه'],
        ['manage_users', 'مدیریت کاربران'],
        ['manage_classes', 'مدیریت کلاس‌ها'],
        ['manage_attendance', 'مدیریت حضور و غیاب'],
        ['manage_grades', 'مدیریت نمرات'],
        ['manage_counseling', 'مدیریت مشاوره محرمانه'],
        ['manage_cultural_events', 'مدیریت رویدادهای فرهنگی'],
        ['use_ai', 'استفاده از قابلیت‌های هوش مصنوعی'],
        ['send_sms', 'ارسال پیامک‌های سامانه']
    ];
    for (const permission of permissions) {
        await conn.execute('INSERT INTO permissions (name, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE description=VALUES(description)', permission);
    }

    const rolePermissionMap = {
        super_admin: permissions.map(p => p[0]),
        admin: ['view_school_kpis', 'manage_users', 'manage_classes', 'manage_attendance', 'manage_grades', 'use_ai', 'send_sms'],
        principal: ['view_school_kpis', 'manage_classes', 'manage_attendance', 'manage_grades', 'manage_counseling', 'manage_cultural_events', 'use_ai', 'send_sms'],
        executive_deputy: ['manage_classes', 'manage_attendance', 'send_sms', 'use_ai'],
        cultural_deputy: ['manage_cultural_events', 'send_sms', 'use_ai'],
        counselor: ['manage_counseling', 'send_sms', 'use_ai'],
        teacher: ['manage_attendance', 'manage_grades', 'use_ai'],
        student: ['use_ai'],
        parent: ['use_ai']
    };
    for (const [roleName, permissionNames] of Object.entries(rolePermissionMap)) {
        for (const permissionName of permissionNames) {
            await conn.execute(`
                INSERT IGNORE INTO role_permissions (role_id, permission_id)
                SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name = ? WHERE r.name = ?
            `, [permissionName, roleName]);
        }
    }

    for (const [parentId, studentId, relation, isPrimary] of [[4, 6, 'father', 1], [4, 7, 'father', 0], [5, 8, 'mother', 1], [5, 9, 'mother', 0], [5, 10, 'guardian', 0]]) {
        await conn.execute('INSERT IGNORE INTO parent_children (parent_id, student_id, relation, is_primary) VALUES (?, ?, ?, ?)', [parentId, studentId, relation, isPrimary]);
    }

    const classes = [[1, '7/1', 7, 30], [2, '8/1', 8, 30], [3, '9/1', 9, 30]];
    for (const cls of classes) {
        await conn.execute(`
            INSERT INTO classes (id, name, grade, capacity, status) VALUES (?, ?, ?, ?, 'active')
            ON DUPLICATE KEY UPDATE name=VALUES(name), grade=VALUES(grade), capacity=VALUES(capacity), status='active'
        `, cls);
    }

    for (const [classId, studentId] of [[1, 6], [1, 7], [2, 8], [2, 9], [3, 10]]) {
        await conn.execute('INSERT IGNORE INTO class_students (class_id, student_id, status) VALUES (?, ?, "active")', [classId, studentId]);
    }

    const courses = [
        [1, 'ریاضی هفتم', 'MATH701', 4, 1, 'شنبه 08:00-10:00'],
        [2, 'علوم هفتم', 'SCI701', 3, 1, 'یکشنبه 10:00-12:00'],
        [3, 'فارسی هشتم', 'PER801', 3, 2, 'دوشنبه 08:00-10:00'],
        [4, 'ریاضی هشتم', 'MATH801', 4, 2, 'سه‌شنبه 10:00-12:00'],
        [5, 'علوم نهم', 'SCI901', 3, 3, 'چهارشنبه 08:00-10:00']
    ];
    for (const course of courses) {
        await conn.execute(`
            INSERT INTO courses (id, name, code, credits, class_id, schedule, status) VALUES (?, ?, ?, ?, ?, ?, 'active')
            ON DUPLICATE KEY UPDATE name=VALUES(name), credits=VALUES(credits), class_id=VALUES(class_id), schedule=VALUES(schedule), status='active'
        `, course);
    }
    for (const [courseId, teacherId] of [[1, 2], [2, 2], [3, 3], [4, 2], [5, 3]]) {
        await conn.execute('INSERT IGNORE INTO course_teachers (course_id, teacher_id, role) VALUES (?, ?, "main")', [courseId, teacherId]);
    }

    const grades = [[6, 1, 18, 17, 19], [6, 2, 16, 18, 17], [7, 1, 15, 16, 18], [8, 3, 19, 18, 20], [9, 4, 14, 15, 16], [10, 5, 17, 18, 18]];
    for (const [studentId, courseId, quiz, midterm, finalExam] of grades) {
        const average = Number(((quiz + midterm + finalExam) / 3).toFixed(1));
        const letter = average >= 18 ? 'A+' : average >= 16 ? 'A' : average >= 14 ? 'B' : 'C';
        await conn.execute(`
            INSERT INTO grades (student_id, course_id, quiz, midterm, final_exam, average, letter_grade, term, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'ترم اول', 2)
            ON DUPLICATE KEY UPDATE quiz=VALUES(quiz), midterm=VALUES(midterm), final_exam=VALUES(final_exam), average=VALUES(average), letter_grade=VALUES(letter_grade)
        `, [studentId, courseId, quiz, midterm, finalExam, average, letter]);
    }

    const today = new Date();
    for (let offset = 0; offset < 7; offset++) {
        const date = new Date(today);
        date.setDate(today.getDate() - offset);
        const dateStr = date.toISOString().slice(0, 10);
        for (const [studentId, classId] of [[6, 1], [7, 1], [8, 2], [9, 2], [10, 3]]) {
            const status = offset === 2 && studentId === 9 ? 'absent' : offset === 3 && studentId === 8 ? 'late' : 'present';
            await conn.execute(`
                INSERT INTO attendance (student_id, class_id, date, status, recorded_by)
                VALUES (?, ?, ?, ?, 2)
                ON DUPLICATE KEY UPDATE status=VALUES(status), recorded_by=VALUES(recorded_by)
            `, [studentId, classId, dateStr, status]);
        }
    }

    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 19).replace('T', ' ');
    await conn.execute(`
        INSERT INTO assignments (id, course_id, title, description, deadline, total_points, created_by)
        VALUES (1, 1, 'تمرین فصل اول ریاضی', 'سوال‌های ۱ تا ۱۰ صفحه ۱۲', ?, 20, 2)
        ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), deadline=VALUES(deadline)
    `, [nextWeek]);

    await conn.execute(`
        INSERT INTO exams (id, course_id, title, description, duration, start_time, total_points, is_published, created_by)
        VALUES (1, 1, 'آزمون کوتاه ریاضی', 'آزمون نمونه برای تست پنل', 45, ?, 20, 1, 2)
        ON DUPLICATE KEY UPDATE title=VALUES(title), start_time=VALUES(start_time), is_published=1
    `, [nextWeek]);

    await conn.execute(`
        INSERT INTO announcements (id, title, content, target_role, priority, is_active, created_by)
        VALUES
            (1, 'شروع سال تحصیلی', 'سال تحصیلی جدید با برنامه منظم آغاز شد.', 'all', 'high', 1, 1),
            (2, 'جلسه اولیا و مربیان', 'جلسه اولیا و مربیان هفته آینده برگزار می‌شود.', 'parent', 'normal', 1, 1)
        ON DUPLICATE KEY UPDATE title=VALUES(title), content=VALUES(content), target_role=VALUES(target_role), priority=VALUES(priority), is_active=VALUES(is_active)
    `);

    await conn.execute(`
        INSERT INTO homepage_news (id, title, summary, category, event_date, image_url, link_url, is_featured, is_active, sort_order, created_by)
        VALUES
            (1, 'آغاز ثبت‌نام دوره تابستانی رباتیک', 'دوره‌های تخصصی رباتیک برای دانش‌آموزان علاقه‌مند در تابستان امسال برگزار می‌شود.', 'news', '2026-06-10', '/assets/images/gallery/robotic.webp', '#news-events', 1, 1, 1, 1),
            (2, 'کسب مقام برتر در مسابقات برنامه‌نویسی', 'تیم دانش‌آموزی ما در مسابقات کشوری برنامه‌نویسی موفق به کسب مقام اول شد.', 'success', '2026-05-28', '/assets/images/gallery/tajhizat.webp', '#news-events', 0, 1, 2, 1),
            (3, 'اطلاعیه جلسه اولیا و مربیان', 'جلسه اولیا و مربیان در روز سه‌شنبه ساعت ۱۷ برگزار خواهد شد.', 'notice', '2026-05-16', '/assets/images/gallery/consultation.png', '#news-events', 0, 1, 3, 1),
            (4, 'کارگاه آموزشی هوش مصنوعی', 'یک روز کارگاه عملی و پروژه‌محور برای دانش‌آموزان علاقه‌مند.', 'event', '2026-05-18', '/assets/images/gallery/about_2.png', '#news-events', 0, 1, 4, 1),
            (5, 'نمایشگاه هنر و خلاقیت دانش‌آموزان', 'نمایش آثار هنری و پروژه‌های خلاقانه دانش‌آموزان در تالار مدرسه.', 'event', '2026-05-25', '/assets/images/gallery/artist.webp', '#news-events', 0, 1, 5, 1),
            (6, 'برگزاری جشنواره دستاوردهای دانش‌آموزی', 'جشنواره سالانه معرفی پروژه‌ها و دستاوردهای برتر دانش‌آموزان.', 'event', '2026-05-22', '/assets/images/hero/intl-contests.webp', '#news-events', 0, 1, 6, 1)
        ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary), category=VALUES(category), event_date=VALUES(event_date), image_url=VALUES(image_url), is_featured=VALUES(is_featured), is_active=VALUES(is_active), sort_order=VALUES(sort_order)
    `);

    await conn.execute(`
        INSERT INTO homepage_gallery_items (id, title, subtitle, category, image_url, alt_text, icon, is_active, sort_order, created_by)
        VALUES
            (1, 'کلاس هوشمند', 'آموزشی', 'educational', '/assets/images/gallery/class.png', 'کلاس هوشمند', 'fa-users', 1, 1, 1),
            (2, 'برنامه‌نویسی', 'فناوری', 'technology', '/assets/images/gallery/technolocy.jpg', 'برنامه‌نویسی', 'fa-code', 1, 2, 1),
            (3, 'رباتیک', 'فناوری', 'technology', '/assets/images/gallery/robotic.webp', 'رباتیک', 'fa-robot', 1, 3, 1),
            (4, 'قرآنی', 'آموزش قرآن', 'quran', '/assets/images/gallery/ghoran.webp', 'قرآنی', 'fa-book-open', 1, 4, 1),
            (5, 'هنری', 'خلاقیت', 'art', '/assets/images/gallery/artist.webp', 'هنری', 'fa-palette', 1, 5, 1),
            (6, 'ورزشی', 'افتخارآفرینی', 'sports', '/assets/images/gallery/tajhizat.webp', 'ورزشی', 'fa-futbol', 1, 6, 1),
            (7, 'مشاوره', 'همراهی دانش‌آموز', 'educational', '/assets/images/gallery/consultation.png', 'مشاوره', 'fa-comments', 1, 7, 1),
            (8, 'آزمایشگاه', 'پژوهش', 'technology', '/assets/images/gallery/about_1.png', 'آزمایشگاه', 'fa-flask', 1, 8, 1),
            (9, 'آموزش گروهی', 'کلاس پویا', 'educational', '/assets/images/gallery/about.png', 'آموزش گروهی', 'fa-chalkboard-user', 1, 9, 1)
        ON DUPLICATE KEY UPDATE title=VALUES(title), subtitle=VALUES(subtitle), category=VALUES(category), image_url=VALUES(image_url), alt_text=VALUES(alt_text), icon=VALUES(icon), is_active=VALUES(is_active), sort_order=VALUES(sort_order)
    `);

    await conn.execute(`
        INSERT INTO school_events (id, title, description, event_type, event_date, location, organizer_id, visibility, status)
        VALUES
            (1, 'جشنواره علمی و فرهنگی', 'رویداد مشترک پژوهشی و فرهنگی دانش‌آموزان.', 'cultural', '2026-07-10 09:00:00', 'سالن اجتماعات', 14, 'school', 'published'),
            (2, 'جلسه هماهنگی اولیا', 'جلسه فصلی برای بررسی روند آموزشی و تربیتی.', 'meeting', '2026-07-17 17:00:00', 'سالن اجتماعات', 13, 'school', 'published')
        ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), event_date=VALUES(event_date), status=VALUES(status)
    `);

    await conn.execute(`
        INSERT INTO student_activity_records (id, student_id, event_id, activity_type, title, description, points, recorded_by)
        VALUES
            (1, 6, 1, 'recognition', 'تقدیر از پیشرفت درسی', 'بهبود مستمر در درس ریاضی و مشارکت گروهی.', 10, 14),
            (2, 8, 1, 'participation', 'شرکت در جشنواره علمی', 'ارائه پروژه کوتاه علمی در جشنواره.', 8, 14)
        ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), points=VALUES(points)
    `);

    await conn.execute(`
        INSERT INTO counseling_requests (id, student_id, requested_by, assigned_counselor_id, category, priority, summary, status, appointment_at)
        VALUES
            (1, 9, 4, 15, 'academic', 'normal', 'درخواست بررسی افت تمرکز و برنامه‌ریزی مطالعه.', 'scheduled', '2026-07-02 10:30:00')
        ON DUPLICATE KEY UPDATE summary=VALUES(summary), status=VALUES(status), appointment_at=VALUES(appointment_at)
    `);

    await conn.execute(`
        INSERT INTO counseling_sessions (id, request_id, student_id, counselor_id, session_at, public_summary, private_notes, risk_level, follow_up_at)
        VALUES
            (1, 1, 9, 15, '2026-07-02 10:30:00', 'برنامه پیگیری مطالعه و ارتباط با معلم تدوین شد.', 'یادداشت محرمانه نمونه برای تست سطح دسترسی.', 'low', '2026-07-09 10:30:00')
        ON DUPLICATE KEY UPDATE public_summary=VALUES(public_summary), private_notes=VALUES(private_notes), risk_level=VALUES(risk_level), follow_up_at=VALUES(follow_up_at)
    `);

    const settings = [
        ['school_name', 'مدرسه هوشمند فرزانگان', 'string', 'نام مدرسه'],
        ['school_year', '1404-1405', 'string', 'سال تحصیلی جاری'],
        ['school_phone', '021-44706644', 'string', 'شماره تماس مدرسه'],
        ['school_address', 'تهران، خیابان اصلی، پلاک ۱۲۳', 'string', 'آدرس مدرسه'],
        ['ai_enabled', process.env.AI_API_KEY ? 'true' : 'false', 'boolean', 'فعال/غیرفعال کردن هوش مصنوعی'],
        ['ai_api_base_url', process.env.AI_API_BASE_URL || 'https://api.gapgpt.app/v1', 'string', 'آدرس پایه GapGPT'],
        ['ai_default_model', process.env.AI_DEFAULT_MODEL || 'gpt-4o', 'string', 'مدل پیش‌فرض هوش مصنوعی'],
        ['sms_sender_number', process.env.SMS_SENDER_NUMBER || '9982002811', 'string', 'شماره فرستنده پیامک']
    ];
    for (const item of settings) {
        await conn.execute(`
            INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value), setting_type=VALUES(setting_type), description=VALUES(description)
        `, item);
    }
}

async function showSummary(conn) {
    const [users] = await conn.query('SELECT role, COUNT(*) AS count FROM users GROUP BY role ORDER BY role');
    const [[classes]] = await conn.query('SELECT COUNT(*) AS count FROM classes');
    const [[courses]] = await conn.query('SELECT COUNT(*) AS count FROM courses');

    console.log('\n📊 خلاصه:');
    users.forEach(row => console.log(`   - ${row.role}: ${row.count}`));
    console.log(`   - کلاس‌ها: ${classes.count}`);
    console.log(`   - دروس: ${courses.count}`);
    console.log('\n🔑 اطلاعات ورود تست:');
    console.log('   مدیر: admin / admin123');
    console.log('   معلم: teacher_rezai / teacher123');
    console.log('   دانش‌آموز: student_ahmadi / student123');
    console.log('   والدین: parent_ahmadi / parent123');
}

async function main() {
    let conn;
    try {
        conn = await connect();
        await createTables(conn);
        await seed(conn);
        await showSummary(conn);
        console.log('\n✅ Seed دیتابیس MySQL با موفقیت انجام شد.');
    } catch (error) {
        console.error('\n❌ خطا در seed دیتابیس:', error.message);
        process.exitCode = 1;
    } finally {
        if (conn) await conn.end();
    }
}

main();
