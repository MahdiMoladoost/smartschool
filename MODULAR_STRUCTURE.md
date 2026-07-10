# ساختار ماژولار پنل‌ها

در این نسخه، هر صفحه از پنل مدیر، معلم، دانش‌آموز و والدین یک فایل HTML مستقل دارد و مسیر مستقیم خودش را دریافت می‌کند. ظاهر، CSS، APIها و منطق JavaScript قبلی حفظ شده‌اند.

## ساختار پوشه‌ها

```text
pages/dashboard/panel/
├── shared/
│   └── panel-pages.json
├── admin/
│   ├── layout.template.html
│   ├── dashboard.html
│   ├── users.html
│   ├── classes.html
│   └── ...
├── teacher/
│   ├── layout.template.html
│   ├── dashboard.html
│   ├── students.html
│   └── ...
├── student/
│   ├── layout.template.html
│   ├── dashboard.html
│   ├── grades.html
│   └── ...
└── parent/
    ├── layout.template.html
    ├── dashboard.html
    ├── children.html
    └── ...
```

## مسیرهای صفحات

نمونه‌ها:

- `/dashboard/admin/dashboard`
- `/dashboard/admin/classes`
- `/dashboard/teacher/students`
- `/dashboard/student/grades`
- `/dashboard/parent/children`

مسیرهای قدیمی مانند `/dashboard/admin` و فایل‌های قدیمی مانند `admin.html` همچنان کار می‌کنند و داشبورد را نمایش می‌دهند.

## افزودن صفحه جدید

1. صفحه را در `pages/dashboard/panel/shared/panel-pages.json` به پنل مربوط اضافه کنید.
2. آیتم منوی آن را در `layout.template.html` همان پنل قرار دهید.
3. دستور زیر را اجرا کنید:

```bash
npm run panels:generate
```

4. تابع رندر یا منطق صفحه را مانند ساختار فعلی در کنترلر JavaScript همان پنل اضافه کنید.

## نکته مهم برای توسعه بعدی

فایل‌های `layout.template.html` منبع اصلی پوسته هر پنل هستند. برای تغییر سایدبار، هدر یا منابع مشترک، قالب را ویرایش و سپس صفحات را بازتولید کنید؛ فایل‌های تولیدشده را جداگانه ویرایش نکنید.
