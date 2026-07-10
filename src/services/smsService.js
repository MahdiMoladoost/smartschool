import crypto from 'crypto';
import { logInfo, logWarn, logError } from '../utils/logger.js';
import { getSMSAdapter as resolveSMSAdapter } from './smsProviders/index.js';
import { classifyProviderStatus } from './smsProviders/providerUtils.js';

const DEFAULT_DUPLICATE_WINDOW_SECONDS = Number(process.env.SMS_DUPLICATE_WINDOW_SECONDS || 300);
const DEFAULT_TIMEOUT_MS = Number(process.env.SMS_TIMEOUT_MS || 12000);
const DEFAULT_RETRIES = Number(process.env.SMS_RETRY_ATTEMPTS || 2);
const DEFAULT_USER_DAILY_LIMIT = Number(process.env.SMS_USER_DAILY_LIMIT || 30);
const DEFAULT_GLOBAL_PER_MINUTE_LIMIT = Number(process.env.SMS_GLOBAL_PER_MINUTE_LIMIT || 120);
const CIRCUIT_FAILURE_THRESHOLD = Number(process.env.SMS_CIRCUIT_FAILURE_THRESHOLD || 5);
const CIRCUIT_OPEN_SECONDS = Number(process.env.SMS_CIRCUIT_OPEN_SECONDS || 120);

const globalSendTimestamps = [];
const circuitState = new Map();

export function normalizePhoneNumber(input) {
    if (!input) return null;
    let number = String(input).trim()
        .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
        .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
        .replace(/[\s\-()]/g, '');

    if (number.startsWith('0098')) number = `+98${number.slice(4)}`;
    if (number.startsWith('98') && number.length === 12) number = `+${number}`;
    if (number.startsWith('09') && number.length === 11) number = `+98${number.slice(1)}`;

    return /^\+989\d{9}$/.test(number) ? number : null;
}

function hashMessage(number, message, eventType) {
    return crypto.createHash('sha256').update(`${number}|${eventType}|${message}`).digest('hex');
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function safeProviderResponse(value) {
    return String(value || '')
        .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [redacted]')
        .replace(/(api[_-]?key|token|password|secret)["'\s:=]+[^\s"'}]+/gi, '$1=[redacted]')
        .slice(0, 2000);
}

function checkGlobalRateLimit() {
    const now = Date.now();
    const minuteAgo = now - 60_000;
    while (globalSendTimestamps.length && globalSendTimestamps[0] < minuteAgo) globalSendTimestamps.shift();
    if (globalSendTimestamps.length >= DEFAULT_GLOBAL_PER_MINUTE_LIMIT) {
        return { allowed: false, status: 'rate_limited', classification: 'global_rate_limit' };
    }
    globalSendTimestamps.push(now);
    return { allowed: true };
}

function getCircuit(provider) {
    const state = circuitState.get(provider) || { failures: 0, openedUntil: 0 };
    if (state.openedUntil && Date.now() < state.openedUntil) {
        return { allowed: false, status: 'circuit_open', classification: 'provider_circuit_open', openedUntil: state.openedUntil };
    }
    if (state.openedUntil && Date.now() >= state.openedUntil) {
        state.failures = 0;
        state.openedUntil = 0;
        circuitState.set(provider, state);
    }
    return { allowed: true, state };
}

function recordCircuitResult(provider, status) {
    const state = circuitState.get(provider) || { failures: 0, openedUntil: 0 };
    if (status === 'sent' || status === 'provider_not_configured' || status === 'duplicate_suppressed' || status === 'rate_limited') {
        if (status === 'sent') state.failures = 0;
        circuitState.set(provider, state);
        return;
    }
    if (status === 'retryable_failed' || status === 'failed') {
        state.failures += 1;
        if (state.failures >= CIRCUIT_FAILURE_THRESHOLD) {
            state.openedUntil = Date.now() + (CIRCUIT_OPEN_SECONDS * 1000);
            logWarn('sms_circuit_opened', { provider, failures: state.failures, opened_until: new Date(state.openedUntil).toISOString() });
        }
        circuitState.set(provider, state);
    }
}

export function getSMSAdapter(provider = process.env.SMS_PROVIDER || 'generic_json') {
    return resolveSMSAdapter(provider);
}

async function logSMS({ execute, userId, normalized, safeMessage, status, providerResponse, eventType, messageHash, attempts, latencyMs, classification }) {
    if (!execute) return;
    const responsePayload = providerResponse ? { ...providerResponse, classification, latency_ms: latencyMs } : { classification, latency_ms: latencyMs };
    await execute(`
        INSERT INTO sms_logs (user_id, recipient_number, message, message_hash, status, provider_response, event_type, attempts, last_attempt_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [userId, normalized, safeMessage, messageHash, status, safeProviderResponse(JSON.stringify(responsePayload)), eventType, attempts]).catch(async () => {
        await execute(`
            INSERT INTO sms_logs (user_id, recipient_number, message, status, provider_response, event_type)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [userId, normalized, safeMessage, status, safeProviderResponse(JSON.stringify(responsePayload)), eventType]).catch(() => null);
    });
}

async function checkUserDailyLimit({ queryOne, userId }) {
    if (!queryOne || !userId) return { allowed: true };
    const row = await queryOne(`
        SELECT COUNT(*) AS count
        FROM sms_logs
        WHERE user_id = ? AND status IN ('sent','provider_not_configured','retryable_failed','failed') AND created_at >= CURDATE()
    `, [userId]).catch(() => null);
    const count = Number(row?.count || 0);
    if (count >= DEFAULT_USER_DAILY_LIMIT) {
        return { allowed: false, status: 'rate_limited', classification: 'user_daily_limit' };
    }
    return { allowed: true, remainingToday: Math.max(0, DEFAULT_USER_DAILY_LIMIT - count - 1) };
}

export async function sendSMS({
    recipientNumber,
    message,
    execute,
    queryOne,
    userId = null,
    eventType = 'manual',
    provider = process.env.SMS_PROVIDER || 'generic_json',
    requestId = null
}) {
    const normalized = normalizePhoneNumber(recipientNumber);
    const safeMessage = typeof message === 'string' ? message.trim().slice(0, 1000) : '';
    const startedAt = Date.now();

    if (!normalized) {
        return { success: false, status: 'invalid_number', classification: 'validation_error', message: 'شماره موبایل ایران معتبر نیست. نمونه صحیح: 09123456789' };
    }
    if (!safeMessage) {
        return { success: false, status: 'empty_message', classification: 'validation_error', message: 'متن پیامک الزامی است.' };
    }

    const messageHash = hashMessage(normalized, safeMessage, eventType);
    if (queryOne) {
        const duplicate = await queryOne(`
            SELECT id FROM sms_logs
            WHERE recipient_number = ? AND (message_hash = ? OR message = ?) AND created_at >= DATE_SUB(NOW(), INTERVAL ? SECOND)
            LIMIT 1
        `, [normalized, messageHash, safeMessage, DEFAULT_DUPLICATE_WINDOW_SECONDS]).catch(() => null);
        if (duplicate) {
            await logSMS({ execute, userId, normalized, safeMessage, status: 'duplicate_suppressed', providerResponse: { duplicateOf: duplicate.id }, eventType, messageHash, attempts: 0, latencyMs: Date.now() - startedAt, classification: 'duplicate' });
            return { success: false, status: 'duplicate_suppressed', classification: 'duplicate', recipientNumber: normalized, message: 'ارسال تکراری پیامک جلوگیری شد.' };
        }
    }

    const dailyLimit = await checkUserDailyLimit({ queryOne, userId });
    if (!dailyLimit.allowed) {
        await logSMS({ execute, userId, normalized, safeMessage, status: dailyLimit.status, providerResponse: { reason: dailyLimit.classification }, eventType, messageHash, attempts: 0, latencyMs: Date.now() - startedAt, classification: dailyLimit.classification });
        return { success: false, status: dailyLimit.status, classification: dailyLimit.classification, message: 'محدودیت روزانه ارسال پیامک تکمیل شده است.' };
    }

    const globalLimit = checkGlobalRateLimit();
    if (!globalLimit.allowed) {
        await logSMS({ execute, userId, normalized, safeMessage, status: globalLimit.status, providerResponse: { reason: globalLimit.classification }, eventType, messageHash, attempts: 0, latencyMs: Date.now() - startedAt, classification: globalLimit.classification });
        return { success: false, status: globalLimit.status, classification: globalLimit.classification, message: 'محدودیت کلی ارسال پیامک فعال است.' };
    }

    const adapter = getSMSAdapter(provider);
    const circuit = getCircuit(adapter.name);
    if (!circuit.allowed) {
        await logSMS({ execute, userId, normalized, safeMessage, status: circuit.status, providerResponse: { openedUntil: circuit.openedUntil }, eventType, messageHash, attempts: 0, latencyMs: Date.now() - startedAt, classification: circuit.classification });
        return { success: false, status: circuit.status, classification: circuit.classification, message: 'ارسال پیامک موقتاً به دلیل خطای مکرر سرویس‌دهنده متوقف شده است.' };
    }

    let status = 'pending';
    let providerResponse = null;
    let classification = 'unknown';
    let attempts = 0;

    for (let attempt = 0; attempt <= DEFAULT_RETRIES; attempt++) {
        attempts = attempt + 1;
        try {
            const result = await adapter.send({ recipient: normalized, message: safeMessage });
            status = result.status;
            classification = result.classification || classifyProviderStatus({ status: result.providerResponse?.status, message: result.providerResponse?.body });
            providerResponse = { adapter: adapter.name, ...result.providerResponse };
            if (status !== 'retryable_failed') break;
            if (attempt < DEFAULT_RETRIES) await delay(500 * (attempt + 1));
        } catch (error) {
            status = 'retryable_failed';
            classification = classifyProviderStatus({ errorName: error.name, message: error.message });
            providerResponse = { adapter: adapter.name, error: error.name === 'AbortError' ? 'timeout' : error.message };
            if (attempt < DEFAULT_RETRIES) await delay(500 * (attempt + 1));
        }
    }

    recordCircuitResult(adapter.name, status);
    const latencyMs = Date.now() - startedAt;
    await logSMS({ execute, userId, normalized, safeMessage, status, providerResponse, eventType, messageHash, attempts, latencyMs, classification });

    if (status === 'sent') {
        logInfo('sms_sent', { request_id: requestId, user_id: userId, event_type: eventType, provider: adapter.name, latency_ms: latencyMs, attempts });
    } else {
        logWarn('sms_not_sent', { request_id: requestId, user_id: userId, event_type: eventType, provider: adapter.name, status, classification, latency_ms: latencyMs, attempts });
    }

    return {
        success: status === 'sent',
        status,
        classification,
        recipientNumber: normalized,
        attempts,
        latency_ms: latencyMs,
        message: status === 'sent' ? 'پیامک ارسال شد.' : 'پیامک ارسال نشد؛ وضعیت در لاگ ثبت شد.'
    };
}

export default {
    sendSMS,
    normalizePhoneNumber,
    getSMSAdapter
};
