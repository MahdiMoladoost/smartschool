# Database Schema Overview

This schema is defined in `src/data/migrations/001_full_schema.sql` and is also checked by `npm run schema:verify`. It is designed for MySQL/InnoDB with utf8mb4 Persian collation.

## Tables

| users | All login accounts and role identities. |
| classes | School classes/grades. |
| class_students | Student enrollment in classes. |
| courses | Subjects/courses assigned to classes. |
| course_teachers | Teacher-course assignments. |
| weekly_schedule_entries | Class timetable periods. |
| attendance_session_records | Per-session attendance records. |
| enrollments | Application data table. |
| grades | Student grades per course and term. |
| attendance | Daily attendance records. |
| announcements | School announcements by target role. |
| announcements_read | Announcement read tracking. |
| homepage_news | Public news/events cards. |
| homepage_gallery_items | Public gallery items. |
| payments | Student payment/fee records. |
| registrations | Public admission/registration requests. |
| assignments | Teacher-created homework/assignments. |
| submissions | Student assignment submissions. |
| exams | Exam definitions. |
| exam_questions | Exam question bank. |
| exam_results | Student exam attempts/results. |
| tickets | Support/administrative tickets. |
| ticket_replies | Ticket conversation replies. |
| leave_requests | Student leave requests. |
| meetings | Parent-teacher meeting requests. |
| messages | Internal user messaging. |
| settings | Key/value system settings. |
| admin_logs | Administrative action logs. |
| ai_logs | Legacy/general AI interaction log. |
| ai_requests_log | Detailed AI usage metering: prompt, role, model, tokens, response time. |
| backups | Backup metadata. |
| roles | RBAC role reference data. |
| permissions | RBAC permission reference data. |
| role_permissions | Many-to-many mapping between roles and permissions. |
| parent_children | Authorized parent/guardian to student links. |
| digital_library | Teacher/admin educational resources. |
| counseling_requests | Counseling request workflow. |
| counseling_sessions | Counseling sessions with private notes and risk flags. |
| school_events | Cultural/school events. |
| student_activity_records | Student cultural/behavior/activity records. |
| sms_logs | SMS send log, status, duplicate/spam controls. |
| ai_automation_logs | Logs of AI+SMS automation decisions/actions. |

## Critical relationships

- `users.role` maps to `roles.name` conceptually; role permissions are normalized through `roles`, `permissions`, and `role_permissions`.
- `class_students.student_id`, `grades.student_id`, `attendance.student_id`, `submissions.student_id`, and counseling tables reference student `users.id`.
- `parent_children.parent_id -> users.id` and `parent_children.student_id -> users.id` enforce parent/child ownership checks.
- `courses.class_id -> classes.id`, `course_teachers.course_id -> courses.id`, and `course_teachers.teacher_id -> users.id` support teacher authorization.
- `counseling_sessions.private_notes` must only be returned to counselor/management APIs.
- `sms_logs.user_id` and `ai_requests_log.user_id` preserve auditability without storing API/SMS secrets.

## Verification

Run:

```bash
npm run schema:verify
```

This checks required tables, critical columns, foreign keys, and indexes including `parent_children`, `sms_logs`, `ai_requests_log`, `ai_automation_logs`, and counseling tables.

## Phase 3 additions / hardening

- `sms_logs.status` now supports `rate_limited` and `circuit_open` in addition to provider and duplicate statuses.
- New/verified high-traffic indexes:
  - `attendance(student_id, date)`
  - `attendance(class_id, date)`
  - `grades(student_id, updated_at)`
  - `counseling_requests(student_id, status)`
  - `counseling_sessions(risk_level, created_at)`
  - `ai_requests_log(user_id, created_at)`
- `ai_requests_log` is the authoritative table for per-user daily AI quota checks.
- `sms_logs` is the authoritative table for duplicate suppression and per-user SMS quota checks.
