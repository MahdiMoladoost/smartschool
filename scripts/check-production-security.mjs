import fs from 'fs';
import path from 'path';

const root = process.cwd();
const ignoredDirs = new Set(['node_modules', '.git', 'backups']);
const allowedFiles = new Set(['.env.example']);
const riskyPatterns = [
    { name: 'OpenAI/GapGPT style key', regex: /sk-[A-Za-z0-9_-]{20,}/ },
    { name: 'JWT secret assignment in source', regex: /JWT_SECRET\s*=\s*['"][^'"]{12,}['"]/ },
    { name: 'SMS API key assignment in source', regex: /SMS_API_KEY\s*=\s*['"][^'"]{8,}['"]/ },
    { name: 'Database password assignment in source', regex: /DB_PASSWORD\s*=\s*['"][^'"]+['"]/ }
];

function walk(dir, files = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ignoredDirs.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, files);
        else files.push(full);
    }
    return files;
}

const failures = [];
const gitignore = fs.existsSync('.gitignore') ? fs.readFileSync('.gitignore', 'utf8') : '';
if (!/^\.env$/m.test(gitignore) || !/^\.env\.\*$/m.test(gitignore)) {
    failures.push('.gitignore must ignore .env and .env.*');
}
if (fs.existsSync('.env')) failures.push('.env exists in project directory; do not commit or package it.');

for (const file of walk(root)) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    if (allowedFiles.has(rel) || /\.(png|jpg|jpeg|webp|gif|ico|woff2?|ttf|eot|svg|pdf|zip)$/i.test(rel)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of riskyPatterns) {
        if (pattern.regex.test(text)) failures.push(`${pattern.name} found in ${rel}`);
    }
}

if (failures.length) {
    console.error('❌ Production security check failed:');
    for (const failure of failures) console.error(` - ${failure}`);
    process.exit(1);
}
console.log('✅ Production security check passed: .env ignored and no obvious secrets found.');
