import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const FULL_SCHEMA_PATH = path.join(__dirname, 'migrations', '001_full_schema.sql');

const ROLE_VALUES = [
    'super_admin',
    'admin',
    'principal',
    'executive_deputy',
    'cultural_deputy',
    'counselor',
    'teacher',
    'student',
    'parent'
];
const ROLE_ENUM_SQL = ROLE_VALUES.map(role => `'${role}'`).join(', ');

export function splitSqlStatements(sqlText) {
    const withoutLineComments = sqlText
        .split(/\r?\n/)
        .filter(line => !line.trim().startsWith('--'))
        .join('\n');
    return withoutLineComments
        .split(/;\s*(?:\r?\n|$)/)
        .map(statement => statement.trim())
        .filter(Boolean);
}

export async function runFullSchemaMigration(conn, { logger = console } = {}) {
    const sqlText = fs.readFileSync(FULL_SCHEMA_PATH, 'utf8');
    const statements = splitSqlStatements(sqlText);
    for (const statement of statements) {
        await conn.execute(statement);
    }
    logger?.log?.(`✅ Full schema migration executed (${statements.length} statements)`);
}

export async function columnExists(conn, tableName, columnName) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(columnName)) {
        throw new Error('Unsafe schema identifier');
    }
    const [rows] = await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
        LIMIT 1
    `, [tableName, columnName]);
    return rows.length > 0;
}

export async function ensureColumn(conn, tableName, columnName, columnDefinition) {
    if (!(await columnExists(conn, tableName, columnName))) {
        await conn.execute(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDefinition}`);
    }
}

export async function ensureIndex(conn, tableName, indexName, indexDefinition) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(indexName)) {
        throw new Error('Unsafe schema identifier');
    }
    const [rows] = await conn.execute(`
        SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
        LIMIT 1
    `, [tableName, indexName]);
    if (!rows.length) {
        await conn.execute(`ALTER TABLE \`${tableName}\` ADD ${indexDefinition}`);
    }
}

export async function runCompatibilityMigrations(conn) {
    // Existing development databases may have been created before the expanded role set.
    // Keep this migration non-destructive so seeded enterprise roles can be inserted safely.
    await conn.execute(`ALTER TABLE users MODIFY COLUMN role ENUM(${ROLE_ENUM_SQL}) NOT NULL`).catch(() => {});

    // Normalize parent-child relation naming. Older builds used relationship/relation_type;
    // current runtime uses relation. We add relation and copy legacy values if present.
    await ensureColumn(conn, 'parent_children', 'relation', "VARCHAR(50) DEFAULT 'guardian'").catch(() => {});
    if (await columnExists(conn, 'parent_children', 'relationship').catch(() => false)) {
        await conn.execute("UPDATE parent_children SET relation = COALESCE(NULLIF(relation, ''), relationship) WHERE relationship IS NOT NULL").catch(() => {});
    }
    if (await columnExists(conn, 'parent_children', 'relation_type').catch(() => false)) {
        await conn.execute("UPDATE parent_children SET relation = COALESCE(NULLIF(relation, ''), relation_type) WHERE relation_type IS NOT NULL").catch(() => {});
    }

    await ensureColumn(conn, 'users', 'parent_phone', 'VARCHAR(20) NULL').catch(() => {});
    await ensureColumn(conn, 'users', 'parent_email', 'VARCHAR(100) NULL').catch(() => {});
    await ensureColumn(conn, 'ai_logs', 'user_role', 'VARCHAR(50) NULL').catch(() => {});
    await ensureColumn(conn, 'ai_logs', 'feature', "VARCHAR(100) DEFAULT 'chat'").catch(() => {});
    await ensureColumn(conn, 'ai_logs', 'tokens_used', 'INT NULL').catch(() => {});
    await ensureColumn(conn, 'ai_logs', 'provider_status', 'VARCHAR(50) NULL').catch(() => {});
    await ensureColumn(conn, 'ai_logs', 'provider_response', 'TEXT NULL').catch(() => {});
    await ensureColumn(conn, 'sms_logs', 'message_hash', 'CHAR(64) NULL').catch(() => {});
    await ensureColumn(conn, 'sms_logs', 'attempts', 'INT DEFAULT 0').catch(() => {});
    await ensureColumn(conn, 'sms_logs', 'last_attempt_at', 'DATETIME NULL').catch(() => {});
    await conn.execute("ALTER TABLE sms_logs MODIFY COLUMN status ENUM('pending','sent','failed','retryable_failed','provider_not_configured','duplicate_suppressed','rate_limited','circuit_open') DEFAULT 'pending'").catch(() => {});
    await ensureIndex(conn, 'sms_logs', 'idx_sms_message_hash', 'INDEX idx_sms_message_hash (message_hash)').catch(() => {});
    await ensureIndex(conn, 'attendance', 'idx_attendance_student_date', 'INDEX idx_attendance_student_date (student_id, date)').catch(() => {});
    await ensureIndex(conn, 'grades', 'idx_grades_student_updated', 'INDEX idx_grades_student_updated (student_id, updated_at)').catch(() => {});
    await ensureIndex(conn, 'counseling_requests', 'idx_counseling_student_status', 'INDEX idx_counseling_student_status (student_id, status)').catch(() => {});
    await ensureIndex(conn, 'counseling_sessions', 'idx_counseling_risk_created', 'INDEX idx_counseling_risk_created (risk_level, created_at)').catch(() => {});
    await ensureIndex(conn, 'ai_requests_log', 'idx_ai_requests_user_day', 'INDEX idx_ai_requests_user_day (user_id, created_at)').catch(() => {});
}
