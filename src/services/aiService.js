import { logInfo, logWarn, logError } from '../utils/logger.js';

const DEFAULT_AI_BASE_URL = 'https://api.gapgpt.app/v1';
const DEFAULT_AI_MODEL = 'gpt-4o';
const DEFAULT_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 20000);
const DEFAULT_RETRIES = Number(process.env.AI_RETRY_ATTEMPTS || 2);
const MAX_PROMPT_CHARS = Number(process.env.AI_MAX_PROMPT_CHARS || 6000);
const MAX_MESSAGE_CHARS = Number(process.env.AI_MAX_MESSAGE_CHARS || 4000);
const MAX_RESPONSE_TOKENS = Number(process.env.AI_MAX_RESPONSE_TOKENS || 1500);
const DEFAULT_DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 50);
const DEFAULT_MINUTE_LIMIT = Number(process.env.AI_PER_MINUTE_LIMIT || 8);

const ROLE_SYSTEM_PROMPTS = {
    student: 'تو دستیار آموزشی امن مدرسه هستی. پاسخ‌ها باید آموزشی، کوتاه، مرحله‌به‌مرحله و مناسب دانش‌آموز باشند. پاسخ آماده تقلب یا انجام کامل تکلیف نده؛ راهنمایی و توضیح بده.',
    teacher: 'تو دستیار حرفه‌ای معلم هستی. طرح درس، سؤال آزمون، بازخورد آموزشی و تحلیل عملکرد را با لحن حرفه‌ای و قابل استفاده در مدرسه ارائه بده.',
    parent: 'تو مشاور آموزشی والدین هستی. وضعیت تحصیلی را ساده توضیح بده و پیشنهادهای عملی، محترمانه و غیرپزشکی برای کمک به فرزند ارائه کن.',
    counselor: 'تو دستیار مشاور مدرسه هستی. خلاصه‌سازی و پیشنهاد راهبردهای حمایتی بده، اما تشخیص پزشکی، برچسب‌زنی و افشای اطلاعات محرمانه انجام نده.',
    principal: 'تو تحلیل‌گر مدیریتی مدرسه هستی. داده‌ها را به KPI، ریسک‌ها، روندها و اقدام‌های اجرایی تبدیل کن.',
    admin: 'تو دستیار مدیر سیستم مدرسه هستی. پاسخ‌ها باید عملیاتی، امن، قابل پیگیری و بدون افشای اطلاعات حساس باشند.',
    executive_deputy: 'تو دستیار معاون اجرایی مدرسه هستی. روی حضور و غیاب، ثبت‌نام، برنامه هفتگی، کلاس‌ها و اسناد اداری تمرکز کن.',
    cultural_deputy: 'تو دستیار معاون پرورشی/فرهنگی مدرسه هستی. روی فعالیت‌های فرهنگی، مسابقات، رفتار، مشارکت و انگیزش دانش‌آموزان تمرکز کن.',
    super_admin: 'تو دستیار راهبر ارشد سامانه مدرسه هستی. پیشنهادهای فنی، امنیتی، RBAC و گزارش‌های مدیریتی ارائه بده.'
};

const STRUCTURED_OUTPUT_INSTRUCTION = 'فقط JSON معتبر برگردان. ساختار پیشنهادی: {"summary":"...","risks":[...],"recommendations":[...],"kpis":{...}}. هیچ متن خارج از JSON ننویس.';
const inMemoryBuckets = new Map();

function getConfig() {
    const legacyUrl = process.env.AI_API_URL || '';
    const baseUrl = (process.env.AI_API_BASE_URL || (legacyUrl ? legacyUrl.replace(/\/chat\/completions\/?$/, '') : DEFAULT_AI_BASE_URL)).replace(/\/$/, '');
    return {
        baseUrl,
        apiKey: process.env.AI_API_KEY || '',
        model: process.env.AI_DEFAULT_MODEL || process.env.AI_MODEL || DEFAULT_AI_MODEL,
        timeoutMs: DEFAULT_TIMEOUT_MS,
        retries: Math.max(0, DEFAULT_RETRIES)
    };
}

function cleanMessages(messages = []) {
    return messages
        .filter(item => item && ['system', 'user', 'assistant'].includes(item.role) && typeof item.content === 'string')
        .slice(-12)
        .map(item => ({ role: item.role, content: item.content.slice(0, MAX_MESSAGE_CHARS) }));
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function safeProviderText(text) {
    if (!text) return null;
    return String(text).replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [redacted]').slice(0, 1500);
}

function normalizeMaxTokens(maxTokens) {
    const parsed = Number(maxTokens) || 700;
    return Math.max(64, Math.min(parsed, MAX_RESPONSE_TOKENS));
}

function sanitizePrompt(prompt) {
    return String(prompt || '').trim().slice(0, MAX_PROMPT_CHARS);
}

export function checkAIServiceRateLimit(userId, { perMinute = DEFAULT_MINUTE_LIMIT, perDay = DEFAULT_DAILY_LIMIT } = {}) {
    const key = String(userId || 'anonymous');
    const now = Date.now();
    const minuteAgo = now - 60_000;
    const dayAgo = now - 86_400_000;
    const bucket = inMemoryBuckets.get(key) || [];
    const fresh = bucket.filter(ts => ts > dayAgo);
    const lastMinute = fresh.filter(ts => ts > minuteAgo);
    if (lastMinute.length >= perMinute) {
        inMemoryBuckets.set(key, fresh);
        return { allowed: false, statusCode: 429, code: 'AI_RATE_LIMIT_MINUTE', message: 'تعداد درخواست‌های هوش مصنوعی در دقیقه بیش از حد مجاز است.' };
    }
    if (fresh.length >= perDay) {
        inMemoryBuckets.set(key, fresh);
        return { allowed: false, statusCode: 429, code: 'AI_RATE_LIMIT_DAILY_MEMORY', message: 'محدودیت روزانه درخواست هوش مصنوعی تکمیل شده است.' };
    }
    fresh.push(now);
    inMemoryBuckets.set(key, fresh);
    return { allowed: true, remainingToday: Math.max(0, perDay - fresh.length), remainingMinute: Math.max(0, perMinute - lastMinute.length - 1) };
}

async function checkAIDailyQuota({ queryOne, userId, perDay = DEFAULT_DAILY_LIMIT }) {
    if (!queryOne || !userId) return { allowed: true };
    const row = await queryOne(`
        SELECT COUNT(*) AS count
        FROM ai_requests_log
        WHERE user_id = ? AND created_at >= CURDATE()
    `, [userId]).catch(() => null);
    const count = Number(row?.count || 0);
    if (count >= perDay) {
        return { allowed: false, statusCode: 429, code: 'AI_DAILY_QUOTA_EXCEEDED', message: 'سهمیه روزانه هوش مصنوعی برای این کاربر تکمیل شده است.' };
    }
    return { allowed: true, remainingToday: Math.max(0, perDay - count - 1) };
}

async function logAIRequest({ execute, userId, role, prompt, model, tokens, responseTime, requestId }) {
    if (!execute) return;
    await execute(`
        INSERT INTO ai_requests_log (user_id, role, prompt, model, tokens, response_time)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [userId || null, role || null, String(prompt || '').slice(0, 6000), model, tokens || null, responseTime || null]).catch(error => {
        logWarn('ai_request_log_failed', { request_id: requestId, user_id: userId || null, reason: error.message });
    });
}

async function fetchCompletion(url, apiKey, body, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeout);
    }
}

function parseStructuredOutput(content) {
    if (!content) return null;
    try {
        return JSON.parse(content);
    } catch {
        const match = String(content).match(/\{[\s\S]*\}/);
        if (!match) return null;
        try { return JSON.parse(match[0]); } catch { return null; }
    }
}

export async function callGapGPT({
    role = 'student',
    prompt,
    messages = [],
    temperature = 0.4,
    maxTokens = 700,
    userId = null,
    feature = 'chat',
    execute = null,
    queryOne = null,
    enforceRateLimit = false,
    structuredOutput = false,
    requestId = null
}) {
    const safePrompt = sanitizePrompt(prompt);
    if (!safePrompt) {
        return { success: false, statusCode: 400, code: 'AI_EMPTY_PROMPT', message: 'متن درخواست الزامی است.' };
    }

    if (String(prompt || '').length > MAX_PROMPT_CHARS) {
        return { success: false, statusCode: 400, code: 'AI_PROMPT_TOO_LONG', message: 'متن درخواست بیش از حد طولانی است.' };
    }

    const config = getConfig();
    if (!config.apiKey) {
        return { success: false, statusCode: 503, code: 'AI_NOT_CONFIGURED', message: 'AI_API_KEY روی سرور تنظیم نشده است.' };
    }

    if (enforceRateLimit) {
        const memoryRate = checkAIServiceRateLimit(userId || role);
        if (!memoryRate.allowed) return { success: false, statusCode: memoryRate.statusCode, code: memoryRate.code, message: memoryRate.message };
        const dailyRate = await checkAIDailyQuota({ queryOne, userId });
        if (!dailyRate.allowed) return { success: false, statusCode: dailyRate.statusCode, code: dailyRate.code, message: dailyRate.message };
    }

    const startedAt = Date.now();
    const systemPrompt = `${ROLE_SYSTEM_PROMPTS[role] || ROLE_SYSTEM_PROMPTS.student}${structuredOutput ? `\n${STRUCTURED_OUTPUT_INSTRUCTION}` : ''}`;
    const requestMessages = [
        { role: 'system', content: systemPrompt },
        ...cleanMessages(messages),
        { role: 'user', content: safePrompt }
    ];
    const body = {
        model: config.model,
        messages: requestMessages,
        temperature,
        max_tokens: normalizeMaxTokens(maxTokens),
        metadata: { feature }
    };
    if (structuredOutput) {
        body.response_format = { type: 'json_object' };
    }

    let lastError = null;
    for (let attempt = 0; attempt <= config.retries; attempt++) {
        try {
            const response = await fetchCompletion(`${config.baseUrl}/chat/completions`, config.apiKey, body, config.timeoutMs);
            const responseTime = Date.now() - startedAt;
            if (!response.ok) {
                const providerText = safeProviderText(await response.text().catch(() => ''));
                if (response.status >= 500 && attempt < config.retries) {
                    lastError = { status: response.status, providerText };
                    await delay(400 * (attempt + 1));
                    continue;
                }
                await logAIRequest({ execute, userId, role, prompt: safePrompt, model: config.model, tokens: null, responseTime, requestId });
                logWarn('ai_provider_error', { request_id: requestId, user_id: userId, role, feature, status: response.status, response_time_ms: responseTime });
                return {
                    success: false,
                    statusCode: response.status >= 500 ? 502 : 400,
                    code: response.status >= 500 ? 'AI_PROVIDER_UNAVAILABLE' : 'AI_PROVIDER_REJECTED',
                    message: 'خطا در ارتباط با سرویس هوش مصنوعی.',
                    providerStatus: response.status,
                    providerResponse: providerText
                };
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';
            const tokens = data.usage?.total_tokens || data.usage?.completion_tokens || null;
            const structured = structuredOutput ? parseStructuredOutput(content) : null;
            await logAIRequest({ execute, userId, role, prompt: safePrompt, model: config.model, tokens, responseTime, requestId });
            logInfo('ai_completion', { request_id: requestId, user_id: userId, role, feature, model: config.model, tokens, response_time_ms: responseTime, structured_output: structuredOutput });
            return {
                success: true,
                data: {
                    content,
                    structured,
                    model: config.model,
                    usage: data.usage || null,
                    responseTime
                }
            };
        } catch (error) {
            lastError = error;
            if (attempt < config.retries && (error.name === 'AbortError' || /fetch|network|timeout/i.test(error.message))) {
                await delay(400 * (attempt + 1));
                continue;
            }
        }
    }

    const responseTime = Date.now() - startedAt;
    await logAIRequest({ execute, userId, role, prompt: safePrompt, model: config.model, tokens: null, responseTime, requestId });
    logError('ai_completion_failed', lastError, { request_id: requestId, user_id: userId, role, feature, response_time_ms: responseTime });
    return {
        success: false,
        statusCode: 502,
        code: lastError?.name === 'AbortError' ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE',
        message: lastError?.name === 'AbortError' ? 'مهلت پاسخ‌گویی سرویس هوش مصنوعی تمام شد.' : 'سرویس هوش مصنوعی در دسترس نیست.',
        error: safeProviderText(lastError?.message || String(lastError || 'unknown'))
    };
}

export function buildSchoolAIRequest(feature, payload = {}) {
    const safePayload = JSON.stringify(payload, null, 2).slice(0, 4500);
    const featurePrompts = {
        homework_help: `با توجه به داده زیر، دانش‌آموز را برای فهم موضوع راهنمایی کن، روش حل و نکات کلیدی بده، اما جواب آماده تقلبی نده:\n${safePayload}`,
        lesson_explanation: `درس یا مفهوم زیر را ساده، مرحله‌به‌مرحله، با مثال کوتاه و مناسب دانش‌آموز توضیح بده:\n${safePayload}`,
        study_planner: `برای دانش‌آموز زیر یک برنامه مطالعه واقع‌بینانه، قابل اجرا و کوتاه طراحی کن. زمان استراحت و اولویت درس‌ها را هم مشخص کن:\n${safePayload}`,
        quiz_generation: `برای معلم، سؤال‌های آزمون استاندارد با سطح دشواری مناسب، گزینه‌ها/پاسخ‌نامه و بارم کوتاه تولید کن:\n${safePayload}`,
        assignment_generation: `برای معلم، یک تکلیف آموزشی روشن با هدف یادگیری، دستورالعمل، معیار ارزیابی و مهلت پیشنهادی تولید کن:\n${safePayload}`,
        performance_summary: `خلاصه عملکرد تحصیلی/حضور را با نقاط قوت، نگرانی‌ها و پیشنهادهای عملی بنویس. داده‌های خصوصی غیرضروری را افشا نکن:\n${safePayload}`,
        parent_progress_summary: `برای ولی دانش‌آموز، وضعیت پیشرفت فرزند را با زبان ساده، محترمانه و پیشنهادهای عملی خانگی خلاصه کن:\n${safePayload}`,
        admin_analytics_summary: `برای مدیر/ادمین، داده‌های مدرسه را به JSON مدیریتی شامل summary، risks، recommendations و kpis تبدیل کن:\n${safePayload}`,
        counseling_summary: `متن مشاوره را بدون افشای جزئیات غیرضروری خلاصه کن و اقدامات پیگیری امن پیشنهاد بده:\n${safePayload}`,
        announcement_sms_summary: `اطلاعیه را در حداکثر ۲ پیامک فارسی کوتاه، رسمی و قابل ارسال به والدین خلاصه کن:\n${safePayload}`,
        attendance_risk: `بر اساس داده حضور و غیاب، ریسک‌ها و اقدام‌های پیشنهادی مدرسه را خلاصه کن:\n${safePayload}`,
        grade_drop_alert: `بر اساس افت نمره دانش‌آموز، متن هشدار کوتاه و محترمانه برای ولی و اقدام‌های پیشنهادی مدرسه بنویس:\n${safePayload}`,
        counselor_risk_alert: `بر اساس پرچم ریسک مشاوره، یک خلاصه مدیریتی بسیار محتاط و بدون جزئیات محرمانه برای مدیر بنویس:\n${safePayload}`
    };

    return featurePrompts[feature] || `درخواست مدرسه را تحلیل کن و پاسخ کاربردی، امن و قابل استفاده بده:\n${safePayload}`;
}

export default {
    callGapGPT,
    buildSchoolAIRequest,
    checkAIServiceRateLimit
};
