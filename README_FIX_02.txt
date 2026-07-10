Fix 02 - Admin Classes Management

Replace these paths in your project:
- public/assets/js/admin.js
- src/routes/legacyRoutes.js
- pages/dashboard/panel/admin/*.html

Changes:
- Fixed class edit/detail API crash caused by the wrong courses.teacher_id reference.
- Fixed /api/v1/admin/classes/:id/teachers to return courses + assignments for the class manager modal.
- Fixed saving teacher-per-course assignments from the admin classes page.
- Added explicit window bindings for class manager buttons to avoid inline onclick reference errors.
- Updated admin.js cache-busting query to v=fix-02-classes in admin panel HTML files.

After replacement:
1. Stop and restart the Node server.
2. Open /dashboard/admin/classes
3. Hard refresh with Ctrl+F5.
4. Confirm the console shows admin.js?v=fix-02-classes.
