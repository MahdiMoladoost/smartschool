import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'src/data/migrations/001_full_schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

function parseTables(sql) {
    const tables = new Map();
    const tableRegex = /CREATE TABLE IF NOT EXISTS\s+(\w+)\s*\(([\s\S]*?)\) ENGINE=InnoDB/gi;
    let match;
    while ((match = tableRegex.exec(sql))) {
        const [, tableName, body] = match;
        const columns = new Set();
        const indexes = [];
        const foreignKeys = [];
        for (const rawLine of body.split(/\r?\n/)) {
            const line = rawLine.trim().replace(/,$/, '');
            if (!line) continue;
            const col = line.match(/^`?([a-zA-Z_][a-zA-Z0-9_]*)`?\s+(INT|VARCHAR|TEXT|ENUM|BOOLEAN|DATE|DATETIME|TIMESTAMP|DECIMAL|JSON|TIME|TINYINT|CHAR)\b/i);
            if (col) columns.add(col[1]);
            if (/^(INDEX|UNIQUE KEY|PRIMARY KEY|KEY)\b/i.test(line)) indexes.push(line);
            if (/^FOREIGN KEY\b/i.test(line)) foreignKeys.push(line);
        }
        tables.set(tableName, { columns, indexes, foreignKeys });
    }
    return tables;
}

const tables = parseTables(schema);

const requiredTables = [
    'users', 'roles', 'permissions', 'role_permissions', 'classes', 'class_students', 'courses', 'course_teachers',
    'weekly_schedule_entries', 'attendance', 'attendance_session_records', 'assignments', 'submissions', 'exams',
    'exam_questions', 'exam_results', 'grades', 'announcements', 'announcements_read', 'messages', 'payments',
    'registrations', 'tickets', 'ticket_replies', 'leave_requests', 'meetings', 'settings', 'admin_logs', 'ai_logs',
    'ai_requests_log', 'ai_automation_logs', 'sms_logs', 'parent_children', 'digital_library', 'counseling_requests',
    'counseling_sessions', 'school_events', 'student_activity_records', 'homepage_news', 'homepage_gallery_items', 'backups'
];

const requiredColumns = {
    users: ['id', 'username', 'password', 'name', 'role', 'phone', 'email', 'class_id', 'status', 'created_at'],
    parent_children: ['id', 'parent_id', 'student_id', 'relation', 'is_primary', 'created_at'],
    sms_logs: ['id', 'user_id', 'recipient_number', 'message', 'message_hash', 'status', 'provider_response', 'event_type', 'attempts', 'last_attempt_at', 'created_at'],
    ai_requests_log: ['id', 'user_id', 'role', 'prompt', 'model', 'tokens', 'response_time', 'created_at'],
    ai_automation_logs: ['id', 'user_id', 'automation_type', 'input_summary', 'ai_output', 'action_taken', 'status', 'created_at'],
    counseling_requests: ['id', 'student_id', 'requested_by', 'assigned_counselor_id', 'category', 'priority', 'summary', 'status', 'appointment_at'],
    counseling_sessions: ['id', 'request_id', 'student_id', 'counselor_id', 'session_at', 'public_summary', 'private_notes', 'risk_level', 'follow_up_at'],
    grades: ['id', 'student_id', 'course_id', 'quiz', 'midterm', 'final_exam', 'average', 'term', 'created_by'],
    attendance: ['id', 'student_id', 'class_id', 'date', 'status', 'recorded_by'],
    announcements: ['id', 'title', 'content', 'target_role', 'priority', 'is_active', 'created_by'],
    school_events: ['id', 'title', 'event_type', 'event_date', 'visibility', 'status'],
    student_activity_records: ['id', 'student_id', 'event_id', 'activity_type', 'title', 'points', 'recorded_by']
};

const failures = [];
for (const table of requiredTables) {
    if (!tables.has(table)) failures.push(`missing table: ${table}`);
}
for (const [table, columns] of Object.entries(requiredColumns)) {
    const found = tables.get(table);
    if (!found) continue;
    for (const column of columns) {
        if (!found.columns.has(column)) failures.push(`missing column: ${table}.${column}`);
    }
}

const fkRequired = ['parent_children', 'counseling_requests', 'counseling_sessions', 'sms_logs', 'ai_requests_log', 'school_events'];
for (const table of fkRequired) {
    const found = tables.get(table);
    if (!found?.foreignKeys.length) failures.push(`missing foreign keys: ${table}`);
}

const indexRequired = ['idx_sms_recipient_created', 'idx_sms_message_hash', 'idx_ai_requests_user_created', 'idx_counseling_student', 'idx_session_risk'];
const allIndexText = [...tables.values()].flatMap(t => t.indexes).join('\n');
for (const indexName of indexRequired) {
    if (!allIndexText.includes(indexName)) failures.push(`missing index: ${indexName}`);
}

if (failures.length) {
    console.error('❌ Schema contract verification failed:');
    for (const failure of failures) console.error(` - ${failure}`);
    process.exit(1);
}

console.log(`✅ Schema contract verification passed (${tables.size} tables checked).`);
