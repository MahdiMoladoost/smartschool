# Phase 2 Implementation Report — Production Hardening Foundation

## Scope completed

This phase continued from the repaired project package and implemented the next production-readiness layer without doing a broad rewrite. The project remains a Node.js/Express + MySQL application, but the highest-risk areas were moved toward reusable schema, service, controller, and route foundations.

## Architecture overview

- `server.js`: still the primary Express bootstrap and legacy route host. The final 404/error handler remains at the true end of the file.
- `src/data/migrations/001_full_schema.sql`: canonical MySQL schema used by both standalone seed and reusable database setup.
- `src/data/schemaRunner.js`: reusable migration runner, SQL splitter, and compatibility migration helper.
- `src/services/aiService.js`: centralized GapGPT/OpenAI-compatible AI client with timeout, retry, rate limiting, safe errors, and usage logging.
- `src/services/smsService.js`: provider-agnostic SMS service with Iranian phone validation, adapter layer, retry, duplicate suppression, and logging.
- `src/controllers/aiFeatureController.js`: AI feature controller layer for student, teacher, parent, and admin AI tools.
- `src/controllers/automationController.js`: AI + SMS automation controller layer.
- `src/routes/aiRoutes.js`: modular AI feature routes mounted at `/api/v1/ai`.
- `src/routes/automationRoutes.js`: modular AI/SMS automation routes mounted at `/api/v1/automation`.
- `src/middleware/security.js`: rate-limit responses standardized to safe JSON.
- `scripts/verify-schema-contracts.mjs`: static schema contract verifier.

## Database verification and migration

### Canonical migration

The full schema is now in:

```text
src/data/migrations/001_full_schema.sql
```

Both `seed-data.js` and `src/config/database.js` use the same migration runner, avoiding the previous risk where `seed-data.js`, `server.js`, and config-level setup could create different schemas.

### Verified schema contract

Command run:

```bash
npm run schema:verify
```

Result:

```text
✅ Schema contract verification passed (42 tables checked).
```

### Important verified tables

- `users`
- `roles`
- `permissions`
- `role_permissions`
- `classes`
- `class_students`
- `courses`
- `course_teachers`
- `enrollments`
- `weekly_schedule_entries`
- `attendance_session_records`
- `attendance`
- `grades`
- `assignments`
- `submissions`
- `exams`
- `exam_questions`
- `exam_results`
- `announcements`
- `announcements_read`
- `messages`
- `tickets`
- `ticket_replies`
- `meetings`
- `leave_requests`
- `payments`
- `registrations`
- `homepage_news`
- `homepage_gallery_items`
- `settings`
- `admin_logs`
- `ai_logs`
- `ai_requests_log`
- `sms_logs`
- `ai_automation_logs`
- `parent_children`
- `digital_library`
- `counseling_requests`
- `counseling_sessions`
- `school_events`
- `student_activity_records`
- `backups`

### Relationship highlights

- `parent_children.parent_id` and `parent_children.student_id` both reference `users.id` and enforce parent/student linkage.
- `course_teachers.course_id` references `courses.id`, and `course_teachers.teacher_id` references `users.id`, supporting teacher ownership checks.
- `enrollments` links students, courses, and classes.
- `grades`, `attendance`, `assignments`, `submissions`, `exams`, and `exam_results` are linked to users/courses/classes as needed for role dashboards.
- `counseling_requests` and `counseling_sessions` link students, counselors, and optionally parents/creators while keeping private session notes in counselor-scoped tables.
- `sms_logs`, `ai_requests_log`, and `ai_automation_logs` are audit tables for production observability.

Full details are documented in `SCHEMA_OVERVIEW.md`.

## AI service completion

Centralized service:

```text
src/services/aiService.js
```

Implemented:

- GapGPT/OpenAI-compatible endpoint:
  - `AI_API_BASE_URL=https://api.gapgpt.app/v1`
  - `AI_API_KEY`
  - `AI_DEFAULT_MODEL=gpt-4o`
- Backend-only usage; no frontend exposure of API key.
- Timeout handling using `AbortController`.
- Retry with backoff for transient failures.
- Safe error responses that do not expose provider internals or secrets.
- In-memory user+feature rate limiting.
- Detailed logging to `ai_requests_log`.
- Existing public AI chat and teacher AI exam generation were routed through the centralized AI service.

### AI request log table

`ai_requests_log` fields include:

- `id`
- `user_id`
- `role`
- `feature`
- `prompt`
- `model`
- `tokens`
- `response_time`
- `status`
- `error_message`
- `created_at`

The requested core fields are present, with extra production fields for feature/status/error tracking.

## SMS service completion

Centralized service:

```text
src/services/smsService.js
```

Implemented:

- Provider-agnostic adapter layer.
- `generic_json` adapter.
- `form_post` adapter.
- Iranian mobile validation and normalization to `+989xxxxxxxxx`.
- Retry handling.
- Timeout handling.
- Duplicate/spam suppression using message hash and time window.
- Safe provider response redaction.
- Logging to `sms_logs`.
- Support for `SMS_API_KEY`, `SMS_SENDER_NUMBER`, `SMS_API_URL`, `SMS_PROVIDER`, `SMS_TIMEOUT_MS`, `SMS_RETRY_ATTEMPTS`, and `SMS_DUPLICATE_WINDOW_SECONDS`.

A real provider can be added by adding a new adapter in `getSMSAdapter()` without changing controllers.

## RBAC hardening

Implemented and documented in:

```text
API_SECURITY_MATRIX.md
```

Important enforced rules in new routes:

- AI student features: `student` only.
- AI teacher features: `teacher`, with teacher-student ownership validation for performance summaries.
- AI parent summary: `parent`, with `parent_children` ownership validation.
- Admin analytics: `admin`, `super_admin`, `principal`.
- Attendance/grade automations: management/admin/counselor scopes plus parent/student ownership protection where applicable.
- Counselor risk automation: counselor/management roles only; counselor can alert only for sessions assigned to them; private notes are not included in SMS content.
- Announcement AI+SMS automation: admin/management roles only.

The legacy app still contains many large monolithic routes. The most sensitive new AI/SMS/automation routes now enforce backend authentication, role checks, and ownership checks where relevant.

## AI features implemented

### Student

- Homework assistant: `POST /api/v1/ai/student/homework-assistant`
- Lesson explanation: `POST /api/v1/ai/student/lesson-explanation`
- Study planner: `POST /api/v1/ai/student/study-planner`

### Teacher

- Quiz generator: `POST /api/v1/ai/teacher/quiz-generator`
- Assignment generator: `POST /api/v1/ai/teacher/assignment-generator`
- Student performance summary: `POST /api/v1/ai/teacher/performance-summary`

### Parent

- Student progress summary: `POST /api/v1/ai/parent/student/:studentId/progress-summary`

### Admin / Principal

- School analytics summary: `POST /api/v1/ai/admin/analytics-summary`

All implemented AI features use the centralized AI service.

## AI + SMS automations implemented

Routes:

- `POST /api/v1/automation/attendance-drop/:studentId`
- `POST /api/v1/automation/grade-drop/:studentId`
- `POST /api/v1/automation/counselor-risk/:sessionId`
- `POST /api/v1/automation/announcement-summary`

Implemented automations:

- Attendance drop detection and optional parent SMS notification.
- Significant grade drop detection and optional parent SMS notification.
- Counselor risk flag notification to management, without exposing private counselor notes.
- AI announcement summarization and optional SMS summary delivery by target role.

Automation runs are logged in `ai_automation_logs`.

## Project hardening

Implemented:

- Express API rate limiting.
- Login-specific stricter limiter.
- Centralized safe JSON error handler.
- Safe rate-limit JSON responses.
- Morgan request logging.
- Backend-only AI/SMS secrets.
- Removal of unused server-side `xlsx` dependency and import.
- `npm audit --omit=dev` now reports zero known production dependency vulnerabilities.
- Config settings no longer expose raw AI/SMS key values.

## API inventory

All detected API and page routes are listed in:

```text
API_ROUTE_INVENTORY.md
```

This inventory currently contains 211 unique method/path entries after normalizing duplicate monolith definitions for readability.

## Verification commands run

```bash
npm install
npm run schema:verify
npm run panels:validate
node --check server.js
node --check seed-data.js
node --check src/data/schemaRunner.js
node --check src/services/aiService.js
node --check src/services/smsService.js
node --check src/controllers/aiFeatureController.js
node --check src/controllers/automationController.js
node --check src/routes/aiRoutes.js
node --check src/routes/automationRoutes.js
node --check src/middleware/security.js
node --check src/controllers/settingsController.js
node --check src/config/database.js
node --check scripts/verify-schema-contracts.mjs
npm audit --omit=dev
```

Results:

- Syntax checks: passed.
- Schema contract verification: passed.
- Panel validation: passed, 98 modular panel pages.
- Production dependency audit: zero known vulnerabilities.

### Service smoke tests

Verified locally with Node:

- Iranian SMS phone normalization.
- Invalid Iranian phone rejection.
- SMS provider-not-configured safe response.
- AI prompt builder.
- AI rate limiter basic allowance.
- AI no-key safe `503` response.

Result:

```text
✅ AI/SMS service smoke tests passed.
```

### Route startup verification

Started server directly in no-DB mode:

```bash
PORT=3101 REQUIRE_DB=false NODE_ENV=development JWT_SECRET=testsecret AI_API_KEY= SMS_API_URL= node server.js
```

Verified status codes:

```text
/                                      200
/login                                 200
/dashboard/principal                   200
/dashboard/executive-deputy            200
/dashboard/cultural-deputy             200
/dashboard/counselor                   200
/api/v1/ai/student/homework-assistant  401 without token
/api/v1/automation/attendance-drop/6   401 without token
/api/v1/portal/overview                401 without token
/api/v1/sms/logs                       401 without token
```

## Not runtime-verified

A real MySQL runtime verification could not be completed in this sandbox because no MySQL client/server or Docker runtime is installed:

- `mysql`: not available
- `mysqld`: not available
- `docker`: not available

Therefore, SQL was statically verified for schema contracts and application startup was verified in DB-optional mode. To fully close this verification gap, run these commands on a machine with MySQL:

```bash
CREATE DATABASE smartschool CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci;
cp .env.example .env
# Fill DB_* and JWT_SECRET
npm install
npm run db:init
npm start
```

Then exercise login and protected APIs with real users from the seed data.

## Remaining risks

- `server.js` remains a large monolith with many pre-existing duplicate route definitions. The project has duplicate-route replacement, and new AI/automation routes were modularized, but a future pass should continue splitting legacy admin/teacher/student/parent routes into `src/routes` and `src/controllers`.
- The browser-side `public/assets/js/xlsx.full.min.js` remains because current panels use it for Excel exports. The unused server-side npm dependency was removed and production audit is clean, but the static browser export library should be reviewed or replaced with CSV export in a future hardening pass.
- Real GapGPT calls were not performed because no real key should be committed and no runtime key was provided in the sandbox.
- Real SMS sending was not performed because no concrete provider endpoint/API contract was supplied. The adapter layer is ready for provider integration.
- Full end-to-end database API flow requires a real MySQL runtime.

## Confidence levels

- Schema contract: Verified statically.
- Seed/schema alignment: Implemented and statically verified.
- AI service: Implemented and service-smoke verified, real provider call not verified.
- SMS service: Implemented and service-smoke verified, real provider delivery not verified.
- New RBAC-protected AI/automation endpoints: Implemented and no-token protection verified; full role-token flows require MySQL login verification.
- Dashboard panel generation: Verified with validator.
- Server no-DB startup: Verified.
- Production dependency audit: Verified clean.
