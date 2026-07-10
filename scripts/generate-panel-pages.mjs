import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const panelsRoot = path.join(projectRoot, 'pages', 'dashboard', 'panel');
const manifestPath = path.join(panelsRoot, 'shared', 'panel-pages.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

for (const [panel, config] of Object.entries(manifest)) {
    const panelDir = path.join(panelsRoot, panel);
    const templatePath = path.join(panelDir, 'layout.template.html');
    const template = fs.readFileSync(templatePath, 'utf8');

    for (const [pageKey, pageTitle] of Object.entries(config.pages)) {
        let html = template
            .replaceAll('{{PAGE_KEY}}', pageKey)
            .replaceAll('{{DOCUMENT_TITLE}}', `${pageTitle} | ${config.titlePrefix}`);

        const activePattern = new RegExp(`class="nav-item"(?=\\s+data-tab="${escapeRegExp(pageKey)}")`);
        html = html.replace(activePattern, 'class="nav-item active"');

        fs.writeFileSync(path.join(panelDir, `${pageKey}.html`), html, 'utf8');
    }

    // Preserve the old entry filename for backward compatibility.
    const legacyFilename = `${panel}.html`;
    let dashboardHtml = template
        .replaceAll('{{PAGE_KEY}}', 'dashboard')
        .replaceAll('{{DOCUMENT_TITLE}}', `${config.pages.dashboard} | ${config.titlePrefix}`)
        .replace(/class="nav-item"(?=\s+data-tab="dashboard")/, 'class="nav-item active"');

    fs.writeFileSync(path.join(panelDir, legacyFilename), dashboardHtml, 'utf8');
    console.log(`Generated ${Object.keys(config.pages).length} pages for ${panel}`);
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
