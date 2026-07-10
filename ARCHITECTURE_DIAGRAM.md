# Final Architecture Diagram - Text View

```text
Browser / Role Dashboard
   |
   | HTTPS requests with JWT
   v
Express server.js bootstrap (18 lines)
   |
   v
src/routes/legacyRoutes.js
   |-- legacy public pages and existing APIs
   |-- mounts src/routes/aiRoutes.js
   |-- mounts src/routes/automationRoutes.js
   |-- mounts poll routes
   |
   +--> Middleware layer
   |      - request id correlation
   |      - Helmet security headers
   |      - CORS
   |      - API/login rate limits
   |      - JSON body parsing
   |      - JWT authentication
   |      - role guards
   |
   +--> Controller layer
   |      - src/controllers/aiFeatureController.js
   |      - src/controllers/automationController.js
   |      - selected legacy inline controllers pending future extraction
   |
   +--> Service layer
   |      - src/services/aiService.js
   |      - src/services/smsService.js
   |      - src/utils/db.js transaction helper
   |      - src/utils/logger.js structured JSON logs
   |
   +--> External integrations
   |      - GapGPT API through backend only
   |      - SMS provider adapter through backend only
   |
   v
MySQL database
   |-- users / roles / permissions
   |-- parent_children ownership
   |-- classes / courses / assignments / grades / attendance
   |-- counseling_requests / counseling_sessions
   |-- sms_logs
   |-- ai_requests_log
   |-- ai_automation_logs
```

## Request flow

1. Request enters `server.js` and the extracted legacy route app.
2. `requestContext` assigns an `X-Request-Id`.
3. Security middleware applies headers and rate limits.
4. Protected routes validate JWT and role.
5. Controllers validate payloads and ownership.
6. Services perform AI/SMS work with retries, timeouts, quotas, logging, and safe errors.
7. Database access uses prepared statements; transactional multi-step writes use `withTransaction()`.
8. Responses use predictable JSON shapes with safe messages.

## Automation layer

- Attendance/grade/counselor/announcement automations live in `src/controllers/automationController.js`.
- Automation write steps use DB transactions for SMS logs and automation logs.
- AI output is generated before transactional writes to avoid holding DB locks during provider latency.
