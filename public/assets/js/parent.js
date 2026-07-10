// ============================================
// PARENT PANEL - SMART SCHOOL MANAGEMENT
// امکانات: مدیریت فرزندان، نمرات، برنامه، تکالیف، حضور، پیام، درخواست ملاقات، مالی، اطلاعیه‌ها
// ============================================

(function() {
    'use strict';

    // ============================================
    // متغیرهای سراسری
    // ============================================
    const API_BASE_URL = '/api/v1';
    let currentUser = null;
    let currentTab = 'dashboard';
    let currentParentId = null;
    
    // داده‌های فرزندان
    let childrenList = [];
    let selectedChildId = null;
    let selectedChildName = '';
    
    // داده‌های ذخیره شده
    let gradesData = {};
    let scheduleData = {};
    let assignmentsData = {};
    let attendanceData = {};
    let paymentsData = {};
    let messagesData = [];
    let meetingsData = [];
    let announcementsData = [];
    
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
    
    function formatMoney(amount) {
        if (!amount) return '۰ تومان';
        return amount.toLocaleString('fa-IR') + ' تومان';
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
        const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#8b5cf6' };
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
            overlay.innerHTML = '<div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:center; justify-content:center;"><div style="background:white; border-radius:24px; padding:30px; text-align:center;"><i class="fas fa-spinner fa-pulse fa-3x" style="color:#8b5cf6;"></i><p style="margin-top:10px;">در حال بارگذاری...</p></div></div>';
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
    
    async function loadChildren() {
        try {
            const data = await fetchAPI('/parent/children');
            childrenList = data.children || [];
            if (childrenList.length > 0 && !selectedChildId) {
                selectedChildId = childrenList[0].id;
                selectedChildName = childrenList[0].name;
            }
            return childrenList;
        } catch (error) {
            console.error('Error loading children:', error);
            return [];
        }
    }
    
    async function loadProfile() {
        try {
            const data = await fetchAPI('/parent/profile');
            return data.parent || data;
        } catch (error) {
            console.error('Error loading profile:', error);
            return null;
        }
    }
    
    async function loadChildGrades(childId) {
        try {
            const data = await fetchAPI(`/parent/child/${childId}/grades`);
            gradesData[childId] = data.grades || [];
            return data;
        } catch (error) {
            console.error('Error loading grades:', error);
            return { grades: [] };
        }
    }
    
    async function loadChildSchedule(childId) {
        try {
            const data = await fetchAPI(`/parent/child/${childId}/schedule`);
            scheduleData[childId] = data.schedule || [];
            return data;
        } catch (error) {
            console.error('Error loading schedule:', error);
            return { schedule: [] };
        }
    }
    
    async function loadChildAssignments(childId) {
        try {
            const data = await fetchAPI(`/parent/child/${childId}/assignments`);
            assignmentsData[childId] = data.assignments || [];
            return data;
        } catch (error) {
            console.error('Error loading assignments:', error);
            return { assignments: [] };
        }
    }
    
    async function loadChildAttendance(childId) {
        try {
            const data = await fetchAPI(`/parent/child/${childId}/attendance`);
            attendanceData[childId] = data.attendance || [];
            return data;
        } catch (error) {
            console.error('Error loading attendance:', error);
            return { attendance: [] };
        }
    }
    
    async function loadChildPayments(childId) {
        try {
            const data = await fetchAPI(`/parent/child/${childId}/payments`);
            paymentsData[childId] = data.payments || [];
            return data;
        } catch (error) {
            console.error('Error loading payments:', error);
            return { payments: [] };
        }
    }
    
    async function loadMessages() {
        try {
            const data = await fetchAPI('/parent/messages');
            messagesData = data.messages || [];
            const unreadCount = messagesData.filter(m => !m.is_read).length;
            document.getElementById('messagesBadge').innerText = unreadCount > 0 ? toPersianNumber(unreadCount) : '';
            return data;
        } catch (error) {
            console.error('Error loading messages:', error);
            return { messages: [] };
        }
    }
    
    async function loadMeetings() {
        try {
            const data = await fetchAPI('/parent/meetings');
            meetingsData = data.meetings || [];
            return data;
        } catch (error) {
            console.error('Error loading meetings:', error);
            return { meetings: [] };
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
            const data = await fetchAPI('/parent/messages', {
                method: 'POST',
                body: JSON.stringify({ receiver_id: receiverId, message })
            });
            return data;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }
    
    async function requestMeeting(meetingData) {
        try {
            const data = await fetchAPI('/parent/meetings', {
                method: 'POST',
                body: JSON.stringify(meetingData)
            });
            return data;
        } catch (error) {
            console.error('Error requesting meeting:', error);
            throw error;
        }
    }
    
    async function updateProfile(profileData) {
        try {
            const data = await fetchAPI('/parent/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });
            return data;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }
    
    // ============================================
    // تب‌ها و رندرها
    // ============================================
    

    const PARENT_EXTRA_PAGES = {
        "daily-child-status": {
                "title": "مشاهده وضعیت روزانه فرزند",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "report-card": {
                "title": "مشاهده کارنامه",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "progress-chart": {
                "title": "مشاهده نمودار پیشرفت",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "exam-results": {
                "title": "مشاهده نتایج آزمون‌ها",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "exam-schedule": {
                "title": "مشاهده برنامه امتحانات",
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
        "school-news": {
                "title": "مشاهده اخبار مدرسه",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "teacher-messenger": {
                "title": "پیام‌رسان با معلمان",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "admin-messenger": {
                "title": "پیام‌رسان با مدیر",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "counselor-messenger": {
                "title": "پیام‌رسان با مشاور",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "teacher-meeting": {
                "title": "درخواست جلسه با معلم",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "counseling-reserve": {
                "title": "رزرو جلسه مشاوره",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "sms-messages": {
                "title": "دریافت پیامک‌ها",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "notifications": {
                "title": "دریافت نوتیفیکیشن",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "cultural-activities": {
                "title": "مشاهده فعالیت‌های فرهنگی",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "gallery": {
                "title": "مشاهده گالری مدرسه",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "tuition-payment": {
                "title": "پرداخت شهریه",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "payment-history": {
                "title": "مشاهده سوابق پرداخت",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-child-analysis": {
                "title": "تحلیل کامل وضعیت تحصیلی فرزند",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-strength-weakness": {
                "title": "تحلیل نقاط ضعف و قوت",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-grade-forecast": {
                "title": "پیش‌بینی نمرات آینده",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-study-plan": {
                "title": "پیشنهاد برنامه مطالعه",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-absence-impact": {
                "title": "تحلیل ارتباط غیبت با افت تحصیلی",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-weekly-report": {
                "title": "گزارش هوشمند هفتگی",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-resource-suggestions": {
                "title": "پیشنهاد منابع آموزشی",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        }
};
    async function renderParentExtraPage(tabName, info) {
        const contentArea = document.getElementById('contentArea');
        if (!contentArea) return;
        const label = info?.title || tabName;
        contentArea.innerHTML = `<div class="empty-state"><i class="fas ${info?.icon || 'fa-layer-group'}"></i><h4>${escapeHtml(label)}</h4><p>${escapeHtml(info?.subtitle || 'این بخش جدید به پنل اضافه شده و به داده‌های مدرسه متصل است.')}</p><div style="margin-top:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px"><div class="stat-card"><h3>ماژولار</h3><p>صفحه مستقل</p></div><div class="stat-card"><h3>Role-Based</h3><p>وابسته به نقش کاربر</p></div><div class="stat-card"><h3>API Ready</h3><p>آماده اتصال کامل</p></div></div></div>`;
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
            dashboard: { title: 'داشبورد', subtitle: 'خلاصه وضعیت فرزندان', icon: 'fa-chart-line' },
            children: { title: 'مدیریت فرزندان', subtitle: 'مشاهده و مدیریت اطلاعات فرزندان', icon: 'fa-child' },
            grades: { title: 'کارنامه و نمرات', subtitle: 'مشاهده نمرات فرزندان', icon: 'fa-star' },
            schedule: { title: 'برنامه هفتگی', subtitle: 'برنامه کلاس‌های فرزندان', icon: 'fa-calendar-week' },
            assignments: { title: 'تکالیف', subtitle: 'مشاهده تکالیف فرزندان', icon: 'fa-tasks' },
            attendance: { title: 'حضور و غیاب', subtitle: 'مشاهده وضعیت حضور فرزندان', icon: 'fa-clipboard-check' },
            messages: { title: 'پیام‌ها', subtitle: 'ارسال و دریافت پیام با معلمان', icon: 'fa-envelope' },
            meetings: { title: 'درخواست ملاقات', subtitle: 'درخواست ملاقات با معلمان', icon: 'fa-calendar-alt' },
            payments: { title: 'وضعیت مالی', subtitle: 'مشاهده صورت حساب‌ها', icon: 'fa-credit-card' },
            profile: { title: 'پروفایل', subtitle: 'مشاهده و ویرایش اطلاعات', icon: 'fa-user-circle' },
            announcements: { title: 'اطلاعیه‌ها', subtitle: 'اخبار و اطلاعیه‌های مدرسه', icon: 'fa-bullhorn' }
        };
        
        const info = titles[tabName] || PARENT_EXTRA_PAGES[tabName] || { title: tabName, subtitle: 'بخش ماژولار پنل', icon: 'fa-layer-group' };
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
        
        // قبل از بارگذاری تب، لیست فرزندان را دریافت کن
        if (childrenList.length === 0) {
            await loadChildren();
        }
        
        setTimeout(async () => {
            try {
                switch(tabName) {
                    case 'dashboard': await renderDashboard(); break;
                    case 'children': await renderChildren(); break;
                    case 'grades': await renderGrades(); break;
                    case 'schedule': await renderSchedule(); break;
                    case 'assignments': await renderAssignments(); break;
                    case 'attendance': await renderAttendance(); break;
                    case 'messages': await renderMessages(); break;
                    case 'meetings': await renderMeetings(); break;
                    case 'payments': await renderPayments(); break;
                    case 'profile': await renderProfile(); break;
                    case 'announcements': await renderAnnouncements(); break;
                    default: await renderParentExtraPage(tabName, info);
                }
            } catch (error) {
                console.error(`Error loading ${tabName}:`, error);
                if (contentArea) {
                    contentArea.innerHTML = `<div style="text-align:center; padding:50px;"><i class="fas fa-exclamation-circle fa-3x" style="color:#ef4444;"></i><p>خطا در بارگذاری</p><button onclick="window.showTab('${tabName}')" style="margin-top:1rem; padding:0.5rem 1rem; background:#8b5cf6; color:white; border:none; border-radius:40px; cursor:pointer;">تلاش مجدد</button></div>`;
                }
            }
        }, 100);
    }
    
    // ============================================
    // رندر انتخابگر فرزند (برای تب‌های آموزشی)
    // ============================================
    
    function renderChildSelector(onChangeCallback) {
        if (childrenList.length === 0) return '';
        
        return `
            <div class="child-selector">
                <div style="font-weight: 600;"><i class="fas fa-child"></i> انتخاب فرزند:</div>
                <div class="child-tabs" id="childTabs">
                    ${childrenList.map(child => `
                        <div class="child-tab ${selectedChildId === child.id ? 'active' : ''}" data-child-id="${child.id}" onclick="window.selectChild(${child.id}, '${escapeHtml(child.name)}')">
                            <i class="fas fa-user-graduate"></i>
                            <div>
                                <div class="child-name">${escapeHtml(child.name)}</div>
                                <div class="child-class">${child.class_name || 'کلاس ' + child.class_id}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    window.selectChild = function(childId, childName) {
        selectedChildId = childId;
        selectedChildName = childName;
        
        // بروزرسانی کلاس active در تب‌ها
        document.querySelectorAll('.child-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-child-id') == childId) {
                tab.classList.add('active');
            }
        });
        
        // بارگذاری مجدد تب فعلی با فرزند جدید
        const currentTabName = currentTab;
        if (currentTabName === 'grades') renderGrades();
        else if (currentTabName === 'schedule') renderSchedule();
        else if (currentTabName === 'assignments') renderAssignments();
        else if (currentTabName === 'attendance') renderAttendance();
        else if (currentTabName === 'payments') renderPayments();
    };
    
    // ============================================
    // رندر داشبورد
    // ============================================
    
    async function renderDashboard() {
        showLoading(true);
        try {
            const profile = await loadProfile();
            
            // جمع‌آوری آمار همه فرزندان
            let totalChildren = childrenList.length;
            let totalUnreadMessages = 0;
            let totalPendingMeetings = 0;
            let totalUpcomingExams = 0;
            
            for (const child of childrenList) {
                const assignmentsRes = await loadChildAssignments(child.id);
                const pendingAssignments = assignmentsRes.assignments?.filter(a => !a.submitted && new Date(a.deadline) > new Date()).length || 0;
                totalUpcomingExams += pendingAssignments;
            }
            
            const messagesRes = await loadMessages();
            totalUnreadMessages = messagesRes.messages?.filter(m => !m.is_read).length || 0;
            
            const meetingsRes = await loadMeetings();
            totalPendingMeetings = meetingsRes.meetings?.filter(m => m.status === 'pending').length || 0;
            
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
                        cursor: pointer;
                    }
                    .stat-item:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                    .stat-icon { width: 50px; height: 50px; margin: 0 auto 12px; background: #ede9fe; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; color: #8b5cf6; }
                    .stat-value { font-size: 1.8rem; font-weight: 800; }
                    .stat-label { font-size: 0.75rem; color: #64748b; margin-top: 6px; }
                    .welcome-card {
                        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
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
                    .children-summary {
                        background: white;
                        border-radius: 20px;
                        border: 1px solid #e2e8f0;
                        overflow: hidden;
                    }
                    .child-summary-item {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 16px 20px;
                        border-bottom: 1px solid #f1f5f9;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .child-summary-item:hover { background: #f8fafc; }
                    .child-summary-item:last-child { border-bottom: none; }
                    .child-info { display: flex; align-items: center; gap: 12px; }
                    .child-avatar { width: 48px; height: 48px; background: #8b5cf6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2rem; }
                    @media (max-width: 1024px) { .dashboard-stats { grid-template-columns: repeat(2, 1fr); } }
                    @media (max-width: 640px) { .dashboard-stats { grid-template-columns: 1fr; } }
                </style>
                
                <div>
                    <div class="welcome-card">
                        <div class="welcome-text">
                            <h2><i class="fas fa-user-friends"></i> خوش آمدید، ${escapeHtml(profile?.name || 'والد گرامی')}</h2>
                            <p>به پنل والدین خوش آمدید. در اینجا می‌توانید وضعیت آموزشی فرزندان خود را پیگیری کنید.</p>
                        </div>
                        <div class="welcome-date"><i class="fas fa-calendar-alt"></i> ${formatDate(new Date())} - ${getWeekdayName(new Date())}</div>
                    </div>
                    
                    <div class="dashboard-stats">
                        <div class="stat-item" onclick="window.showTab('children')">
                            <div class="stat-icon"><i class="fas fa-child"></i></div>
                            <div class="stat-value">${toPersianNumber(totalChildren)}</div>
                            <div class="stat-label">فرزندان</div>
                        </div>
                        <div class="stat-item" onclick="window.showTab('messages')">
                            <div class="stat-icon"><i class="fas fa-envelope"></i></div>
                            <div class="stat-value">${toPersianNumber(totalUnreadMessages)}</div>
                            <div class="stat-label">پیام خوانده نشده</div>
                        </div>
                        <div class="stat-item" onclick="window.showTab('meetings')">
                            <div class="stat-icon"><i class="fas fa-calendar-check"></i></div>
                            <div class="stat-value">${toPersianNumber(totalPendingMeetings)}</div>
                            <div class="stat-label">درخواست ملاقات</div>
                        </div>
                        <div class="stat-item" onclick="window.showTab('assignments')">
                            <div class="stat-icon"><i class="fas fa-tasks"></i></div>
                            <div class="stat-value">${toPersianNumber(totalUpcomingExams)}</div>
                            <div class="stat-label">تکالیف در انتظار</div>
                        </div>
                    </div>
                    
                    <div class="children-summary">
                        <div class="card-header"><div class="card-title"><i class="fas fa-child"></i> خلاصه فرزندان</div></div>
                        <div id="childrenSummaryList">
                            ${childrenList.length > 0 ? childrenList.map(child => `
                                <div class="child-summary-item" onclick="window.selectAndShowChild(${child.id}, '${escapeHtml(child.name)}')">
                                    <div class="child-info">
                                        <div class="child-avatar">${child.name.charAt(0)}</div>
                                        <div>
                                            <div style="font-weight: 700;">${escapeHtml(child.name)}</div>
                                            <div style="font-size: 0.7rem; color: #64748b;">${child.class_name || 'کلاس ' + child.class_id}</div>
                                        </div>
                                    </div>
                                    <div><i class="fas fa-chevron-left" style="color: #8b5cf6;"></i></div>
                                </div>
                            `).join('') : '<div class="empty-state">هیچ فرزندی ثبت نشده است</div>'}
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('contentArea').innerHTML = html;
            
            window.selectAndShowChild = function(childId, childName) {
                selectChild(childId, childName);
                showTab('grades');
            };
            
        } catch (error) {
            console.error('Dashboard error:', error);
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-chart-line fa-3x"></i><h4>خطا در بارگذاری داشبورد</h4><button onclick="renderDashboard()" class="btn-primary" style="margin-top:1rem;">تلاش مجدد</button></div>`;
        }
        showLoading(false);
    }
    
    // ============================================
    // رندر مدیریت فرزندان
    // ============================================
    
    async function renderChildren() {
        showLoading(true);
        try {
            await loadChildren();
            
            const html = `
                <div class="card">
                    <div class="card-header">
                        <div class="card-title"><i class="fas fa-child"></i> لیست فرزندان</div>
                        <button class="btn-primary" onclick="window.linkNewChild()"><i class="fas fa-plus"></i> افزودن فرزند جدید</button>
                    </div>
                    <div class="card-body">
                        ${childrenList.length > 0 ? childrenList.map(child => `
                            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                                <div style="display: flex; align-items: center; gap: 16px;">
                                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; font-weight: bold;">${child.name.charAt(0)}</div>
                                    <div>
                                        <h3 style="margin-bottom: 4px;">${escapeHtml(child.name)}</h3>
                                        <p style="color: #64748b; margin-bottom: 4px;"><i class="fas fa-door-open"></i> ${child.class_name || 'کلاس ' + child.class_id}</p>
                                        <p style="color: #64748b; font-size: 0.8rem;"><i class="fas fa-id-card"></i> کد ملی: ${child.national_id || 'ثبت نشده'}</p>
                                    </div>
                                </div>
                                <div style="display: flex; gap: 8px;">
                                    <button class="btn-primary" onclick="window.viewChildDetails(${child.id})"><i class="fas fa-eye"></i> مشاهده</button>
                                    <button class="btn-outline" onclick="window.viewChildGrades(${child.id})"><i class="fas fa-star"></i> نمرات</button>
                                </div>
                            </div>
                        `).join('') : '<div class="empty-state"><i class="fas fa-child"></i><h4>هیچ فرزندی یافت نشد</h4><p>برای افزودن فرزند، روی دکمه "افزودن فرزند جدید" کلیک کنید</p></div>'}
                    </div>
                </div>
            `;
            
            document.getElementById('contentArea').innerHTML = html;
            
            window.linkNewChild = function() {
                showToast('لطفاً با مدیریت مدرسه تماس بگیرید تا فرزند شما به حساب متصل شود', 'info');
            };
            
            window.viewChildDetails = function(childId) {
                const child = childrenList.find(c => c.id === childId);
                if (child) {
                    alert(`نام: ${child.name}\nکلاس: ${child.class_name || child.class_id}\nکد ملی: ${child.national_id || 'ثبت نشده'}\nشماره تماس: ${child.phone || 'ثبت نشده'}`);
                }
            };
            
            window.viewChildGrades = function(childId) {
                selectChild(childId, childrenList.find(c => c.id === childId)?.name || '');
                showTab('grades');
            };
            
        } catch (error) {
            console.error('Children error:', error);
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-child"></i><h4>خطا در بارگذاری فرزندان</h4></div>`;
        }
        showLoading(false);
    }
    
    // ============================================
    // رندر نمرات
    // ============================================
    
    async function renderGrades() {
        showLoading(true);
        try {
            if (childrenList.length === 0) {
                document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-star"></i><h4>هیچ فرزندی ثبت نشده است</h4><p>لطفاً ابتدا فرزندان خود را اضافه کنید</p></div>`;
                showLoading(false);
                return;
            }
            
            if (!selectedChildId) selectedChildId = childrenList[0]?.id;
            
            const data = await loadChildGrades(selectedChildId);
            const grades = data.grades || [];
            const gpa = data.gpa || 0;
            const child = childrenList.find(c => c.id === selectedChildId);
            
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
                ${renderChildSelector()}
                
                <div class="card">
                    <div class="card-header"><div class="card-title"><i class="fas fa-chart-line"></i> خلاصه عملکرد - ${escapeHtml(child?.name || '')}</div></div>
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
                                    return `<tr>
                                        <td>${toPersianNumber(idx+1)}</div>
                                        <td><strong>${escapeHtml(g.course_name)}</strong></div>
                                        <td><span class="grade-badge ${gradeClass}">${grade}</span></div>
                                        <td>${grade >= 10 ? '✅ قبول' : '❌ مردود'}</div>
                                        <td>${gradeText}</div>
                                        <td>${formatDate(g.created_at)}</div>
                                    </tr>`;
                                }).join('') : '<tr><td colspan="6" class="empty-state">نمره‌ای ثبت نشده است</div></td>'}
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
            if (childrenList.length === 0) {
                document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-calendar-week"></i><h4>هیچ فرزندی ثبت نشده است</h4></div>`;
                showLoading(false);
                return;
            }
            
            if (!selectedChildId) selectedChildId = childrenList[0]?.id;
            
            const data = await loadChildSchedule(selectedChildId);
            const schedule = data.schedule || [];
            const child = childrenList.find(c => c.id === selectedChildId);
            
            const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه'];
            const grouped = {};
            days.forEach(d => grouped[d] = []);
            schedule.forEach(s => { if (grouped[s.day]) grouped[s.day].push(s); });
            
            const html = `
                ${renderChildSelector()}
                
                <style>
                    .schedule-grid-custom { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
                    .day-card-custom { background: white; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; }
                    .day-title-custom { background: #8b5cf6; padding: 12px; text-align: center; font-weight: 700; color: white; }
                    .day-content-custom { padding: 16px; min-height: 350px; }
                    .class-item-custom { background: #ede9fe; border-radius: 16px; padding: 12px; margin-bottom: 12px; border-right: 3px solid #8b5cf6; }
                    .class-time-custom { font-size: 0.7rem; color: #7c3aed; margin-bottom: 6px; }
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
            if (childrenList.length === 0) {
                document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-tasks"></i><h4>هیچ فرزندی ثبت نشده است</h4></div>`;
                showLoading(false);
                return;
            }
            
            if (!selectedChildId) selectedChildId = childrenList[0]?.id;
            
            const data = await loadChildAssignments(selectedChildId);
            const assignments = data.assignments || [];
            const child = childrenList.find(c => c.id === selectedChildId);
            
            const now = new Date();
            
            const html = `
                ${renderChildSelector()}
                
                <div class="card">
                    <div class="card-header"><div class="card-title"><i class="fas fa-tasks"></i> لیست تکالیف - ${escapeHtml(child?.name || '')}</div></div>
                    <div class="card-body">
                        <div style="display: grid; gap: 16px;">
                            ${assignments.length > 0 ? assignments.map(a => {
                                const deadline = new Date(a.deadline);
                                const isOverdue = deadline < now && !a.submitted;
                                const statusClass = a.submitted ? 'grade-excellent' : (isOverdue ? 'grade-poor' : 'grade-average');
                                const statusText = a.submitted ? 'تحویل شده' : (isOverdue ? 'تأخیر داشته' : 'در انتظار تحویل');
                                
                                return `
                                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 16px;">
                                        <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 12px;">
                                            <div>
                                                <h4 style="margin-bottom: 8px;"><i class="fas fa-book"></i> ${escapeHtml(a.title)}</h4>
                                                <p style="font-size: 0.8rem; color: #64748b;">${escapeHtml(a.description || 'توضیحی وارد نشده')}</p>
                                                <div style="display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap;">
                                                    <span><i class="fas fa-door-open"></i> ${escapeHtml(a.course_name)}</span>
                                                    <span><i class="fas fa-calendar-alt"></i> مهلت: ${formatDate(a.deadline)}</span>
                                                    <span><i class="fas fa-star"></i> نمره: ${a.total_points || 100}</span>
                                                    <span class="grade-badge ${statusClass}"><i class="fas ${a.submitted ? 'fa-check-circle' : 'fa-clock'}"></i> ${statusText}</span>
                                                </div>
                                                ${a.grade ? `<div style="margin-top: 12px; background: #d1fae5; border-radius: 12px; padding: 8px 16px; display: inline-block;"><strong>نمره کسب شده: ${a.grade}</strong></div>` : ''}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('') : '<div class="empty-state">هیچ تکلیفی وجود ندارد</div>'}
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
    // رندر حضور و غیاب
    // ============================================
    
    async function renderAttendance() {
        showLoading(true);
        try {
            if (childrenList.length === 0) {
                document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-clipboard-check"></i><h4>هیچ فرزندی ثبت نشده است</h4></div>`;
                showLoading(false);
                return;
            }
            
            if (!selectedChildId) selectedChildId = childrenList[0]?.id;
            
            const data = await loadChildAttendance(selectedChildId);
            const attendance = data.attendance || [];
            const stats = data.stats || {};
            const child = childrenList.find(c => c.id === selectedChildId);
            
            const html = `
                ${renderChildSelector()}
                
                <div class="stats-grid" style="margin-bottom: 24px;">
                    <div class="stat-card"><div class="stat-icon"><i class="fas fa-check-circle"></i></div><div class="stat-value">${toPersianNumber(stats.present || 0)}</div><div class="stat-label">حاضر</div></div>
                    <div class="stat-card"><div class="stat-icon"><i class="fas fa-times-circle"></i></div><div class="stat-value">${toPersianNumber(stats.absent || 0)}</div><div class="stat-label">غایب</div></div>
                    <div class="stat-card"><div class="stat-icon"><i class="fas fa-clock"></i></div><div class="stat-value">${toPersianNumber(stats.late || 0)}</div><div class="stat-label">تأخیر</div></div>
                    <div class="stat-card"><div class="stat-icon"><i class="fas fa-chart-line"></i></div><div class="stat-value">${stats.attendance_rate || 0}%</div><div class="stat-label">درصد حضور</div></div>
                </div>
                
                <div class="card">
                    <div class="card-header"><div class="card-title"><i class="fas fa-calendar-alt"></i> گزارش حضور و غیاب - ${escapeHtml(child?.name || '')}</div></div>
                    <div class="card-body" style="overflow-x: auto;">
                        <table class="data-table" style="width: 100%;">
                            <thead><tr><th>تاریخ</th><th>وضعیت</th><th>توضیحات</th></tr></thead>
                            <tbody>
                                ${attendance.length > 0 ? attendance.map(a => `
                                    <tr>
                                        <td>${formatDate(a.date)}</div>
                                        <td><span class="status-${a.status === 'present' ? 'present' : (a.status === 'absent' ? 'absent' : 'late')} grade-badge">${a.status === 'present' ? 'حاضر' : (a.status === 'absent' ? 'غایب' : 'تأخیر')}</span></div>
                                        <td>${a.notes || '-'}</div>
                                    </tr>
                                `).join('') : '<tr><td colspan="3" class="empty-state">هیچ گزارشی ثبت نشده است</div></tr>'}
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
                                    <div class="teacher-item" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; cursor: pointer;" onclick="window.selectTeacherForMessage(${t.id}, '${escapeHtml(t.name)}')">
                                        <div style="width: 40px; height: 40px; background: #8b5cf6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;"><i class="fas fa-chalkboard-user"></i></div>
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
                                <input type="text" id="messageInput" class="form-control" placeholder="پیام خود را بنویسید..." onkeypress="if(event.key==='Enter') window.sendParentMessage()">
                                <button class="btn-primary" onclick="window.sendParentMessage()"><i class="fas fa-paper-plane"></i> ارسال</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('contentArea').innerHTML = html;
            
            window.selectedTeacherId = null;
            
            window.selectTeacherForMessage = function(teacherId, teacherName) {
                window.selectedTeacherId = teacherId;
                loadChatMessages(teacherId);
            };
            
            async function loadChatMessages(teacherId) {
                try {
                    const data = await fetchAPI(`/parent/messages/${teacherId}`);
                    const messages = data.messages || [];
                    
                    const container = document.getElementById('chatMessages');
                    container.innerHTML = messages.map(m => `
                        <div style="display: flex; justify-content: ${m.sender_id === currentParentId ? 'flex-end' : 'flex-start'}; margin-bottom: 12px;">
                            <div style="background: ${m.sender_id === currentParentId ? '#8b5cf6' : '#f1f5f9'}; color: ${m.sender_id === currentParentId ? 'white' : '#0f172a'}; padding: 10px 14px; border-radius: 18px; max-width: 70%;">
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
            
            window.sendParentMessage = async function() {
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
                    await loadMessages();
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
    // رندر درخواست ملاقات
    // ============================================
    
    async function renderMeetings() {
        showLoading(true);
        try {
            await loadMeetings();
            
            // دریافت لیست معلمان
            let teachers = [];
            try {
                const teachersRes = await fetchAPI('/teachers/list');
                teachers = teachersRes.teachers || [];
            } catch (e) {
                console.warn('Could not load teachers:', e);
            }
            
            const html = `
                <div class="card">
                    <div class="card-header">
                        <div class="card-title"><i class="fas fa-calendar-alt"></i> درخواست ملاقات جدید</div>
                        <button class="btn-primary" onclick="window.openMeetingRequestModal()"><i class="fas fa-plus"></i> درخواست ملاقات</button>
                    </div>
                    <div class="card-body">
                        <div style="display: grid; gap: 16px;">
                            ${meetingsData.length > 0 ? meetingsData.map(m => {
                                const statusClass = m.status === 'approved' ? 'grade-excellent' : (m.status === 'rejected' ? 'grade-poor' : 'grade-average');
                                const statusText = m.status === 'approved' ? 'تایید شده' : (m.status === 'rejected' ? 'رد شده' : 'در انتظار');
                                return `
                                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 16px;">
                                        <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 12px;">
                                            <div>
                                                <h4><i class="fas fa-chalkboard-user"></i> ${escapeHtml(m.teacher_name)}</h4>
                                                <p>${escapeHtml(m.reason || 'بدون توضیحات')}</p>
                                                <div style="display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap;">
                                                    <span><i class="fas fa-calendar-alt"></i> تاریخ: ${formatDate(m.requested_date)}</span>
                                                    <span><i class="fas fa-clock"></i> ساعت: ${m.requested_time}</span>
                                                    <span class="grade-badge ${statusClass}">${statusText}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('') : '<div class="empty-state">هیچ درخواست ملاقاتی ثبت نشده است</div>'}
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('contentArea').innerHTML = html;
            
            window.openMeetingRequestModal = function() {
                const modalHtml = `
                    <div id="meetingModal" class="modal-overlay active" style="display: flex;">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h3><i class="fas fa-calendar-plus"></i> درخواست ملاقات جدید</h3>
                                <button class="modal-close" onclick="closeModal('meetingModal')"><i class="fas fa-times"></i></button>
                            </div>
                            <div class="modal-body">
                                <div class="form-group">
                                    <label>انتخاب فرزند</label>
                                    <select id="meetingChildId" class="form-control">
                                        ${childrenList.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>انتخاب معلم</label>
                                    <select id="meetingTeacherId" class="form-control">
                                        ${teachers.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>تاریخ ملاقات</label>
                                    <input type="date" id="meetingDate" class="form-control">
                                </div>
                                <div class="form-group">
                                    <label>ساعت ملاقات</label>
                                    <input type="time" id="meetingTime" class="form-control">
                                </div>
                                <div class="form-group">
                                    <label>علت درخواست</label>
                                    <textarea id="meetingReason" class="form-control" rows="3" placeholder="لطفاً علت درخواست ملاقات را بنویسید..."></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button class="btn-primary" onclick="submitMeetingRequest()">ارسال درخواست</button>
                                <button class="btn-outline" onclick="closeModal('meetingModal')">انصراف</button>
                            </div>
                        </div>
                    </div>
                `;
                
                const existingModal = document.getElementById('meetingModal');
                if (existingModal) existingModal.remove();
                document.body.insertAdjacentHTML('beforeend', modalHtml);
            };
            
            window.submitMeetingRequest = async function() {
                const childId = document.getElementById('meetingChildId')?.value;
                const teacherId = document.getElementById('meetingTeacherId')?.value;
                const date = document.getElementById('meetingDate')?.value;
                const time = document.getElementById('meetingTime')?.value;
                const reason = document.getElementById('meetingReason')?.value;
                
                if (!childId || !teacherId || !date || !time) {
                    showToast('لطفاً تمام فیلدها را پر کنید', 'error');
                    return;
                }
                
                showLoading(true);
                try {
                    await requestMeeting({
                        child_id: parseInt(childId),
                        teacher_id: parseInt(teacherId),
                        requested_date: date,
                        requested_time: time,
                        reason: reason || null
                    });
                    showToast('درخواست ملاقات با موفقیت ثبت شد', 'success');
                    closeModal('meetingModal');
                    await renderMeetings();
                } catch (error) {
                    showToast(error.message || 'خطا در ثبت درخواست', 'error');
                } finally {
                    showLoading(false);
                }
            };
            
        } catch (error) {
            console.error('Meetings error:', error);
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-calendar-alt"></i><h4>خطا در بارگذاری درخواست‌ها</h4></div>`;
        }
        showLoading(false);
    }
    
    // ============================================
    // رندر وضعیت مالی
    // ============================================
    
    async function renderPayments() {
        showLoading(true);
        try {
            if (childrenList.length === 0) {
                document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-credit-card"></i><h4>هیچ فرزندی ثبت نشده است</h4></div>`;
                showLoading(false);
                return;
            }
            
            if (!selectedChildId) selectedChildId = childrenList[0]?.id;
            
            const data = await loadChildPayments(selectedChildId);
            const payments = data.payments || [];
            const totalDebt = data.total_debt || 0;
            const child = childrenList.find(c => c.id === selectedChildId);
            
            const html = `
                ${renderChildSelector()}
                
                <div class="stats-grid" style="margin-bottom: 24px;">
                    <div class="stat-card"><div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div><div class="stat-value">${formatMoney(totalDebt)}</div><div class="stat-label">بدهی کل</div></div>
                    <div class="stat-card"><div class="stat-icon"><i class="fas fa-check-circle"></i></div><div class="stat-value">${toPersianNumber(payments.filter(p => p.status === 'paid').length)}</div><div class="stat-label">پرداخت شده</div></div>
                    <div class="stat-card"><div class="stat-icon"><i class="fas fa-clock"></i></div><div class="stat-value">${toPersianNumber(payments.filter(p => p.status === 'pending').length)}</div><div class="stat-label">در انتظار</div></div>
                    <div class="stat-card"><div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div><div class="stat-value">${toPersianNumber(payments.filter(p => p.status === 'overdue').length)}</div><div class="stat-label">تأخیر دار</div></div>
                </div>
                
                <div class="card">
                    <div class="card-header"><div class="card-title"><i class="fas fa-receipt"></i> صورت حساب‌ها - ${escapeHtml(child?.name || '')}</div></div>
                    <div class="card-body" style="overflow-x: auto;">
                        <table class="data-table" style="width: 100%;">
                            <thead>
                                <tr><th>عنوان</th><th>مبلغ</th><th>نوع</th><th>وضعیت</th><th>سررسید</th><th>تاریخ پرداخت</th></tr>
                            </thead>
                            <tbody>
                                ${payments.length > 0 ? payments.map(p => {
                                    const statusClass = p.status === 'paid' ? 'grade-excellent' : (p.status === 'pending' ? 'grade-average' : 'grade-poor');
                                    const statusText = p.status === 'paid' ? 'پرداخت شده' : (p.status === 'pending' ? 'در انتظار' : 'تأخیر');
                                    return `<tr>
                                        <td>${escapeHtml(p.title)}</div>
                                        <td>${formatMoney(p.amount)}</div>
                                        <td>${p.type === 'tuition' ? 'شهریه' : 'سایر'}</div>
                                        <td><span class="grade-badge ${statusClass}">${statusText}</span></div>
                                        <td>${p.due_date ? formatDate(p.due_date) : '-'}</div>
                                        <td>${p.paid_date ? formatDate(p.paid_date) : '-'}</div>
                                    </td>`;
                                }).join('') : '<td><td colspan="6" class="empty-state">هیچ صورتحسابی ثبت نشده است</div></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            document.getElementById('contentArea').innerHTML = html;
            
        } catch (error) {
            console.error('Payments error:', error);
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-credit-card"></i><h4>خطا در بارگذاری اطلاعات مالی</h4></div>`;
        }
        showLoading(false);
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
                        <button class="btn-primary" onclick="openEditParentProfileModal()"><i class="fas fa-edit"></i> ویرایش پروفایل</button>
                    </div>
                    <div class="card-body">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <div style="width: 100px; height: 100px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                                <i class="fas fa-user-friends fa-3x" style="color: white;"></i>
                            </div>
                            <h3>${escapeHtml(profile?.name)}</h3>
                            <p><span class="grade-badge grade-excellent">والدین</span></p>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>نام کامل</label><div class="form-control" style="background:#f8fafc;">${escapeHtml(profile?.name)}</div></div>
                            <div class="form-group"><label>نام کاربری</label><div class="form-control" style="background:#f8fafc;">${escapeHtml(profile?.username)}</div></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>شماره تماس</label><div class="form-control" style="background:#f8fafc;">${profile?.phone || 'ثبت نشده'}</div></div>
                            <div class="form-group"><label>ایمیل</label><div class="form-control" style="background:#f8fafc;">${profile?.email || 'ثبت نشده'}</div></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>کد ملی</label><div class="form-control" style="background:#f8fafc;">${profile?.national_id || 'ثبت نشده'}</div></div>
                            <div class="form-group"><label>تاریخ عضویت</label><div class="form-control" style="background:#f8fafc;">${formatDate(profile?.created_at)}</div></div>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('contentArea').innerHTML = html;
            
            window.openEditParentProfileModal = function() {
                showToast('در حال توسعه... به زودی', 'info');
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
                return { bg: '#ede9fe', color: '#8b5cf6', icon: 'fa-info-circle', text: 'عادی' };
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
    
    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.remove();
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
            if (user.role !== 'parent') {
                window.location.href = '/login';
                return;
            }
            currentUser = user;
            currentParentId = user.id;
            
            const parentNameEl = document.getElementById('parentName');
            if (parentNameEl) parentNameEl.innerText = user.name || 'والدین';
            
            await loadChildren();
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
    window.selectChild = selectChild;
    window.closeModal = closeModal;
    
})();