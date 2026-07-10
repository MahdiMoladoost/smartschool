# SMS Provider Integration Contract

SMS sending is backend-only and provider-agnostic. The active adapter is selected with:

```env
SMS_PROVIDER=generic_json
SMS_API_URL=https://provider.example/send
SMS_API_KEY=your_key
SMS_SENDER_NUMBER=9982002811
```

## Built-in provider adapters

Adapters live in:

```text
src/services/smsProviders/
```

Current adapters:

- `generic_json`
- `form_post`
- `example_provider`

## Generic JSON provider contract

Endpoint:

```text
${SMS_API_URL}
```

Method:

```text
POST
```

Headers:

```http
Content-Type: application/json
Authorization: Bearer ${SMS_API_KEY}
```

Payload:

```json
{
  "sender": "9982002811",
  "recipient": "+989123456789",
  "message": "متن پیامک"
}
```

Success response:

- HTTP `2xx`
- body can be any JSON/text; it is stored redacted in `sms_logs.provider_response`

Error response:

- HTTP `400`/`422`: validation error
- HTTP `401`/`403`: auth error
- HTTP `429`: provider rate limit and retryable
- HTTP `5xx`: provider server error and retryable
- timeout/network error: retryable and may open circuit breaker

## Form POST provider contract

Endpoint:

```text
${SMS_API_URL}
```

Method:

```text
POST
```

Headers:

```http
Content-Type: application/x-www-form-urlencoded
```

Payload:

```text
api_key=${SMS_API_KEY}&sender=${SMS_SENDER_NUMBER}&receptor=+989123456789&message=متن پیامک
```

## Adding a real provider

1. Copy `src/services/smsProviders/exampleProvider.js`.
2. Rename the factory, for example `createKavenegarProvider`.
3. Map the provider-specific request payload.
4. Map the provider response to:

```js
{
  status: 'sent' | 'failed' | 'retryable_failed' | 'provider_not_configured',
  classification: 'ok' | 'auth_error' | 'validation_error' | 'provider_rate_limit' | 'provider_server_error' | 'timeout' | 'network_error',
  providerResponse: { status: 200, body: '...' }
}
```

5. Register it in `src/services/smsProviders/index.js`.
6. Set `SMS_PROVIDER=your_provider_name` in `.env`.
7. Run:

```bash
RUN_REAL_SMS_TEST=true TEST_SMS_RECIPIENT=09123456789 npm run live:verify
```
