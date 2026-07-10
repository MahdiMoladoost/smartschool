# Production Deployment Guide

This guide focuses on proving the system actually runs end-to-end before production traffic is allowed.

## 1. Required environment variables

Create `.env` from `.env.example` and set real values:

```env
NODE_ENV=production
REQUIRE_DB=true
PORT=3000
CORS_ORIGINS=https://your-school-domain.example

DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=smartschool
DB_PASSWORD=replace_with_secret
DB_NAME=smart_school

JWT_SECRET=replace_with_long_random_secret

AI_API_BASE_URL=https://api.gapgpt.app/v1
AI_API_KEY=replace_with_real_gapgpt_key
AI_DEFAULT_MODEL=gpt-4o

SMS_PROVIDER=generic_json
SMS_API_KEY=replace_with_real_sms_key
SMS_API_URL=https://your-sms-provider-send-endpoint
SMS_SENDER_NUMBER=9982002811
```

Production startup now fails if `JWT_SECRET` is missing or left as a default placeholder.

## 2. Install and verify locally on server

```bash
npm ci --omit=dev
npm run db:init
npm run db:seed
npm start
```

In another shell:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/db
LIVE_BASE_URL=http://localhost:3000 LIVE_SKIP_DB_SETUP=true npm run live:verify
```

## 3. Required deployment gates

Do not deploy until these pass:

```bash
npm run verify:ci
npm run smoke:nodb
npm run live:verify
```

Then verify real providers:

```bash
RUN_REAL_AI_TEST=true npm run live:verify
RUN_REAL_SMS_TEST=true TEST_SMS_RECIPIENT=09123456789 npm run live:verify
```

## 4. Demo users and production policy

Seeded demo users are for verification and demos only. Before public launch:

- Change all seeded passwords.
- Disable or delete demo users not needed in production.
- Keep at least one real `super_admin` with a strong password.
- Do not expose demo credentials in public docs or logs.

The server startup banner no longer prints demo credentials in `NODE_ENV=production`.

## 5. Security configuration

- `.env` and `.env.*` are gitignored.
- Helmet is enabled.
- API rate limiting is enabled.
- Login rate limiting is enabled.
- CORS is restricted by `CORS_ORIGINS` in production.
- AI/SMS credentials are backend-only.
- Raw provider responses are redacted before logs.
- Raw internal errors are handled by the JSON error handler.

## 6. Monitoring recommendations

Monitor:

- `/api/health`
- `/api/health/db`
- HTTP 5xx rate
- MySQL CPU/disk usage
- `ai_requests_log` latency and failures
- `sms_logs` failure classifications
- `ai_automation_logs` failed automations
- application JSON logs by `request_id`

## 7. Rollback

1. Stop app service.
2. Restore previous release artifact.
3. Restore DB backup only if migration/data corruption occurred.
4. Restart app.
5. Run `npm run live:verify`.
