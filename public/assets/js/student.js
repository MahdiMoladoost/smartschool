// ============================================
// STUDENT PANEL - SMART SCHOOL MANAGEMENT
// تمام امکانات: نمرات، برنامه، تکالیف، آزمون‌ها، حضور، پیام، دستیار هوشمند، پروفایل
// ============================================

(function() {
    'use strict';

    // ============================================
    // متغیرهای سراسری
    // ============================================
    const API_BASE_URL = '/api/v1';
    let currentUser = null;
    let currentTab = 'dashboard';
    let currentStudentId = null;
    
    // داده‌های ذخیره شده
    let gradesData = [];
    let scheduleData = [];
    let assignmentsData = [];
    let examsData = [];
    let attendanceData = [];
    let messagesData = [];
    let announcementsData = [];
    
    // متغیرهای آزمون آنلاین
    let currentExam = null;
    let currentExamQuestions = [];
    let studentAnswers = {};
    let examStartTime = null;
    
    // ============================================
    // توابع کمکی
    // ============================================
    
    function toPersianNumber(num) {
        if (num === undefined || num === null) return '۰';
        const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return num.toString().replace(/\d/g, d => persianDigits[parseInt(d)]);
    }
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (typeof moment !== 'undefined') {
                return moment(date).format('jYYYY/jMM/jDD');
            }
            return date.toLocaleDateString('fa-IR');
        } catch { return dateStr; }
    }
    
    function formatDateTime(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (typeof moment !== 'undefined') {
                return moment(date).format('jYYYY/jMM/jDD HH:mm');
            }
            return date.toLocaleDateString('fa-IR') + ' ' + date.toLocaleTimeString('fa-IR');
        } catch { return dateStr; }
    }
    
    function getWeekdayName(date) {
        const weekDays = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
        let dayIndex = date.getDay();
        if (dayIndex === 0) dayIndex = 6;
        else dayIndex = dayIndex - 1;
        return weekDays[dayIndex];
    }
    
    function showToast(message, type = 'success') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:10000; display:flex; flex-direction:column; gap:10px; align-items:center;';
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
        
        toast.style.cssText = `background:${colors[type]}; color:white; padding:12px 24px; border-radius:50px; font-size:0.875rem; font-weight:600; display:flex; align-items:center; gap:10px; box-shadow:0 10px 25px rgba(0,0,0,0.1); direction:rtl; margin-bottom:10px; animation:slideDown 0.3s ease;`;
        toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            toast.style.transition = 'all 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    function showLoading(show) {
        let overlay = document.getElementById('loadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.innerHTML = '<div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:center; justify-content:center;"><div style="background:white; border-radius:24px; padding:30px; text-align:center;"><i class="fas fa-spinner fa-pulse fa-3x" style="color:#10b981;"></i><p style="margin-top:10px;">در حال بارگذاری...</p></div></div>';
            document.body.appendChild(overlay);
        }
        overlay.style.display = show ? 'flex' : 'none';
    }
    
    function getToken() {
        return localStorage.getItem('token');
    }
    
    async function fetchAPI(endpoint, options = {}) {
        const token = getToken();
        const url = `${API_BASE_URL}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                    ...options.headers
                }
            });
            
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                throw new Error('Unauthorized');
            }
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
                throw new Error(error.error || `خطای سرور: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error);
            throw error;
        }
    }
    
    function logout() {
        if (confirm('آیا از خروج مطمئن هستید؟')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
    }
    
    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.toggle('active');
    }
    
    function closeNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (panel) panel.classList.remove('active');
    }
    
    function refreshData() {
        if (currentTab) showTab(currentTab);
        else showTab('dashboard');
    }
    
    // ============================================
    // توابع دریافت داده از دیتابیس
    // ============================================
    
    async function loadProfile() {
        try {
            const data = await fetchAPI('/student/profile');
            return data.student || data;
        } catch (error) {
            console.error('Error loading profile:', error);
            return null;
        }
    }
    
    async function loadGrades() {
        try {
            const data = await fetchAPI('/student/grades');
            gradesData = data.grades || [];
            return data;
        } catch (error) {
            console.error('Error loading grades:', error);
            return { grades: [] };
        }
    }
    
    async function loadSchedule() {
        try {
            const data = await fetchAPI('/student/schedule');
            scheduleData = data.schedule || [];
            return data;
        } catch (error) {
            console.error('Error loading schedule:', error);
            return { schedule: [] };
        }
    }
    
    async function loadAssignments() {
        try {
            const data = await fetchAPI('/student/assignments');
            assignmentsData = data.assignments || [];
            return data;
        } catch (error) {
            console.error('Error loading assignments:', error);
            return { assignments: [] };
        }
    }
    
    async function loadExams() {
        try {
            const data = await fetchAPI('/student/exams');
            examsData = data.exams || [];
            document.getElementById('examsBadge')?.setAttribute('data-count', examsData.filter(e => e.status === 'active' && new Date(e.start_time) <= new Date()).length);
            return data;
        } catch (error) {
            console.error('Error loading exams:', error);
            return { exams: [] };
        }
    }
    
    async function loadAttendance() {
        try {
            const data = await fetchAPI('/student/attendance');
            attendanceData = data.attendance || [];
            return data;
        } catch (error) {
            console.error('Error loading attendance:', error);
            return { attendance: [] };
        }
    }
    
    async function loadMessages() {
        try {
            const data = await fetchAPI('/student/messages');
            messagesData = data.messages || [];
            const unreadCount = messagesData.filter(m => !m.is_read).length;
            document.getElementById('messagesBadge').innerText = unreadCount > 0 ? toPersianNumber(unreadCount) : '';
            return data;
        } catch (error) {
            console.error('Error loading messages:', error);
            return { messages: [] };
        }
    }
    
    async function loadAnnouncements() {
        try {
            const data = await fetchAPI('/announcements');
            announcementsData = data.announcements || [];
            return data;
        } catch (error) {
            console.error('Error loading announcements:', error);
            return { announcements: [] };
        }
    }
    
    async function sendMessage(receiverId, message) {
        try {
            const data = await fetchAPI('/student/messages', {
                method: 'POST',
                body: JSON.stringify({ receiver_id: receiverId, message })
            });
            return data;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }
    
    async function getExamQuestions(examId) {
        try {
            const data = await fetchAPI(`/student/exams/${examId}/questions`);
            return data;
        } catch (error) {
            console.error('Error loading exam questions:', error);
            return { questions: [] };
        }
    }
    
    async function submitExam(examId, answers) {
        try {
            const data = await fetchAPI(`/student/exams/${examId}/submit`, {
                method: 'POST',
                body: JSON.stringify({ answers })
            });
            return data;
        } catch (error) {
            console.error('Error submitting exam:', error);
            throw error;
        }
    }
    
    async function updateProfile(profileData) {
        try {
            const data = await fetchAPI('/student/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });
            return data;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }
    
    function studentAvatarFileToDataUrl(file) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!file) return Promise.reject(new Error('فایلی انتخاب نشده است'));
        if (!allowedTypes.includes(file.type)) {
            return Promise.reject(new Error('فقط تصاویر JPG، PNG و WEBP مجاز هستند'));
        }
        if (file.size > 5 * 1024 * 1024) {
            return Promise.reject(new Error('حجم عکس نباید بیشتر از ۵ مگابایت باشد'));
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('خواندن فایل تصویر انجام نشد'));
            reader.readAsDataURL(file);
        });
    }

    async function uploadAvatar(file) {
        try {
            const image = await studentAvatarFileToDataUrl(file);
            const response = await fetch('/api/v1/student/avatar', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ image })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'خطا در بارگذاری عکس');
            }
            return result;
        } catch (error) {
            console.error('Error uploading avatar:', error);
            throw error;
        }
    }
    
    async function sendAssistantMessage(message) {
        try {
            const response = await fetch('/api/chat/public', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            const data = await response.json();
            return { reply: data.reply || 'پاسخی دریافت نشد.' };
        } catch (error) {
            console.error('Error in assistant:', error);
            return { reply: 'متاسفانه در حال حاضر قادر به پاسخگویی نیستم. لطفاً مجدد تلاش کنید.' };
        }
    }
    
    // ============================================
    // تب‌ها و رندرها
    // ============================================
    

    const STUDENT_EXTRA_PAGES = {
        "courses-view": {
                "title": "مشاهده دروس",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "assignment-submit": {
                "title": "ارسال تکالیف",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "report-card": {
                "title": "مشاهده کارنامه",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "progress-chart": {
                "title": "مشاهده نمودار پیشرفت تحصیلی",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "exam-schedule": {
                "title": "مشاهده برنامه امتحانات",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "online-exam": {
                "title": "شرکت در آزمون آنلاین",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "exam-results": {
                "title": "مشاهده نتایج آزمون‌ها",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "online-class": {
                "title": "شرکت در کلاس آنلاین",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "virtual-class-content": {
                "title": "مشاهده کلاس مجازی و محتوای آموزشی",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "educational-files": {
                "title": "دانلود فایل‌های آموزشی",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "school-news": {
                "title": "مشاهده اخبار مدرسه",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "teacher-messenger": {
                "title": "پیام‌رسان داخلی با معلمان",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "admin-messenger": {
                "title": "پیام‌رسان با مدیر مدرسه",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "counselor-messenger": {
                "title": "پیام‌رسان با مشاور",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "sms-messages": {
                "title": "دریافت پیامک‌های مدرسه",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "notifications": {
                "title": "دریافت نوتیفیکیشن‌ها",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "absence-late-history": {
                "title": "مشاهده سوابق غیبت و تأخیر",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "discipline-cases": {
                "title": "مشاهده موارد انضباطی",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "encouragements": {
                "title": "مشاهده تشویقی‌ها",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "cultural-activities": {
                "title": "مشاهده فعالیت‌های فرهنگی",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "counseling-request": {
                "title": "ثبت درخواست مشاوره",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "counseling-sessions": {
                "title": "مشاهده برنامه جلسات مشاوره",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "competitions": {
                "title": "مشاهده مسابقات مدرسه",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "competition-registration": {
                "title": "ثبت‌نام در مسابقات",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "gallery": {
                "title": "مشاهده گالری تصاویر مدرسه",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "academic-calendar": {
                "title": "تقویم آموزشی",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "school-events": {
                "title": "مشاهده رویدادهای مدرسه",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "finance-status": {
                "title": "مشاهده وضعیت مالی",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "tuition-view": {
                "title": "مشاهده شهریه",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "tuition-payment": {
                "title": "پرداخت آنلاین شهریه",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "edit-profile": {
                "title": "ویرایش اطلاعات شخصی",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "change-password": {
                "title": "تغییر رمز عبور",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-study-assistant": {
                "title": "دستیار هوشمند درسی",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-homework-help": {
                "title": "حل تمرین با توضیح مرحله‌ای",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-lesson-summary": {
                "title": "خلاصه‌سازی درس",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-question-generator": {
                "title": "تولید نمونه سوال",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-study-plan": {
                "title": "برنامه‌ریزی مطالعه",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-weakness-analysis": {
                "title": "تحلیل نقاط ضعف درسی",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-resource-suggestions": {
                "title": "پیشنهاد منابع آموزشی",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        }
};
    async function renderStudentExtraPage(tabName, info) {
        const contentArea = document.getElementById('contentArea');
        if (!contentArea) return;
        const label = info?.title || tabName;
        contentArea.innerHTML = `<div class="empty-state"><i class="fas ${info?.icon || 'fa-layer-group'}"></i><h4>${escapeHtml(label)}</h4><p>برای این بخش در حال حاضر داده‌ای ثبت نشده است.</p></div>`;
    }

    async function showTab(tabName) {
        currentTab = tabName;
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-tab') === tabName) {
                item.classList.add('active');
            }
        });
        
        const titles = {
            dashboard: { title: 'داشبورد', subtitle: 'خلاصه وضعیت آموزشی', icon: 'fa-chart-line' },
            grades: { title: 'کارنامه و نمرات', subtitle: 'مشاهده نمرات دروس', icon: 'fa-star' },
            schedule: { title: 'برنامه هفتگی', subtitle: 'برنامه کلاس‌ها و زنگ‌ها', icon: 'fa-calendar-week' },
            assignments: { title: 'تکالیف', subtitle: 'لیست تکالیف و مهلت تحویل', icon: 'fa-tasks' },
            exams: { title: 'آزمون‌های آنلاین', subtitle: 'شرکت در آزمون‌ها', icon: 'fa-pen-to-square' },
            attendance: { title: 'حضور و غیاب', subtitle: 'مشاهده وضعیت حضور', icon: 'fa-clipboard-check' },
            messages: { title: 'پیام‌ها', subtitle: 'ارسال و دریافت پیام با معلمان', icon: 'fa-envelope' },
            assistant: { title: 'دستیار هوشمند', subtitle: 'پاسخگویی به سوالات درسی', icon: 'fa-robot' },
            profile: { title: 'پروفایل شخصی', subtitle: 'مشاهده و ویرایش اطلاعات', icon: 'fa-user-circle' },
            announcements: { title: 'اطلاعیه‌ها', subtitle: 'اخبار و اطلاعیه‌های مدرسه', icon: 'fa-bullhorn' }
        };
        
        const info = titles[tabName] || STUDENT_EXTRA_PAGES[tabName] || { title: tabName, subtitle: 'بخش ماژولار پنل', icon: 'fa-layer-group' };
        const pageTitle = document.getElementById('pageTitle');
        const pageSubtitle = document.getElementById('pageSubtitle');
        const pageIcon = document.getElementById('pageIcon');
        if (pageTitle) pageTitle.innerText = info.title;
        if (pageSubtitle) pageSubtitle.innerText = info.subtitle;
        if (pageIcon) pageIcon.className = `fas ${info.icon}`;
        
        const contentArea = document.getElementById('contentArea');
        if (contentArea) {
            contentArea.innerHTML = `<div class="loading-content"><i class="fas fa-spinner fa-spin"></i><p>در حال بارگذاری ${info.title}...</p></div>`;
        }
        
        if (window.innerWidth <= 1024) toggleSidebar();
        
        setTimeout(async () => {
            try {
                switch(tabName) {
                    case 'dashboard': await renderDashboard(); break;
                    case 'grades':
                    case 'report-card':
                    case 'progress-chart': await renderGrades(); break;
                    case 'schedule':
                    case 'courses-view':
                    case 'academic-calendar': await renderSchedule(); break;
                    case 'assignments':
                    case 'assignment-submit': await renderAssignments(); break;
                    case 'exams':
                    case 'exam-schedule':
                    case 'online-exam':
                    case 'exam-results': await renderExams(); break;
                    case 'attendance':
                    case 'absence-late-history': await renderAttendance(); break;
                    case 'messages':
                    case 'teacher-messenger':
                    case 'admin-messenger':
                    case 'counselor-messenger':
                    case 'notifications':
                    case 'sms-messages': await renderMessages(); break;
                    case 'assistant':
                    case 'ai-study-assistant':
                    case 'ai-homework-help':
                    case 'ai-lesson-summary':
                    case 'ai-question-generator':
                    case 'ai-study-plan':
                    case 'ai-weakness-analysis':
                    case 'ai-resource-suggestions': await renderAssistant(); break;
                    case 'profile':
                    case 'edit-profile':
                    case 'change-password': await renderProfile(); break;
                    case 'announcements':
                    case 'school-news': await renderAnnouncements(); break;
                    default: await renderStudentExtraPage(tabName, info);
                }
            } catch (error) {
                console.error(`Error loading ${tabName}:`, error);
                if (contentArea) {
                    contentArea.innerHTML = `<div style="text-align:center; padding:50px;"><i class="fas fa-exclamation-circle fa-3x" style="color:#ef4444;"></i><p>خطا در بارگذاری</p><button onclick="window.showTab('${tabName}')" style="margin-top:1rem; padding:0.5rem 1rem; background:#10b981; color:white; border:none; border-radius:40px; cursor:pointer;">تلاش مجدد</button></div>`;
                }
            }
        }, 100);
    }
    
    // ============================================
    // رندر داشبورد
    // ============================================
    
    async function renderDashboard() {
        showLoading(true);
        try {
            const profile = await loadProfile();
            const gradesRes = await loadGrades();
            const assignmentsRes = await loadAssignments();
            const attendanceRes = await loadAttendance();
            const examsRes = await loadExams();
            
            const avgGrade = gradesRes.gpa || 0;
            const totalAssignments = assignmentsRes.assignments?.length || 0;
            const pendingAssignments = assignmentsRes.assignments?.filter(a => new Date(a.deadline) > new Date() && !a.submitted).length || 0;
            const attendanceRate = attendanceRes.stats?.attendance_rate || 0;
            const upcomingExams = examsRes.exams?.filter(e => new Date(e.start_time) > new Date() && e.status === 'active').length || 0;
            
            const html = `
                <style>
                    .dashboard-stats {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 20px;
                        margin-bottom: 24px;
                    }
                    .stat-item {
                        background: white;
                        border-radius: 20px;
                        padding: 20px;
                        text-align: center;
                        border: 1px solid #e2e8f0;
                        transition: all 0.3s;
                    }
                    .stat-item:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                    .stat-icon { width: 50px; height: 50px; margin: 0 auto 12px; background: #d1fae5; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; color: #10b981; }
                    .stat-value { font-size: 1.8rem; font-weight: 800; }
                    .stat-label { font-size: 0.75rem; color: #64748b; margin-top: 6px; }
                    .welcome-card {
                        background: linear-gradient(135deg, #10b981, #059669);
                        border-radius: 24px;
                        padding: 24px;
                        color: white;
                        margin-bottom: 24px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        flex-wrap: wrap;
                        gap: 16px;
                    }
                    .welcome-text h2 { font-size: 1.3rem; margin-bottom: 8px; }
                    .welcome-text p { opacity: 0.9; font-size: 0.85rem; }
                    .welcome-date { background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 40px; font-size: 0.8rem; }
                    .recent-activities { background: white; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; }
                    .activity-item { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-bottom: 1px solid #f1f5f9; }
                    .activity-icon { width: 40px; height: 40px; background: #d1fae5; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #10b981; }
                    @media (max-width: 1024px) { .dashboard-stats { grid-template-columns: repeat(2, 1fr); } }
                    @media (max-width: 640px) { .dashboard-stats { grid-template-columns: 1fr; } }
                </style>
                
                <div>
                    <div class="welcome-card">
                        <div class="welcome-text">
                            <h2><i class="fas fa-graduation-cap"></i> خوش آمدید، ${escapeHtml(profile?.name || 'دانش‌آموز عزیز')}</h2>
                            <p>به پنل دانش‌آموزی خوش آمدید. در اینجا می‌توانید وضعیت آموزشی خود را مشاهده کنید.</p>
                        </div>
                        <div class="welcome-date"><i class="fas fa-calendar-alt"></i> ${formatDate(new Date())} - ${getWeekdayName(new Date())}</div>
                    </div>
                    
                    <div class="dashboard-stats">
                        <div class="stat-item"><div class="stat-icon"><i class="fas fa-star"></i></div><div class="stat-value">${toPersianNumber(avgGrade)}</div><div class="stat-label">معدل کل</div></div>
                        <div class="stat-item"><div class="stat-icon"><i class="fas fa-tasks"></i></div><div class="stat-value">${toPersianNumber(pendingAssignments)}/${toPersianNumber(totalAssignments)}</div><div class="stat-label">تکالیف انجام نشده</div></div>
                        <div class="stat-item"><div class="stat-icon"><i class="fas fa-calendar-check"></i></div><div class="stat-value">${attendanceRate}%</div><div class="stat-label">درصد حضور</div></div>
                        <div class="stat-item"><div class="stat-icon"><i class="fas fa-pen-to-square"></i></div><div class="stat-value">${toPersianNumber(upcomingExams)}</div><div class="stat-label">آزمون پیش رو</div></div>
                    </div>
                    
                    <div class="recent-activities">
                        <div class="card-header"><div class="card-title"><i class="fas fa-clock"></i> آخرین فعالیت‌ها</div></div>
                        <div id="activitiesList">
                            <div class="activity-item"><div class="activity-icon"><i class="fas fa-star"></i></div><div>آخرین نمرات شما در حال بارگذاری...</div></div>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('contentArea').innerHTML = html;
            
            // بارگذاری فعالیت‌های اخیر
            const activitiesList = document.getElementById('activitiesList');
            if (gradesRes.grades && gradesRes.grades.length > 0) {
                const recentGrades = gradesRes.grades.slice(0, 5);
                activitiesList.innerHTML = recentGrades.map(g => `
                    <div class="activity-item">
                        <div class="activity-icon"><i class="fas fa-star"></i></div>
                        <div><strong>${escapeHtml(g.course_name)}</strong>: نمره ${g.average || g.quiz || '-'} از ۲۰</div>
                        <div style="margin-right: auto; font-size: 0.7rem; color: #94a3b8;">${formatDate(g.created_at)}</div>
                    </div>
                `).join('');
            } else {
                activitiesList.innerHTML = '<div class="activity-item"><div class="activity-icon"><i class="fas fa-info-circle"></i></div><div>هیچ فعالیتی ثبت نشده است</div></div>';
            }
            
        } catch (error) {
            console.error('Dashboard error:', error);
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-chart-line fa-3x"></i><h4>خطا در بارگذاری داشبورد</h4><button onclick="renderDashboard()" class="btn-primary" style="margin-top:1rem;">تلاش مجدد</button></div>`;
        }
        showLoading(false);
    }
    
    // ============================================
    // رندر کارنامه و نمرات
    // ============================================
    
    async function renderGrades() {
        showLoading(true);
        try {
            const data = await loadGrades();
            const grades = data.grades || [];
            const gpa = data.gpa || 0;
            
            const getGradeClass = (grade) => {
                const num = parseFloat(grade);
                if (num >= 17) return 'grade-excellent';
                if (num >= 14) return 'grade-good';
                if (num >= 10) return 'grade-average';
                return 'grade-poor';
            };
            
            const getGradeText = (grade) => {
                const num = parseFloat(grade);
                if (num >= 17) return 'عالی';
                if (num >= 14) return 'خوب';
                if (num >= 10) return 'متوسط';
                return 'نیاز به تلاش';
            };
            
            const html = `
                <div class="card">
                    <div class="card-header"><div class="card-title"><i class="fas fa-chart-line"></i> خلاصه عملکرد</div></div>
                    <div class="card-body">
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; text-align: center;">
                            <div style="background: #d1fae5; border-radius: 20px; padding: 16px;"><div style="font-size: 2rem; font-weight: 800; color: #059669;">${toPersianNumber(gpa)}</div><div>معدل کل</div></div>
                            <div style="background: #dbeafe; border-radius: 20px; padding: 16px;"><div style="font-size: 2rem; font-weight: 800; color: #2563eb;">${toPersianNumber(grades.length)}</div><div>تعداد دروس</div></div>
                            <div style="background: #fef3c7; border-radius: 20px; padding: 16px;"><div style="font-size: 2rem; font-weight: 800; color: #d97706;">${toPersianNumber(grades.filter(g => parseFloat(g.average || g.quiz) >= 10).length)}</div><div>دروس قبولی</div></div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header"><div class="card-title"><i class="fas fa-table-list"></i> جدول نمرات</div></div>
                    <div class="card-body" style="overflow-x: auto;">
                        <table class="data-table" style="width: 100%;">
                            <thead><tr><th>#</th><th>نام درس</th><th>نمره</th><th>وضعیت</th><th>ارزیابی</th><th>تاریخ ثبت</th></tr></thead>
                            <tbody>
                                ${grades.length > 0 ? grades.map((g, idx) => {
                                    const grade = g.average || g.quiz || g.final_exam || '-';
                                    const gradeClass = getGradeClass(grade);
                                    const gradeText = getGradeText(grade);
                                    return `<tr><td>${toPersianNumber(idx+1)}</td><td><strong>${escapeHtml(g.course_name)}</strong></td><td><span class="grade-badge ${gradeClass}">${grade}</span></td><td>${grade >= 10 ? '✅ قبول' : '❌ مردود'}</td><td>${gradeText}</td><td>${formatDate(g.created_at)}</td></tr>`;
                                }).join('') : '<tr><td colspan="6" class="empty-state">نمره‌ای ثبت نشده است</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            document.getElementById('contentArea').innerHTML = html;
            
        } catch (error) {
            console.error('Grades error:', error);
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-star"></i><h4>خطا در بارگذاری نمرات</h4></div>`;
        }
        showLoading(false);
    }
    
    // ============================================
    // رندر برنامه هفتگی
    // ============================================
    
    async function renderSchedule() {
        showLoading(true);
        try {
            const data = await loadSchedule();
            const schedule = data.schedule || [];
            
            const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه'];
            const grouped = {};
            days.forEach(d => grouped[d] = []);
            schedule.forEach(s => { if (grouped[s.day]) grouped[s.day].push(s); });
            
            const html = `
                <style>
                    .schedule-grid-custom { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
                    .day-card-custom { background: white; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; }
                    .day-title-custom { background: #10b981; padding: 12px; text-align: center; font-weight: 700; color: white; }
                    .day-content-custom { padding: 16px; min-height: 350px; }
                    .class-item-custom { background: #d1fae5; border-radius: 16px; padding: 12px; margin-bottom: 12px; border-right: 3px solid #10b981; }
                    .class-time-custom { font-size: 0.7rem; color: #059669; margin-bottom: 6px; }
                    .empty-day-custom { text-align: center; color: #94a3b8; padding: 40px 16px; font-size: 0.8rem; }
                    @media (max-width: 1024px) { .schedule-grid-custom { grid-template-columns: repeat(2, 1fr); } }
                    @media (max-width: 640px) { .schedule-grid-custom { grid-template-columns: 1fr; } }
                </style>
                
                <div class="schedule-grid-custom">
                    ${days.map(day => `
                        <div class="day-card-custom">
                            <div class="day-title-custom">${day}</div>
                            <div class="day-content-custom">
                                ${grouped[day].length ? grouped[day].map(s => `
                                    <div class="class-item-custom">
                                        <div class="class-time-custom"><i class="fas fa-clock"></i> ${s.start_time || s.time || '-'}</div>
                                        <div><strong>${escapeHtml(s.course_name)}</strong></div>
                                        <div style="font-size: 0.7rem; color: #64748b;">${escapeHtml(s.teacher_name || '')}</div>
                                    </div>
                                `).join('') : '<div class="empty-day-custom"><i class="fas fa-calendar-times"></i><br>برنامه‌ای ثبت نشده</div>'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            document.getElementById('contentArea').innerHTML = html;
            
        } catch (error) {
            console.error('Schedule error:', error);
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-calendar-week"></i><h4>خطا در بارگذاری برنامه</h4></div>`;
        }
        showLoading(false);
    }
    
    // ============================================
    // رندر تکالیف
    // ============================================
    
    async function renderAssignments() {
        showLoading(true);
        try {
            const data = await loadAssignments();
            const assignments = data.assignments || [];
            
            const now = new Date();
            
            const html = `
                <div class="card">
                    <div class="card-header"><div class="card-title"><i class="fas fa-tasks"></i> لیست تکالیف</div></div>
                    <div class="card-body">
                        <div style="display: grid; gap: 16px;">
                            ${assignments.length > 0 ? assignments.map(a => {
                                const deadline = new Date(a.deadline);
                                const isOverdue = deadline < now && !a.submitted;
                                const statusClass = a.submitted ? 'grade-excellent' : (isOverdue ? 'grade-poor' : 'grade-average');
                                const statusText = a.submitted ? 'تحویل شده' : (isOverdue ? 'تأخیر داشته' : 'در انتظار تحویل');
                                
                                return `
                                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 16px; transition: all 0.3s;">
                                        <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 12px;">
                                            <div>
                                                <h4 style="margin-bottom: 8px;"><i class="fas fa-book"></i> ${escapeHtml(a.title)}</h4>
                                                <p style="font-size: 0.8rem; color: #64748b;">${escapeHtml(a.description || 'توضیحی وارد نشده')}</p>
                                                <div style="display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap;">
                                                    <span><i class="fas fa-door-open"></i> ${escapeHtml(a.class_name)}</span>
                                                    <span><i class="fas fa-calendar-alt"></i> مهلت: ${formatDate(a.deadline)}</span>
                                                    <span><i class="fas fa-star"></i> نمره: ${a.total_points || 100}</span>
                                                    <span class="grade-badge ${statusClass}"><i class="fas ${a.submitted ? 'fa-check-circle' : 'fa-clock'}"></i> ${statusText}</span>
                                                </div>
                                            </div>
                                            ${!a.submitted && !isOverdue ? `<button class="btn-primary" onclick="window.submitAssignment(${a.id})"><i class="fas fa-upload"></i> تحویل تکلیف</button>` : ''}
                                            ${a.grade ? `<div style="background: #d1fae5; border-radius: 12px; padding: 8px 16px;"><strong>نمره: ${a.grade}</strong></div>` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('') : '<div class="empty-state"><i class="fas fa-tasks"></i><h4>هیچ تکلیفی وجود ندارد</h4></div>'}
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('contentArea').innerHTML = html;
            
        } catch (error) {
            console.error('Assignments error:', error);
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-tasks"></i><h4>خطا در بارگذاری تکالیف</h4></div>`;
        }
        showLoading(false);
    }
    
    // ============================================
    // رندر آزمون‌های آنلاین
    // ============================================
    
    async function renderExams() {
        showLoading(true);
        try {
            const data = await loadExams();
            const exams = data.exams || [];
            
            const now = new Date();
            const activeExams = exams.filter(e => new Date(e.start_time) <= now && e.status === 'active');
            const upcomingExams = exams.filter(e => new Date(e.start_time) > now && e.status === 'active');
            const completedExams = exams.filter(e => e.status === 'completed');
            
            const html = `
                <div class="card">
                    <div class="card-header"><div class="card-title"><i class="fas fa-play-circle"></i> آزمون‌های فعال</div></div>
                    <div class="card-body">
                        ${activeExams.length > 0 ? activeExams.map(e => `
                            <div style="background: #d1fae5; border-radius: 20px; padding: 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                                <div><strong><i class="fas fa-pen-to-square"></i> ${escapeHtml(e.title)}</strong><br><small>مدت: ${e.duration} دقیقه | نمره کل: ${e.total_points}</small></div>
                                <button class="btn-primary" onclick="window.startExam(${e.id})"><i class="fas fa-play"></i> شروع آزمون</button>
                            </div>
                        `).join('') : '<div class="empty-state">هیچ آزمون فعالی وجود ندارد</div>'}
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header"><div class="card-title"><i class="fas fa-clock"></i> آزمون‌های پیش‌رو</div></div>
                    <div class="card-body">
                        ${upcomingExams.length > 0 ? upcomingExams.map(e => `
                            <div style="background: #fef3c7; border-radius: 20px; padding: 16px; margin-bottom: 16px;">
                                <strong>${escapeHtml(e.title)}</strong><br>
                                <small>شروع: ${formatDateTime(e.start_time)} | مدت: ${e.duration} دقیقه</small>
                            </div>
                        `).join('') : '<div class="empty-state">آزمون پیش‌رویی وجود ندارد</div>'}
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header"><div class="card-title"><i class="fas fa-check-circle"></i> آزمون‌های گذشته</div></div>
                    <div class="card-body">
                        ${completedExams.length > 0 ? completedExams.map(e => `
                            <div style="background: #f8fafc; border-radius: 20px; padding: 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                                <div><strong>${escapeHtml(e.title)}</strong><br><small>نمره: ${e.score || 'در انتظار تصحیح'}</small></div>
                                <button class="btn-primary" style="background:#64748b;" onclick="window.viewExamResult(${e.id})"><i class="fas fa-eye"></i> مشاهده نتیجه</button>
                            </div>
                        `).join('') : '<div class="empty-state">آزمونی ثبت نشده است</div>'}
                    </div>
                </div>
            `;
            
            document.getElementById('contentArea').innerHTML = html;
            
        } catch (error) {
            console.error('Exams error:', error);
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-pen-to-square"></i><h4>خطا در بارگذاری آزمون‌ها</h4></div>`;
        }
        showLoading(false);
    }
    
    // شروع آزمون
    window.startExam = async function(examId) {
        try {
            const data = await getExamQuestions(examId);
            const exam = examsData.find(e => e.id === examId);
            const questions = data.questions || [];
            
            if (questions.length === 0) {
                showToast('این آزمون سوالی ندارد', 'error');
                return;
            }
            
            currentExam = exam;
            currentExamQuestions = questions;
            studentAnswers = {};
            examStartTime = new Date();
            
            const modalHtml = `
                <div id="examModal" class="modal-overlay active" style="display: flex;">
                    <div class="modal-content" style="max-width: 700px;">
                        <div class="modal-header">
                            <h3><i class="fas fa-pen-to-square"></i> ${escapeHtml(exam.title)}</h3>
                            <button class="modal-close" onclick="closeExamModal()"><i class="fas fa-times"></i></button>
                        </div>
                        <div class="modal-body" id="examQuestionsBody">
                            <div id="timerDisplay" style="background: #fee2e2; padding: 8px 16px; border-radius: 40px; margin-bottom: 20px; text-align: center; font-weight: bold;">زمان باقیمانده: ${exam.duration}:00</div>
                            <div id="questionsContainer"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-primary" onclick="submitExamAnswers()">ارسال پاسخ‌ها</button>
                            <button class="btn-primary" style="background:#94a3b8;" onclick="closeExamModal()">انصراف</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('modalsContainer').innerHTML += modalHtml;
            
            const container = document.getElementById('questionsContainer');
            container.innerHTML = questions.map((q, idx) => `
                <div style="margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 16px;">
                    <div style="font-weight: 700; margin-bottom: 12px;">${idx+1}. ${escapeHtml(q.question_text)} <span style="font-size: 0.7rem; color: #64748b;">(${q.points} نمره)</span></div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${q.options ? JSON.parse(q.options).map((opt, optIdx) => `
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="radio" name="q_${q.id}" value="${String.fromCharCode(65+optIdx)}" onchange="window.setAnswer(${q.id}, '${String.fromCharCode(65+optIdx)}')">
                                <span>${String.fromCharCode(65+optIdx)}. ${escapeHtml(opt)}</span>
                            </label>
                        `).join('') : '<textarea class="form-control" rows="3" placeholder="پاسخ خود را وارد کنید..." onchange="window.setAnswerText(${q.id}, this.value)"></textarea>'}
                    </div>
                </div>
            `).join('');
            
            // تایمر
            let timeLeft = exam.duration * 60;
            const timerInterval = setInterval(() => {
                if (!document.getElementById('examModal')) {
                    clearInterval(timerInterval);
                    return;
                }
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                document.getElementById('timerDisplay').innerText = `زمان باقیمانده: ${minutes}:${seconds.toString().padStart(2, '0')}`;
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    submitExamAnswers();
                }
                timeLeft--;
            }, 1000);
            
            window.currentExamTimer = timerInterval;
            
        } catch (error) {
            console.error('Start exam error:', error);
            showToast('خطا در شروع آزمون', 'error');
        }
    };
    
    window.setAnswer = function(questionId, answer) {
        studentAnswers[questionId] = answer;
    };
    
    window.setAnswerText = function(questionId, answer) {
        studentAnswers[questionId] = answer;
    };
    
    window.submitExamAnswers = async function() {
        if (!confirm('آیا از ارسال پاسخ‌ها مطمئن هستید؟')) return;
        
        showLoading(true);
        try {
            const result = await submitExam(currentExam.id, studentAnswers);
            showToast(`نمره شما: ${result.score} از ${result.total_points}`, 'success');
            closeExamModal();
            await renderExams();
        } catch (error) {
            showToast(error.message || 'خطا در ارسال پاسخ‌ها', 'error');
        } finally {
            showLoading(false);
        }
    };
    
    window.closeExamModal = function() {
        if (window.currentExamTimer) clearInterval(window.currentExamTimer);
        const modal = document.getElementById('examModal');
        if (modal) modal.remove();
        currentExam = null;
        currentExamQuestions = [];
        studentAnswers = {};
    };
    
    window.viewExamResult = function(examId) {
        showToast('در حال توسعه...', 'info');
    };
    
    // ============================================
    // رندر حضور و غیاب
    // ============================================
    
    async function renderAttendance() {
        showLoading(true);
        try {
            const data = await loadAttendance();
            const attendance = data.attendance || [];
            const stats = data.stats || {};
            
            const html = `
                <div class="stats-grid" style="margin-bottom: 24px;">
                    <div class="stat-card"><div class="stat-icon"><i class="fas fa-check-circle"></i></div><div class="stat-value">${toPersianNumber(stats.present || 0)}</div><div class="stat-label">حاضر</div></div>
                    <div class="stat-card"><div class="stat-icon"><i class="fas fa-times-circle"></i></div><div class="stat-value">${toPersianNumber(stats.absent || 0)}</div><div class="stat-label">غایب</div></div>
                    <div class="stat-card"><div class="stat-icon"><i class="fas fa-clock"></i></div><div class="stat-value">${toPersianNumber(stats.late || 0)}</div><div class="stat-label">تأخیر</div></div>
                    <div class="stat-card"><div class="stat-icon"><i class="fas fa-chart-line"></i></div><div class="stat-value">${stats.attendance_rate || 0}%</div><div class="stat-label">درصد حضور</div></div>
                </div>
                
                <div class="card">
                    <div class="card-header"><div class="card-title"><i class="fas fa-calendar-alt"></i> گزارش حضور و غیاب</div></div>
                    <div class="card-body" style="overflow-x: auto;">
                        <table class="data-table" style="width: 100%;">
                            <thead><tr><th>تاریخ</th><th>وضعیت</th><th>توضیحات</th></tr></thead>
                            <tbody>
                                ${attendance.length > 0 ? attendance.map(a => `
                                    <tr>
                                        <td>${formatDate(a.date)}</td>
                                        <td><span class="status-${a.status === 'present' ? 'present' : (a.status === 'absent' ? 'absent' : 'late')} grade-badge">${a.status === 'present' ? 'حاضر' : (a.status === 'absent' ? 'غایب' : 'تأخیر')}</span></td>
                                        <td>${a.notes || '-'}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="3" class="empty-state">هیچ گزارشی ثبت نشده است</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            document.getElementById('contentArea').innerHTML = html;
            
        } catch (error) {
            console.error('Attendance error:', error);
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-clipboard-check"></i><h4>خطا در بارگذاری حضور و غیاب</h4></div>`;
        }
        showLoading(false);
    }
    
    // ============================================
    // رندر پیام‌ها
    // ============================================
    
    async function renderMessages() {
        showLoading(true);
        try {
            await loadMessages();
            
            // دریافت لیست معلمان
            let teachers = [];
            try {
                const teachersRes = await fetchAPI('/teachers/list');
                teachers = teachersRes.teachers || [];
            } catch (e) {
                console.warn('Could not load teachers:', e);
            }
            
            const html = `
                <div style="display: grid; grid-template-columns: 300px 1fr; gap: 20px; min-height: 500px;">
                    <div class="card" style="margin: 0;">
                        <div class="card-header"><div class="card-title"><i class="fas fa-users"></i> معلمان</div></div>
                        <div class="card-body" style="padding: 0;">
                            <div id="teachersList" style="max-height: 500px; overflow-y: auto;">
                                ${teachers.map(t => `
                                    <div class="teacher-item" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; cursor: pointer;" onclick="window.selectTeacher(${t.id}, '${escapeHtml(t.name)}')">
                                        <div style="width: 40px; height: 40px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;"><i class="fas fa-chalkboard-user"></i></div>
                                        <div><strong>${escapeHtml(t.name)}</strong><br><span style="font-size: 0.7rem; color: #64748b;">${escapeHtml(t.subject || 'معلم')}</span></div>
                                    </div>
                                `).join('')}
                                ${teachers.length === 0 ? '<div class="empty-state">هیچ معلمی یافت نشد</div>' : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div class="card" style="margin: 0;">
                        <div class="card-header"><div class="card-title"><i class="fas fa-comments"></i> مکالمات</div></div>
                        <div class="card-body" style="display: flex; flex-direction: column; height: 500px;">
                            <div id="chatMessages" style="flex: 1; overflow-y: auto; margin-bottom: 16px;">
                                <div class="empty-state">یک معلم را برای شروع مکالمه انتخاب کنید</div>
                            </div>
                            <div style="display: flex; gap: 12px;">
                                <input type="text" id="messageInput" class="form-control" placeholder="پیام خود را بنویسید..." onkeypress="if(event.key==='Enter') window.sendMessageToTeacher()">
                                <button class="btn-primary" onclick="window.sendMessageToTeacher()"><i class="fas fa-paper-plane"></i> ارسال</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('contentArea').innerHTML = html;
            
            window.selectedTeacherId = null;
            
            window.selectTeacher = function(teacherId, teacherName) {
                window.selectedTeacherId = teacherId;
                document.getElementById('selectedTeacherName').innerHTML = teacherName;
                loadChatMessages(teacherId);
            };
            
            async function loadChatMessages(teacherId) {
                try {
                    const data = await fetchAPI(`/student/messages/${teacherId}`);
                    const messages = data.messages || [];
                    
                    const container = document.getElementById('chatMessages');
                    container.innerHTML = messages.map(m => `
                        <div style="display: flex; justify-content: ${m.sender_id === currentStudentId ? 'flex-end' : 'flex-start'}; margin-bottom: 12px;">
                            <div style="background: ${m.sender_id === currentStudentId ? '#10b981' : '#f1f5f9'}; color: ${m.sender_id === currentStudentId ? 'white' : '#0f172a'}; padding: 10px 14px; border-radius: 18px; max-width: 70%;">
                                <div style="font-size: 0.8rem;">${escapeHtml(m.message)}</div>
                                <div style="font-size: 0.6rem; opacity: 0.7; margin-top: 4px;">${formatDateTime(m.created_at)}</div>
                            </div>
                        </div>
                    `).join('');
                    if (messages.length === 0) {
                        container.innerHTML = '<div class="empty-state">هیچ پیامی وجود ندارد. پیام خود را ارسال کنید.</div>';
                    }
                    container.scrollTop = container.scrollHeight;
                } catch (error) {
                    console.error('Error loading chat:', error);
                }
            }
            
            window.sendMessageToTeacher = async function() {
                const input = document.getElementById('messageInput');
                const message = input.value.trim();
                if (!message || !window.selectedTeacherId) {
                    if (!window.selectedTeacherId) showToast('لطفاً یک معلم را انتخاب کنید', 'warning');
                    return;
                }
                
                showLoading(true);
                try {
                    await sendMessage(window.selectedTeacherId, message);
                    input.value = '';
                    await loadChatMessages(window.selectedTeacherId);
                    await loadMessages(); // به‌روزرسانی تعداد پیام‌های خوانده نشده
                } catch (error) {
                    showToast(error.message || 'خطا در ارسال پیام', 'error');
                } finally {
                    showLoading(false);
                }
            };
            
        } catch (error) {
            console.error('Messages error:', error);
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-envelope"></i><h4>خطا در بارگذاری پیام‌ها</h4></div>`;
        }
        showLoading(false);
    }
    
    // ============================================
    // رندر دستیار هوشمند
    // ============================================
    
    async function renderAssistant() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = '';
        contentArea.style.padding = '20px';
        contentArea.style.backgroundColor = '#f8fafc';
        
        const html = `
            <style>
                .assistant-wrapper {
                    width: 100%;
                    min-height: calc(100vh - 200px);
                    background: linear-gradient(135deg, #d1fae5 0%, #fef3c7 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    border-radius: 24px;
                }
                .assistant-card {
                    width: 100%;
                    max-width: 600px;
                    background: white;
                    border-radius: 32px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .assistant-header {
                    background: linear-gradient(135deg, #10b981, #059669);
                    padding: 20px;
                    color: white;
                    text-align: center;
                }
                .assistant-header h3 { font-size: 1.3rem; margin: 0; display: flex; align-items: center; justify-content: center; gap: 8px; }
                .assistant-header p { font-size: 0.75rem; margin: 6px 0 0; opacity: 0.9; }
                .chat-area {
                    height: 450px;
                    overflow-y: auto;
                    padding: 16px;
                    background: #f8fafc;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .msg-bot { display: flex; gap: 10px; align-items: flex-start; }
                .msg-user { display: flex; gap: 10px; align-items: flex-start; flex-direction: row-reverse; }
                .bot-avatar { width: 38px; height: 38px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .user-avatar { width: 38px; height: 38px; background: #8b5cf6; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .bot-avatar i, .user-avatar i { color: white; font-size: 1rem; }
                .bot-text { background: white; padding: 10px 14px; border-radius: 18px; border-top-right-radius: 4px; font-size: 0.85rem; color: #1e293b; max-width: 80%; }
                .user-text { background: #8b5cf6; padding: 10px 14px; border-radius: 18px; border-top-left-radius: 4px; font-size: 0.85rem; color: white; max-width: 80%; }
                .input-area { padding: 16px; background: white; border-top: 1px solid #e2e8f0; display: flex; gap: 10px; }
                .input-area input { flex: 1; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 50px; font-family: inherit; font-size: 0.85rem; }
                .input-area button { background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 12px 24px; border-radius: 50px; cursor: pointer; font-weight: 600; }
                @keyframes bounceDots { 0%,80%,100%{transform:scale(0)}40%{transform:scale(1)} }
                .typing-dots { background: white; padding: 12px 18px; border-radius: 18px; border-top-right-radius: 4px; display: flex; gap: 5px; }
                .typing-dots span { width: 7px; height: 7px; background: #94a3b8; border-radius: 50%; animation: bounceDots 1.4s infinite; }
                .typing-dots span:nth-child(1) { animation-delay: 0s; }
                .typing-dots span:nth-child(2) { animation-delay: -0.32s; }
                .typing-dots span:nth-child(3) { animation-delay: -0.16s; }
                @media (max-width: 640px) { .assistant-wrapper { padding: 12px; } .chat-area { height: 400px; } }
            </style>
            
            <div class="assistant-wrapper">
                <div class="assistant-card">
                    <div class="assistant-header">
                        <h3><i class="fas fa-robot"></i> دستیار هوشمند درسی</h3>
                        <p>پاسخگویی با AI - سوالات درسی خود را بپرسید</p>
                    </div>
                    <div class="chat-area" id="assistantChatArea">
                        <div class="msg-bot">
                            <div class="bot-avatar"><i class="fas fa-robot"></i></div>
                            <div class="bot-text">سلام! 🤖<br>من دستیار هوشمند درسی شما هستم. هر سوالی در مورد دروس، تکالیف یا برنامه درسی دارید بپرسید.</div>
                        </div>
                    </div>
                    <div class="input-area">
                        <input type="text" id="assistantInput" placeholder="سوال خود را بپرسید..." onkeypress="if(event.key==='Enter') sendAssistantMsg()">
                        <button onclick="sendAssistantMsg()"><i class="fas fa-paper-plane"></i> ارسال</button>
                    </div>
                </div>
            </div>
        `;
        
        contentArea.innerHTML = html;
        
        let typingElement = null;
        
        function showTyping() {
            if (typingElement) typingElement.remove();
            typingElement = document.createElement('div');
            typingElement.className = 'msg-bot';
            typingElement.innerHTML = `<div class="bot-avatar"><i class="fas fa-robot"></i></div><div class="typing-dots"><span></span><span></span><span></span></div>`;
            document.getElementById('assistantChatArea').appendChild(typingElement);
            typingElement.scrollIntoView({ behavior: 'smooth' });
        }
        
        function hideTyping() { if (typingElement) { typingElement.remove(); typingElement = null; } }
        
        window.sendAssistantMsg = async function() {
            const input = document.getElementById('assistantInput');
            const message = input?.value.trim();
            if (!message) return;
            
            const chatArea = document.getElementById('assistantChatArea');
            chatArea.innerHTML += `<div class="msg-user"><div class="user-avatar"><i class="fas fa-user-graduate"></i></div><div class="user-text">${escapeHtml(message)}</div></div>`;
            input.value = '';
            chatArea.scrollTop = chatArea.scrollHeight;
            
            showTyping();
            try {
                const response = await sendAssistantMessage(message);
                hideTyping();
                chatArea.innerHTML += `<div class="msg-bot"><div class="bot-avatar"><i class="fas fa-robot"></i></div><div class="bot-text">${escapeHtml(response.reply)}</div></div>`;
                chatArea.scrollTop = chatArea.scrollHeight;
            } catch (error) {
                hideTyping();
                chatArea.innerHTML += `<div class="msg-bot"><div class="bot-avatar"><i class="fas fa-exclamation-triangle"></i></div><div class="bot-text" style="background:#fee2e2; color:#dc2626;">❌ خطا در اتصال. لطفاً دوباره تلاش کنید.</div></div>`;
            }
        };
    }
    
    // ============================================
    // رندر پروفایل
    // ============================================
    
    async function renderProfile() {
        showLoading(true);
        try {
            const profile = await loadProfile();
            
            const html = `
                <div class="card">
                    <div class="card-header">
                        <div class="card-title"><i class="fas fa-user-circle"></i> اطلاعات شخصی</div>
                        <button class="btn-primary" onclick="openEditProfileModal()"><i class="fas fa-edit"></i> ویرایش پروفایل</button>
                    </div>
                    <div class="card-body">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <div id="profileAvatar" style="width: 100px; height: 100px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; cursor: pointer; overflow: hidden; border: 4px solid #fff; box-shadow: 0 10px 28px rgba(15,23,42,.18); position: relative;" onclick="document.getElementById('avatarInput').click()" title="تغییر عکس پروفایل">
                                ${profile.avatar_url
                                    ? `<img src="${escapeHtml(profile.avatar_url)}" alt="عکس پروفایل" style="width:100%;height:100%;object-fit:cover;">`
                                    : '<i class="fas fa-user-graduate fa-3x" style="color: white;"></i>'}
                                <span style="position:absolute;left:4px;bottom:4px;width:27px;height:27px;border-radius:50%;background:#2563eb;color:#fff;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:.65rem;"><i class="fas fa-camera"></i></span>
                            </div>
                            <input type="file" id="avatarInput" style="display:none" accept="image/jpeg,image/png,image/webp" onchange="uploadAvatar(this)">
                            <h3>${escapeHtml(profile.name)}</h3>
                            <p><span class="grade-badge grade-excellent">دانش‌آموز</span></p>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>نام کامل</label><div class="form-control" style="background:#f8fafc;" id="profileName">${escapeHtml(profile.name)}</div></div>
                            <div class="form-group"><label>نام کاربری</label><div class="form-control" style="background:#f8fafc;">${escapeHtml(profile.username)}</div></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>کلاس</label><div class="form-control" style="background:#f8fafc;" id="profileClass">${profile.class_name || 'نامشخص'}</div></div>
                            <div class="form-group"><label>شماره تماس</label><div class="form-control" style="background:#f8fafc;" id="profilePhone">${profile.phone || 'ثبت نشده'}</div></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>ایمیل</label><div class="form-control" style="background:#f8fafc;" id="profileEmail">${profile.email || 'ثبت نشده'}</div></div>
                            <div class="form-group"><label>تاریخ عضویت</label><div class="form-control" style="background:#f8fafc;">${formatDate(profile.created_at)}</div></div>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('contentArea').innerHTML = html;
            
            window.openEditProfileModal = function() {
                showToast('در حال توسعه... به زودی', 'info');
            };
            
            window.uploadAvatar = async function(input) {
                const file = input.files[0];
                if (!file) return;
                showLoading(true);
                try {
                    const result = await uploadAvatar(file);
                    if (result.success) {
                        showToast('عکس پروفایل با موفقیت تغییر کرد', 'success');
                        await renderProfile();
                    }
                } catch (error) {
                    showToast(error.message || 'خطا در آپلود عکس', 'error');
                } finally {
                    showLoading(false);
                }
            };
            
        } catch (error) {
            console.error('Profile error:', error);
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-user-circle"></i><h4>خطا در بارگذاری پروفایل</h4></div>`;
        }
        showLoading(false);
    }
    
    // ============================================
    // رندر اطلاعیه‌ها
    // ============================================
    
    async function renderAnnouncements() {
        showLoading(true);
        try {
            const data = await loadAnnouncements();
            const announcements = data.announcements || [];
            
            const getPriorityStyle = (priority) => {
                if (priority === 'urgent') return { bg: '#fee2e2', color: '#dc2626', icon: 'fa-exclamation-triangle', text: 'فوری' };
                if (priority === 'high') return { bg: '#fef3c7', color: '#d97706', icon: 'fa-arrow-up', text: 'مهم' };
                return { bg: '#d1fae5', color: '#10b981', icon: 'fa-info-circle', text: 'عادی' };
            };
            
            const html = `
                <div class="card">
                    <div class="card-header"><div class="card-title"><i class="fas fa-bullhorn"></i> اطلاعیه‌ها و اخبار</div></div>
                    <div class="card-body">
                        <div style="display: grid; gap: 16px;">
                            ${announcements.length > 0 ? announcements.map(a => {
                                const style = getPriorityStyle(a.priority);
                                return `
                                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden;">
                                        <div style="background: ${style.bg}; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                                            <h4 style="margin: 0;"><i class="fas ${style.icon}" style="color: ${style.color};"></i> ${escapeHtml(a.title)}</h4>
                                            <span style="background: ${style.color}20; color: ${style.color}; padding: 4px 12px; border-radius: 40px; font-size: 0.7rem;">${style.text}</span>
                                        </div>
                                        <div style="padding: 16px;">
                                            <p>${escapeHtml(a.content)}</p>
                                            <div style="display: flex; justify-content: space-between; margin-top: 12px; font-size: 0.7rem; color: #64748b;">
                                                <span><i class="fas fa-user"></i> ${a.created_by_name || 'مدیر سیستم'}</span>
                                                <span><i class="fas fa-calendar-alt"></i> ${formatDate(a.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('') : '<div class="empty-state">هیچ اطلاعیه‌ای وجود ندارد</div>'}
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('contentArea').innerHTML = html;
            
        } catch (error) {
            console.error('Announcements error:', error);
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-bullhorn"></i><h4>خطا در بارگذاری اطلاعیه‌ها</h4></div>`;
        }
        showLoading(false);
    }
    
    // ============================================
    // توابع کمکی اضافی
    // ============================================
    
    window.submitAssignment = function(assignmentId) {
        showToast('در حال توسعه... به زودی می‌توانید فایل تکلیف خود را آپلود کنید', 'info');
    };
    
    // ============================================
    // راه‌اندازی اولیه
    // ============================================
    
    
function getInitialPanelPage() {
    const page = document.body && document.body.dataset ? document.body.dataset.page : null;
    return page || 'dashboard';
}

async function init() {
        const token = getToken();
        if (!token) {
            window.location.href = '/login';
            return;
        }
        
        try {
            const user = await fetchAPI('/auth/me');
            if (user.role !== 'student') {
                window.location.href = '/login';
                return;
            }
            currentUser = user;
            currentStudentId = user.id;
            
            const studentNameEl = document.getElementById('studentName');
            if (studentNameEl) studentNameEl.innerText = user.name || 'دانش‌آموز';
        } catch (error) {
            console.error('Error getting user info:', error);
            showToast('خطا در دریافت اطلاعات کاربر', 'error');
        }
        
        // اتصال رویدادهای منو
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (item.matches('a[href]')) return;
            item.removeEventListener('click', item._listener);
            const listener = (e) => {
                e.preventDefault();
                const tab = item.getAttribute('data-tab');
                if (tab) showTab(tab);
            };
            item.addEventListener('click', listener);
            item._listener = listener;
        });
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.removeEventListener('click', logoutBtn._listener);
            const logoutListener = () => logout();
            logoutBtn.addEventListener('click', logoutListener);
            logoutBtn._listener = logoutListener;
        }
        
        showTab(getInitialPanelPage());
    }
    
    // شروع برنامه
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // توابع سراسری
    window.showTab = showTab;
    window.logout = logout;
    window.toggleSidebar = toggleSidebar;
    window.refreshData = refreshData;
    window.closeNotificationPanel = closeNotificationPanel;
    window.toPersianNumber = toPersianNumber;
    window.showToast = showToast;
    window.startExam = startExam;
    window.setAnswer = setAnswer;
    window.setAnswerText = setAnswerText;
    window.submitExamAnswers = submitExamAnswers;
    window.closeExamModal = closeExamModal;
    window.viewExamResult = viewExamResult;
    window.submitAssignment = submitAssignment;
    window.selectTeacher = (teacherId, teacherName) => { if (typeof window.selectTeacher === 'function') window.selectTeacher(teacherId, teacherName); };
    window.sendMessageToTeacher = () => { if (typeof window.sendMessageToTeacher === 'function') window.sendMessageToTeacher(); };
    window.sendAssistantMsg = () => { if (typeof window.sendAssistantMsg === 'function') window.sendAssistantMsg(); };
    window.openEditProfileModal = () => { if (typeof window.openEditProfileModal === 'function') window.openEditProfileModal(); };
    window.uploadAvatar = (input) => { if (typeof window.uploadAvatar === 'function') window.uploadAvatar(input); };
    
})();
