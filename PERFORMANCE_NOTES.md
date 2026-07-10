# Performance Notes

## Implemented query hardening

- Added/verified indexes for high-frequency student lookups:
  - `attendance(student_id, date)`
  - `attendance(class_id, date)`
  - `grades(student_id, updated_at)`
  - `parent_children(parent_id)` and `parent_children(student_id)`
  - `sms_logs(recipient_number, created_at)`
  - `sms_logs(message_hash)`
  - `ai_requests_log(user_id, created_at)`
  - `counseling_requests(student_id, status)`
  - `counseling_sessions(risk_level, created_at)`

## Pagination

- Added pagination to large Phase 2/3 operational endpoints:
  - `GET /api/v1/sms/logs?page=&limit=`
  - `GET /api/v1/counselor/requests?page=&limit=`
  - `GET /api/v1/counselor/sessions?page=&limit=`
- Existing legacy endpoints already had mixed pagination. A future cleanup should standardize all list endpoints to `{ data, pagination }`.

## Rate limiting and quota

- API rate limit: global `/api/` limiter.
- Login limiter: stricter auth login limit.
- AI limiter: per-minute memory limiter + per-user daily quota backed by `ai_requests_log`.
- SMS limiter: duplicate suppression, per-user daily limit, global per-minute limiter, and provider circuit breaker.

## Query safety

- Dynamic values use prepared-statement parameters in new Phase 3 routes and services.
- Remaining legacy SQL uses a mix of prepared parameters and sanitized numeric interpolation for pagination. This was not fully rewritten to avoid high-risk monolith changes.

## Accepted performance risks

- `src/routes/legacyRoutes.js` remains large. It is extracted from `server.js`, but not fully decomposed into small controllers yet.
- Some old legacy list endpoints still need consistent pagination and total counts.
- External AI/SMS provider latency is controlled with timeouts/retries, but live provider behavior must be profiled after credentials are configured.
