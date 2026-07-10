/**
 * 🎓 دبیرستان پلیس - سیستم مدیریت مدرسه
 * API Client و Utilities
 */

const API_BASE_URL = 'http://localhost:3000/api';

// ============ درخواست API ============
async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/pages/auth/login.html';
            }
            throw new Error(`خطا ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('خطا در درخواست API:', error);
        showNotification('خطا: ' + error.message, 'error');
        throw error;
    }
}

// ============ مدیریت دانش‌آموزان ============
async function getStudents() {
    return apiCall('/students');
}

async function getStudent(id) {
    return apiCall(`/students/${id}`);
}

async function createStudent(data) {
    return apiCall('/students', 'POST', data);
}

async function updateStudent(id, data) {
    return apiCall(`/students/${id}`, 'PUT', data);
}

async function deleteStudent(id) {
    return apiCall(`/students/${id}`, 'DELETE');
}

// ============ مدیریت معلمان ============
async function getTeachers() {
    return apiCall('/teachers');
}

async function createTeacher(data) {
    return apiCall('/teachers', 'POST', data);
}

async function updateTeacher(id, data) {
    return apiCall(`/teachers/${id}`, 'PUT', data);
}

async function deleteTeacher(id) {
    return apiCall(`/teachers/${id}`, 'DELETE');
}

// ============ مدیریت کاربران ============
async function getUsers() {
    return apiCall('/users');
}

async function createUser(data) {
    return apiCall('/users', 'POST', data);
}

async function updateUser(id, data) {
    return apiCall(`/users/${id}`, 'PUT', data);
}

async function deleteUser(id) {
    return apiCall(`/users/${id}`, 'DELETE');
}

// ============ آمار داشبورد ============
async function getDashboardStats() {
    return apiCall('/dashboard/stats');
}

// ============ نمایش اعلان ============
function showNotification(message, type = 'success') {
    // ایجاد عنصر اعلان اگر وجود نداشت
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(notificationContainer);
    }

    const notification = document.createElement('div');
    const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#f59e0b';
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';

    notification.style.cssText = `
        background: ${bgColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideIn 0.3s ease-out;
        font-weight: 500;
    `;
    notification.textContent = `${icon} ${message}`;

    notificationContainer.appendChild(notification);

    // حذف بعد از 3 ثانیه
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============ نمایش جدول دانش‌آموزان ============
async function displayStudentsTable(containerId) {
    try {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '<div style="text-align: center; padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> در حال بارگذاری...</div>';

        const result = await getStudents();
        const students = result.data || [];

        if (students.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 2rem;">دانش‌آموزی یافت نشد</p>';
            return;
        }

        let html = `
            <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 1rem; text-align: right; font-weight: 700;">نام و نام‌خانواده</th>
                    <th style="padding: 1rem; text-align: right; font-weight: 700;">کلاس</th>
                    <th style="padding: 1rem; text-align: right; font-weight: 700;">وضعیت</th>
                    <th style="padding: 1rem; text-align: right; font-weight: 700;">حضور</th>
                    <th style="padding: 1rem; text-align: right; font-weight: 700;">عملیات</th>
                </tr>
            </thead>
            <tbody>
        `;

        students.forEach(student => {
            const status = student.status === 'فعال' ? 
                '<span style="background: #d1fae5; color: #065f46; padding: 0.375rem 0.875rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">✓ فعال</span>' : 
                '<span style="background: #fee2e2; color: #991b1b; padding: 0.375rem 0.875rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">✗ غیرفعال</span>';
            
            html += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 1rem;">${student.firstName} ${student.lastName}</td>
                    <td style="padding: 1rem;">${student.class || '-'}</td>
                    <td style="padding: 1rem;">${status}</td>
                    <td style="padding: 1rem;">${student.attendanceRate || '-'}%</td>
                    <td style="padding: 1rem;">
                        <button onclick="editStudent('${student.id}')" style="padding: 0.5rem; margin: 0 0.25rem; background: #dbeafe; border: none; border-radius: 8px; cursor: pointer;">✏️</button>
                        <button onclick="deleteStudentConfirm('${student.id}')" style="padding: 0.5rem; margin: 0 0.25rem; background: #fee2e2; border: none; border-radius: 8px; cursor: pointer;">🗑️</button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (error) {
        console.error('خطا:', error);
        if (document.getElementById(containerId)) {
            document.getElementById(containerId).innerHTML = '<p style="color: #ef4444; text-align: center; padding: 2rem;">خطا در بارگذاری داده‌ها</p>';
        }
    }
}

// ============ نمایش جدول معلمان ============
async function displayTeachersTable(containerId) {
    try {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '<div style="text-align: center; padding: 2rem;"><i class="fas fa-spinner fa-spin"></i> در حال بارگذاری...</div>';

        const result = await getTeachers();
        const teachers = result.data || [];

        if (teachers.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 2rem;">معلمی یافت نشد</p>';
            return;
        }

        let html = `
            <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 1rem; text-align: right; font-weight: 700;">نام معلم</th>
                    <th style="padding: 1rem; text-align: right; font-weight: 700;">تخصص</th>
                    <th style="padding: 1rem; text-align: right; font-weight: 700;">تحصیلات</th>
                    <th style="padding: 1rem; text-align: right; font-weight: 700;">وضعیت</th>
                    <th style="padding: 1rem; text-align: right; font-weight: 700;">عملیات</th>
                </tr>
            </thead>
            <tbody>
        `;

        teachers.forEach(teacher => {
            const status = teacher.status === 'فعال' ? 
                '<span style="background: #d1fae5; color: #065f46; padding: 0.375rem 0.875rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">✓ فعال</span>' : 
                '<span style="background: #fee2e2; color: #991b1b; padding: 0.375rem 0.875rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">✗ غیرفعال</span>';
            
            html += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 1rem;">${teacher.firstName} ${teacher.lastName}</td>
                    <td style="padding: 1rem;">${teacher.specialization || '-'}</td>
                    <td style="padding: 1rem;">${teacher.qualification || '-'}</td>
                    <td style="padding: 1rem;">${status}</td>
                    <td style="padding: 1rem;">
                        <button onclick="editTeacher('${teacher.id}')" style="padding: 0.5rem; margin: 0 0.25rem; background: #dbeafe; border: none; border-radius: 8px; cursor: pointer;">✏️</button>
                        <button onclick="deleteTeacherConfirm('${teacher.id}')" style="padding: 0.5rem; margin: 0 0.25rem; background: #fee2e2; border: none; border-radius: 8px; cursor: pointer;">🗑️</button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (error) {
        console.error('خطا:', error);
        if (document.getElementById(containerId)) {
            document.getElementById(containerId).innerHTML = '<p style="color: #ef4444; text-align: center; padding: 2rem;">خطا در بارگذاری داده‌ها</p>';
        }
    }
}

// ============ حذف دانش‌آموز ============
async function deleteStudentConfirm(id) {
    if (confirm('آیا مطمئن‌اید که می‌خواهید این دانش‌آموز را حذف کنید؟')) {
        try {
            await deleteStudent(id);
            showNotification('دانش‌آموز با موفقیت حذف شد');
            displayStudentsTable('students-table-container');
        } catch (error) {
            showNotification('خطا در حذف دانش‌آموز', 'error');
        }
    }
}

// ============ حذف معلم ============
async function deleteTeacherConfirm(id) {
    if (confirm('آیا مطمئن‌اید که می‌خواهید این معلم را حذف کنید؟')) {
        try {
            await deleteTeacher(id);
            showNotification('معلم با موفقیت حذف شد');
            displayTeachersTable('teachers-table-container');
        } catch (error) {
            showNotification('خطا در حذف معلم', 'error');
        }
    }
}

// ============ ویرایش دانش‌آموز/معلم ============
function editStudent(id) {
    alert('ویرایش برای دانش‌آموز ' + id);
    // بعداً پیاده‌سازی کامل فرم ویرایش
}

function editTeacher(id) {
    alert('ویرایش برای معلم ' + id);
    // بعداً پیاده‌سازی کامل فرم ویرایش
}

// ============ بهروزرسانی آمار داشبورد ============
async function loadDashboardStats() {
    try {
        const result = await getDashboardStats();
        const stats = result.data;

        // به‌روزرسانی کارت‌های آمار
        if (document.getElementById('stat-students')) {
            document.getElementById('stat-students').textContent = stats.totalStudents || 0;
        }
        if (document.getElementById('stat-teachers')) {
            document.getElementById('stat-teachers').textContent = stats.totalTeachers || 0;
        }
        if (document.getElementById('stat-users')) {
            document.getElementById('stat-users').textContent = stats.totalUsers || 0;
        }
        if (document.getElementById('stat-attendance')) {
            document.getElementById('stat-attendance').textContent = stats.avgAttendance || 0 + '%';
        }
    } catch (error) {
        console.error('خطا در بارگذاری آمار:', error);
    }
}

// ============ سبک انیمیشن ============
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    button:hover {
        opacity: 0.8 !important;
    }

    button:active {
        transform: scale(0.95) !important;
    }
`;
document.head.appendChild(style);

// ============ تابع تریگر بارگذاری ============
window.addEventListener('load', () => {
    // بارگذاری خودکار اگر صفحه آماده است
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadDashboardStats);
    } else {
        loadDashboardStats();
    }
});

console.log('✅ Farzangan API Client بارگذاری شد');
