import { spawn } from 'child_process';

const port = Number(process.env.SMOKE_PORT || 3334);
const baseUrl = `http://127.0.0.1:${port}`;
const paths = [
    '/', '/login', '/dashboard/student', '/dashboard/teacher', '/dashboard/parent', '/dashboard/principal',
    '/dashboard/executive-deputy', '/dashboard/cultural-deputy', '/dashboard/counselor', '/dashboard/admin', '/dashboard/super-admin'
];
const protectedApiChecks = [
    '/api/v1/ai/student/homework-assistant',
    '/api/v1/automation/attendance-drop/6',
    '/api/v1/sms/logs',
    '/api/v1/portal/overview'
];

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function waitHealth() {
    const started = Date.now();
    while (Date.now() - started < 30000) {
        try { if ((await fetch(`${baseUrl}/api/health`)).ok) return; } catch {}
        await wait(500);
    }
    throw new Error('Server did not start in no-DB smoke mode');
}

const child = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(port), REQUIRE_DB: 'false', NODE_ENV: 'test', JWT_SECRET: 'no-db-smoke-test-secret' },
    stdio: ['ignore', 'pipe', 'pipe']
});
child.stdout.on('data', chunk => process.stdout.write(`[server] ${chunk}`));
child.stderr.on('data', chunk => process.stderr.write(`[server] ${chunk}`));

try {
    await waitHealth();
    for (const path of paths) {
        const res = await fetch(`${baseUrl}${path}`);
        if (res.status !== 200) throw new Error(`${path} returned ${res.status}`);
        console.log(`✅ ${path} -> ${res.status}`);
    }
    for (const path of protectedApiChecks) {
        const method = path.includes('/ai/') || path.includes('/automation/') ? 'POST' : 'GET';
        const res = await fetch(`${baseUrl}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'POST' ? '{}' : undefined });
        if (res.status !== 401) throw new Error(`${method} ${path} returned ${res.status}, expected 401`);
        console.log(`✅ ${method} ${path} -> 401`);
    }
    console.log('✅ No-DB smoke verification passed.');
} finally {
    child.kill('SIGTERM');
}
