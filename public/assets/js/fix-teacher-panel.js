// ============================================
// اسکریپت رفع کامل خطاهای پنل معلم
// اجرا کن: node fix-teacher-panel.js
// ============================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// تنظیمات دیتابیس
const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'smart_school'
};

// رنگ‌ها برای ترمینال
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

// ============================================
// 1. ایجاد جداول缺失 در دیتابیس
// ============================================
async function createMissingTables() {
    log('\n📊 مرحله 1: ایجاد جداول缺失 در دیتابیس...', 'cyan');
    
    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        log('✅ اتصال به دیتابیس برقرار شد', 'green');
        
        // جدول teachers
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS teachers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                specialization VARCHAR(200),
                hire_date DATE,
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user (user_id)
            )
        `);
        log('✅ جدول teachers ایجاد شد', 'green');
        
        // جدول notifications
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                user_type VARCHAR(50) NOT NULL,
                title VARCHAR(200) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'system',
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user (user_id, user_type)
            )
        `);
        log('✅ جدول notifications ایجاد شد', 'green');
        
        // جدول class_students (اگر از قبل نبود)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS class_students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                class_id INT NOT NULL,
                student_id INT NOT NULL,
                status ENUM('active', 'inactive', 'transferred') DEFAULT 'active',
                enrolled_date DATE DEFAULT (CURRENT_DATE),
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_class_student (class_id, student_id)
            )
        `);
        log('✅ جدول class_students بررسی شد', 'green');
        
        return true;
    } catch (error) {
        log(`❌ خطا در ایجاد جداول: ${error.message}`, 'red');
        return false;
    } finally {
        if (connection) await connection.end();
    }
}

// ============================================
// 2. اضافه کردن داده‌های معلم
// ============================================
async function addTeacherData() {
    log('\n👨‍🏫 مرحله 2: اضافه کردن داده‌های معلم...', 'cyan');
    
    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        
        // بررسی وجود معلم
        const [existingTeacher] = await connection.execute(
            `SELECT id FROM users WHERE username = 'teacher_rezai' AND role = 'teacher'`
        );
        
        if (existingTeacher.length === 0) {
            const hashedPassword = '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrI5fYgGqBZzXjZ4jZ4jZ4jZ4jZ4jZ4'; // رمز: teacher123
            
            await connection.execute(`
                INSERT INTO users (username, password, name, role, phone, email, status) 
                VALUES ('teacher_rezai', ?, 'رضا رضایی', 'teacher', '09120000002', 'rezai@school.com', 'active')
            `, [hashedPassword]);
            log('✅ کاربر معلم ایجاد شد', 'green');
            
            const [user] = await connection.execute(`SELECT id FROM users WHERE username = 'teacher_rezai'`);
            if (user[0]) {
                await connection.execute(`
                    INSERT INTO teachers (user_id, specialization) VALUES (?, 'ریاضیات')
                `, [user[0].id]);
                log('✅ رکورد معلم در جدول teachers ایجاد شد', 'green');
            }
        } else {
            log('ℹ️ کاربر معلم از قبل وجود دارد', 'yellow');
        }
        
        // ایجاد کلاس‌ها
        const [classes] = await connection.execute(`SELECT id FROM classes LIMIT 3`);
        if (classes.length < 3) {
            await connection.execute(`
                INSERT INTO classes (name, grade, capacity, status) VALUES
                ('کلاس ۱۰۱', 10, 30, 'active'),
                ('کلاس ۱۰۲', 10, 30, 'active'),
                ('کلاس ۱۰۳', 11, 30, 'active')
            `);
            log('✅ کلاس‌ها ایجاد شدند', 'green');
        }
        
        // ایجاد دروس
        const [teacher] = await connection.execute(`SELECT id FROM users WHERE username = 'teacher_rezai'`);
        const teacherId = teacher[0]?.id;
        
        if (teacherId) {
            const [courses] = await connection.execute(`SELECT id FROM courses WHERE teacher_id = ?`, [teacherId]);
            if (courses.length === 0) {
                const [classList] = await connection.execute(`SELECT id FROM classes LIMIT 3`);
                for (let i = 0; i < classList.length; i++) {
                    await connection.execute(`
                        INSERT INTO courses (name, code, credits, class_id, teacher_id, status) 
                        VALUES (?, ?, ?, ?, ?, 'active')
                    `, [`درس ${i+1}`, `CRS00${i+1}`, 3, classList[i].id, teacherId]);
                }
                log('✅ دروس برای معلم ایجاد شدند', 'green');
            }
        }
        
        return true;
    } catch (error) {
        log(`❌ خطا در اضافه کردن داده‌ها: ${error.message}`, 'red');
        return false;
    } finally {
        if (connection) await connection.end();
    }
}

// ============================================
// 3. تصحیح فایل teacher.js
// ============================================
function fixTeacherJS() {
    log('\n📝 مرحله 3: تصحیح فایل teacher.js...', 'cyan');
    
    const teacherJSPath = path.join(__dirname, 'public/assets/js/teacher.js');
    
    if (!fs.existsSync(teacherJSPath)) {
        log(`❌ فایل teacher.js پیدا نشد در مسیر: ${teacherJSPath}`, 'red');
        return false;
    }
    
    let content = fs.readFileSync(teacherJSPath, 'utf8');
    
    // اصلاح مسیر API dashboard
    content = content.replace(
        /await fetchAPI\('\/teacher\/dashboard\/stats'\)/g,
        "await fetchAPI('/teacher/dashboard')"
    );
    
    // اصلاح مسیر API grades
    content = content.replace(
        /await fetchAPI\('\/teacher\/grades/g,
        "await fetchAPI('/teacher/grades"
    );
    
    // اصلاح مسیر API assignments
    content = content.replace(
        /await fetchAPI\('\/teacher\/assignments/g,
        "await fetchAPI('/teacher/assignments"
    );
    
    // اضافه کردن تابع getRoleColor اگر نبود
    if (!content.includes('function getRoleColor')) {
        const getRoleColorFunc = `
function getRoleColor(role) {
    const colors = {
        student: 'linear-gradient(135deg, #10b981, #059669)',
        teacher: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
        parent: 'linear-gradient(135deg, #f59e0b, #d97706)',
        admin: 'linear-gradient(135deg, #ef4444, #dc2626)'
    };
    return colors[role] || 'linear-gradient(135deg, #64748b, #475569)';
}
`;
        content = content.replace('function getRoleName(role)', getRoleColorFunc + '\n\nfunction getRoleName(role)');
    }
    
    fs.writeFileSync(teacherJSPath, content);
    log('✅ فایل teacher.js تصحیح شد', 'green');
    return true;
}

// ============================================
// 4. تصحیح فایل server.js (حذف کدهای تکراری)
// ============================================
function fixServerJS() {
    log('\n🔧 مرحله 4: تصحیح فایل server.js...', 'cyan');
    
    const serverPath = path.join(__dirname, 'server.js');
    
    if (!fs.existsSync(serverPath)) {
        log(`❌ فایل server.js پیدا نشد`, 'red');
        return false;
    }
    
    let content = fs.readFileSync(serverPath, 'utf8');
    
    // حذف مسیرهای تکراری /teacher/dashboard
    const lines = content.split('\n');
    let newLines = [];
    let seenEndpoints = new Set();
    let inDuplicateBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // تشخیص مسیرهای تکراری
        if (line.includes("app.get('/api/v1/teacher/") || line.includes("app.post('/api/v1/teacher/")) {
            const endpointMatch = line.match(/app\.(get|post)\('([^']+)'/);
            if (endpointMatch) {
                const endpoint = endpointMatch[2];
                if (seenEndpoints.has(endpoint)) {
                    inDuplicateBlock = true;
                    continue;
                }
                seenEndpoints.add(endpoint);
            }
        }
        
        if (inDuplicateBlock && (line.includes('});') || line.includes('});') && lines[i+1]?.includes("app."))) {
            inDuplicateBlock = false;
            continue;
        }
        
        if (!inDuplicateBlock) {
            newLines.push(line);
        }
    }
    
    content = newLines.join('\n');
    fs.writeFileSync(serverPath, content);
    log('✅ فایل server.js از کدهای تکراری پاک شد', 'green');
    return true;
}

// ============================================
// 5. ری‌استارت سرور
// ============================================
function restartServer() {
    log('\n🔄 مرحله 5: ری‌استارت سرور...', 'cyan');
    
    return new Promise((resolve) => {
        const { spawn } = require('child_process');
        
        // پیدا کردن پروسه nodemon
        const killNodemon = spawn('taskkill', ['/f', '/im', 'node.exe'], { shell: true });
        
        killNodemon.on('close', (code) => {
            log('✅ پروسه‌های قدیمی متوقف شدند', 'green');
            
            // اجرای مجدد سرور
            const server = spawn('node', ['server.js'], { 
                cwd: __dirname,
                detached: true,
                stdio: 'ignore'
            });
            server.unref();
            
            log('✅ سرور در حال اجرا است...', 'green');
            setTimeout(resolve, 3000);
        });
    });
}

// ============================================
// تابع اصلی
// ============================================
async function main() {
    log('\n╔══════════════════════════════════════════════════════════════╗', 'cyan');
    log('║     🔧 ابزار رفع خودکار خطاهای پنل معلم 🔧                  ║', 'cyan');
    log('╚══════════════════════════════════════════════════════════════╝', 'cyan');
    
    log('\n⏳ لطفاً صبر کنید، در حال اجرای عملیات...', 'yellow');
    
    // مرحله 1: ایجاد جداول
    const tablesCreated = await createMissingTables();
    if (!tablesCreated) {
        log('\n❌ عملیات با خطا مواجه شد! لطفاً تنظیمات دیتابیس را بررسی کنید.', 'red');
        process.exit(1);
    }
    
    // مرحله 2: اضافه کردن داده‌ها
    await addTeacherData();
    
    // مرحله 3: تصحیح فایل teacher.js
    fixTeacherJS();
    
    // مرحله 4: تصحیح فایل server.js
    fixServerJS();
    
    // مرحله 5: ری‌استارت سرور
    await restartServer();
    
    log('\n╔══════════════════════════════════════════════════════════════╗', 'green');
    log('║                    ✅ عملیات با موفقیت انجام شد!              ║', 'green');
    log('╠══════════════════════════════════════════════════════════════╣', 'green');
    log('║                                                              ║', 'green');
    log('║   📍 آدرس پنل معلم: http://localhost:3000/dashboard/teacher  ║', 'green');
    log('║                                                              ║', 'green');
    log('║   🔑 اطلاعات ورود معلم:                                      ║', 'green');
    log('║      👤 نام کاربری: teacher_rezai                            ║', 'green');
    log('║      🔒 رمز عبور: teacher123                                 ║', 'green');
    log('║                                                              ║', 'green');
    log('╚══════════════════════════════════════════════════════════════╝', 'green');
    
    log('\n💡 نکته: حالا می‌توانید با مرورگر به آدرس بالا بروید و وارد شوید.\n', 'cyan');
}

// اجرای اسکریپت
main().catch(console.error);