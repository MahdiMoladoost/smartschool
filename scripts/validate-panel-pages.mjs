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

function assetPathFromUrl(rawUrl, filePath) {
    const cleanUrl = rawUrl.split(/[?#]/, 1)[0];
    if (!cleanUrl || /^(?:[a-z]+:|\/\/|#)/i.test(cleanUrl) || cleanUrl.includes('{{')) return null;

    const extension = path.extname(cleanUrl).toLowerCase();
    const assetExtensions = new Set([
        '.css', '.js', '.mjs', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
        '.ico', '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.zip'
    ]);
    if (!assetExtensions.has(extension)) return null;

    if (cleanUrl.startsWith('/public/')) return path.join(projectRoot, cleanUrl.slice(1));
    if (cleanUrl.startsWith('/assets/')) return path.join(projectRoot, 'public', cleanUrl.slice(1));
    if (cleanUrl.startsWith('/pages/')) return path.join(projectRoot, cleanUrl.slice(1));
    if (cleanUrl.startsWith('/')) return null;
    return path.resolve(path.dirname(filePath), cleanUrl);
}

function validateLocalAssets(html, filePath) {
    for (const match of html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
        const assetPath = assetPathFromUrl(match[1], filePath);
        if (assetPath && !fs.existsSync(assetPath)) {
            errors.push(`Missing local asset in ${filePath}: ${match[1]}`);
        }
    }

    for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
        if (!/\bhref\s*=\s*["'][^"']+["']/i.test(match[0])) {
            errors.push(`Link element without href in ${filePath}: ${match[0]}`);
        }
    }
}

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

        validateLocalAssets(html, filePath);
    }
}

if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exit(1);
}

console.log(`Validated ${checkedPages} modular panel pages successfully.`);
