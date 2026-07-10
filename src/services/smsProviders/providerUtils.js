export async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

export function classifyProviderStatus({ status, errorName, message = '' }) {
    const text = String(message || '').toLowerCase();
    if (errorName === 'AbortError' || text.includes('timeout')) return 'timeout';
    if (status === 401 || status === 403) return 'auth_error';
    if (status === 400 || status === 422) return 'validation_error';
    if (status === 429) return 'provider_rate_limit';
    if (status >= 500) return 'provider_server_error';
    if (text.includes('network') || text.includes('fetch')) return 'network_error';
    return status >= 200 && status < 300 ? 'ok' : 'unknown_provider_error';
}

export function buildSMSProviderConfig(env = process.env) {
    return {
        apiKey: env.SMS_API_KEY || env.KAVENEGAR_API_KEY || '',
        sender: env.SMS_SENDER_NUMBER || '9982002811',
        providerUrl: env.SMS_API_URL || '',
        timeoutMs: Number(env.SMS_TIMEOUT_MS || 12000)
    };
}

export function missingProviderConfig(config) {
    return {
        status: 'provider_not_configured',
        classification: 'configuration_missing',
        providerResponse: { message: 'SMS_API_KEY یا SMS_API_URL تنظیم نشده است.' }
    };
}
