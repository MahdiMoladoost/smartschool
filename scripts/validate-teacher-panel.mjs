import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { enhanceDashboardHtml } from '../src/middleware/dashboardExperience.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rendererPath = resolve(root, 'public/assets/js/panel-dynamic-pages.js');
const cssPath = resolve(root, 'public/assets/css/panel/dynamic-pages.css');
const serverPath = resolve(root, 'server.js');
const middlewarePath = resolve(root, 'src/middleware/dashboardExperience.js');
const manifestPath = resolve(root, 'pages/dashboard/panel/shared/panel-pages.json');
const errors = [];

for (const file of [rendererPath, cssPath, serverPath, middlewarePath]) {
    if (!existsSync(file)) errors.push(`Missing required file: ${file}`);
}

const source = existsSync(rendererPath) ? readFileSync(rendererPath, 'utf8') : '';
const server = existsSync(serverPath) ? readFileSync(serverPath, 'utf8') : '';
if (!server.includes('installDashboardExperience(app)')) errors.push('server.js does not activate dashboardExperience.');
if (!source.includes("body?.dataset?.panel !== 'teacher'")) errors.push('Dynamic renderer is not scoped to the teacher panel.');
if (!source.includes('PLACEHOLDER_PATTERN')) errors.push('Placeholder detector is missing.');
if (!source.includes('new MutationObserver(queue)')) errors.push('Placeholder mutation observer is missing.');

const syntax = spawnSync(process.execPath, ['--check', rendererPath], { cwd: root, encoding: 'utf8' });
if (syntax.status !== 0) errors.push(`Renderer syntax check failed: ${syntax.stderr || syntax.stdout}`);

const teacherHtml = '<!doctype html><html><head></head><body data-panel="teacher"></body></html>';
const enhancedTeacher = enhanceDashboardHtml(teacherHtml, '/dashboard/teacher/attendance-create');
for (const asset of ['unified-experience.css', 'dynamic-pages.css', 'panel-unified.js', 'panel-dynamic-pages.js']) {
    const count = enhancedTeacher.split(asset).length - 1;
    if (count !== 1) errors.push(`Expected ${asset} exactly once on teacher pages; found ${count}.`);
}
if (enhanceDashboardHtml(enhancedTeacher, '/dashboard/teacher/attendance-create') !== enhancedTeacher) {
    errors.push('Teacher HTML injection is not idempotent.');
}

const nonTeacher = enhanceDashboardHtml('<!doctype html><html><head></head><body data-panel="student"></body></html>', '/dashboard/student/dashboard');
for (const teacherAsset of ['dynamic-pages.css', 'panel-dynamic-pages.js']) {
    if (nonTeacher.includes(teacherAsset)) errors.push(`Teacher-only asset leaked into another panel: ${teacherAsset}`);
}

const fallbackTeacherPages = [
    'dashboard','schedule','classes','students','attendance-create','attendance-view','grades-create','grades-edit','grades',
    'online-exam-create','exams','exam-results','class-performance','assignments','assignment-create','assignment-review',
    'student-feedback','online-classes','virtual-classes','content-upload','library','announcements','student-messenger',
    'parent-chat','admin-messenger','reports','student-report-cards','discipline-report-create','encouragement-create',
    'school-suggestions','profile','change-password','ai-exam-builder','ai-book-question-generator','ai-pdf-question-generator',
    'ai-answer-key-generator','ai-auto-grading','ai-student-performance','ai-extra-question-suggestions','ai-exam-difficulty-analysis'
];
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
const teacherPages = manifest ? Object.keys(manifest.teacher?.pages || {}) : fallbackTeacherPages;
const handlerBlock = source.match(/const handlers\s*=\s*\{([\s\S]*?)\n\s*\};/)?.[1] || '';
for (const page of teacherPages) {
    const escaped = page.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`(?:['"]${escaped}['"]|\\b${escaped})\\s*:`).test(handlerBlock)) {
        errors.push(`Teacher page has no operational handler: ${page}`);
    }
}

const attendanceContract = /JSON\.stringify\(\{\s*class_id:\s*Number\(classId\),\s*date:\s*dateInput\.value,\s*period:\s*periodSelect\.value,\s*records\s*\}\)/;
const gradesContract = /JSON\.stringify\(\{\s*class_id:\s*Number\(classId\),\s*course_id:\s*Number\(courseId\),\s*term,\s*eval_type:\s*evalType,\s*grades\s*\}\)/;
if (!attendanceContract.test(source)) errors.push('Attendance POST payload does not match the exact backend contract.');
if (!gradesContract.test(source)) errors.push('Grades POST payload does not match the exact backend contract.');

for (const placeholderCard of ['<h3>Role-Based</h3>', '<h3>API Ready</h3>', '<h3>ماژولار</h3>']) {
    if (source.includes(placeholderCard)) errors.push(`Legacy placeholder card remains: ${placeholderCard}`);
}
for (const signal of ['<form', 'table(', '.addEventListener(', "method: 'POST'", "method: 'PUT'", "method: 'DELETE'"]) {
    if (!source.includes(signal)) errors.push(`Operational signal missing from renderer: ${signal}`);
}

if (errors.length) {
    console.error('Teacher panel validation failed:');
    for (const error of errors) console.error(` - ${error}`);
    process.exit(1);
}
console.log(`Teacher panel validated: ${teacherPages.length} pages mapped, placeholders blocked, injection scoped, exact attendance/grades payloads confirmed.`);
