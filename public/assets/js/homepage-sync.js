/**
 * 🎓 دبیرستان پلیس - بهروزرسانی صفحه اصلی با API حقیقی
 */

// ابتدا API Client را بارگذاری کنید
const API_URL = 'http://localhost:3000/api';

// تابع برای بهروزرسانی آمار صفحه اصلی
async function updateHomepageStats() {
    try {
        // دریافت داده‌های دانش‌آموزان
        const studentsResponse = await fetch(`${API_URL}/students`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        }).then(r => r.json());

        // دریافت داده‌های معلمان
        const teachersResponse = await fetch(`${API_URL}/teachers`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        }).then(r => r.json());

        // دریافت آمار داشبورد
        const statsResponse = await fetch(`${API_URL}/dashboard/stats`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        }).then(r => r.json());

        const stats = statsResponse.data || {};
        const students = studentsResponse.data || [];
        const teachers = teachersResponse.data || [];

        // به‌روزرسانی کارت‌های آمار اگر وجود داشته باشد
        const statElements = {
            'stat-students': stats.totalStudents || students.length,
            'stat-teachers': stats.totalTeachers || teachers.length,
            'stat-attendance': (stats.avgAttendance || 94.2) + '%',
            'stat-users': stats.totalUsers || 45,
            'stat-admins': stats.totalAdmins || 3,
            'total-users': stats.totalUsers || 45,
            'total-students': stats.totalStudents || students.length,
            'total-teachers': stats.totalTeachers || teachers.length
        };

        // انجام تغییرات در DOM
        for (const [id, value] of Object.entries(statElements)) {
            const elem = document.getElementById(id);
            if (elem) {
                // بر روی عنصر انیمیشن اعمال کنید
                elem.textContent = value;
                elem.style.animation = 'pulse 0.6s ease-in-out';
            }
        }

        console.log('✅ آمار صفحه اصلی به‌روزرسانی شد:', stats);

        // بهروزرسانی جداول دانش‌آموزان اگر وجود داشته باشد
        updateStudentsTable(students);
        updateTeachersTable(teachers);

    } catch (error) {
        console.warn('⚠️ نتوانستم اطلاعات از سرور دریافت کنم، از داده‌های پیش‌فرض استفاده می‌کنم:', error);
        // اگر سرور در دسترس نیست، از داده‌های پیش‌فرض استفاده کنید
        loadDefaultStats();
    }
}

// تابع برای نمایش دانش‌آموزان در جدول
function updateStudentsTable(students) {
    const container = document.querySelector('[id*="students"]');
    if (!container || students.length === 0) return;

    let html = '<ul style="list-style: none;">';
    students.slice(0, 5).forEach(student => {
        html += `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid #e2e8f0;">
                <div>
                    <strong>${student.firstName} ${student.lastName}</strong>
                    <br>
                    <small style="color: #94a3b8;">${student.class || '-'}</small>
                </div>
                <span style="background: #d1fae5; color: #065f46; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">
                    ${student.attendanceRate || 94}%
                </span>
            </li>
        `;
    });
    html += '</ul>';
    container.innerHTML = html;
}

// تابع برای نمایش معلمان در جدول
function updateTeachersTable(teachers) {
    const container = document.querySelector('[id*="teachers"]');
    if (!container || teachers.length === 0) return;

    let html = '<ul style="list-style: none;">';
    teachers.slice(0, 4).forEach(teacher => {
        html += `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid #e2e8f0;">
                <div>
                    <strong>${teacher.firstName} ${teacher.lastName}</strong>
                    <br>
                    <small style="color: #94a3b8;">${teacher.specialization || 'معلم'}</small>
                </div>
                <span style="font-weight: 700; color: #2563eb;">${teacher.experience || 5}+ سال</span>
            </li>
        `;
    });
    html += '</ul>';
    container.innerHTML = html;
}

// داده‌های پیش‌فرض (اگر سرور در دسترس نباشد)
function loadDefaultStats() {
    const defaultStats = {
        'stat-students': '320',
        'stat-teachers': '28',
        'stat-attendance': '94.2%',
        'stat-users': '678',
        'stat-admins': '5'
    };

    for (const [id, value] of Object.entries(defaultStats)) {
        const elem = document.getElementById(id);
        if (elem && !elem.textContent.trim()) {
            elem.textContent = value;
        }
    }
}

// نقطه ورود - زمان بارگذاری صفحه
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 شروع بهروزرسانی آمار صفحه اصلی...');
    updateHomepageStats();

    // بهروزرسانی دوره‌ای هر 30 ثانیه
    setInterval(updateHomepageStats, 30000);
});

// اضافه کردن انیمیشن pulse برای عنصرها
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
    }
    
    .stat-value {
        transition: all 0.3s ease;
    }
`;
document.head.appendChild(style);

console.log('✅ نوشتار صفحه اصلی بارگذاری شد');
