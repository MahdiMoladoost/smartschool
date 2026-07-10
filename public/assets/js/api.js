// ==========================================
// API CLIENT
// ==========================================

const API_BASE_URL = '/api/v1';

class ApiClient {
    constructor() {
        this.token = localStorage.getItem('token');
    }
    
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        };
    }
    
    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers: this.getHeaders()
            });
            
            const data = await response.json();
            
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                throw new Error('نشست شما منقضی شده است');
            }
            
            if (!response.ok) {
                throw new Error(data.error || 'خطا در درخواست');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    // AUTH
    async login(username, password, role) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password, role })
        });
    }
    
    async getCurrentUser() {
        return this.request('/auth/me');
    }
    
    // STUDENT
    async getStudentDashboard() {
        return this.request('/student/dashboard');
    }
    
    async getStudentGrades() {
        return this.request('/student/grades');
    }
    
    async getStudentAttendance() {
        return this.request('/student/attendance');
    }
    
    async getStudentProfile() {
        return this.request('/student/profile');
    }
    
    // TEACHER
    async getTeacherDashboard() {
        return this.request('/teacher/dashboard');
    }
    
    async getTeacherClasses() {
        return this.request('/teacher/classes');
    }
    
    async getTeacherStudents(classId) {
        return this.request(`/teacher/students/${classId}`);
    }
    
    // PARENT
    async getParentDashboard() {
        return this.request('/parent/dashboard');
    }
    
    // ADMIN
    async getAdminStats() {
        return this.request('/admin/dashboard/stats');
    }
    
    async getUsers(role = null, search = null) {
        let url = '/admin/users';
        const params = [];
        if (role) params.push(`role=${role}`);
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (params.length) url += `?${params.join('&')}`;
        return this.request(url);
    }
    
    async createUser(userData) {
        return this.request('/admin/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }
    
    async updateUser(id, userData) {
        return this.request(`/admin/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }
    
    async deleteUser(id) {
        return this.request(`/admin/users/${id}`, {
            method: 'DELETE'
        });
    }
    
    // ANNOUNCEMENTS
    async getAnnouncements() {
        return this.request('/announcements');
    }
    
    // AI
    async askAI(question) {
        return this.request('/ai/ask', {
            method: 'POST',
            body: JSON.stringify({ question })
        });
    }
    
    // SETTINGS
    async getSettings() {
        return this.request('/settings');
    }
}

// Create singleton instance
const api = new ApiClient();

// Export for use
window.api = api;