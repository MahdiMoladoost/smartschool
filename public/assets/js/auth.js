// ==========================================
// AUTHENTICATION SYSTEM
// ==========================================

const API_BASE_URL = '/api/v1';

class Auth {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.init();
    }
    
    init() {
        this.checkAuthStatus();
        this.setupLoginForm();
        this.setupLogoutButtons();
    }
    
    checkAuthStatus() {
        if (this.token && this.user) {
            this.updateUIForLoggedInUser();
        }
    }
    
    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.login();
            });
        }
        
        // Tab switching for login methods
        const methodTabs = document.querySelectorAll('.method-tab');
        if (methodTabs.length) {
            methodTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const method = tab.getAttribute('data-method');
                    this.switchLoginMethod(method);
                });
            });
        }
    }
    
    setupLogoutButtons() {
        const logoutBtns = document.querySelectorAll('.btn-logout, #logoutBtn');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });
    }
    
    async login() {
        const username = document.getElementById('username')?.value;
        const password = document.getElementById('password')?.value;
        const roleRadio = document.querySelector('input[name="role"]:checked');
        const role = roleRadio ? roleRadio.value : 'student';
        
        if (!username || !password) {
            this.showError('لطفاً نام کاربری و رمز عبور را وارد کنید');
            return;
        }
        
        const submitBtn = document.querySelector('#loginForm button[type="submit"]');
        const originalText = submitBtn?.innerHTML;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="spinner"></div> در حال ورود...';
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, role })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                this.showToast('ورود با موفقیت انجام شد');
                
                // Redirect based on role
                const redirects = {
                    super_admin: '/dashboard/super-admin',
                    admin: '/dashboard/admin',
                    principal: '/dashboard/principal',
                    executive_deputy: '/dashboard/executive-deputy',
                    cultural_deputy: '/dashboard/cultural-deputy',
                    counselor: '/dashboard/counselor',
                    teacher: '/dashboard/teacher',
                    student: '/dashboard/student',
                    parent: '/dashboard/parent'
                };
                
                setTimeout(() => {
                    window.location.href = redirects[data.user.role] || '/dashboard/student';
                }, 500);
                
            } else {
                this.showError(data.error || 'نام کاربری یا رمز عبور اشتباه است');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('خطا در ارتباط با سرور');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }
    
    async logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.token = null;
        this.user = null;
        
        this.showToast('خروج با موفقیت انجام شد');
        setTimeout(() => {
            window.location.href = '/login';
        }, 500);
    }
    
    switchLoginMethod(method) {
        const passwordPanel = document.getElementById('passwordPanel');
        const smsPanel = document.getElementById('smsPanel');
        const tabs = document.querySelectorAll('.method-tab');
        
        if (method === 'password') {
            if (passwordPanel) passwordPanel.classList.add('active');
            if (smsPanel) smsPanel.classList.remove('active');
            tabs[0]?.classList.add('active');
            tabs[1]?.classList.remove('active');
        } else {
            if (passwordPanel) passwordPanel.classList.remove('active');
            if (smsPanel) smsPanel.classList.add('active');
            tabs[0]?.classList.remove('active');
            tabs[1]?.classList.add('active');
        }
    }
    
    updateUIForLoggedInUser() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const userMenu = document.getElementById('userMenu');
        const userNameSpan = document.getElementById('userName');
        
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (userNameSpan && this.user) userNameSpan.textContent = this.user.name;
    }
    
    showError(message) {
        const errorDiv = document.getElementById('errorMsg');
        if (errorDiv) {
            errorDiv.querySelector('span').textContent = message;
            errorDiv.classList.add('show');
            setTimeout(() => errorDiv.classList.remove('show'), 5000);
        } else {
            alert(message);
        }
    }
    
    showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.classList.add('show');
            if (isError) toast.classList.add('error');
            setTimeout(() => {
                toast.classList.remove('show');
                if (isError) toast.classList.remove('error');
            }, 3000);
        }
    }
    
    getToken() {
        return this.token;
    }
    
    getUser() {
        return this.user;
    }
    
    isAuthenticated() {
        return !!this.token && !!this.user;
    }
}

// Initialize auth
const auth = new Auth();

// Export for use in other files
window.auth = auth;