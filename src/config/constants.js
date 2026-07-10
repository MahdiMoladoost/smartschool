// ثابت‌های پروژه
export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    PRINCIPAL: 'principal',
    EXECUTIVE_DEPUTY: 'executive_deputy',
    CULTURAL_DEPUTY: 'cultural_deputy',
    COUNSELOR: 'counselor',
    TEACHER: 'teacher',
    STUDENT: 'student',
    PARENT: 'parent'
};

export const MANAGEMENT_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL];
export const OPERATIONAL_ROLES = [...MANAGEMENT_ROLES, ROLES.EXECUTIVE_DEPUTY];
export const CULTURAL_ROLES = [...MANAGEMENT_ROLES, ROLES.CULTURAL_DEPUTY];
export const COUNSELOR_ROLES = [...MANAGEMENT_ROLES, ROLES.COUNSELOR];

export const ATTENDANCE_STATUS = {
    PRESENT: 'حضور',
    ABSENT: 'غیاب',
    LATE: 'تاخیر',
    EXCUSED: 'موجه'
};

export const AI_RATE_LIMITS = {
    requestsPerHour: 10,
    requestsPerDay: 50,
    maxTokensPerRequest: 150,
};

export const PORT = process.env.PORT || 3000;
