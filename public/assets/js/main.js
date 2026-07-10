/* ============================================
   Farzangan Naja - Main JavaScript
   ============================================ */

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initScrollAnimations();
    initCounters();
    initAccordion();
    initForms();
    initLazyLoading();
});

/* Navigation */
function initNavigation() {
    const header = document.getElementById('main-header');
    const mobileToggle = document.getElementById('mobile-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileClose = document.getElementById('mobile-close');
    const mobileOverlay = document.getElementById('mobile-overlay');
    
    // Sticky Header
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            header.classList.add('sticky');
            if (currentScroll > lastScroll) {
                header.style.transform = 'translateY(-100%)';
            } else {
                header.style.transform = 'translateY(0)';
            }
        } else {
            header.classList.remove('sticky');
            header.style.transform = 'translateY(0)';
        }
        
        lastScroll = currentScroll;
    });
    
    // Mobile Menu
    if (mobileToggle) {
        mobileToggle.addEventListener('click', openMobileMenu);
    }
    
    if (mobileClose) {
        mobileClose.addEventListener('click', closeMobileMenu);
    }
    
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', closeMobileMenu);
    }
    
    // Smooth Scroll for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                closeMobileMenu();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function openMobileMenu() {
    document.getElementById('mobile-menu').classList.add('active');
    document.getElementById('mobile-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    document.getElementById('mobile-menu').classList.remove('active');
    document.getElementById('mobile-overlay').classList.remove('active');
    document.body.style.overflow = '';
}

/* Scroll Animations */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

/* Counter Animation */
function initCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const end = parseInt(target.getAttribute('data-counter'));
                const duration = 2000;
                const start = 0;
                const increment = end / (duration / 16);
                
                let current = start;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= end) {
                        target.textContent = end.toLocaleString('fa-IR');
                        clearInterval(timer);
                    } else {
                        target.textContent = Math.floor(current).toLocaleString('fa-IR');
                    }
                }, 16);
                
                observer.unobserve(target);
            }
        });
    }, { threshold: 0.5 });
    
    counters.forEach(counter => observer.observe(counter));
}

/* Accordion */
function initAccordion() {
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const content = header.nextElementSibling;
            const isActive = item.classList.contains('active');
            
            // Close all
            document.querySelectorAll('.accordion-item').forEach(i => {
                i.classList.remove('active');
                i.querySelector('.accordion-content').style.maxHeight = null;
            });
            
            // Open clicked if wasn't active
            if (!isActive) {
                item.classList.add('active');
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        });
    });
}

/* Forms */
function initForms() {
    // Form Validation
    document.querySelectorAll('form[data-validate]').forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });
    
    // Real-time validation
    document.querySelectorAll('input[data-validate], textarea[data-validate]').forEach(field => {
        field.addEventListener('blur', validateField);
        field.addEventListener('input', clearError);
    });
}

function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    let isValid = true;
    
    form.querySelectorAll('[data-validate]').forEach(field => {
        if (!validateField({ target: field })) {
            isValid = false;
        }
    });
    
    if (isValid) {
        showNotification('success', 'فرم با موفقیت ارسال شد');
        form.reset();
    }
}

function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    const type = field.getAttribute('data-validate');
    let isValid = true;
    let message = '';
    
    switch(type) {
        case 'required':
            if (!value) {
                isValid = false;
                message = 'این فیلد الزامی است';
            }
            break;
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                message = 'ایمیل نامعتبر است';
            }
            break;
        case 'phone':
            const phoneRegex = /^09\d{9}$/;
            if (!phoneRegex.test(value)) {
                isValid = false;
                message = 'شماره موبایل نامعتبر است';
            }
            break;
        case 'national':
            const nationalRegex = /^\d{10}$/;
            if (!nationalRegex.test(value)) {
                isValid = false;
                message = 'کد ملی ۱۰ رقمی وارد کنید';
            }
            break;
    }
    
    const formGroup = field.closest('.form-group');
    const errorEl = formGroup.querySelector('.error-message');
    
    if (!isValid) {
        formGroup.classList.add('error');
        if (errorEl) errorEl.textContent = message;
    } else {
        formGroup.classList.remove('error');
        if (errorEl) errorEl.textContent = '';
    }
    
    return isValid;
}

function clearError(e) {
    const field = e.target;
    const formGroup = field.closest('.form-group');
    formGroup.classList.remove('error');
    const errorEl = formGroup.querySelector('.error-message');
    if (errorEl) errorEl.textContent = '';
}

/* Lazy Loading */
function initLazyLoading() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });
    
    lazyImages.forEach(img => imageObserver.observe(img));
}

/* Notification System */
function showNotification(type, message, duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after duration
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

/* Modal System */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.parentElement.classList.remove('active');
        document.body.style.overflow = '';
    }
});

/* Utility Functions */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Persian Number Converter
function toPersianNumber(num) {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/\d/g, x => persianDigits[x]);
}

// Export for other modules
window.FarzanganApp = {
    openModal,
    closeModal,
    showNotification,
    toPersianNumber
};