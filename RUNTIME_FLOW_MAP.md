# Runtime Flow Map - Enterprise Stabilization Phase

Status: implemented and statically verified in this environment. Live database execution requires MySQL.

## Student flow: login → dashboard → AI homework → log/rate limit

1. `POST /api/v1/auth/login`
   - Reads `users` by username.
   - Verifies bcrypt password.
   - Issues JWT containing `id`, `username`, and `role`.
2. Frontend stores token and redirects student to `/dashboard/student`.
3. `GET /dashboard/student`
   - Serves generated dashboard page from `pages/dashboard/panel/student/index.html`.
4. `POST /api/v1/ai/student/homework-assistant`
   - Middleware: `authenticateToken` then `checkRole('student')`.
   - Controller validates homework text.
   - `aiService.callGapGPT()` applies student system prompt, prompt-size guard, max-token guard, per-minute limit, and per-user daily quota check against `ai_requests_log`.
   - Backend calls GapGPT only from server side.
   - Inserts AI usage row into `ai_requests_log`.
   - Controller also inserts feature-level history into `ai_logs`.
5. Expected SQL behavior:
   - `SELECT COUNT(*) FROM ai_requests_log WHERE user_id=? AND created_at>=CURDATE()`
   - `INSERT INTO ai_requests_log (...) VALUES (...)`
   - `INSERT INTO ai_logs (...) VALUES (...)`

## Teacher flow: login → generate quiz → save assignment

1. `POST /api/v1/auth/login` authenticates teacher.
2. `POST /api/v1/ai/teacher/quiz-generator`
   - Middleware: authenticated teacher only.
   - Uses teacher system prompt and centralized AI logging/rate limit.
3. `POST /api/v1/teacher/assignments`
   - Existing legacy route remains available after duplicate cleanup.
   - Teacher role required.
   - Assignment data is validated and persisted in `assignments`.
4. Expected SQL behavior:
   - `INSERT INTO ai_requests_log (...)`
   - `INSERT INTO ai_logs (...)`
   - `INSERT INTO assignments (...)`

## Parent flow: login → view child → AI progress summary

1. Parent logs in through `POST /api/v1/auth/login`.
2. `GET /api/v1/parent/children`
   - Returns only children linked through `parent_children`.
3. `POST /api/v1/ai/parent/student/:studentId/progress-summary`
   - Middleware: parent only.
   - Ownership guard: `parentOwnsStudent(parentId, studentId)`.
   - Reads child grades, attendance, assignments/submissions.
   - Uses parent system prompt and logs to `ai_requests_log`.
4. Expected SQL behavior:
   - `SELECT id FROM parent_children WHERE parent_id=? AND student_id=? LIMIT 1`
   - `SELECT ... FROM grades WHERE student_id=?`
   - `SELECT ... FROM attendance WHERE student_id=?`
   - `INSERT INTO ai_requests_log (...)`

## Attendance-drop automation flow: trigger → AI summary → parent SMS → logs

1. `POST /api/v1/automation/attendance-drop/:studentId`
   - Roles: admin, principal, executive deputy, teacher, parent.
   - Teachers must be assigned to the student's class/course.
   - Parents must own the student through `parent_children`.
2. Reads last 30 days of attendance grouped by status.
3. Builds AI attendance-risk summary through centralized AI service.
4. If threshold is met, opens a DB transaction for SMS log writes and automation log.
5. `smsService.sendSMS()` validates Iranian phone numbers, checks duplicates, daily SMS quota, global rate limit, circuit breaker, provider retries, and writes `sms_logs`.
6. Inserts `ai_automation_logs` in the same write transaction.
7. Expected SQL behavior:
   - `SELECT status, COUNT(*) FROM attendance WHERE student_id=? AND date>=DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY status`
   - `SELECT parents FROM parent_children JOIN users`
   - `INSERT INTO sms_logs (...)`
   - `INSERT INTO ai_automation_logs (...)`
   - Rollback if a transaction-level exception occurs.

## Counselor risk flow: session risk → admin SMS → automation log

1. `POST /api/v1/automation/counselor-risk/:sessionId`
   - Roles: counselor, admin, super admin, principal.
   - If role is counselor, session ownership is enforced.
2. Reads `counseling_sessions` without returning `private_notes`.
3. AI produces a management-safe summary using counselor prompt.
4. For medium/high risk, notifies active management users by SMS.
5. SMS logs and automation log are inserted transactionally.
6. Expected SQL behavior:
   - `SELECT cs.id, cs.student_id, cs.counselor_id, cs.public_summary, cs.risk_level ... FROM counseling_sessions cs ... WHERE cs.id=?`
   - `SELECT users WHERE role IN ('principal','admin','super_admin') AND phone IS NOT NULL`
   - `INSERT INTO sms_logs (...)`
   - `INSERT INTO ai_automation_logs (...)`

## Runtime verification status

- Endpoint and table presence: verified statically by `npm run flows:simulate`.
- Generated dashboard pages: verified by `npm run panels:validate`.
- Live SQL execution: requires external MySQL.
