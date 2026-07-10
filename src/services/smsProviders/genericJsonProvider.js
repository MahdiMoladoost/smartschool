import { buildSMSProviderConfig, classifyProviderStatus, fetchWithTimeout, missingProviderConfig } from './providerUtils.js';

export function createGenericJsonProvider(env = process.env) {
    const config = buildSMSProviderConfig(env);
    return {
        name: 'generic_json',
        contract: {
            method: 'POST',
            headers: ['Content-Type: application/json', 'Authorization: Bearer ${SMS_API_KEY}'],
            payload: { sender: '${SMS_SENDER_NUMBER}', recipient: '+989123456789', message: 'متن پیامک' },
            success: 'HTTP 2xx. Provider body is stored in sms_logs.provider_response.',
            error: 'HTTP 4xx/5xx or network timeout. Classification is stored in provider_response.classification.'
        },
        async send({ recipient, message }) {
            if (!config.apiKey || !config.providerUrl) return missingProviderConfig(config);
            const response = await fetchWithTimeout(config.providerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({ sender: config.sender, recipient, message })
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
