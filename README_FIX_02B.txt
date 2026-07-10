# Fix 02B - Class manager president display

This patch fixes the class cards showing `تعیین نشده` after selecting `رئیس انجمن معلمان`.

Changed files:
- public/assets/js/admin.js
- src/routes/legacyRoutes.js
- pages/dashboard/panel/admin/*.html

Main fix:
- /api/v1/admin/classes now returns `main_teacher_name` by joining `classes.main_teacher_id` to `users`.
- admin.js also resolves `main_teacher_name` from the teachers list as a frontend fallback.
- admin HTML files use cache-busting version `fix-02b-class-president`.
