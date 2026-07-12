import fs from 'fs';
import path from 'path';

const DASHBOARD_PATH = /^\/dashboard\/(admin|teacher|student|parent|principal|executive-deputy|cultural-deputy|counselor|super-admin)(?:\/|$)/;
const STYLE_HREF = '/public/assets/css/panel/unified-experience.css?v=2026-07-12';
const SCRIPT_SRC = '/public/assets/js/panel-unified.js?v=2026-07-12';

function enhanceDashboardHtml(html) {
    if (typeof html !== 'string' || !/<html[\s>]/i.test(html)) return html;

    let output = html;
    if (!output.includes(STYLE_HREF)) {
        output = output.replace(
            /<\/head>/i,
            `  <link rel="stylesheet" href="${STYLE_HREF}">\n</head>`
        );
    }

    if (!output.includes(SCRIPT_SRC)) {
        output = output.replace(
            /<\/body>/i,
            `  <script src="${SCRIPT_SRC}" defer></script>\n</body>`
        );
    }

    return output;
}

function dashboardEnhancementMiddleware(req, res, next) {
    if (!DASHBOARD_PATH.test(req.path)) return next();

    const originalSend = res.send.bind(res);
    const originalSendFile = res.sendFile.bind(res);

    res.send = function enhancedSend(body) {
        if (typeof body === 'string') {
            return originalSend(enhanceDashboardHtml(body));
        }
        if (Buffer.isBuffer(body)) {
            const text = body.toString('utf8');
            if (/<html[\s>]/i.test(text)) {
                return originalSend(Buffer.from(enhanceDashboardHtml(text), 'utf8'));
            }
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

        if (!/\.html?$/i.test(filePath)) {
            return originalSendFile(filePath, opts, done);
        }

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
                originalSend(enhanceDashboardHtml(html));
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

/**
 * Installs the dashboard middleware before registered page routes. The legacy
 * router is already built when server.js imports it, so the newly-created
 * Express layer is moved immediately before the first route layer.
 */
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
