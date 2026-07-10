# API Security Matrix

Protected APIs must pass backend authentication and authorization. Frontend menu hiding is not considered security.

## Core auth/public

| Endpoint | Method | Auth | Roles/ownership |
|---|---:|---|---|
| `/api/v1/auth/login` | POST | No | Login rate limited. |
| `/api/v1/auth/register` | POST | No | Public registration; server validates required fields. |
| `/api/v1/auth/me` | GET | Yes | Current user only. |
| `/api/chat/public` | POST | No | Public AI FAQ chat, server-side key only, rate limited by AI service. |

## AI features

| Endpoint | Method | Roles/ownership |
|---|---:|---|
| `/api/v1/ai/assist` | POST | Any authenticated role, AI service rate limit and AI logs. |
| `/api/v1/ai/student/homework-assistant` | POST | Student only; own learning request only. |
| `/api/v1/ai/student/lesson-explanation` | POST | Student only. |
| `/api/v1/ai/student/study-planner` | POST | Student only; server loads only the logged-in student schedule/assignments/exams. |
| `/api/v1/ai/teacher/quiz-generator` | POST | Teacher only. |
| `/api/v1/ai/teacher/assignment-generator` | POST | Teacher only. |
| `/api/v1/ai/teacher/performance-summary` | POST | Teacher only; must pass `teacherCanAccessStudent`. |
| `/api/v1/ai/parent/student/:studentId/progress-summary` | POST | Parent only; must pass `parentOwnsStudent`. |
| `/api/v1/ai/admin/analytics-summary` | POST | Super Admin, Admin, Principal. |

## SMS and automations

| Endpoint | Method | Roles/ownership |
|---|---:|---|
| `/api/v1/sms/send` | POST | Super Admin, Admin, Principal, Executive Deputy, Cultural Deputy, Counselor. |
| `/api/v1/sms/logs` | GET | Super Admin, Admin, Principal. |
| `/api/v1/attendance/:studentId/notify-parent` | POST | Management/Executive/Teacher; teachers must pass `teacherCanAccessStudent`. |
| `/api/v1/automation/attendance-drop/:studentId` | POST | Management, Executive Deputy, Teacher, Parent; teacher/parent ownership checks enforced. |
| `/api/v1/automation/grade-drop/:studentId` | POST | Management, Executive Deputy, Teacher, Parent; teacher/parent ownership checks enforced. |
| `/api/v1/automation/counselor-risk/:sessionId` | POST | Super Admin, Admin, Principal, Counselor; counselors can only flag their own sessions. |
| `/api/v1/automation/announcement-summary` | POST | Super Admin, Admin, Principal, Executive Deputy, Cultural Deputy. |

## Role dashboards / operational APIs

| Endpoint group | Roles/ownership |
|---|---|
| `/api/v1/student/*` | Student only; uses `req.user.id` for personal data. |
| `/api/v1/teacher/*` | Teacher only; class/student access is scoped by `course_teachers`, `courses`, and `class_students` where implemented. |
| `/api/v1/parent/child/:childId/*` | Parent only; must pass `parent_children` relationship checks where implemented. |
| `/api/v1/counselor/requests` | Counselor/management can list full queue; students/parents/teachers receive scoped records. |
| `/api/v1/counselor/sessions` | Counselor/management only; private notes are only returned through this protected group. |
| `/api/v1/cultural/*` | Cultural Deputy and management for writes; reads are limited by event visibility. |
| `/api/v1/principal/dashboard` | Super Admin, Admin, Principal. |
| `/api/v1/executive-deputy/dashboard` | Super Admin, Admin, Principal, Executive Deputy. |
| `/api/v1/cultural-deputy/dashboard` | Super Admin, Admin, Principal, Cultural Deputy. |
| `/api/v1/admin/*` | Existing admin routes are admin-scoped; several legacy routes should be further split into Principal/Super Admin policies during the next hardening pass. |

## Sensitive-data rules

- Password hashes are never returned intentionally.
- AI/SMS keys stay in environment variables; settings now store only configured/not-configured booleans.
- `counseling_sessions.private_notes` is not exposed through parent/student/teacher APIs.
- Parent access depends on `parent_children` backend checks.
- Teacher access to a student depends on assigned course/class relationships.

## Phase 3 protected endpoint restrictions

| Endpoint | Method | Required auth | Roles | Ownership / privacy rule |
|---|---:|---:|---|---|
| `/api/v1/ai/student/homework-assistant` | POST | Yes | student | Student user only; AI quota by `ai_requests_log`. |
| `/api/v1/ai/student/lesson-explanation` | POST | Yes | student | Student user only; prompt guard and AI quota. |
| `/api/v1/ai/student/study-planner` | POST | Yes | student | Reads only authenticated student's assignments/exams. |
| `/api/v1/ai/teacher/quiz-generator` | POST | Yes | teacher | Teacher role only. |
| `/api/v1/ai/teacher/assignment-generator` | POST | Yes | teacher | Teacher role only. |
| `/api/v1/ai/teacher/performance-summary` | POST | Yes | teacher | Teacher must be assigned to the student through course/class relationship. |
| `/api/v1/ai/parent/student/:studentId/progress-summary` | POST | Yes | parent | Parent must be linked in `parent_children`. |
| `/api/v1/ai/admin/analytics-summary` | POST | Yes | super_admin, admin, principal | Management analytics only; structured output mode enabled. |
| `/api/v1/automation/attendance-drop/:studentId` | POST | Yes | super_admin, admin, principal, executive_deputy, teacher, parent | Teachers need assigned class/course; parents need `parent_children`. |
| `/api/v1/automation/grade-drop/:studentId` | POST | Yes | super_admin, admin, principal, executive_deputy, teacher, parent | Teachers need assigned class/course; parents need `parent_children`. |
| `/api/v1/automation/counselor-risk/:sessionId` | POST | Yes | super_admin, admin, principal, counselor | Counselor must own session; private notes never sent in SMS response. |
| `/api/v1/automation/announcement-summary` | POST | Yes | super_admin, admin, principal, executive_deputy, cultural_deputy | SMS target role is allowlisted to parent/student/teacher. |
| `/api/v1/sms/send` | POST | Yes | super_admin, admin, principal, executive_deputy, cultural_deputy, counselor | SMS limits, duplicate suppression, and provider circuit breaker enforced. |
| `/api/v1/sms/logs` | GET | Yes | super_admin, admin, principal | Paginated; management visibility only. |
| `/api/v1/counselor/requests` | GET | Yes | counselor, management, student, parent, teacher | Students see self; parents linked children; teachers assigned students. |
| `/api/v1/counselor/sessions` | GET | Yes | counselor, management | Paginated; private notes remain restricted to current management policy. |
| `/api/v1/counselor/sessions` | POST | Yes | counselor, super_admin, admin, principal | Session insert and request update are transactional. |
