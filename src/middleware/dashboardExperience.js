import fs from 'node:fs';
import path from 'node:path';

const DASHBOARD_PATH = /^\/dashboard\/(admin|teacher|student|parent|principal|executive-deputy|cultural-deputy|counselor|super-admin)(?:\/|$)/;
const TEACHER_DASHBOARD_PATH = /^\/dashboard\/teacher(?:\/|$)/;
const SHARED_STYLES = ['/public/assets/css/panel/unified-experience.css?v=2026-07-12'];
const SHARED_SCRIPTS = ['/public/assets/js/panel-unified.js?v=2026-07-12'];
const TEACHER_STYLES = ['/public/assets/css/panel/dynamic-pages.css?v=2026-07-12-shell-v4'];
const TEACHER_SCRIPTS = ['/public/assets/js/panel-dynamic-pages.js?v=2026-07-12-shell-v4'];

function injectStyles(html, hrefs) {
    return hrefs.reduce((output, href) => {
        if (output.includes(href) || !/<\/head>/i.test(output)) return output;
        return output.replace(/<\/head>/i, `  <link rel="stylesheet" href="${href}">\n</head>`);
    }, html);
}

function injectScripts(html, sources) {
    return sources.reduce((output, src) => {
        if (output.includes(src) || !/<\/body>/i.test(output)) return output;
        return output.replace(/<\/body>/i, `  <script src="${src}" defer></script>\n</body>`);
    }, html);
}

function enhanceDashboardHtml(html, requestPath = '') {
    if (typeof html !== 'string' || !/<html[\s>]/i.test(html)) return html;

    const teacherPage = TEACHER_DASHBOARD_PATH.test(requestPath)
        || /<body\b[^>]*\bdata-panel=["']teacher["']/i.test(html);
    const styles = teacherPage ? [...SHARED_STYLES, ...TEACHER_STYLES] : SHARED_STYLES;
    const scripts = teacherPage ? [...SHARED_SCRIPTS, ...TEACHER_SCRIPTS] : SHARED_SCRIPTS;

    return injectScripts(injectStyles(html, styles), scripts);
}

function dashboardEnhancementMiddleware(req, res, next) {
    if (!DASHBOARD_PATH.test(req.path)) return next();

    const originalSend = res.send.bind(res);
    const originalSendFile = res.sendFile.bind(res);
    const enhance = html => enhanceDashboardHtml(html, req.path);

    res.send = function enhancedSend(body) {
        if (typeof body === 'string') return originalSend(enhance(body));
        if (Buffer.isBuffer(body)) {
            const text = body.toString('utf8');
            if (/<html[\s>]/i.test(text)) return originalSend(Buffer.from(enhance(text), 'utf8'));
        }
        return originalSend(body);
    };

    res.sendFile = function enhancedSendFile(filePath, options, callback) {
        let opts = options;
        let done = callback;
        if (typeof options === 'function') {
            done = options;
            opts = undefined;
        }
        if (!/\.html?$/i.test(filePath)) return originalSendFile(filePath, opts, done);

        const absolutePath = path.isAbsolute(filePath)
            ? filePath
            : path.resolve(opts?.root || process.cwd(), filePath);

        fs.readFile(absolutePath, 'utf8', (error, html) => {
            if (error) {
                if (typeof done === 'function') return done(error);
                return next(error);
            }
            try {
                res.type('html');
                originalSend(enhance(html));
                if (typeof done === 'function') done();
            } catch (sendError) {
                if (typeof done === 'function') return done(sendError);
                next(sendError);
            }
        });
        return res;
    };

    next();
}

export function installDashboardExperience(app) {
    if (!app || app.locals.__dashboardExperienceInstalled) return;
    app.locals.__dashboardExperienceInstalled = true;

    app.use(dashboardEnhancementMiddleware);
    const stack = app._router?.stack;
    if (!Array.isArray(stack) || stack.length === 0) return;

    const layer = stack.pop();
    if (!layer) return;
    const firstRouteIndex = stack.findIndex(item => Boolean(item.route));
    stack.splice(firstRouteIndex >= 0 ? firstRouteIndex : 0, 0, layer);
}

export { enhanceDashboardHtml };
