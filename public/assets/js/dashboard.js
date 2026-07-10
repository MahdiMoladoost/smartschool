/* ============================================
   Dashboard System
   ============================================ */

class DashboardManager {
    constructor() {
        this.user = null;
        this.data = null;
        this.init();
    }
    
    async init() {
        // Check authentication
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '../../pages/auth/login.html';
            return;
        }
        
        // Get user info
        this.user = JSON.parse(localStorage.getItem('user'));
        
        // Load dashboard based on role
        if (this.user) {
            this.loadDashboard();
        }
    }
    
    async loadDashboard() {
        try {
            switch (this.user.role) {
                case 'student':
                    await this.loadStudentDashboard();
                    break;
                case 'teacher':
                    await this.loadTeacherDashboard();
                    break;
                case 'parent':
                    await this.loadParentDashboard();
                    break;
                case 'admin':
                    await this.loadAdminDashboard();
                    break;
            }
        } catch (error) {
            console.error('خطا در بارگذاری داشبورد:', error);
            showNotification('error', 'خطا در بارگذاری اطلاعات');
        }
    }
    
    async loadStudentDashboard() {
        try {
            api.setToken(localStorage.getItem('token'));
            const data = await api.getStudentDashboard();
            this.data = data;
            
            // Update student info
            this.updateStudentInfo(data);
            
            // Display courses
            this.displayCourses(data.courses);
            
            // Display attendance
            this.displayAttendance(data.attendance);
            
            // Display grades
            this.displayGrades(data.grades, data.courses);
            
        } catch (error) {
            console.error('خطا:', error);
            showNotification('error', error.message);
        }
    }
    
    async loadTeacherDashboard() {
        try {
            api.setToken(localStorage.getItem('token'));
            const data = await api.getTeacherDashboard();
            this.data = data;
            
            // Update teacher info
            this.updateTeacherInfo(data);
            
            // Display courses
            this.displayCourses(data.courses);
            
            // Display students
            this.displayStudents(data.students);
            
        } catch (error) {
            console.error('خطا:', error);
            showNotification('error', error.message);
        }
    }
    
    async loadParentDashboard() {
        try {
            api.setToken(localStorage.getItem('token'));
            const data = await api.getParentDashboard();
            this.data = data;
            
            // Update parent info
            this.updateParentInfo(data);
            
            // Display child info
            this.displayChildInfo(data.child);
            
            // Display grades
            this.displayGrades(data.grades, data.courses);
            
            // Display attendance
            this.displayAttendance(data.attendance);
            
        } catch (error) {
            console.error('خطا:', error);
            showNotification('error', error.message);
        }
    }
    
    async loadAdminDashboard() {
        try {
            api.setToken(localStorage.getItem('token'));
            const data = await api.getAdminDashboard();
            this.data = data;
            
            // Update statistics
            this.updateAdminStats(data.statistics);
            
            // Display users
            this.displayAdminUsers(data.users);
            
            // Display courses
            this.displayCourses(data.courses);
            
        } catch (error) {
            console.error('خطا:', error);
            showNotification('error', error.message);
        }
    }
    
    // Helper methods for updating UI
    
    updateStudentInfo(data) {
        const container = document.getElementById('student-info');
        if (container) {
            container.innerHTML = `
                <div class="info-card">
                    <h3>${data.student.name}</h3>
                    <p>کلاس: ${data.student.class}</p>
                    <p>ایمیل: ${data.student.email}</p>
                    <p>میانگین نمرات: ${data.summary.averageGrade}</p>
                </div>
            `;
        }
    }
    
    updateTeacherInfo(data) {
        const container = document.getElementById('teacher-info');
        if (container) {
            container.innerHTML = `
                <div class="info-card">
                    <h3>${data.teacher.name}</h3>
                    <p>درس: ${data.teacher.subject}</p>
                    <p>ایمیل: ${data.teacher.email}</p>
                    <p>تعداد دانش‌آموزان: ${data.totalStudents}</p>
                </div>
            `;
        }
    }
    
    updateParentInfo(data) {
        const container = document.getElementById('parent-info');
        if (container) {
            container.innerHTML = `
                <div class="info-card">
                    <h3>${data.parent.name}</h3>
                    <p>فرزند: ${data.parent.childName}</p>
                    <p>کلاس: ${data.parent.childClass}</p>
                    <p>ایمیل: ${data.parent.email}</p>
                </div>
            `;
        }
    }
    
    updateAdminStats(stats) {
        const container = document.getElementById('admin-stats');
        if (container) {
            container.innerHTML = `
                <div class="stat-card">
                    <h4>دانش‌آموزان</h4>
                    <p>${stats.totalStudents}</p>
                </div>
                <div class="stat-card">
                    <h4>معلمان</h4>
                    <p>${stats.totalTeachers}</p>
                </div>
                <div class="stat-card">
                    <h4>والدین</h4>
                    <p>${stats.totalParents}</p>
                </div>
                <div class="stat-card">
                    <h4>دروس</h4>
                    <p>${stats.totalCourses}</p>
                </div>
            `;
        }
    }
    
    displayCourses(courses) {
        const container = document.getElementById('courses-list');
        if (!container) return;
        
        if (courses.length === 0) {
            container.innerHTML = '<p>هیچ درسی وجود ندارد</p>';
            return;
        }
        
        let html = '';
        courses.forEach(course => {
            html += `
                <div class="course-card">
                    <h4>${course.name}</h4>
                    <p>معلم: ${course.teacher}</p>
                    <p>زمان: ${course.schedule}</p>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    displayAttendance(attendance) {
        const container = document.getElementById('attendance-list');
        if (!container) return;
        
        if (attendance.length === 0) {
            container.innerHTML = '<p>سابقه حضوری وجود ندارد</p>';
            return;
        }
        
        let html = '<table><thead><tr><th>تاریخ</th><th>وضعیت</th><th>ساعت</th></tr></thead><tbody>';
        attendance.forEach(record => {
            html += `
                <tr>
                    <td>${record.date}</td>
                    <td><span class="badge ${record.status === 'حضور' ? 'success' : 'danger'}">${record.status}</span></td>
                    <td>دوره ${record.period}</td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        
        container.innerHTML = html;
    }
    
    displayGrades(grades, courses) {
        const container = document.getElementById('grades-list');
        if (!container) return;
        
        if (grades.length === 0) {
            container.innerHTML = '<p>نمره‌ای وجود ندارد</p>';
            return;
        }
        
        let html = '<table><thead><tr><th>درس</th><th>میان‌ترم</th><th>پایانی</th><th>میانگین</th></tr></thead><tbody>';
        grades.forEach(grade => {
            const course = courses.find(c => c.id === grade.courseId);
            html += `
                <tr>
                    <td>${course?.name || 'نامشخص'}</td>
                    <td>${grade.midterm}</td>
                    <td>${grade.final}</td>
                    <td><strong>${grade.average}</strong></td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        
        container.innerHTML = html;
    }
    
    displayStudents(students) {
        const container = document.getElementById('students-list');
        if (!container) return;
        
        if (students.length === 0) {
            container.innerHTML = '<p>دانش‌آموزی وجود ندارد</p>';
            return;
        }
        
        let html = '';
        students.forEach(student => {
            html += `
                <div class="student-card">
                    <h4>${student.name}</h4>
                    <p>کلاس: ${student.class}</p>
                    <p>ایمیل: ${student.email}</p>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    displayChildInfo(child) {
        const container = document.getElementById('child-info');
        if (container && child) {
            container.innerHTML = `
                <div class="info-card">
                    <h3>${child.name}</h3>
                    <p>کلاس: ${child.class}</p>
                    <p>ایمیل: ${child.email}</p>
                </div>
            `;
        }
    }
    
    displayAdminUsers(users) {
        const container = document.getElementById('admin-users');
        if (!container) return;
        
        let html = '<h3>فهرست کاربران</h3>';
        
        // Display students
        if (users.students.length > 0) {
            html += '<h4>دانش‌آموزان</h4><ul>';
            users.students.forEach(user => {
                html += `<li>${user.name} (${user.class})</li>`;
            });
            html += '</ul>';
        }
        
        // Display teachers
        if (users.teachers.length > 0) {
            html += '<h4>معلمان</h4><ul>';
            users.teachers.forEach(user => {
                html += `<li>${user.name} (${user.subject})</li>`;
            });
            html += '</ul>';
        }
        
        // Display parents
        if (users.parents.length > 0) {
            html += '<h4>والدین</h4><ul>';
            users.parents.forEach(user => {
                html += `<li>${user.name}</li>`;
            });
            html += '</ul>';
        }
        
        container.innerHTML = html;
    }
}

// Initialize dashboard when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.dashboard = new DashboardManager();
    });
} else {
    window.dashboard = new DashboardManager();
}
