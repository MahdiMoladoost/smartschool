// Example adapter template for a real SMS provider. Copy this file, rename the
// factory, and map the provider-specific response fields to the normalized
// { status, classification, providerResponse } shape used by smsService.js.
import { buildSMSProviderConfig, classifyProviderStatus, fetchWithTimeout, missingProviderConfig } from './providerUtils.js';

export function createExampleProvider(env = process.env) {
    const config = buildSMSProviderConfig(env);
    return {
        name: 'example_provider',
        contract: {
            endpoint: 'Set SMS_API_URL to the provider send endpoint.',
            method: 'POST',
            headers: ['Authorization or API key header required by your provider'],
            payload: 'Map recipient/message/sender to your provider contract.',
            success: 'Return status=sent for a confirmed provider success.',
            error: 'Return failed or retryable_failed with a classification.'
        },
        async send({ recipient, message }) {
            if (!config.apiKey || !config.providerUrl) return missingProviderConfig(config);
            const response = await fetchWithTimeout(config.providerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': config.apiKey },
                body: JSON.stringify({ from: config.sender, to: recipient, text: message })
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
