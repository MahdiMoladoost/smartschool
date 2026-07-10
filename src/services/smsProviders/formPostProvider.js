import { buildSMSProviderConfig, classifyProviderStatus, fetchWithTimeout, missingProviderConfig } from './providerUtils.js';

export function createFormPostProvider(env = process.env) {
    const config = buildSMSProviderConfig(env);
    return {
        name: 'form_post',
        contract: {
            method: 'POST',
            headers: ['Content-Type: application/x-www-form-urlencoded'],
            payload: 'api_key=${SMS_API_KEY}&sender=${SMS_SENDER_NUMBER}&receptor=+989123456789&message=...',
            success: 'HTTP 2xx. Provider body is stored in sms_logs.provider_response.',
            error: 'HTTP 4xx/5xx or network timeout. Classification is stored in provider_response.classification.'
        },
        async send({ recipient, message }) {
            if (!config.apiKey || !config.providerUrl) return missingProviderConfig(config);
            const params = new URLSearchParams({ api_key: config.apiKey, sender: config.sender, receptor: recipient, message });
            const response = await fetchWithTimeout(config.providerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            }, config.timeoutMs);
            const text = await response.text().catch(() => '');
            const classification = classifyProviderStatus({ status: response.status, message: text });
            return {
                status: response.ok ? 'sent' : (response.status >= 500 || response.status === 429 ? 'retryable_failed' : 'failed'),
                classification,
                providerResponse: { status: response.status, body: text }
            };
        }
    };
}
