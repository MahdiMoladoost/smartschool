# Demo Login Credentials

These accounts are created by `npm run db:seed` / `seed-data.js` for local development and testing only.

> Production warning: change or disable all demo users before deployment.

| Panel / Role | Username | Password | Dashboard |
|---|---|---|---|
| Super Admin | `super_admin` | `superadmin123` | `/dashboard/super-admin` |
| Admin | `admin` | `admin123` | `/dashboard/admin` |
| Principal | `principal` | `principal123` | `/dashboard/principal` |
| Executive Deputy | `executive_deputy` | `deputy123` | `/dashboard/executive-deputy` |
| Cultural Deputy | `cultural_deputy` | `cultural123` | `/dashboard/cultural-deputy` |
| Counselor | `counselor` | `counselor123` | `/dashboard/counselor` |
| Teacher 1 | `teacher_rezai` | `teacher123` | `/dashboard/teacher` |
| Teacher 2 | `teacher_karimi` | `teacher123` | `/dashboard/teacher` |
| Parent 1 | `parent_ahmadi` | `parent123` | `/dashboard/parent` |
| Parent 2 | `parent_mohammadi` | `parent123` | `/dashboard/parent` |
| Student 1 | `student_ahmadi` | `student123` | `/dashboard/student` |
| Student 2 | `student_mohammadi` | `student123` | `/dashboard/student` |
| Student 3 | `student_hosseini` | `student123` | `/dashboard/student` |
| Student 4 | `student_karimi` | `student123` | `/dashboard/student` |
| Student 5 | `student_rezaei` | `student123` | `/dashboard/student` |

## Setup reminder

```bash
npm install
cp .env.example .env
npm run db:init
npm run db:seed
npm start
```

Then open: `http://localhost:3000/login`
