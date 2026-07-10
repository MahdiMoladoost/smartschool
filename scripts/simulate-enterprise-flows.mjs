import fs from 'fs';

const schema = fs.readFileSync('src/data/migrations/001_full_schema.sql', 'utf8');
const routeFiles = ['src/routes/legacyRoutes.js', 'src/routes/aiRoutes.js', 'src/routes/automationRoutes.js'];
const source = routeFiles.map(file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '').join('\n');

const checks = [
  {
    name: 'Student login → dashboard → AI homework → AI log/rate limit',
    endpoints: ['POST /api/v1/auth/login', 'GET /dashboard/student', 'POST /api/v1/ai/student/homework-assistant'],
    tables: ['users', 'ai_requests_log', 'ai_logs'],
    expectedSql: [
      'SELECT user by username/password path during login',
      'INSERT ai_requests_log(user_id, role, prompt, model, tokens, response_time)',
      'INSERT ai_logs(user_id, user_role, feature, question, response, tokens_used)'
    ]
  },
  {
    name: 'Teacher login → generate quiz → save assignment',
    endpoints: ['POST /api/v1/auth/login', 'POST /api/v1/ai/teacher/quiz-generator', 'POST /api/v1/teacher/assignments'],
    tables: ['users', 'ai_requests_log', 'assignments', 'course_teachers'],
    expectedSql: [
      'teacher route is role-protected by checkRole(teacher)',
      'AI request inserts ai_requests_log',
      'assignment creation inserts assignments after teacher/class/course validation'
    ]
  },
  {
    name: 'Parent login → view child → AI progress summary',
    endpoints: ['POST /api/v1/auth/login', 'GET /api/v1/parent/children', 'POST /api/v1/ai/parent/student/:studentId/progress-summary'],
    tables: ['users', 'parent_children', 'grades', 'attendance', 'assignments', 'submissions', 'ai_requests_log'],
    expectedSql: [
      'parentOwnsStudent checks parent_children(parent_id, student_id)',
      'summary queries grades/attendance/assignments for the linked student only',
      'AI request inserts ai_requests_log'
    ]
  },
  {
    name: 'Attendance drop automation → SMS triggered → logs stored',
    endpoints: ['POST /api/v1/automation/attendance-drop/:studentId'],
    tables: ['attendance', 'parent_children', 'sms_logs', 'ai_automation_logs'],
    expectedSql: [
      'SELECT attendance grouped by status for student and date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)',
      'SELECT linked parents through parent_children',
      'INSERT sms_logs inside transaction through smsService',
      'INSERT ai_automation_logs inside the same transaction'
    ]
  },
  {
    name: 'Counselor risk flag → management notification → automation log',
    endpoints: ['POST /api/v1/automation/counselor-risk/:sessionId'],
    tables: ['counseling_sessions', 'sms_logs', 'ai_automation_logs'],
    expectedSql: [
      'SELECT counseling session without private_notes for notification payload',
      'counselor ownership check if role is counselor',
      'SELECT active principal/admin/super_admin phones',
      'INSERT sms_logs and ai_automation_logs through transaction'
    ]
  }
];

function routeExists(route) {
  const [method, path] = route.split(' ');
  const bare = path.replace('/api/v1/ai', '').replace('/api/v1/automation', '');
  return source.includes(path) || source.includes(bare) || (path.startsWith('/dashboard/') && source.includes(path));
}

function tableExists(table) {
  return new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${table}\\s*\\(`, 'i').test(schema);
}

const failures = [];
let md = '# Enterprise End-to-End Flow Simulation\n\nThis is a static/dry-run verification because this execution environment does not provide a live MySQL daemon.\n\n';
for (const flow of checks) {
  md += `## ${flow.name}\n\n`;
  md += '### Endpoint checks\n';
  for (const endpoint of flow.endpoints) {
    const ok = routeExists(endpoint);
    if (!ok) failures.push(`missing endpoint: ${endpoint}`);
    md += `- ${ok ? 'Verified statically' : 'Missing'}: \`${endpoint}\`\n`;
  }
  md += '\n### Table checks\n';
  for (const table of flow.tables) {
    const ok = tableExists(table);
    if (!ok) failures.push(`missing table: ${table}`);
    md += `- ${ok ? 'Verified statically' : 'Missing'}: \`${table}\`\n`;
  }
  md += '\n### Expected SQL behavior\n';
  for (const sql of flow.expectedSql) md += `- ${sql}\n`;
  md += '\n';
}

if (failures.length) {
  md += '## Failures\n';
  for (const failure of failures) md += `- ${failure}\n`;
} else {
  md += '## Result\n\nAll required Phase 3 flow endpoints and tables were found statically. Runtime DB execution still requires a live MySQL environment.\n';
}

fs.writeFileSync('ENTERPRISE_FLOW_SIMULATION.md', md);
if (failures.length) {
  console.error('❌ Enterprise flow simulation failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`✅ Enterprise flow simulation passed (${checks.length} flows).`);
