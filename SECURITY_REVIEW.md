# Manual Security Review - Phase 3

## JWT validation

- Backend JWT validation is centralized through `authenticateToken` in the legacy route module.
- Missing or invalid token returns safe errors.
- Production requires a long random `JWT_SECRET`; `.env.example` documents this.

## Role-based access control

- New AI routes enforce role checks through `checkRole`:
  - student AI features: student only
  - teacher AI features: teacher only
  - parent AI summary: parent only
  - admin analytics: admin/super_admin/principal only
- Automation routes enforce management/teacher/parent/counselor restrictions.

## Ownership / IDOR checks

- Parent access to child data uses `parent_children(parent_id, student_id)`.
- Teacher access to student data uses class/course assignment through `course_teachers`, `courses`, and `class_students`.
- Counselor risk automation verifies counselor owns the session unless user has management role.
- Counselor notifications intentionally exclude `private_notes`.

## Role escalation paths

- New routes do not accept role changes from request bodies.
- Existing legacy user-management routes should still be reviewed before public production launch.
- RBAC tables exist, but most legacy checks still use hardcoded role guards. Full permission-policy middleware is a future hardening step.

## Mass assignment risks

- New AI/SMS/automation endpoints whitelist and sanitize expected fields.
- Some legacy CRUD endpoints still accept larger request bodies. They should be migrated to dedicated controllers with field allowlists.

## Injection risks

- New Phase 3 services use parameterized SQL queries.
- SMS provider payloads redact secrets in logs.
- Dynamic SQL identifiers are not accepted from clients in new code.
- Legacy routes include some numeric interpolation for pagination after `parseInt`; no raw user-supplied SQL identifiers were introduced in Phase 3.

## Secrets exposure

- AI and SMS keys are only read from environment variables server-side.
- Settings endpoints were previously adjusted to avoid exposing AI/SMS secret values.
- `.env` is excluded from final ZIP.

## Sensitive data

- Counselor private notes are not used in SMS alerts.
- Counselor session list still permits management roles to view private notes per current policy. If the school requires stricter privacy, limit `private_notes` to counselor and super_admin only.

## Findings

- Verified: new AI/SMS/automation endpoints have auth, role, and ownership checks where required.
- Partially verified: legacy route hardening is improved but not fully controllerized.
- Requires external environment: live penetration/IDOR tests with real database seed users.
