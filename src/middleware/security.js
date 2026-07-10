import rateLimit from 'express-rate-limit';

// Rate Limiting برای لاگین
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقیقه
    max: 5, // حداکثر 5 تلاش
    message: { success: false, message: '❌ بیش از 5 تلاش ناموفق. 15 دقیقه دیگر تلاش کنید.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate Limiting برای API عمومی
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 دقیقه
    max: 60, // حداکثر 60 درخواست
    message: { success: false, message: '❌ تعداد درخواست‌ها بیش از حد مجاز است.' },
});

// Rate Limiting برای هوش مصنوعی (با قابلیت تنظیم از پنل ادمین)
let aiRateLimitPerDay = 20; // مقدار پیش‌فرض، از دیتابیس خوانده می‌شود

export async function getAIRateLimit() {
    try {
        const { queryOne } = await import('../config/database.js');
        const setting = await queryOne('SELECT setting_value FROM settings WHERE setting_key = "ai_daily_limit"');
        if (setting && setting.setting_value) {
            aiRateLimitPerDay = parseInt(setting.setting_value);
        }
    } catch (e) {}
    return aiRateLimitPerDay;
}

// ذخیره درخواست‌های AI در حافظه موقت
const userAIRequests = {};

export async function checkAIRateLimit(userId) {
    const limit = await getAIRateLimit();
    const today = new Date().toISOString().split('T')[0];
    
    if (!userAIRequests[userId]) {
        userAIRequests[userId] = {};
    }
    if (!userAIRequests[userId][today]) {
        userAIRequests[userId][today] = 0;
    }
    
    if (userAIRequests[userId][today] >= limit) {
        return { allowed: false, remaining: 0, limit };
    }
    
    return { allowed: true, remaining: limit - userAIRequests[userId][today] - 1, limit };
}

export function recordAIRequest(userId) {
    const today = new Date().toISOString().split('T')[0];
    if (!userAIRequests[userId]) {
        userAIRequests[userId] = {};
    }
    if (!userAIRequests[userId][today]) {
        userAIRequests[userId][today] = 0;
    }
    userAIRequests[userId][today]++;
}

// Sanitize inputs (محافظت پایه در برابر XSS بدون وابستگی اضافی)
export function sanitizeInput(input) {
    if (typeof input === 'string') {
        return input.trim()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    if (Array.isArray(input)) {
        return input.map(value => sanitizeInput(value));
    }
    if (typeof input === 'object' && input !== null) {
        const sanitized = {};
        for (const [key, value] of Object.entries(input)) {
            sanitized[key] = sanitizeInput(value);
        }
        return sanitized;
    }
    return input;
}

// Middleware برای sanitize بدنه درخواست
export function sanitizeBody(req, res, next) {
    if (req.body) {
        req.body = sanitizeInput(req.body);
    }
    if (req.query) {
        req.query = sanitizeInput(req.query);
    }
    next();
}

// لاگ فعالیت‌های ادمین
export async function logAdminAction(adminId, action, targetType = null, targetId = null, details = null, ipAddress = null) {
    try {
        const { execute } = await import('../config/database.js');
        await execute(
            `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, ip_address) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [adminId, action, targetType, targetId, details ? JSON.stringify(details) : null, ipAddress]
        );
    } catch (error) {
        console.error('خطا در ذخیره لاگ ادمین:', error);
    }
}