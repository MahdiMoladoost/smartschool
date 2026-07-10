# Live Verification Checklist

This checklist is for proving the project runs against a real MySQL database and real backend services. Do not mark the system production-ready until the required live sections pass in your own environment.

## Prerequisites

- Node.js 20+
- MySQL 8+
- A copied `.env` file created from `.env.example`
- A strong `JWT_SECRET`
- Real DB credentials in `.env`
- Optional: real `AI_API_KEY`
- Optional: real `SMS_API_URL`/`SMS_API_KEY`/`TEST_SMS_RECIPIENT`

## Migration and seed order

`npm run db:init` currently executes `init-db.js`, which imports `seed-data.js`. The seed script performs the safe order below:

1. Create database if it does not exist.
2. Execute `src/data/migrations/001_full_schema.sql`.
3. Execute compatibility migrations in `src/data/schemaRunner.js`:
   - add missing columns when needed
   - modify `sms_logs.status` enum when needed
   - add performance indexes when needed
4. Insert/update safe demo seed data.

The migration is idempotent for existing tables because it uses `CREATE TABLE IF NOT EXISTS` and `ON DUPLICATE KEY UPDATE` where appropriate. It is not intended to delete production data.

## Live MySQL verification commands

```bash
npm install
cp .env.example .env
# Edit .env with real DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET
npm run db:init
npm run db:seed
npm run live:verify
```

The live script verifies:

- `npm run db:init`
- `npm run db:seed`
- required tables exist
- seeded users can login
- dashboard/public panel routes respond
- `/api/v1/portal/overview` returns real role data
- parent-child links work
- teacher-student relationships work
- counselor sessions are restricted
- unauthorized AI/API requests return `401`/`403`
- automation routes insert into `sms_logs` and `ai_automation_logs`

## Real GapGPT verification

To run one real backend AI request and verify `ai_requests_log` insertion:

```bash
RUN_REAL_AI_TEST=true npm run live:verify
```

Requirements:

```env
AI_API_BASE_URL=https://api.gapgpt.app/v1
AI_API_KEY=your_real_key
AI_DEFAULT_MODEL=gpt-4o
```

The script does not print the API key. It checks that:

- unauthenticated AI endpoint calls return `401`
- authenticated student AI call succeeds
- `ai_requests_log` row count increases
- optional rate-limit test can be enabled with `VERIFY_AI_RATE_LIMIT=true`

## Real SMS provider verification

To run a real SMS send and duplicate-suppression test:

```bash
RUN_REAL_SMS_TEST=true TEST_SMS_RECIPIENT=09123456789 npm run live:verify
```

Requirements:

```env
SMS_PROVIDER=generic_json
SMS_API_URL=https://your-provider.example/send
SMS_API_KEY=your_provider_key
SMS_SENDER_NUMBER=9982002811
```

The script verifies:

- `sms_logs` row count increases
- duplicate message is suppressed and logged as `duplicate_suppressed`
- provider failure data is stored in redacted `provider_response`

## Real authenticated flow map

### Student

1. `POST /api/v1/auth/login` with `student_ahmadi/student123`.
2. Load `/dashboard/student`.
3. `GET /api/v1/portal/overview`.
4. `POST /api/v1/ai/student/homework-assistant` if real AI testing is enabled.
5. Expected SQL:
   - `SELECT * FROM users WHERE username = ?`
   - `UPDATE users SET last_login = NOW() WHERE id = ?`
   - `INSERT INTO ai_requests_log (...) VALUES (...)`

### Teacher

1. `POST /api/v1/auth/login` with `teacher_rezai/teacher123`.
2. Load `/dashboard/teacher`.
3. `POST /api/v1/ai/teacher/quiz-generator` if real AI testing is enabled.
4. `POST /api/v1/teacher/assignments` to save an assignment for an assigned class.
5. Expected SQL:
   - teacher/class validation through `course_teachers`, `courses`, `classes`
   - insert into `assignments`
   - AI usage logged to `ai_requests_log`

### Parent

1. `POST /api/v1/auth/login` with `parent_ahmadi/parent123`.
2. Load `/dashboard/parent`.
3. `GET /api/v1/parent/children`.
4. Verify child `6` is visible and unrelated child `10` is blocked.
5. `POST /api/v1/ai/parent/student/6/progress-summary` if real AI testing is enabled.
6. Expected SQL:
   - `parent_children(parent_id, student_id)` ownership check
   - grades/attendance/submissions queried only for linked child

### Counselor

1. `POST /api/v1/auth/login` with `counselor/counselor123`.
2. Load `/dashboard/counselor`.
3. `GET /api/v1/counselor/sessions` succeeds.
4. Parent/student requests to the same endpoint return `403`.
5. Risk automation does not send `private_notes` in SMS.

### Principal/Admin

1. `POST /api/v1/auth/login` with `principal/principal123` or `admin/admin123`.
2. Load management dashboard.
3. Verify `/api/v1/principal/dashboard`, `/api/v1/rbac/roles`, `/api/v1/sms/logs`.
4. Verify non-management roles receive `403` for restricted endpoints.

## Browser QA checklist

For each page below, check render, navigation, API loading state, empty state, error state, mobile width under 390px, and unauthorized access handling.

### Public pages

- `/`
- `/login`
- `/register`
- Forgot-password page: not implemented as a dedicated route in this codebase; verify that links do not point to a missing workflow before production.
- `/about`
- `/contact`
- `/faq`
- `/services`
- `/timeline`

### Dashboards

- `/dashboard/student`
- `/dashboard/teacher`
- `/dashboard/parent`
- `/dashboard/principal`
- `/dashboard/executive-deputy`
- `/dashboard/cultural-deputy`
- `/dashboard/counselor`
- `/dashboard/admin`
- `/dashboard/super-admin`

### Browser checks per dashboard

- Login redirects to the correct role dashboard.
- Sidebar links navigate without 404.
- Data cards show loading state first.
- Empty datasets show a human-readable empty message.
- API failures show a safe error message.
- Mobile menu/sidebar remains usable.
- Role cannot see menus or API data for another role.
- Logout clears token and blocks protected APIs.
