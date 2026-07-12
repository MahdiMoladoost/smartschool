import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const panelsRoot = path.join(projectRoot, 'pages', 'dashboard', 'panel');
const manifest = JSON.parse(
    fs.readFileSync(path.join(panelsRoot, 'shared', 'panel-pages.json'), 'utf8')
);

const errors = [];
let checkedPages = 0;

for (const [panel, config] of Object.entries(manifest)) {
    const pageKeys = Object.keys(config.pages);
    const expectedLinks = new Set(pageKeys.map(page => `/dashboard/${panel}/${page}`));

    for (const page of pageKeys) {
        const filePath = path.join(panelsRoot, panel, `${page}.html`);
        if (!fs.existsSync(filePath)) {
            errors.push(`Missing page: ${filePath}`);
            continue;
        }

        const html = fs.readFileSync(filePath, 'utf8');
        checkedPages += 1;

        if (!html.includes(`data-panel="${panel}"`) || !html.includes(`data-page="${page}"`)) {
            errors.push(`Invalid body metadata: ${filePath}`);
        }

        const activeMatches = [...html.matchAll(/class="nav-item active"\s+data-tab="([^"]+)"/g)].map(match => match[1]);
        if (activeMatches.length !== 1 || activeMatches[0] !== page) {
            errors.push(`Invalid active navigation item in ${filePath}: ${activeMatches.join(', ')}`);
        }

        const actualLinks = new Set([...html.matchAll(/href="(\/dashboard\/[^/]+\/[^"]+)"/g)].map(match => match[1]));
        if (actualLinks.size !== expectedLinks.size || [...expectedLinks].some(link => !actualLinks.has(link))) {
            errors.push(`Navigation links do not match the manifest: ${filePath}`);
        }

        if (html.includes('{{PAGE_KEY}}') || html.includes('{{DOCUMENT_TITLE}}')) {
            errors.push(`Unresolved template token: ${filePath}`);
        }

        if (panel !== 'admin' && !html.includes('/public/assets/css/panel/role-panel.css')) {
            errors.push(`Missing shared admin-aligned stylesheet: ${filePath}`);
        }
    }
}

const placeholderPatterns = [
    /API Ready/i,
    /آماده اتصال کامل/,
    /این بخش جدید به پنل اضافه شده/,
    /زیرساخت API و RBAC این بخش آماده است/
];
for (const asset of ['student.js', 'parent.js', 'teacher.js', 'role-panel.js']) {
    const assetPath = path.join(projectRoot, 'public', 'assets', 'js', asset);
    const source = fs.readFileSync(assetPath, 'utf8');
    for (const pattern of placeholderPatterns) {
        if (pattern.test(source)) errors.push(`Placeholder-only panel content in ${assetPath}: ${pattern}`);
    }
}

if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exit(1);
}

console.log(`Validated ${checkedPages} modular panel pages successfully.`);
