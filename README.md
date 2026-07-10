# Smart School Management Portal

A Persian/RTL school website and management portal built with **Node.js**, **Express**, static/EJS pages, JWT authentication, and a real **MySQL** database layer through `mysql2/promise`.

## Current architecture

- **Backend:** `server.js` Express application with REST APIs under `/api/v1`.
- **Database:** MySQL schema creation/compatibility migrations in `server.js`, standalone seed script in `seed-data.js`.
- **Authentication:** JWT + bcrypt password hashing.
- **Authorization:** backend role checks and ownership checks for role-sensitive APIs.
- **Frontend:** public pages in `pages/`, assets in `public/assets/`, generated modular dashboards under `pages/dashboard/panel/`.
- **AI:** backend-only GapGPT integration through `src/services/aiService.js`.
- **SMS:** backend-only SMS service/logging through `src/services/smsService.js` and `sms_logs` table.

## Supported portal roles

- Super Admin
- Admin
- Principal / School Manager
- Executive Vice Principal / Administrative Deputy
- Educational / Cultural Vice Principal
- Counselor
- Teacher
- Student
- Parent / Guardian

The modular panel generator currently validates 98 dashboard pages across these roles.

## Required environment variables

Copy `.env.example` to `.env` and fill real values. Do not commit `.env`.

```bash
cp .env.example .env
```

Important variables:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smartschool
JWT_SECRET=replace_with_a_long_random_secret

AI_API_BASE_URL=https://api.gapgpt.app/v1
AI_API_KEY=YOUR_GAPGPT_API_KEY
AI_DEFAULT_MODEL=gpt-4o

SMS_API_KEY=YOUR_SMS_API_KEY
SMS_SENDER_NUMBER=9982002811
SMS_API_URL=
```

`SMS_API_URL` must match the real SMS provider endpoint. If it is not configured, SMS requests are safely logged as `provider_not_configured` rather than exposing credentials or crashing the app.

## Install and run

```bash
npm install
npm start
```

Development mode:

```bash
npm run dev
```

Default URL:

```text
http://localhost:3000
```

## Database setup

1. Install/start MySQL.
2. Create the database:

```sql
CREATE DATABASE smartschool CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci;
```

3. Configure `.env` database credentials.
4. Start the server. On startup, `server.js` creates required tables and performs non-destructive compatibility migrations.
5. To explicitly seed demo data, run:

```bash
npm run db:seed
```

Demo credentials are development-only. Change them before production.

## Verification commands

```bash
node --check server.js
node --check seed-data.js
node --check src/services/aiService.js
node --check src/services/smsService.js
npm run panels:validate
npm start
```

## Security notes

- Credentials must stay in environment variables only.
- AI and SMS keys are used only by backend services.
- Protected APIs must enforce backend authorization, not only hidden frontend buttons.
- Counselor private notes are restricted to counselor/management roles.
- Parent/student/teacher APIs include ownership or assignment checks where implemented.

## Phase 2 production hardening

This project now includes:

- Full reusable MySQL schema migration at `src/data/migrations/001_full_schema.sql`.
- Schema contract verification with `npm run schema:verify`.
- Centralized AI service with timeout, retry, safe error handling, in-memory rate limiting, `ai_logs`, and `ai_requests_log` metering.
- Provider-agnostic SMS service with Iranian mobile validation, retry logic, duplicate suppression, adapter layer, and `sms_logs` persistence.
- AI-powered role features for students, teachers, parents, and management.
- AI+SMS automation routes for attendance drop, grade drop, counselor risk, and announcement summaries.
- Documentation files: `SCHEMA_OVERVIEW.md` and `API_SECURITY_MATRIX.md`.

Important: set `REQUIRE_DB=true` in production so the server does not continue in limited mode if MySQL is unavailable.

## Enterprise Phase 3 verification commands

```bash
npm run schema:verify
npm run panels:validate
npm run routes:inventory
npm run flows:simulate
npm audit
```

Phase 3 moved the bootstrap server to a small `server.js` and extracted the legacy application/router registration into `src/routes/legacyRoutes.js`. New production-grade AI/SMS/automation features live in modular controllers and services.

Important production variables:

```env
AI_MAX_PROMPT_CHARS=6000
AI_MAX_RESPONSE_TOKENS=1500
SMS_USER_DAILY_LIMIT=30
SMS_GLOBAL_PER_MINUTE_LIMIT=120
SMS_CIRCUIT_FAILURE_THRESHOLD=5
SMS_CIRCUIT_OPEN_SECONDS=120
```
