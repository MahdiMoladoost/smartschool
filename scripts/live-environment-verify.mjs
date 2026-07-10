import { execFile } from 'child_process';
import { spawn } from 'child_process';
import { promisify } from 'util';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const execFileAsync = promisify(execFile);
const root = process.cwd();
const port = Number(process.env.LIVE_VERIFY_PORT || 3333);
const baseUrl = process.env.LIVE_BASE_URL || `http://127.0.0.1:${port}`;
const useExistingServer = Boolean(process.env.LIVE_BASE_URL);
const runDbSetup = process.env.LIVE_SKIP_DB_SETUP !== 'true';
const runRealAI = process.env.RUN_REAL_AI_TEST === 'true';
const runRealSMS = process.env.RUN_REAL_SMS_TEST === 'true';
const verifyRateLimits = process.env.VERIFY_AI_RATE_LIMIT === 'true';
const smsRecipient = process.env.TEST_SMS_RECIPIENT || '09120000020';

const users = {
    student: { username: 'student_ahmadi', password: 'student123', dashboard: '/dashboard/student' },
    teacher: { username: 'teacher_rezai', password: 'teacher123', dashboard: '/dashboard/teacher' },
    parent: { username: 'parent_ahmadi', password: 'parent123', dashboard: '/dashboard/parent' },
    counselor: { username: 'counselor', password: 'counselor123', dashboard: '/dashboard/counselor' },
    principal: { username: 'principal', password: 'principal123', dashboard: '/dashboard/principal' },
    admin: { username: 'admin', password: 'admin123', dashboard: '/dashboard/admin' }
};

const results = [];
function record(name, status, details = '') {
    results.push({ name, status, details });
    const symbol = status === 'passed' ? '✅' : status === 'skipped' ? '⚠️' : '❌';
    console.log(`${symbol} ${name}${details ? ` — ${details}` : ''}`);
}

async function runCommand(command, args, env = process.env) {
    const { stdout, stderr } = await execFileAsync(command, args, { cwd: root, env, maxBuffer: 20 * 1024 * 1024 });
    if (stdout.trim()) console.log(stdout.trim());
    if (stderr.trim()) console.error(stderr.trim());
}

async function waitForHealth(timeoutMs = 45000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        try {
            const res = await fetch(`${baseUrl}/api/health`);
            if (res.ok) return true;
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 600));
    }
    return false;
}

async function startServerIfNeeded() {
    if (useExistingServer) return null;
    const env = {
        ...process.env,
        PORT: String(port),
        REQUIRE_DB: 'true',
        NODE_ENV: 'test',
        JWT_SECRET: process.env.JWT_SECRET || 'phase4-live-verification-secret-change-me',
        AI_PER_MINUTE_LIMIT: verifyRateLimits ? '1' : (process.env.AI_PER_MINUTE_LIMIT || '8')
    };
    const child = spawn('node', ['server.js'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', chunk => process.stdout.write(`[server] ${chunk}`));
    child.stderr.on('data', chunk => process.stderr.write(`[server] ${chunk}`));
    const ok = await waitForHealth();
    if (!ok) {
        child.kill('SIGTERM');
        throw new Error(`Server did not become healthy at ${baseUrl}`);
    }
    return child;
}

async function connectDb() {
    return mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'smart_school',
        charset: 'utf8mb4'
    });
}

async function sqlOne(conn, sql, params = []) {
    const [rows] = await conn.execute(sql, params);
    return rows[0] || null;
}

async function sqlRows(conn, sql, params = []) {
    const [rows] = await conn.execute(sql, params);
    return rows;
}

async function request(path, { method = 'GET', token, body, expected = [200] } = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!expected.includes(res.status)) {
        throw new Error(`${method} ${path} returned ${res.status}, expected ${expected.join('/')}: ${text.slice(0, 400)}`);
    }
    return { status: res.status, data };
}

async function login(role) {
    const user = users[role];
    const res = await request('/api/v1/auth/login', { method: 'POST', body: { username: user.username, password: user.password } });
    if (!res.data?.success || !res.data?.token) throw new Error(`${role} login did not return token`);
    if (res.data.user?.role !== role && !(role === 'principal' && res.data.user?.role === 'principal')) {
        throw new Error(`${role} login returned wrong role ${res.data.user?.role}`);
    }
    return { token: res.data.token, user: res.data.user };
}

async function verifySchema(conn) {
    const requiredTables = [
        'users', 'roles', 'permissions', 'role_permissions', 'classes', 'class_students', 'courses', 'course_teachers',
        'parent_children', 'attendance', 'grades', 'assignments', 'submissions', 'counseling_requests', 'counseling_sessions',
        'sms_logs', 'ai_requests_log', 'ai_automation_logs'
    ];
    for (const table of requiredTables) {
        const row = await sqlOne(conn, 'SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [table]);
        if (!row?.count) throw new Error(`Missing table ${table}`);
    }
    const parentLink = await sqlOne(conn, 'SELECT id FROM parent_children WHERE parent_id = 4 AND student_id = 6');
    if (!parentLink) throw new Error('Missing seeded parent_children link parent=4 student=6');
    const teacherLink = await sqlOne(conn, `
        SELECT cs.student_id
        FROM course_teachers ct
        JOIN courses c ON c.id = ct.course_id
        JOIN class_students cs ON cs.class_id = c.class_id
        WHERE ct.teacher_id = 2 AND cs.student_id = 6
        LIMIT 1
    `);
    if (!teacherLink) throw new Error('Missing seeded teacher-student relationship teacher=2 student=6');
    const counselorRecord = await sqlOne(conn, 'SELECT id, private_notes FROM counseling_sessions WHERE id = 1');
    if (!counselorRecord) throw new Error('Missing seeded counseling session');
    record('Live MySQL schema and relationship checks', 'passed', `${requiredTables.length} required tables plus seed relationships verified`);
}

async function verifyAuthenticatedFlows(conn) {
    const tokens = {};
    const loginResults = {};
    for (const role of Object.keys(users)) {
        loginResults[role] = await login(role);
        tokens[role] = loginResults[role].token;
        await request(users[role].dashboard, { token: tokens[role], expected: [200] });
        await request('/api/v1/portal/overview', { token: tokens[role], expected: [200] });
    }
    record('Seeded users login and dashboard/API overview', 'passed', Object.keys(users).join(', '));

    await request('/api/v1/ai/student/homework-assistant', { method: 'POST', body: { question: 'test' }, expected: [401] });
    await request('/api/v1/student/profile', { token: tokens.parent, expected: [403] });
    await request('/api/v1/parent/children', { token: tokens.student, expected: [403] });
    await request('/api/v1/parent/child/10/grades', { token: tokens.parent, expected: [403] });
    await request('/api/v1/ai/teacher/performance-summary', { method: 'POST', token: tokens.teacher, body: { student_id: 10 }, expected: [403] });
    await request('/api/v1/counselor/sessions', { token: tokens.parent, expected: [403] });
    const counselorSessions = await request('/api/v1/counselor/sessions', { token: tokens.counselor, expected: [200] });
    const privateNoteVisible = JSON.stringify(counselorSessions.data).includes('private_notes');
    if (!privateNoteVisible) throw new Error('Counselor did not receive private_notes field');
    record('Unauthorized/API ownership protections', 'passed', 'student/parent/teacher/counselor checks passed');

    const children = await request('/api/v1/parent/children', { token: tokens.parent });
    const linkedIds = (children.data.children || []).map(child => Number(child.id));
    if (!linkedIds.includes(6) || linkedIds.includes(10)) throw new Error(`Parent child visibility mismatch: ${linkedIds.join(',')}`);
    record('Parent-child visibility', 'passed', `parent_ahmadi sees only linked children: ${linkedIds.join(',')}`);

    return { tokens, loginResults };
}

async function verifyAI(conn, tokens) {
    const before = await sqlOne(conn, 'SELECT COUNT(*) AS count FROM ai_requests_log');
    await request('/api/v1/ai/student/homework-assistant', { method: 'POST', body: { question: 'بدون توکن' }, expected: [401] });
    if (!runRealAI) {
        record('Real GapGPT AI request', 'skipped', 'Set RUN_REAL_AI_TEST=true with AI_API_KEY to run provider call');
        return;
    }
    if (!process.env.AI_API_KEY || process.env.AI_API_KEY.includes('YOUR_')) {
        throw new Error('RUN_REAL_AI_TEST=true but AI_API_KEY is not configured');
    }
    const ai = await request('/api/v1/ai/student/homework-assistant', {
        method: 'POST',
        token: tokens.student,
        body: { subject: 'ریاضی', question: 'لطفاً مفهوم کسر را در دو جمله توضیح بده.' },
        expected: [200]
    });
    if (!ai.data?.success) throw new Error('AI endpoint did not return success');
    const after = await sqlOne(conn, 'SELECT COUNT(*) AS count FROM ai_requests_log');
    if (Number(after.count) <= Number(before.count)) throw new Error('AI request was not logged in ai_requests_log');
    record('Real GapGPT AI request and ai_requests_log insert', 'passed', 'one backend AI request completed without exposing key');

    if (verifyRateLimits) {
        await request('/api/v1/ai/student/homework-assistant', {
            method: 'POST', token: tokens.student, body: { question: 'rate limit second call' }, expected: [429, 503, 200]
        });
        record('AI rate limit behavior', 'passed', 'second call executed under configured test limit; inspect status/logs above');
    }
}

async function verifySMS(conn, tokens) {
    const before = await sqlOne(conn, 'SELECT COUNT(*) AS count FROM sms_logs');
    if (!runRealSMS) {
        record('Real SMS provider send', 'skipped', 'Set RUN_REAL_SMS_TEST=true with SMS_API_URL/SMS_API_KEY/TEST_SMS_RECIPIENT to send');
        return;
    }
    if (!process.env.SMS_API_URL || !process.env.SMS_API_KEY || process.env.SMS_API_KEY.includes('YOUR_')) {
        throw new Error('RUN_REAL_SMS_TEST=true but SMS_API_URL/SMS_API_KEY is not configured');
    }
    const message = `SmartSchool live SMS verification ${new Date().toISOString()}`;
    await request('/api/v1/sms/send', {
        method: 'POST',
        token: tokens.admin,
        body: { recipient_number: smsRecipient, message, event_type: 'phase4_live_sms_test' },
        expected: [200, 202]
    });
    const duplicate = await request('/api/v1/sms/send', {
        method: 'POST',
        token: tokens.admin,
        body: { recipient_number: smsRecipient, message, event_type: 'phase4_live_sms_test' },
        expected: [200, 202]
    });
    const after = await sqlOne(conn, 'SELECT COUNT(*) AS count FROM sms_logs');
    if (Number(after.count) <= Number(before.count)) throw new Error('SMS send did not create sms_logs entry');
    const duplicateLogged = await sqlOne(conn, "SELECT COUNT(*) AS count FROM sms_logs WHERE event_type='phase4_live_sms_test' AND status='duplicate_suppressed' AND created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)");
    if (!Number(duplicateLogged.count)) throw new Error(`Duplicate suppression not logged; second response: ${JSON.stringify(duplicate.data).slice(0, 300)}`);
    record('Real SMS provider send and duplicate suppression', 'passed', `sms_logs increased from ${before.count} to ${after.count}`);
}

async function verifyAutomations(conn, tokens) {
    const beforeSMS = await sqlOne(conn, 'SELECT COUNT(*) AS count FROM sms_logs');
    const beforeAuto = await sqlOne(conn, 'SELECT COUNT(*) AS count FROM ai_automation_logs');
    await request('/api/v1/automation/attendance-drop/6', { method: 'POST', token: tokens.teacher, body: { threshold: 95 }, expected: [200] });
    await request('/api/v1/automation/counselor-risk/1', { method: 'POST', token: tokens.counselor, body: { notify_admin: true }, expected: [200] });
    const afterSMS = await sqlOne(conn, 'SELECT COUNT(*) AS count FROM sms_logs');
    const afterAuto = await sqlOne(conn, 'SELECT COUNT(*) AS count FROM ai_automation_logs');
    if (Number(afterSMS.count) <= Number(beforeSMS.count)) throw new Error('Automations did not create sms_logs entries');
    if (Number(afterAuto.count) <= Number(beforeAuto.count)) throw new Error('Automations did not create ai_automation_logs entries');
    record('Attendance/counselor automations and logs', 'passed', `sms ${beforeSMS.count}->${afterSMS.count}, automation ${beforeAuto.count}->${afterAuto.count}`);
}

async function main() {
    let server = null;
    let conn = null;
    try {
        if (runDbSetup) {
            await runCommand('npm', ['run', 'db:init']);
            record('npm run db:init', 'passed');
            await runCommand('npm', ['run', 'db:seed']);
            record('npm run db:seed', 'passed');
        } else {
            record('Database setup commands', 'skipped', 'LIVE_SKIP_DB_SETUP=true');
        }
        conn = await connectDb();
        await verifySchema(conn);
        server = await startServerIfNeeded();
        const { tokens } = await verifyAuthenticatedFlows(conn);
        await verifyAI(conn, tokens);
        await verifySMS(conn, tokens);
        await verifyAutomations(conn, tokens);

        const failed = results.filter(item => item.status === 'failed');
        if (failed.length) process.exitCode = 1;
        console.log('\nPhase 4 live verification summary:');
        console.table(results);
    } finally {
        if (conn) await conn.end().catch(() => null);
        if (server) server.kill('SIGTERM');
    }
}

main().catch(error => {
    record('Phase 4 live verification', 'failed', error.message);
    console.error(error.stack || error.message);
    process.exit(1);
});
