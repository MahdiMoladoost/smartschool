# Setup Guide

## 1. Prerequisites

- Node.js 18+ recommended
- npm
- MySQL 8+ recommended

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
NODE_ENV=development
REQUIRE_DB=true

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smartschool

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d

AI_API_BASE_URL=https://api.gapgpt.app/v1
AI_API_KEY=YOUR_GAPGPT_API_KEY
AI_DEFAULT_MODEL=gpt-4o
AI_DAILY_LIMIT=20

SMS_API_KEY=YOUR_SMS_API_KEY
SMS_SENDER_NUMBER=9982002811
SMS_API_URL=
```

Never place real secrets in frontend files or commit `.env`.

## 4. Create MySQL database

```sql
CREATE DATABASE smartschool CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci;
```

## 5. Initialize schema and demo data

The server creates and migrates tables on startup:

```bash
npm start
```

Optional explicit seed:

```bash
npm run db:seed
```

## 6. Useful commands

```bash
npm start                  # run production-style server
npm run dev                # run with nodemon
npm run db:init            # initialize database entrypoint
npm run db:seed            # seed demo data
npm run panels:generate    # regenerate modular panel HTML
npm run panels:validate    # validate generated panel pages
```

## 7. Development demo users

These accounts are for local development only and must be changed or removed before production:

| Role | Username | Password |
|---|---|---|
| Admin | admin | admin123 |
| Super Admin | superadmin | superadmin123 |
| Principal | principal | principal123 |
| Executive Deputy | executive_deputy | deputy123 |
| Cultural Deputy | cultural_deputy | cultural123 |
| Counselor | counselor | counselor123 |
| Teacher | teacher_rezai | admin123 in startup seed / teacher123 in standalone seed |
| Student | student_ahmadi | student123 |
| Parent | parent_ahmadi | admin123 in startup seed / parent123 in standalone seed |

## 8. Important routes

Public:

- `/`
- `/login`
- `/register`
- `/about`
- `/contact`

Panels:

- `/dashboard/admin`
- `/dashboard/super-admin`
- `/dashboard/principal`
- `/dashboard/executive-deputy`
- `/dashboard/cultural-deputy`
- `/dashboard/counselor`
- `/dashboard/teacher`
- `/dashboard/student`
- `/dashboard/parent`

Role-aware APIs:

- `GET /api/v1/portal/overview`
- `GET /api/v1/principal/dashboard`
- `GET /api/v1/executive-deputy/dashboard`
- `GET /api/v1/cultural-deputy/dashboard`
- `GET /api/v1/counselor/dashboard`
- `GET /api/v1/rbac/roles`
- `GET/POST /api/v1/counselor/requests`
- `GET/POST /api/v1/counselor/sessions`
- `GET/POST /api/v1/cultural/events`
- `GET/POST /api/v1/cultural/activity-records`
- `POST /api/v1/ai/assist`
- `POST /api/v1/sms/send`
- `GET /api/v1/sms/logs`
- `POST /api/v1/attendance/:studentId/notify-parent`

## 9. Production checklist

- Set `NODE_ENV=production`.
- Set `REQUIRE_DB=true`.
- Replace all demo passwords.
- Use a strong `JWT_SECRET`.
- Configure HTTPS/reverse proxy.
- Configure a real SMS provider URL/API contract.
- Review all duplicate legacy routes before large production deployment.
- Run syntax checks, panel validation, and a full manual role-based QA pass.

## 10. Phase 2 production hardening additions

### Full schema migration

A full MySQL schema is now available at:

```text
src/data/migrations/001_full_schema.sql
```

`npm run db:seed` executes this migration through `src/data/schemaRunner.js` before inserting demo data. The migration includes role/RBAC tables, parent-child ownership, counseling tables, AI logs, detailed AI request metering, SMS logs, and AI automation logs.

Validate schema contracts without needing a running MySQL server:

```bash
npm run schema:verify
```

### AI configuration

All AI calls go through the backend service in `src/services/aiService.js` and use only environment variables:

```env
AI_API_BASE_URL=https://api.gapgpt.app/v1
AI_API_KEY=YOUR_GAPGPT_API_KEY
AI_DEFAULT_MODEL=gpt-4o
AI_TIMEOUT_MS=20000
AI_RETRY_ATTEMPTS=2
AI_PER_MINUTE_LIMIT=8
AI_DAILY_LIMIT=50
```

### SMS configuration

All SMS calls go through `src/services/smsService.js`. The default adapter is provider-agnostic JSON POST.

```env
SMS_PROVIDER=generic_json
SMS_API_KEY=YOUR_SMS_API_KEY
SMS_SENDER_NUMBER=9982002811
SMS_API_URL=https://your-provider.example/send
SMS_TIMEOUT_MS=12000
SMS_RETRY_ATTEMPTS=2
SMS_DUPLICATE_WINDOW_SECONDS=300
```

Supported adapters:

- `generic_json`: sends `{ sender, recipient, message }` as JSON with `Authorization: Bearer <SMS_API_KEY>`.
- `form_post`: sends form fields `api_key`, `sender`, `receptor`, and `message`.

Iranian numbers are normalized to `+989xxxxxxxxx`; invalid non-Iranian mobile formats are rejected.

### New AI endpoints

- `POST /api/v1/ai/student/homework-assistant`
- `POST /api/v1/ai/student/lesson-explanation`
- `POST /api/v1/ai/student/study-planner`
- `POST /api/v1/ai/teacher/quiz-generator`
- `POST /api/v1/ai/teacher/assignment-generator`
- `POST /api/v1/ai/teacher/performance-summary`
- `POST /api/v1/ai/parent/student/:studentId/progress-summary`
- `POST /api/v1/ai/admin/analytics-summary`

### New automation endpoints

- `POST /api/v1/automation/attendance-drop/:studentId`
- `POST /api/v1/automation/grade-drop/:studentId`
- `POST /api/v1/automation/counselor-risk/:sessionId`
- `POST /api/v1/automation/announcement-summary`

See `API_SECURITY_MATRIX.md` for role and ownership restrictions.
