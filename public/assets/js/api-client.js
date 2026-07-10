// API Utility Functions - واحد مرکزی برای تمام درخواست‌های API

class ApiClient {
    constructor() {
        this.baseURL = 'http://localhost:3000/api';
        this.token = localStorage.getItem('authToken');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
    }

    // تنظیم توکن جدید
    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    // تنظیم کاربر جدید
    setUser(user) {
        this.user = user;
        localStorage.setItem('user', JSON.stringify(user));
    }

    // خروج
    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        this.token = null;
        this.user = null;
        window.location.href = '../auth/login.html';
    }

    // درخواست HTTP عمومی
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            // اگر توکن منقضی شده باشد
            if (response.status === 401) {
                this.logout();
                return null;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'خطا در درخواست');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ورود
    async login(username, password, role) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password, role })
        });

        if (data && data.token) {
            this.setToken(data.token);
            this.setUser(data.user);
        }

        return data;
    }

    // خروج
    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('خطا در خروج:', error);
        }
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '../auth/login.html';
    }

    // ===== STUDENT APIs =====

    async getStudentDashboard() {
        return this.request('/student/dashboard');
    }

    async getStudentGrades() {
        return this.request('/student/grades');
    }

    async getStudentAssignments() {
        return this.request('/student/assignments');
    }

    async submitAssignment(assignmentId) {
        return this.request(`/student/assignments/${assignmentId}/submit`, {
            method: 'POST'
        });
    }

    async getAttendance() {
        return this.request('/student/attendance');
    }

    async requestLeave(startDate, endDate, reason) {
        return this.request('/student/leave-request', {
            method: 'POST',
            body: JSON.stringify({ startDate, endDate, reason })
        });
    }

    async getLeaveRequests() {
        return this.request('/student/leave-requests');
    }

    async getMessages() {
        return this.request('/student/messages');
    }

    async sendMessage(recipientId, subject, content) {
        return this.request('/student/messages', {
            method: 'POST',
            body: JSON.stringify({ recipientId, subject, content })
        });
    }

    async getProfile() {
        return this.request('/student/profile');
    }

    async getExams() {
        return this.request('/student/exams');
    }

    async getPayments() {
        return this.request('/student/payments');
    }

    async requestService(type) {
        return this.request('/student/services/request', {
            method: 'POST',
            body: JSON.stringify({ type })
        });
    }

    async getServiceRequests() {
        return this.request('/student/services/requests');
    }

    // ===== TEACHER APIs =====

    async getTeacherDashboard() {
        return this.request('/teacher/dashboard');
    }

    async getTeacherCourses() {
        return this.request('/teacher/courses');
    }

    async addAssignment(courseId, title, description, dueDate, points) {
        return this.request('/teacher/assignments', {
            method: 'POST',
            body: JSON.stringify({ courseId, title, description, dueDate, points })
        });
    }

    async submitGrades(studentId, courseId, grades) {
        return this.request('/teacher/grades', {
            method: 'POST',
            body: JSON.stringify({ studentId, courseId, ...grades })
        });
    }

    // ===== ADMIN APIs =====

    async getAdminDashboard() {
        return this.request('/admin/dashboard');
    }

    async getAllUsers() {
        return this.request('/users');
    }

    async addUser(userData) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }
}

// ایجاد نمونه واحد
const api = new ApiClient();

// ===== UI Helper Functions =====

// نمایش پیام موفقیت
function showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideInUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// نمایش پیام خطا
function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-error';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideInUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// نمایش Loading
function showLoading(message = 'در حال بارگذاری...') {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-overlay';
    loadingDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9998;
        backdrop-filter: blur(2px);
    `;
    loadingDiv.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 12px; text-align: center;">
            <div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div>
            <p style="color: #1e293b; font-weight: 600;">${message}</p>
        </div>
    `;
    document.body.appendChild(loadingDiv);
}

// حذف Loading
function hideLoading() {
    const loading = document.getElementById('loading-overlay');
    if (loading) loading.remove();
}

// بررسی احراز هویت
function isAuthenticated() {
    return !!api.token && !!api.user;
}

// بازگشت به صفحه ورود اگر احراز نشده
function ensureAuthenticated() {
    if (!isAuthenticated()) {
        window.location.href = '../auth/login.html';
    }
}

// فرمت تاریخ برای نمایش
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fa-IR');
}

// فرمت اعداد با جدایش‌گر هزاری
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// بررسی اعتبار فرم
function validateForm(formData, rules) {
    const errors = {};
    
    for (const [field, rule] of Object.entries(rules)) {
        const value = formData[field];
        
        if (rule.required && (!value || value.toString().trim() === '')) {
            errors[field] = `${rule.label} الزامی است`;
            continue;
        }
        
        if (rule.type === 'email' && value && !isValidEmail(value)) {
            errors[field] = 'ایمیل نامعتبر است';
            continue;
        }
        
        if (rule.type === 'number' && value && isNaN(value)) {
            errors[field] = 'مقدار عددی باید باشد';
            continue;
        }
        
        if (rule.minLength && value && value.length < rule.minLength) {
            errors[field] = `حداقل ${rule.minLength} کاراکتر الزامی است`;
            continue;
        }
    }
    
    return errors;
}

// بررسی صحت ایمیل
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// نمایش خطاهای فرم
function displayFormErrors(errors, formElement) {
    // پاک کردن خطاهای قبلی
    formElement.querySelectorAll('.form-error').forEach(el => el.remove());
    
    // نمایش خطاهای جدید
    for (const [field, error] of Object.entries(errors)) {
        const input = formElement.querySelector(`[name="${field}"]`);
        if (input) {
            const errorEl = document.createElement('span');
            errorEl.className = 'form-error';
            errorEl.textContent = error;
            errorEl.style.cssText = `
                color: #ef4444;
                font-size: 0.85rem;
                display: block;
                margin-top: 0.25rem;
            `;
            input.parentElement.appendChild(errorEl);
        }
    }
}

// Export برای استفاده در سایر فایل‌ها
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiClient, api, showSuccess, showError, showLoading, hideLoading };
}
