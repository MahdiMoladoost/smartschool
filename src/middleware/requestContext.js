import crypto from 'crypto';
import { logInfo, logError } from '../utils/logger.js';

export function requestContext(req, res, next) {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    req.requestId = String(requestId).slice(0, 80);
    res.setHeader('X-Request-Id', req.requestId);
    const startedAt = Date.now();
    res.on('finish', () => {
        logInfo('http_request', {
            request_id: req.requestId,
            method: req.method,
            path: req.originalUrl,
            status_code: res.statusCode,
            duration_ms: Date.now() - startedAt,
            user_id: req.user?.id || null,
            role: req.user?.role || null,
            ip: req.ip
        });
    });
    next();
}

export function jsonErrorHandler(err, req, res, next) {
    const statusCode = Number(err.status || err.statusCode || 500);
    logError('http_error', err, {
        request_id: req.requestId,
        method: req.method,
        path: req.originalUrl,
        status_code: statusCode,
        user_id: req.user?.id || null,
        role: req.user?.role || null
    });
    res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
        success: false,
        code: statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
        message: statusCode >= 500 ? 'خطای داخلی سرور' : (err.message || 'خطا در درخواست'),
        request_id: req.requestId
    });
}
