// ============================================
// LOGIN PAGE JS - اتصال به دیتابیس MySQL
// ============================================

const API_BASE_URL = '/api/v1';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const rememberCheckbox = document.getElementById('rememberMe');
const loginBtn = document.getElementById('loginBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

// ============================================
// Helper Functions
// ============================================

function showMessage(message, type = 'error') {
    const container = document.getElementById('messageContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="alert alert-${type}">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'info' ? 'info-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

function showLoading(show) {
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.add('show');
        } else {
            loadingOverlay.classList.remove('show');
        }
    }
    
    if (loginBtn) {
        if (show) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال ورود...';
        } else {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> ورود به سامانه';
        }
    }
}

// ============================================
// Save/Load Remember Me
// ============================================

function saveRememberMe(username, password) {
    if (rememberCheckbox && rememberCheckbox.checked) {
        localStorage.setItem('savedUsername', username);
        localStorage.setItem('savedPassword', btoa(password)); // base64 encode for basic security
    } else {
        localStorage.removeItem('savedUsername');
        localStorage.removeItem('savedPassword');
    }
}

function loadRememberMe() {
    const savedUsername = localStorage.getItem('savedUsername');
    const savedPassword = localStorage.getItem('savedPassword');
    
    if (savedUsername && savedPassword && usernameInput && passwordInput) {
        usernameInput.value = savedUsername;
        passwordInput.value = atob(savedPassword);
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }
}

// ============================================
// Redirect Based on Role
// ============================================

function redirectToDashboard(role) {
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

    window.location.href = redirects[role] || '/dashboard/student';
}

// ============================================
// Handle Login
// ============================================

async function handleLogin(event) {
    event.preventDefault();
    
    const username = usernameInput?.value.trim();
    const password = passwordInput?.value;
    
    // Validation
    if (!username) {
        showMessage('لطفاً نام کاربری خود را وارد کنید', 'error');
        usernameInput?.focus();
        return;
    }
    
    if (!password) {
        showMessage('لطفاً رمز عبور خود را وارد کنید', 'error');
        passwordInput?.focus();
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Save token
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Save remember me
            saveRememberMe(username, password);
            
            showMessage(data.message || 'ورود با موفقیت انجام شد', 'success');
            
            // Redirect after short delay
            setTimeout(() => {
                redirectToDashboard(data.user.role);
            }, 1000);
            
        } else {
            showLoading(false);
            showMessage(data.error || 'نام کاربری یا رمز عبور اشتباه است', 'error');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showLoading(false);
        showMessage('خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید', 'error');
    }
}

// ============================================
// Check if already logged in
// ============================================

function checkAlreadyLoggedIn() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        try {
            const userData = JSON.parse(user);
            // Optional: verify token with server
            redirectToDashboard(userData.role);
        } catch (e) {
            console.error('Error parsing user data');
        }
    }
}

// ============================================
// Event Listeners
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    checkAlreadyLoggedIn();
    
    // Load saved credentials
    loadRememberMe();
    
    // Form submission
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Enter key support
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleLogin(e);
            }
        });
    }
});

// ============================================
// Export for global use
// ============================================

window.handleLogin = handleLogin;
window.togglePassword = function() {
    const passwordField = document.getElementById('password');
    const icon = document.querySelector('.toggle-password i');
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordField.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
};