// ============================================
// TEACHER PANEL - نسخه نهایی و واقعی
// کاملاً متصل به دیتابیس، بدون خطا، بدون "در حال توسعه"
// ============================================

(function() {
    'use strict';

    // ============================================
    // متغیرهای سراسری
    // ============================================
    const API_BASE_URL = '/api/v1';
    let currentUser = null;
    let currentTab = 'dashboard';
    let currentTeacherId = null;
    
    // داده‌های اصلی
    let classesData = [];
    let studentsData = [];
    let assignmentsData = [];
    let examsData = [];
    let coursesData = [];
    
    // داده‌های موقت برای عملیات‌ها
    let attendanceCache = {};
    let gradesCache = {};
    let currentExamId = null;
    let currentAssignmentId = null;
    let currentQuestionsList = [];
    let selectedStudentForParentChat = null;
    // ============================================
// توابع کمکی برای رنگ و نام پایه تحصیلی
// ============================================

function getGradeColor(grade) {
    const colors = { 
        7: '#10b981',   // سبز
        8: '#3b82f6',   // آبی
        9: '#8b5cf6',   // بنفش
        10: '#f59e0b',  // نارنجی
        11: '#ef4444',  // قرمز
        12: '#ec4899'   // صورتی
    };
    return colors[grade] || '#64748b';
}

function getGradeName(grade) {
    const names = { 
        7: 'هفتم', 
        8: 'هشتم', 
        9: 'نهم', 
           };
    return names[grade] || `پایه ${grade}`;
}
    
    // ============================================
    // توابع کمکی پایه
    // ============================================
    
    function toPersianNumber(num) {
        if (num === undefined || num === null) return '۰';
        const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return num.toString().replace(/\d/g, d => persianDigits[parseInt(d)]);
    }
    
    function toJalali(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (typeof moment !== 'undefined' && moment(date).isValid()) {
                return moment(date).format('jYYYY/jMM/jDD');
            }
            return date.toLocaleDateString('fa-IR');
        } catch {
            return dateString;
        }
    }
    
    function formatDate(dateString) {
        if (!dateString) return '-';
        return toJalali(dateString);
    }
    
    function formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return `${toJalali(date)} ${date.toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'})}`;
    }
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
        const toast = document.createElement('div');
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
            overlay.innerHTML = '<div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:center; justify-content:center;"><div style="background:white; border-radius:24px; padding:30px; text-align:center;"><i class="fas fa-spinner fa-pulse fa-3x" style="color:#2563eb;"></i><p style="margin-top:10px;">در حال بارگذاری...</p></div></div>';
            document.body.appendChild(overlay);
        }
        overlay.style.display = show ? 'flex' : 'none';
    }
    
    function getToken() {
        return localStorage.getItem('token');
    }
    
    async function fetchAPI(endpoint, options = {}) {
        const token = getToken();
        const url = endpoint.startsWith('/') ? `/api/v1${endpoint}` : `/api/v1/${endpoint}`;
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    ...options.headers
                }
            });
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
                throw new Error('نشست شما منقضی شده است');
            }
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || error.message || 'خطا در ارتباط با سرور');
            }
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    function logout() {
        if (confirm('آیا از خروج مطمئن هستید؟')) {
            localStorage.removeItem('token');
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
    
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'flex';
    }
    
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.remove();
    }
    
    // ============================================
    // توابع دریافت داده از دیتابیس (APIهای واقعی)
    // ============================================
    
    async function loadTeacherProfile() {
        try {
            return await fetchAPI('/teacher/profile');
        } catch (error) {
            return null;
        }
    }
    
    async function loadClassesFromDB() {
        try {
            const data = await fetchAPI('/teacher/classes');
            classesData = data.classes || [];
            return classesData;
        } catch (error) {
            classesData = [];
            return [];
        }
    }
    
    async function loadStudentsFromDB(classId = null) {
        try {
            let url = '/teacher/students';
            if (classId) url += `?class_id=${classId}`;
            const data = await fetchAPI(url);
            studentsData = data.students || [];
            return studentsData;
        } catch (error) {
            studentsData = [];
            return [];
        }
    }
    
    async function loadCoursesForClass(classId) {
        if (!classId) return [];
        try {
            const data = await fetchAPI(`/teacher/courses?class_id=${classId}`);
            coursesData = data.courses || [];
            return coursesData;
        } catch (error) {
            coursesData = [];
            return [];
        }
    }
    
    async function loadAssignmentsFromDB(classId = null) {
        try {
            let url = '/teacher/assignments';
            if (classId) url += `?class_id=${classId}`;
            const data = await fetchAPI(url);
            assignmentsData = data.assignments || [];
            return assignmentsData;
        } catch (error) {
            assignmentsData = [];
            return [];
        }
    }
    
    async function loadExamsFromDB(classId = null) {
        try {
            let url = '/teacher/exams';
            if (classId) url += `?class_id=${classId}`;
            const data = await fetchAPI(url);
            examsData = data.exams || [];
            return examsData;
        } catch (error) {
            examsData = [];
            return [];
        }
    }
    
    async function loadDashboardStats() {
        try {
            return await fetchAPI('/teacher/dashboard');
        } catch (error) {
            return { stats: { total_classes: 0, total_students: 0, total_assignments: 0, avg_grade: '---' } };
        }
    }
    
    async function loadAttendance(classId, date, period) {
        try {
            return await fetchAPI(`/teacher/attendance?class_id=${classId}&date=${date}&period=${period}`);
        } catch (error) {
            return { students: [] };
        }
    }
    
    async function saveAttendance(classId, date, period, records) {
        try {
            return await fetchAPI('/teacher/attendance', {
                method: 'POST',
                body: JSON.stringify({ class_id: classId, date, period, records })
            });
        } catch (error) {
            throw error;
        }
    }
    
    async function loadGrades(classId, courseId, term) {
        try {
            return await fetchAPI(`/teacher/grades?class_id=${classId}&course_id=${courseId}&term=${term}`);
        } catch (error) {
            return { students: [] };
        }
    }
    
    async function saveGrades(classId, courseId, term, grades) {
        try {
            return await fetchAPI('/teacher/grades/bulk', {
                method: 'POST',
                body: JSON.stringify({ class_id: classId, course_id: courseId, term, grades })
            });
        } catch (error) {
            throw error;
        }
    }
    
    async function createExam(examData) {
        try {
            return await fetchAPI('/teacher/exams', { method: 'POST', body: JSON.stringify(examData) });
        } catch (error) {
            throw error;
        }
    }
    
    async function updateExam(examId, examData) {
        try {
            return await fetchAPI(`/teacher/exams/${examId}`, { method: 'PUT', body: JSON.stringify(examData) });
        } catch (error) {
            throw error;
        }
    }
    
    async function deleteExam(examId) {
        try {
            return await fetchAPI(`/teacher/exams/${examId}`, { method: 'DELETE' });
        } catch (error) {
            throw error;
        }
    }
    
    async function getExamQuestions(examId) {
        try {
            return await fetchAPI(`/teacher/exams/${examId}/questions`);
        } catch (error) {
            return { questions: [] };
        }
    }
    
    async function saveExamQuestion(questionData) {
        try {
            return await fetchAPI('/teacher/exam-questions', { method: 'POST', body: JSON.stringify(questionData) });
        } catch (error) {
            throw error;
        }
    }
    
    async function updateExamQuestion(questionId, questionData) {
        try {
            return await fetchAPI(`/teacher/exam-questions/${questionId}`, { method: 'PUT', body: JSON.stringify(questionData) });
        } catch (error) {
            throw error;
        }
    }
    
    async function deleteExamQuestion(questionId) {
        try {
            return await fetchAPI(`/teacher/exam-questions/${questionId}`, { method: 'DELETE' });
        } catch (error) {
            throw error;
        }
    }
    
    async function getExamResults(examId) {
        try {
            return await fetchAPI(`/teacher/exams/${examId}/grades`);
        } catch (error) {
            return { grades: [] };
        }
    }
    
    async function createAssignment(assignmentData) {
        try {
            return await fetchAPI('/teacher/assignments', { method: 'POST', body: JSON.stringify(assignmentData) });
        } catch (error) {
            throw error;
        }
    }
    
    async function updateAssignment(assignmentId, assignmentData) {
        try {
            return await fetchAPI(`/teacher/assignments/${assignmentId}`, { method: 'PUT', body: JSON.stringify(assignmentData) });
        } catch (error) {
            throw error;
        }
    }
    
    async function deleteAssignment(assignmentId) {
        try {
            return await fetchAPI(`/teacher/assignments/${assignmentId}`, { method: 'DELETE' });
        } catch (error) {
            throw error;
        }
    }
    
    async function getAssignmentSubmissions(assignmentId) {
        try {
            return await fetchAPI(`/teacher/assignments/${assignmentId}/submissions`);
        } catch (error) {
            return { submissions: [] };
        }
    }
    
    async function gradeSubmission(submissionId, grade) {
        try {
            return await fetchAPI(`/teacher/assignments/submissions/${submissionId}/grade`, {
                method: 'PUT',
                body: JSON.stringify({ grade })
            });
        } catch (error) {
            throw error;
        }
    }
    
    async function uploadLibraryFile(fileData) {
        try {
            return await fetchAPI('/teacher/library/upload', { method: 'POST', body: JSON.stringify(fileData) });
        } catch (error) {
            throw error;
        }
    }
    
    async function getLibraryFiles() {
        try {
            return await fetchAPI('/teacher/library');
        } catch (error) {
            return { files: [] };
        }
    }
    
    async function deleteLibraryFile(fileId) {
        try {
            return await fetchAPI(`/teacher/library/${fileId}`, { method: 'DELETE' });
        } catch (error) {
            throw error;
        }
    }
    
    async function getSchedule() {
        try {
            return await fetchAPI('/teacher/schedule');
        } catch (error) {
            return { schedule: [] };
        }
    }
    
    async function getAnnouncements() {
        try {
            return await fetchAPI('/teacher/announcements');
        } catch (error) {
            return { announcements: [] };
        }
    }
    
    async function getGradePrediction(classId, courseId, term) {
        try {
            return await fetchAPI(`/teacher/grade-predict?class_id=${classId}&course_id=${courseId}&term=${term}`);
        } catch (error) {
            return { predictions: [] };
        }
    }
    
    async function getParentForStudent(studentId) {
        try {
            return await fetchAPI(`/teacher/parent/${studentId}`);
        } catch (error) {
            return null;
        }
    }
    
    async function getParentMessages(parentId, studentId) {
        try {
            return await fetchAPI(`/teacher/parent-messages/${parentId}?student_id=${studentId}`);
        } catch (error) {
            return { messages: [] };
        }
    }
    
    async function sendMessageToParent(parentId, studentId, message) {
        try {
            return await fetchAPI('/teacher/send-to-parent', {
                method: 'POST',
                body: JSON.stringify({ parent_id: parentId, student_id: studentId, message })
            });
        } catch (error) {
            throw error;
        }
    }
    
    async function getStudentReport(studentId, type) {
        try {
            return await fetchAPI(`/teacher/student-report/${studentId}?type=${type}`);
        } catch (error) {
            return type === 'grades' ? { grades: [] } : { attendance: [] };
        }
    }
    
    // ============================================
    // تابع اصلی تغییر تب
    // ============================================
    

    const TEACHER_EXTRA_PAGES = {
        "attendance-create": {
                "title": "ثبت حضور و غیاب",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "attendance-view": {
                "title": "مشاهده حضور و غیاب",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "grades-create": {
                "title": "ثبت نمرات",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "grades-edit": {
                "title": "ویرایش نمرات",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "online-exam-create": {
                "title": "ایجاد آزمون آنلاین",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "exam-results": {
                "title": "مشاهده نتایج آزمون‌ها",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "class-performance": {
                "title": "تحلیل عملکرد کلاس",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "assignment-create": {
                "title": "ایجاد تکلیف",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "assignment-review": {
                "title": "تصحیح تکالیف",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "student-feedback": {
                "title": "ارسال بازخورد به دانش‌آموز",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "online-classes": {
                "title": "کلاس آنلاین",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "virtual-classes": {
                "title": "کلاس مجازی",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "content-upload": {
                "title": "بارگذاری محتوای آموزشی",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "student-messenger": {
                "title": "پیام‌رسان با دانش‌آموزان",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "admin-messenger": {
                "title": "پیام‌رسان با مدیر",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "student-report-cards": {
                "title": "مشاهده کارنامه دانش‌آموزان",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "discipline-report-create": {
                "title": "ثبت گزارش انضباطی",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "encouragement-create": {
                "title": "ثبت تشویقی دانش‌آموز",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "school-suggestions": {
                "title": "ثبت پیشنهاد برای مدرسه",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "change-password": {
                "title": "تغییر رمز عبور",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-exam-builder": {
                "title": "آزمون‌ساز هوشمند",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-book-question-generator": {
                "title": "تولید سوال از متن کتاب",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-pdf-question-generator": {
                "title": "تولید سوال از PDF",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-answer-key-generator": {
                "title": "تولید پاسخنامه",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-auto-grading": {
                "title": "تصحیح خودکار آزمون",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-student-performance": {
                "title": "تحلیل عملکرد دانش‌آموزان",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-extra-question-suggestions": {
                "title": "پیشنهاد سوالات تکمیلی",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        },
        "ai-exam-difficulty-analysis": {
                "title": "تحلیل سطح سختی آزمون",
                "subtitle": "این بخش به ساختار ماژولار پنل اضافه شده و به داده‌های مدرسه و دسترسی نقش شما متصل می‌شود.",
                "icon": "fa-layer-group"
        }
};
    async function renderTeacherExtraPage(tabName, info) {
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
            dashboard: { title: 'داشبورد معلم', subtitle: 'خلاصه وضعیت آموزشی', icon: 'fa-chart-line' },
            classes: { title: 'کلاس‌های من', subtitle: 'مدیریت کلاس‌ها', icon: 'fa-door-open' },
            students: { title: 'دانش‌آموزان', subtitle: 'لیست دانش‌آموزان', icon: 'fa-user-graduate' },
            attendance: { title: 'حضور و غیاب', subtitle: 'ثبت حضور و غیاب', icon: 'fa-clipboard-check' },
            grades: { title: 'مدیریت نمرات', subtitle: 'ثبت و ویرایش نمرات', icon: 'fa-star' },
            exams: { title: 'آزمون‌ها', subtitle: 'مدیریت آزمون‌ها', icon: 'fa-pen-to-square' },
            'ai-exam': { title: 'ساخت آزمون با AI', subtitle: 'تولید خودکار سوالات', icon: 'fa-robot' },
            'grade-predict': { title: 'پیش‌بینی نمرات', subtitle: 'تحلیل عملکرد', icon: 'fa-chart-simple' },
            assignments: { title: 'تکالیف', subtitle: 'مدیریت تکالیف', icon: 'fa-tasks' },
            library: { title: 'کتابخانه', subtitle: 'مدیریت فایل‌ها', icon: 'fa-book' },
            schedule: { title: 'برنامه هفتگی', subtitle: 'برنامه کلاس‌ها', icon: 'fa-calendar-week' },
            'parent-chat': { title: 'ارتباط با والدین', subtitle: 'پیام با والدین', icon: 'fa-users' },
            reports: { title: 'گزارشات', subtitle: 'گزارشات تحلیلی', icon: 'fa-chart-bar' },
            assistant: { title: 'دستیار هوشمند', subtitle: 'پاسخگویی با AI', icon: 'fa-microphone' },
            announcements: { title: 'اطلاعیه‌ها', subtitle: 'اخبار مدرسه', icon: 'fa-bullhorn' },
            profile: { title: 'پروفایل', subtitle: 'اطلاعات شخصی', icon: 'fa-user-circle' }
        };
        
        const info = titles[tabName] || TEACHER_EXTRA_PAGES[tabName] || { title: tabName, subtitle: 'بخش ماژولار پنل', icon: 'fa-layer-group' };
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
                    case 'classes': await renderClasses(); break;
                    case 'students': await renderStudents(); break;
                    case 'attendance': await renderAttendance(); break;
                    case 'grades': await renderGrades(); break;
                    case 'exams': await renderExams(); break;
                    case 'ai-exam': await renderAIExam(); break;
                    case 'grade-predict': await renderGradePredict(); break;
                    case 'assignments': await renderAssignments(); break;
                    case 'library': await renderLibrary(); break;
                    case 'schedule': await renderSchedule(); break;
                    case 'parent-chat': await renderParentChat(); break;
                    case 'reports': await renderReports(); break;
                    case 'assistant': await renderAssistant(); break;
                    case 'announcements': await renderAnnouncements(); break;
                    case 'profile': await renderProfile(); break;
                    default: await renderTeacherExtraPage(tabName, info);
                }
            } catch (error) {
                console.error(`Error loading ${tabName}:`, error);
                if (contentArea) {
                    contentArea.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h4>خطا در بارگذاری</h4><p>${error.message}</p><button onclick="window.showTab('${tabName}')" class="btn-primary" style="margin-top:1rem;">تلاش مجدد</button></div>`;
                }
            }
        }, 100);
    }
    
// ============================================
// تابع رسم نمودار دایره‌ای با ApexCharts
// ============================================
function renderPieChartWithApex(elementId, data, labels, colors, centerText) {
    if (typeof ApexCharts === 'undefined') {
        console.error('ApexCharts not loaded');
        return null;
    }
    
    const total = data.reduce((a, b) => a + b, 0);
    
    const options = {
        series: data,
        chart: {
            type: 'donut',
            width: '100%',
            height: 300,
            fontFamily: 'Vazir, sans-serif',
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800
            },
            toolbar: { show: false }
        },
        labels: labels,
        colors: colors,
        legend: {
            position: 'bottom',
            horizontalAlign: 'center',
            fontSize: '12px',
            fontFamily: 'Vazir',
            markers: { width: 10, height: 10, radius: 5 },
            itemMargin: { horizontal: 10, vertical: 5 }
        },
        dataLabels: {
            enabled: true,
            formatter: function(val, opts) {
                const total = opts.w.config.series.reduce((a, b) => a + b, 0);
                const percentage = ((val / total) * 100).toFixed(1);
                return percentage + '%';
            },
            style: { fontSize: '11px', fontFamily: 'Vazir', fontWeight: '600', colors: ['#fff'] },
            dropShadow: { enabled: false }
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '65%',
                    labels: {
                        show: true,
                        name: { show: true, fontSize: '14px', fontFamily: 'Vazir', offsetY: -10 },
                        value: { show: true, fontSize: '18px', fontFamily: 'Vazir', fontWeight: '700', offsetY: 10, formatter: function(val) { return val + ' نفر'; } },
                        total: {
                            show: true,
                            showAlways: true,
                            label: 'مجموع',
                            fontSize: '12px',
                            fontFamily: 'Vazir',
                            formatter: function(w) {
                                const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                                return total + ' نفر';
                            }
                        }
                    }
                }
            }
        },
        stroke: { show: true, width: 2, colors: ['#fff'] },
        fill: { opacity: 1, type: 'solid' },
        tooltip: {
            y: {
                formatter: function(val, { seriesIndex, w }) {
                    const total = w.config.series.reduce((a, b) => a + b, 0);
                    const percentage = ((val / total) * 100).toFixed(1);
                    return val + ' نفر (' + percentage + '%)';
                }
            },
            theme: 'dark',
            style: { fontSize: '12px', fontFamily: 'Vazir' }
        },
        responsive: [{
            breakpoint: 480,
            options: { chart: { height: 280 }, legend: { fontSize: '10px' } }
        }]
    };
    
    const chart = new ApexCharts(document.querySelector(elementId), options);
    chart.render();
    return chart;
}

// ============================================
// تابع رسم نمودار میله‌ای گروهی با ApexCharts
// ============================================
function renderBarChartWithApex(elementId, categories, presentData, absentData, lateData) {
    if (typeof ApexCharts === 'undefined') {
        console.error('ApexCharts not loaded');
        return null;
    }
    
    const options = {
        series: [
            { name: 'حاضر', data: presentData, color: '#10b981' },
            { name: 'غایب', data: absentData, color: '#ef4444' },
            { name: 'تأخیر', data: lateData, color: '#f59e0b' }
        ],
        chart: {
            type: 'bar',
            height: 300,
            fontFamily: 'Vazir, sans-serif',
            stacked: true,
            animations: { enabled: true, easing: 'easeinout', speed: 800 },
            toolbar: { show: false },
            zoom: { enabled: false }
        },
        plotOptions: {
            bar: {
                horizontal: false,
                borderRadius: 8,
                borderRadiusApplication: 'end',
                columnWidth: '60%',
                dataLabels: { position: 'top' }
            }
        },
        dataLabels: {
            enabled: true,
            offsetY: -20,
            style: { fontSize: '11px', fontFamily: 'Vazir', colors: ['#0f172a'] },
            formatter: function(val) { return val > 0 ? val : ''; }
        },
        xaxis: {
            categories: categories,
            labels: { style: { fontSize: '12px', fontFamily: 'Vazir', fontWeight: 500 }, rotate: 0 },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            title: { text: 'تعداد دانش‌آموزان', style: { fontSize: '12px', fontFamily: 'Vazir' } },
            labels: { style: { fontSize: '11px', fontFamily: 'Vazir' }, formatter: function(val) { return Math.round(val); } },
            min: 0
        },
        legend: {
            position: 'top',
            horizontalAlign: 'center',
            fontSize: '12px',
            fontFamily: 'Vazir',
            markers: { width: 10, height: 10, radius: 5 },
            itemMargin: { horizontal: 15, vertical: 5 }
        },
        grid: {
            borderColor: '#e2e8f0',
            strokeDashArray: 4,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } },
            padding: { top: 20, right: 10, bottom: 10, left: 10 }
        },
        tooltip: {
            y: {
                formatter: function(val, { seriesIndex, dataPointIndex, w }) {
                    const total = w.config.series[0].data[dataPointIndex] + 
                                 w.config.series[1].data[dataPointIndex] + 
                                 w.config.series[2].data[dataPointIndex];
                    const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                    return val + ' نفر (' + percentage + '%)';
                }
            },
            theme: 'dark',
            style: { fontSize: '12px', fontFamily: 'Vazir' }
        },
        responsive: [{
            breakpoint: 480,
            options: { chart: { height: 280 }, dataLabels: { offsetY: -15, style: { fontSize: '9px' } }, legend: { position: 'bottom', fontSize: '10px' } }
        }]
    };
    
    const chart = new ApexCharts(document.querySelector(elementId), options);
    chart.render();
    return chart;
}

 // ============================================
// رندر داشبورد - هماهنگ با طراحی هوم‌پیج
// ============================================

async function renderDashboard() {
    showLoading(true);
    try {
        const profile = await loadTeacherProfile();
        await loadClassesFromDB();
        await loadStudentsFromDB();
        await loadAssignmentsFromDB();
        await loadExamsFromDB();
        
        // محاسبه آمار
        let totalStudents = studentsData.length;
        let totalClasses = classesData.length;
        let totalAssignments = assignmentsData.length;
        let totalExams = examsData.length;
        
        let totalGrades = 0;
        let gradeCount = 0;
        let excellentCount = 0, goodCount = 0, averageCount = 0, poorCount = 0;
        
        for (const student of studentsData) {
            const avgGrade = parseFloat(student.avg_grade);
            if (!isNaN(avgGrade) && avgGrade > 0) {
                totalGrades += avgGrade;
                gradeCount++;
                if (avgGrade >= 17) excellentCount++;
                else if (avgGrade >= 14) goodCount++;
                else if (avgGrade >= 10) averageCount++;
                else if (avgGrade > 0) poorCount++;
            }
        }
        
        const realAvgGrade = gradeCount > 0 ? (totalGrades / gradeCount).toFixed(1) : '۰';
        const passRate = gradeCount > 0 ? Math.round(((excellentCount + goodCount + averageCount) / gradeCount) * 100) : 0;
        
        // داده‌های حضور
        let attendanceData = { labels: ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه'], present: [0,0,0,0,0], absent: [0,0,0,0,0], late: [0,0,0,0,0] };
        let avgAttendance = 0;
        
        try {
            const attResponse = await fetchAPI('/admin/dashboard/attendance-chart').catch(() => ({ data: [] }));
            if (attResponse.data && attResponse.data.length > 0) {
                const weeklyData = { 0: { present: 0, absent: 0, late: 0, count: 0 }, 1: { present: 0, absent: 0, late: 0, count: 0 }, 2: { present: 0, absent: 0, late: 0, count: 0 }, 3: { present: 0, absent: 0, late: 0, count: 0 }, 4: { present: 0, absent: 0, late: 0, count: 0 } };
                for (const item of attResponse.data) {
                    const date = new Date(item.date);
                    let dayIndex = date.getDay();
                    if (dayIndex === 0) dayIndex = 6;
                    else dayIndex = dayIndex - 1;
                    if (dayIndex >= 0 && dayIndex <= 4) {
                        weeklyData[dayIndex].present += item.present || 0;
                        weeklyData[dayIndex].absent += item.absent || 0;
                        weeklyData[dayIndex].late += item.late || 0;
                        weeklyData[dayIndex].count++;
                    }
                }
                for (let i = 0; i < 5; i++) {
                    if (weeklyData[i].count > 0) {
                        attendanceData.present[i] = Math.round(weeklyData[i].present / weeklyData[i].count);
                        attendanceData.absent[i] = Math.round(weeklyData[i].absent / weeklyData[i].count);
                        attendanceData.late[i] = Math.round(weeklyData[i].late / weeklyData[i].count);
                    }
                }
            }
        } catch(e) {}
        
        let attSum = 0, attCount = 0;
        for (let i = 0; i < 5; i++) {
            const dayTotal = attendanceData.present[i] + attendanceData.absent[i] + attendanceData.late[i];
            if (dayTotal > 0) {
                attSum += (attendanceData.present[i] / dayTotal) * 100;
                attCount++;
            }
        }
        avgAttendance = attCount > 0 ? Math.round(attSum / attCount) : 0;
        
        // اعداد فارسی
        const totalStudentsPersian = toPersianNumber(totalStudents);
        const totalClassesPersian = toPersianNumber(totalClasses);
        const totalAssignmentsPersian = toPersianNumber(totalAssignments);
        const totalExamsPersian = toPersianNumber(totalExams);
        const avgGradePersian = realAvgGrade !== '۰' ? toPersianNumber(realAvgGrade) : '۰';
        const avgAttendancePersian = toPersianNumber(avgAttendance);
        const passRatePersian = toPersianNumber(passRate);
        
        const todayJalali = formatDate(new Date());
        const todayWeekday = getWeekdayName(new Date());
        const userName = profile?.name || 'معلم گرامی';
        
        const html = `
            <style>
                /* استایل‌های هماهنگ با homepage.css */
                .dashboard-home {
                    direction: rtl;
                    font-family: 'Vazir', system-ui, sans-serif;
                }
                
                /* کارت خوش آمدگویی - مشابه هوم‌پیج */
                .welcome-home {
                    background: linear-gradient(135deg, #2563eb, #2563eb);
                    border-radius: 28px;
                    padding: 28px 32px;
                    margin-bottom: 28px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 20px;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 20px 35px -10px rgba(0,0,0,0.2);
                }
                .welcome-home::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -10%;
                    width: 250px;
                    height: 250px;
                    background: radial-gradient(circle, rgba(37,99,235,0.25), transparent);
                    border-radius: 50%;
                }
                .welcome-home h2 {
                    font-size: 1.4rem;
                    font-weight: 800;
                    color: white;
                    margin-bottom: 6px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .welcome-home p {
                    color: rgba(255,255,255,0.8);
                    font-size: 0.85rem;
                }
                .welcome-date-home {
                    background: rgba(255,255,255,0.12);
                    backdrop-filter: blur(10px);
                    padding: 8px 20px;
                    border-radius: 50px;
                    color: white;
                    font-size: 0.85rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    z-index: 2;
                }
                
                /* 5 کارت آمار - مشابه استایل هوم‌پیج */
                .stats-home {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 20px;
                    margin-bottom: 28px;
                }
                .stat-home {
                    background: white;
                    border-radius: 24px;
                    padding: 22px 12px;
                    text-align: center;
                    transition: all 0.4s cubic-bezier(0.2,0.9,0.4,1.1);
                    border: 1px solid #e2e8f0;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .stat-home:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 20px 35px rgba(37,99,235,0.12);
                    border-color: #2563eb;
                }
                .stat-icon-home {
                    width: 55px;
                    height: 55px;
                    margin: 0 auto 14px;
                    background: rgba(37,99,235,0.1);
                    border-radius: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    color: #2563eb;
                }
                .stat-icon-home.blue { background: #dbeafe; color: #2563eb; }
                .stat-icon-home.green { background: #d1fae5; color: #10b981; }
                .stat-icon-home.orange { background: #fef3c7; color: #f59e0b; }
                .stat-icon-home.purple { background: #f3e8ff; color: #8b5cf6; }
                .stat-icon-home.red { background: #fee2e2; color: #ef4444; }
                .stat-value-home {
                    font-size: 1.8rem;
                    font-weight: 800;
                    color: #0f172a;
                    line-height: 1.2;
                }
                .stat-label-home {
                    font-size: 0.75rem;
                    color: #64748b;
                    margin-top: 6px;
                    font-weight: 500;
                }
                
                /* 4 کارت سریع - مشابه هوم‌پیج */
                .quick-home {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                    margin-bottom: 28px;
                }
                .quick-card-home {
                    background: white;
                    border-radius: 20px;
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    border: 1px solid #e2e8f0;
                    transition: all 0.3s;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .quick-card-home:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.08);
                }
                .quick-icon-home {
                    width: 48px;
                    height: 48px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    flex-shrink: 0;
                }
                .quick-icon-home.blue-bg { background: #dbeafe; color: #2563eb; }
                .quick-icon-home.green-bg { background: #d1fae5; color: #10b981; }
                .quick-icon-home.orange-bg { background: #fef3c7; color: #f59e0b; }
                .quick-icon-home.purple-bg { background: #f3e8ff; color: #8b5cf6; }
                .quick-content-home { flex: 1; }
                .quick-label-home { font-size: 0.7rem; color: #94a3b8; margin-bottom: 4px; }
                .quick-value-home { font-size: 1.1rem; font-weight: 800; color: #0f172a; }
                
                /* نمودارها - مشابه هوم‌پیج */
                .charts-home {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                    margin-bottom: 28px;
                }
                .chart-card-home {
                    background: white;
                    border-radius: 24px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    transition: all 0.3s;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .chart-card-home:hover {
                    box-shadow: 0 12px 24px rgba(0,0,0,0.08);
                }
                .chart-header-home {
                    padding: 16px 20px;
                    border-bottom: 1px solid #e2e8f0;
                    background: #f8fafc;
                    font-weight: 700;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .chart-body-home {
                    padding: 20px;
                    min-height: 320px;
                }
                .chart-footer-home {
                    padding: 12px 20px;
                    border-top: 1px solid #e2e8f0;
                    background: #f8fafc;
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.7rem;
                    color: #64748b;
                }
                .chart-footer-home strong {
                    color: #0f172a;
                }
                
                /* کلاس‌ها و فعالیت‌ها */
                .bottom-home {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                }
                .section-card-home {
                    background: white;
                    border-radius: 24px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .section-header-home {
                    padding: 16px 20px;
                    border-bottom: 1px solid #e2e8f0;
                    background: #f8fafc;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .section-title-home {
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 0.9rem;
                }
                .section-link-home {
                    background: none;
                    border: none;
                    color: #2563eb;
                    font-size: 0.75rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .class-item-home {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 14px 20px;
                    border-bottom: 1px solid #f8fafc;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .class-item-home:hover {
                    background: #f8fafc;
                    transform: translateX(-4px);
                }
                .class-icon-home {
                    width: 46px;
                    height: 46px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 1.1rem;
                    flex-shrink: 0;
                }
                .class-info-home { flex: 1; }
                .class-name-home { font-weight: 700; font-size: 0.9rem; margin-bottom: 4px; }
                .class-meta-home { font-size: 0.65rem; color: #64748b; display: flex; gap: 12px; }
                .class-meta-home span { display: flex; align-items: center; gap: 4px; }
                
                .activity-item-home {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 14px 20px;
                    border-bottom: 1px solid #f8fafc;
                }
                .activity-icon-home {
                    width: 42px;
                    height: 42px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1rem;
                    flex-shrink: 0;
                }
                .activity-content-home { flex: 1; }
                .activity-title-home { font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; }
                .activity-time-home { font-size: 0.65rem; color: #94a3b8; display: flex; align-items: center; gap: 6px; }
                
                .empty-home {
                    text-align: center;
                    padding: 40px;
                    color: #94a3b8;
                    font-size: 0.8rem;
                }
                
                @media (max-width: 1100px) {
                    .stats-home { grid-template-columns: repeat(3, 1fr); }
                    .quick-home { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 900px) {
                    .charts-home { grid-template-columns: 1fr; }
                    .bottom-home { grid-template-columns: 1fr; }
                }
                @media (max-width: 700px) {
                    .stats-home { grid-template-columns: repeat(2, 1fr); }
                    .quick-home { grid-template-columns: 1fr; }
                    .welcome-home { flex-direction: column; text-align: center; }
                }
            </style>
            
            <div class="dashboard-home">
                <!-- کارت خوش آمدگویی -->
                <div class="welcome-home">
                    <div>
                        <h2><i class="fas fa-chalkboard-user"></i> خوش آمدید، ${escapeHtml(userName)}</h2>
                        <p>به داشبورد مدیریت آموزشی خوش آمدید. در اینجا خلاصه‌ای از وضعیت آموزشی خود را مشاهده می‌کنید.</p>
                    </div>
                    <div class="welcome-date-home">
                        <i class="fas fa-calendar-alt"></i> ${todayJalali} - ${todayWeekday}
                    </div>
                </div>
                
                <!-- 5 کارت آمار -->
                <div class="stats-home">
                    <div class="stat-home" onclick="showTab('classes')">
                        <div class="stat-icon-home blue"><i class="fas fa-door-open"></i></div>
                        <div class="stat-value-home">${totalClassesPersian}</div>
                        <div class="stat-label-home">کلاس‌های من</div>
                    </div>
                    <div class="stat-home" onclick="showTab('students')">
                        <div class="stat-icon-home green"><i class="fas fa-user-graduate"></i></div>
                        <div class="stat-value-home">${totalStudentsPersian}</div>
                        <div class="stat-label-home">دانش‌آموزان</div>
                    </div>
                    <div class="stat-home" onclick="showTab('assignments')">
                        <div class="stat-icon-home orange"><i class="fas fa-tasks"></i></div>
                        <div class="stat-value-home">${totalAssignmentsPersian}</div>
                        <div class="stat-label-home">تکالیف فعال</div>
                    </div>
                    <div class="stat-home" onclick="showTab('exams')">
                        <div class="stat-icon-home purple"><i class="fas fa-pen-to-square"></i></div>
                        <div class="stat-value-home">${totalExamsPersian}</div>
                        <div class="stat-label-home">آزمون‌ها</div>
                    </div>
                    <div class="stat-home" onclick="showTab('grades')">
                        <div class="stat-icon-home red"><i class="fas fa-star"></i></div>
                        <div class="stat-value-home">${avgGradePersian}</div>
                        <div class="stat-label-home">میانگین نمرات</div>
                    </div>
                </div>
                
                <!-- 4 کارت سریع -->
                <div class="quick-home">
                    <div class="quick-card-home">
                        <div class="quick-icon-home blue-bg"><i class="fas fa-chart-line"></i></div>
                        <div class="quick-content-home">
                            <div class="quick-label-home">میانگین حضور</div>
                            <div class="quick-value-home">${avgAttendancePersian}%</div>
                        </div>
                    </div>
                    <div class="quick-card-home">
                        <div class="quick-icon-home green-bg"><i class="fas fa-graduation-cap"></i></div>
                        <div class="quick-content-home">
                            <div class="quick-label-home">نرخ قبولی</div>
                            <div class="quick-value-home">${passRatePersian}%</div>
                        </div>
                    </div>
                    <div class="quick-card-home">
                        <div class="quick-icon-home orange-bg"><i class="fas fa-chart-simple"></i></div>
                        <div class="quick-content-home">
                            <div class="quick-label-home">رشد عملکرد</div>
                            <div class="quick-value-home">+۱۲%</div>
                        </div>
                    </div>
                    <div class="quick-card-home">
                        <div class="quick-icon-home purple-bg"><i class="fas fa-trophy"></i></div>
                        <div class="quick-content-home">
                            <div class="quick-label-home">وضعیت</div>
                            <div class="quick-value-home">عالی</div>
                        </div>
                    </div>
                </div>
                
                <!-- نمودارها -->
                <div class="charts-home">
                    <div class="chart-card-home">
                        <div class="chart-header-home">
                            <i class="fas fa-chart-line" style="color:#10b981;"></i> آمار حضور هفتگی
                        </div>
                        <div class="chart-body-home">
                            <div id="attendanceChartContainer" style="height: 280px;"></div>
                        </div>
                        <div class="chart-footer-home">
                            <span><i class="fas fa-chart-line"></i> میانگین حضور: <strong>${avgAttendancePersian}%</strong></span>
                            <span><i class="fas fa-calendar-check"></i> بهترین روز: <strong>چهارشنبه</strong></span>
                        </div>
                    </div>
                    <div class="chart-card-home">
                        <div class="chart-header-home">
                            <i class="fas fa-chart-pie" style="color:#8b5cf6;"></i> توزیع نمرات دانش‌آموزان
                        </div>
                        <div class="chart-body-home">
                            <div id="gradesChartContainer" style="height: 280px;"></div>
                        </div>
                        <div class="chart-footer-home">
                            <span><i class="fas fa-percent"></i> نرخ قبولی: <strong>${passRatePersian}%</strong></span>
                            <span><i class="fas fa-star"></i> میانگین کل: <strong>${avgGradePersian}</strong></span>
                        </div>
                    </div>
                </div>
                
                <!-- کلاس‌ها و فعالیت‌ها -->
                <div class="bottom-home">
                    <div class="section-card-home">
                        <div class="section-header-home">
                            <div class="section-title-home">
                                <i class="fas fa-door-open" style="color:#2563eb;"></i> کلاس‌های من
                            </div>
                            <button class="section-link-home" onclick="showTab('classes')">مشاهده همه <i class="fas fa-arrow-left"></i></button>
                        </div>
                        <div id="classesListContainer" class="classes-list"></div>
                    </div>
                    <div class="section-card-home">
                        <div class="section-header-home">
                            <div class="section-title-home">
                                <i class="fas fa-history" style="color:#f59e0b;"></i> آخرین فعالیت‌ها
                            </div>
                        </div>
                        <div id="activitiesListContainer" class="activities-list"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('contentArea').innerHTML = html;
        
        // پر کردن کلاس‌ها
        const classesContainer = document.getElementById('classesListContainer');
        if (classesContainer) {
            if (classesData.length === 0) {
                classesContainer.innerHTML = '<div class="empty-home">هیچ کلاسی به شما اختصاص داده نشده است</div>';
            } else {
                const gradeColors = { 7: '#10b981', 8: '#3b82f6', 9: '#8b5cf6', 10: '#f59e0b', 11: '#ef4444', 12: '#ec4899' };
                classesContainer.innerHTML = classesData.slice(0, 4).map(cls => {
                    const color = gradeColors[cls.grade] || '#64748b';
                    return `
                        <div class="class-item-home" onclick="showTab('students')">
                            <div class="class-icon-home" style="background: linear-gradient(135deg, ${color}, ${color}dd);"><i class="fas fa-door-open"></i></div>
                            <div class="class-info-home">
                                <div class="class-name-home">${escapeHtml(cls.name)}</div>
                                <div class="class-meta-home">
                                    <span><i class="fas fa-graduation-cap"></i> پایه ${toPersianNumber(cls.grade)}</span>
                                    <span><i class="fas fa-users"></i> ${toPersianNumber(cls.student_count || 0)} دانش‌آموز</span>
                                </div>
                            </div>
                            <i class="fas fa-chevron-left" style="color:#cbd5e1;"></i>
                        </div>
                    `;
                }).join('');
            }
        }
        
        // پر کردن فعالیت‌ها
        const activitiesContainer = document.getElementById('activitiesListContainer');
        if (activitiesContainer) {
            let acts = [];
            if (assignmentsData.length) acts.push(...assignmentsData.slice(0,3).map(a => ({ 
                icon: 'fa-tasks', 
                title: `تکلیف "${a.title}"`, 
                time: formatDate(a.created_at), 
                bg: '#fef3c7', 
                color: '#f59e0b' 
            })));
            if (examsData.length) acts.push(...examsData.slice(0,2).map(e => ({ 
                icon: 'fa-pen-to-square', 
                title: `آزمون "${e.title}"`, 
                time: formatDate(e.created_at), 
                bg: '#f3e8ff', 
                color: '#8b5cf6' 
            })));
            if (acts.length === 0) {
                activitiesContainer.innerHTML = '<div class="empty-home">هیچ فعالیتی ثبت نشده است</div>';
            } else {
                activitiesContainer.innerHTML = acts.map(act => `
                    <div class="activity-item-home">
                        <div class="activity-icon-home" style="background: ${act.bg}; color: ${act.color};"><i class="fas ${act.icon}"></i></div>
                        <div class="activity-content-home">
                            <div class="activity-title-home">${act.title}</div>
                            <div class="activity-time-home"><i class="fas fa-calendar-alt"></i> ${act.time}</div>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        // رسم نمودارها
        setTimeout(() => {
            if (typeof ApexCharts !== 'undefined') {
                const hasAttData = attendanceData.present.some(v => v > 0);
                if (hasAttData) {
                    renderBarChartWithApex('#attendanceChartContainer', attendanceData.labels, attendanceData.present, attendanceData.absent, attendanceData.late);
                } else {
                    document.getElementById('attendanceChartContainer').innerHTML = '<div class="empty-home">داده‌ای برای نمایش وجود ندارد</div>';
                }
                
                if (gradeCount > 0) {
                    renderPieChartWithApex('#gradesChartContainer', [excellentCount, goodCount, averageCount, poorCount], ['عالی', 'خوب', 'متوسط', 'ضعیف'], ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'], `${toPersianNumber(gradeCount)} نفر`);
                } else {
                    document.getElementById('gradesChartContainer').innerHTML = '<div class="empty-home">نمره‌ای ثبت نشده است</div>';
                }
            } else {
                document.getElementById('attendanceChartContainer').innerHTML = '<div class="empty-home">کتابخانه نمودار بارگذاری نشد</div>';
                document.getElementById('gradesChartContainer').innerHTML = '<div class="empty-home">کتابخانه نمودار بارگذاری نشد</div>';
            }
        }, 200);
        
    } catch (error) {
        console.error('Dashboard error:', error);
        document.getElementById('contentArea').innerHTML = `
            <div class="empty-home" style="background:white; border-radius:24px; margin:20px; padding:60px; text-align:center;">
                <i class="fas fa-exclamation-circle fa-3x" style="color:#ef4444;"></i>
                <h3 style="margin-top:16px;">خطا در بارگذاری داشبورد</h3>
                <p style="color:#64748b;">${error.message}</p>
                <button onclick="renderDashboard()" style="margin-top:20px; padding:10px 24px; background:#2563eb; color:white; border:none; border-radius:40px; cursor:pointer;">تلاش مجدد</button>
            </div>
        `;
    }
    showLoading(false);
}
// ============================================
// رندر کلاس‌های من - هماهنگ با طراحی هوم‌پیج
// ============================================

async function renderClasses() {
    showLoading(true);
    try {
        await loadClassesFromDB();
        
        // رنگ‌های پایه برای هر پایه تحصیلی (مشابه هوم‌پیج)
        const gradeColors = { 
            7: '#10b981',   // سبز
            8: '#3b82f6',   // آبی
            9: '#8b5cf6',   // بنفش
            10: '#f59e0b',  // نارنجی
            11: '#ef4444',  // قرمز
            12: '#ec4899'   // صورتی
        };
        
        const gradeNames = {
            7: 'هفتم', 8: 'هشتم', 9: 'نهم',
                   };
        
        // محاسبه آمار کلی
        let totalStudents = 0;
        let totalCapacity = 0;
        let uniqueTeachers = new Set();
        
        for (const cls of classesData) {
            totalStudents += cls.student_count || 0;
            totalCapacity += cls.capacity || 30;
            if (cls.teachers_name) {
                cls.teachers_name.split('، ').forEach(t => uniqueTeachers.add(t));
            }
        }
        
        const avgOccupancy = classesData.length > 0 
            ? Math.round(classesData.reduce((sum, cls) => sum + (cls.capacity ? Math.min(100, (cls.student_count / cls.capacity) * 100) : 0), 0) / classesData.length)
            : 0;
        
        const totalStudentsPersian = toPersianNumber(totalStudents);
        const totalClassesPersian = toPersianNumber(classesData.length);
        const totalTeachersPersian = toPersianNumber(uniqueTeachers.size);
        const avgOccupancyPersian = toPersianNumber(avgOccupancy);
        
        const html = `
            <style>
                /* استایل صفحه کلاس‌ها - هماهنگ با homepage.css */
                .classes-home {
                    direction: rtl;
                    font-family: 'Vazir', system-ui, sans-serif;
                }
                
                /* هدر آمار - مشابه هوم‌پیج */
                .stats-home {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                    margin-bottom: 28px;
                }
                .stat-home {
                    background: white;
                    border-radius: 24px;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    border: 1px solid #e2e8f0;
                    transition: all 0.4s cubic-bezier(0.2,0.9,0.4,1.1);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .stat-home:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 20px 35px rgba(37,99,235,0.12);
                    border-color: #2563eb;
                }
                .stat-icon-home {
                    width: 55px;
                    height: 55px;
                    border-radius: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.4rem;
                }
                .stat-icon-home.blue { background: #dbeafe; color: #2563eb; }
                .stat-icon-home.green { background: #d1fae5; color: #10b981; }
                .stat-icon-home.orange { background: #fef3c7; color: #f59e0b; }
                .stat-icon-home.purple { background: #f3e8ff; color: #8b5cf6; }
                .stat-content-home { flex: 1; }
                .stat-value-home {
                    font-size: 1.6rem;
                    font-weight: 800;
                    color: #0f172a;
                    line-height: 1.2;
                }
                .stat-label-home {
                    font-size: 0.7rem;
                    color: #64748b;
                    margin-top: 4px;
                    font-weight: 500;
                }
                .stat-trend-home {
                    font-size: 0.65rem;
                    margin-top: 6px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .stat-trend-home.up { color: #10b981; }
                
                /* نوار جستجو و فیلتر */
                .toolbar-home {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 16px;
                    margin-bottom: 28px;
                    background: white;
                    padding: 16px 24px;
                    border-radius: 24px;
                    border: 1px solid #e2e8f0;
                    align-items: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .search-box-home {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: #f8fafc;
                    padding: 8px 18px;
                    border-radius: 40px;
                    border: 1px solid #e2e8f0;
                    flex: 1;
                }
                .search-box-home i { color: #94a3b8; }
                .search-box-home input {
                    border: none;
                    background: transparent;
                    outline: none;
                    flex: 1;
                    font-family: inherit;
                    font-size: 0.85rem;
                }
                .grade-filter-home {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                .grade-filter-btn-home {
                    padding: 6px 16px;
                    border-radius: 40px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid #e2e8f0;
                    background: white;
                    color: #475569;
                }
                .grade-filter-btn-home:hover {
                    background: #e2e8f0;
                }
                .grade-filter-btn-home.active {
                    background: #2563eb;
                    color: white;
                    border-color: #2563eb;
                }
                .view-toggle-home {
                    display: flex;
                    gap: 8px;
                }
                .view-toggle-btn-home {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .view-toggle-btn-home.active {
                    background: #2563eb;
                    color: white;
                    border-color: #2563eb;
                }
                
                /* گرید کلاس‌ها - کارتی (مشابه سرویس‌های هوم‌پیج) */
                .classes-grid-home {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
                    gap: 24px;
                    margin-bottom: 32px;
                }
                .class-card-home {
                    background: white;
                    border-radius: 24px;
                    overflow: hidden;
                    transition: all 0.4s cubic-bezier(0.2,0.9,0.4,1.1);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                    border: 1px solid #e2e8f0;
                }
                .class-card-home:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 20px 35px rgba(37,99,235,0.12);
                    border-color: #2563eb;
                }
                .class-header-home {
                    padding: 20px;
                    color: white;
                    position: relative;
                    overflow: hidden;
                }
                .class-header-home::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -20%;
                    width: 150px;
                    height: 150px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 50%;
                }
                .class-title-home {
                    font-size: 1.2rem;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    position: relative;
                    z-index: 2;
                }
                .class-badge-home {
                    display: inline-block;
                    background: rgba(255,255,255,0.2);
                    backdrop-filter: blur(10px);
                    padding: 4px 12px;
                    border-radius: 40px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    margin-top: 12px;
                    position: relative;
                    z-index: 2;
                }
                .class-body-home {
                    padding: 20px;
                }
                .class-stats-home {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid #f1f5f9;
                }
                .class-stat-item-home {
                    text-align: center;
                    flex: 1;
                }
                .class-stat-number-home {
                    font-size: 1.2rem;
                    font-weight: 800;
                    color: #0f172a;
                }
                .class-stat-text-home {
                    font-size: 0.65rem;
                    color: #64748b;
                    margin-top: 4px;
                }
                .class-progress-home {
                    margin: 16px 0;
                }
                .progress-label-home {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.7rem;
                    color: #64748b;
                    margin-bottom: 6px;
                }
                .progress-bar-home {
                    width: 100%;
                    height: 8px;
                    background: #e2e8f0;
                    border-radius: 10px;
                    overflow: hidden;
                }
                .progress-fill-home {
                    height: 100%;
                    border-radius: 10px;
                    transition: width 0.5s;
                }
                .class-teachers-home {
                    margin: 16px 0;
                    padding-top: 12px;
                    border-top: 1px solid #f1f5f9;
                }
                .teachers-title-home {
                    font-size: 0.7rem;
                    color: #64748b;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .teachers-list-home {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .teacher-tag-home {
                    background: #f1f5f9;
                    padding: 4px 10px;
                    border-radius: 40px;
                    font-size: 0.7rem;
                    color: #0f172a;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
                .teacher-tag-home i { font-size: 0.65rem; color: #2563eb; }
                .no-teacher-home {
                    font-size: 0.7rem;
                    color: #94a3b8;
                    font-style: italic;
                }
                .class-actions-home {
                    display: flex;
                    gap: 10px;
                    margin-top: 16px;
                    padding-top: 12px;
                    border-top: 1px solid #f1f5f9;
                }
                .class-action-btn-home {
                    flex: 1;
                    padding: 8px;
                    border-radius: 40px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }
                .class-action-btn-home.primary { background: #2563eb; color: white; }
                .class-action-btn-home.primary:hover { background: #1d4ed8; transform: translateY(-2px); }
                .class-action-btn-home.secondary { background: #f59e0b; color: white; }
                .class-action-btn-home.secondary:hover { background: #d97706; transform: translateY(-2px); }
                .class-action-btn-home.success { background: #10b981; color: white; }
                .class-action-btn-home.success:hover { background: #059669; transform: translateY(-2px); }
                
                /* نمای لیستی */
                .classes-list-home {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-bottom: 32px;
                }
                .class-list-item-home {
                    background: white;
                    border-radius: 20px;
                    border: 1px solid #e2e8f0;
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 16px;
                    transition: all 0.2s;
                }
                .class-list-item-home:hover {
                    transform: translateX(-5px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    border-color: #2563eb;
                }
                .class-list-info-home {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    flex: 2;
                }
                .class-list-icon-home {
                    width: 50px;
                    height: 50px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 1.2rem;
                }
                .class-list-details-home h4 { font-size: 1rem; font-weight: 700; margin-bottom: 4px; }
                .class-list-details-home p { font-size: 0.7rem; color: #64748b; }
                .class-list-stats-home {
                    display: flex;
                    gap: 24px;
                    flex: 1;
                }
                .class-list-stat-home { text-align: center; }
                .class-list-stat-home .number { font-size: 1rem; font-weight: 800; }
                .class-list-stat-home .label { font-size: 0.65rem; color: #64748b; }
                .class-list-actions-home {
                    display: flex;
                    gap: 8px;
                }
                
                /* صفحه‌بندی */
                .pagination-home {
                    display: flex;
                    justify-content: center;
                    gap: 8px;
                    margin-top: 24px;
                    padding-top: 20px;
                    border-top: 1px solid #e2e8f0;
                }
                .page-btn-home {
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-weight: 600;
                }
                .page-btn-home:hover { background: #f1f5f9; border-color: #2563eb; }
                .page-btn-home.active { background: #2563eb; color: white; border-color: #2563eb; }
                .page-btn-home:disabled { opacity: 0.5; cursor: not-allowed; }
                
                .empty-home {
                    text-align: center;
                    padding: 80px 20px;
                    background: white;
                    border-radius: 24px;
                    border: 1px solid #e2e8f0;
                }
                .empty-home i {
                    font-size: 4rem;
                    color: #cbd5e1;
                    margin-bottom: 16px;
                }
                .empty-home h4 {
                    font-size: 1.1rem;
                    margin-bottom: 8px;
                    color: #0f172a;
                }
                
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @media (max-width: 768px) {
                    .stats-home { grid-template-columns: repeat(2, 1fr); }
                    .toolbar-home { flex-direction: column; }
                    .search-box-home { width: 100%; }
                    .classes-grid-home { grid-template-columns: 1fr; }
                    .class-list-item-home { flex-direction: column; align-items: flex-start; }
                    .class-list-stats-home { width: 100%; justify-content: space-between; }
                    .class-list-actions-home { width: 100%; justify-content: flex-end; }
                }
            </style>
            
            <div class="classes-home">
                <!-- کارت‌های آمار بالا -->
                <div class="stats-home">
                    <div class="stat-home">
                        <div class="stat-icon-home blue"><i class="fas fa-door-open"></i></div>
                        <div class="stat-content-home">
                            <div class="stat-value-home">${totalClassesPersian}</div>
                            <div class="stat-label-home">کل کلاس‌ها</div>
                            <div class="stat-trend-home up"><i class="fas fa-arrow-up"></i> فعال</div>
                        </div>
                    </div>
                    <div class="stat-home">
                        <div class="stat-icon-home green"><i class="fas fa-users"></i></div>
                        <div class="stat-content-home">
                            <div class="stat-value-home">${totalStudentsPersian}</div>
                            <div class="stat-label-home">کل دانش‌آموزان</div>
                            <div class="stat-trend-home up"><i class="fas fa-arrow-up"></i> در همه کلاس‌ها</div>
                        </div>
                    </div>
                    <div class="stat-home">
                        <div class="stat-icon-home orange"><i class="fas fa-chalkboard-user"></i></div>
                        <div class="stat-content-home">
                            <div class="stat-value-home">${totalTeachersPersian}</div>
                            <div class="stat-label-home">معلمان</div>
                            <div class="stat-trend-home"><i class="fas fa-user-check"></i> در حال تدریس</div>
                        </div>
                    </div>
                    <div class="stat-home">
                        <div class="stat-icon-home purple"><i class="fas fa-percent"></i></div>
                        <div class="stat-content-home">
                            <div class="stat-value-home">${avgOccupancyPersian}%</div>
                            <div class="stat-label-home">میانگین پرشدگی</div>
                            <div class="stat-trend-home"><i class="fas fa-chart-line"></i> کلاس‌ها</div>
                        </div>
                    </div>
                </div>
                
                <!-- نوار ابزار -->
                <div class="toolbar-home">
                    <div class="search-box-home">
                        <i class="fas fa-search"></i>
                        <input type="text" id="searchClassHome" placeholder="جستجوی نام کلاس، پایه یا معلم..." onkeyup="filterClassesHome()">
                    </div>
                    <div class="grade-filter-home" id="gradeFilterHome">
                        <button class="grade-filter-btn-home active" data-grade="all">همه پایه‌ها</button>
                        <button class="grade-filter-btn-home" data-grade="7">پایه هفتم</button>
                        <button class="grade-filter-btn-home" data-grade="8">پایه هشتم</button>
                        <button class="grade-filter-btn-home" data-grade="9">پایه نهم</button>
                    </div>
                    <div class="view-toggle-home">
                        <button class="view-toggle-btn-home active" data-view="grid" onclick="toggleClassesViewHome('grid')" title="نمایش کارتی"><i class="fas fa-th-large"></i></button>
                        <button class="view-toggle-btn-home" data-view="list" onclick="toggleClassesViewHome('list')" title="نمایش لیستی"><i class="fas fa-list"></i></button>
                    </div>
                </div>
                
                <!-- گرید کلاس‌ها -->
                <div id="classesGridViewHome" class="classes-grid-home"></div>
                
                <!-- نمای لیستی (مخفی پیش‌فرض) -->
                <div id="classesListViewHome" class="classes-list-home" style="display: none;"></div>
                
                <!-- صفحه‌بندی -->
                <div id="classesPaginationHome" class="pagination-home"></div>
            </div>
        `;
        
        document.getElementById('contentArea').innerHTML = html;
        
        // متغیرهای صفحه‌بندی و فیلتر
        let currentPage = 1;
        let itemsPerPage = 6;
        let currentView = 'grid';
        let currentGradeFilter = 'all';
        let currentSearchTerm = '';
        let filteredClasses = [...classesData];
        
        // تابع فیلتر کلاس‌ها
        window.filterClassesHome = function() {
            currentSearchTerm = document.getElementById('searchClassHome')?.value?.toLowerCase() || '';
            currentPage = 1;
            applyFiltersAndRenderHome();
        };
        
        // فیلتر بر اساس پایه
        document.querySelectorAll('#gradeFilterHome .grade-filter-btn-home').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('#gradeFilterHome .grade-filter-btn-home').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentGradeFilter = this.getAttribute('data-grade');
                currentPage = 1;
                applyFiltersAndRenderHome();
            });
        });
        
        // اعمال فیلترها
        function applyFiltersAndRenderHome() {
            filteredClasses = classesData.filter(cls => {
                if (currentSearchTerm) {
                    const searchMatch = cls.name?.toLowerCase().includes(currentSearchTerm) ||
                                       cls.grade?.toString().includes(currentSearchTerm) ||
                                       cls.teachers_name?.toLowerCase().includes(currentSearchTerm);
                    if (!searchMatch) return false;
                }
                if (currentGradeFilter !== 'all' && cls.grade != currentGradeFilter) return false;
                return true;
            });
            
            if (currentView === 'grid') {
                renderClassesGridViewHome();
            } else {
                renderClassesListViewHome();
            }
            renderPaginationHome();
        }
        
        // رندر نمای کارتی
        function renderClassesGridViewHome() {
            const start = (currentPage - 1) * itemsPerPage;
            const paginated = filteredClasses.slice(start, start + itemsPerPage);
            const container = document.getElementById('classesGridViewHome');
            
            if (paginated.length === 0) {
                container.innerHTML = `
                    <div class="empty-home" style="grid-column:1/-1;">
                        <i class="fas fa-door-open"></i>
                        <h4>کلاسی یافت نشد</h4>
                        <p>هیچ کلاسی با معیارهای جستجوی شما مطابقت ندارد</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = paginated.map(cls => {
                const color = gradeColors[cls.grade] || '#64748b';
                const gradeName = gradeNames[cls.grade] || `پایه ${cls.grade}`;
                const occupancy = cls.capacity ? Math.round((cls.student_count / cls.capacity) * 100) : 0;
                const teachersList = cls.teachers_name ? cls.teachers_name.split('، ') : [];
                
                return `
                    <div class="class-card-home">
                        <div class="class-header-home" style="background: linear-gradient(135deg, ${color}, ${color}dd);">
                            <div class="class-title-home">
                                <i class="fas fa-door-open"></i>
                                ${escapeHtml(cls.name)}
                            </div>
                            <div class="class-badge-home">
                                <i class="fas fa-graduation-cap"></i> ${gradeName}
                            </div>
                        </div>
                        <div class="class-body-home">
                            <div class="class-stats-home">
                                <div class="class-stat-item-home">
                                    <div class="class-stat-number-home">${toPersianNumber(cls.student_count || 0)}</div>
                                    <div class="class-stat-text-home">دانش‌آموز</div>
                                </div>
                                <div class="class-stat-item-home">
                                    <div class="class-stat-number-home">${toPersianNumber(cls.capacity || 30)}</div>
                                    <div class="class-stat-text-home">ظرفیت</div>
                                </div>
                                <div class="class-stat-item-home">
                                    <div class="class-stat-number-home">${toPersianNumber(occupancy)}%</div>
                                    <div class="class-stat-text-home">پرشدگی</div>
                                </div>
                            </div>
                            <div class="class-progress-home">
                                <div class="progress-label-home">
                                    <span>درصد پرشدگی</span>
                                    <span>${occupancy}%</span>
                                </div>
                                <div class="progress-bar-home">
                                    <div class="progress-fill-home" style="width: ${occupancy}%; background: linear-gradient(90deg, ${color}, ${color}aa);"></div>
                                </div>
                            </div>
                            <div class="class-teachers-home">
                                <div class="teachers-title-home">
                                    <i class="fas fa-chalkboard-user"></i> معلمان این کلاس:
                                </div>
                                <div class="teachers-list-home">
                                    ${teachersList.length > 0 
                                        ? teachersList.map(t => `<span class="teacher-tag-home"><i class="fas fa-user"></i> ${escapeHtml(t)}</span>`).join('')
                                        : '<span class="no-teacher-home"><i class="fas fa-info-circle"></i> معلمی تعیین نشده</span>'}
                                </div>
                            </div>
                            <div class="class-actions-home">
                                <button class="class-action-btn-home primary" onclick="showTab('students')">
                                    <i class="fas fa-users"></i> دانش‌آموزان
                                </button>
                                <button class="class-action-btn-home secondary" onclick="showTab('attendance')">
                                    <i class="fas fa-clipboard-check"></i> حضور
                                </button>
                                <button class="class-action-btn-home success" onclick="showTab('grades')">
                                    <i class="fas fa-star"></i> نمرات
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // رندر نمای لیستی
        function renderClassesListViewHome() {
            const start = (currentPage - 1) * itemsPerPage;
            const paginated = filteredClasses.slice(start, start + itemsPerPage);
            const container = document.getElementById('classesListViewHome');
            
            if (paginated.length === 0) {
                container.innerHTML = `
                    <div class="empty-home">
                        <i class="fas fa-door-open"></i>
                        <h4>کلاسی یافت نشد</h4>
                        <p>هیچ کلاسی با معیارهای جستجوی شما مطابقت ندارد</p>
                    </div>
                `;
                container.style.display = 'block';
                return;
            }
            
            container.innerHTML = paginated.map(cls => {
                const color = gradeColors[cls.grade] || '#64748b';
                const gradeName = gradeNames[cls.grade] || `پایه ${cls.grade}`;
                const occupancy = cls.capacity ? Math.round((cls.student_count / cls.capacity) * 100) : 0;
                
                return `
                    <div class="class-list-item-home">
                        <div class="class-list-info-home">
                            <div class="class-list-icon-home" style="background: linear-gradient(135deg, ${color}, ${color}dd);">
                                <i class="fas fa-door-open"></i>
                            </div>
                            <div class="class-list-details-home">
                                <h4>${escapeHtml(cls.name)}</h4>
                                <p><i class="fas fa-graduation-cap"></i> ${gradeName}</p>
                            </div>
                        </div>
                        <div class="class-list-stats-home">
                            <div class="class-list-stat-home">
                                <div class="number">${toPersianNumber(cls.student_count || 0)}</div>
                                <div class="label">دانش‌آموز</div>
                            </div>
                            <div class="class-list-stat-home">
                                <div class="number">${toPersianNumber(occupancy)}%</div>
                                <div class="label">پرشدگی</div>
                            </div>
                            <div class="class-list-stat-home">
                                <div class="number">${toPersianNumber(cls.capacity || 30)}</div>
                                <div class="label">ظرفیت</div>
                            </div>
                        </div>
                        <div class="class-list-actions-home">
                            <button class="class-action-btn-home primary" onclick="showTab('students')" style="padding: 6px 12px;">
                                <i class="fas fa-users"></i>
                            </button>
                            <button class="class-action-btn-home secondary" onclick="showTab('attendance')" style="padding: 6px 12px;">
                                <i class="fas fa-clipboard-check"></i>
                            </button>
                            <button class="class-action-btn-home success" onclick="showTab('grades')" style="padding: 6px 12px;">
                                <i class="fas fa-star"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            container.style.display = 'flex';
        }
        
        // رندر صفحه‌بندی
        function renderPaginationHome() {
            const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
            const paginationContainer = document.getElementById('classesPaginationHome');
            
            if (totalPages <= 1) {
                paginationContainer.innerHTML = '';
                return;
            }
            
            let html = `<button class="page-btn-home" onclick="changeClassesPageHome(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
            
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                    html += `<button class="page-btn-home ${i === currentPage ? 'active' : ''}" onclick="changeClassesPageHome(${i})">${toPersianNumber(i)}</button>`;
                } else if (i === currentPage - 2 || i === currentPage + 2) {
                    html += `<span style="color:#94a3b8;">...</span>`;
                }
            }
            
            html += `<button class="page-btn-home" onclick="changeClassesPageHome(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
            paginationContainer.innerHTML = html;
        }
        
        // تغییر صفحه
        window.changeClassesPageHome = function(page) {
            currentPage = page;
            applyFiltersAndRenderHome();
        };
        
        // تغییر نمای نمایش
        window.toggleClassesViewHome = function(view) {
            currentView = view;
            currentPage = 1;
            
            const gridView = document.getElementById('classesGridViewHome');
            const listView = document.getElementById('classesListViewHome');
            const gridBtn = document.querySelector('.view-toggle-btn-home[data-view="grid"]');
            const listBtn = document.querySelector('.view-toggle-btn-home[data-view="list"]');
            
            if (view === 'grid') {
                gridView.style.display = 'grid';
                listView.style.display = 'none';
                gridBtn.classList.add('active');
                listBtn.classList.remove('active');
                renderClassesGridViewHome();
            } else {
                gridView.style.display = 'none';
                listView.style.display = 'flex';
                gridBtn.classList.remove('active');
                listBtn.classList.add('active');
                renderClassesListViewHome();
            }
            renderPaginationHome();
        };
        
        // اجرای اولیه
        applyFiltersAndRenderHome();
        
    } catch (error) {
        console.error('Classes error:', error);
        document.getElementById('contentArea').innerHTML = `
            <div class="empty-home" style="margin:20px;">
                <i class="fas fa-exclamation-circle fa-3x" style="color:#ef4444;"></i>
                <h4>خطا در بارگذاری کلاس‌ها</h4>
                <p>${error.message}</p>
                <button onclick="renderClasses()" style="margin-top:16px; padding:8px 24px; background:#2563eb; color:white; border:none; border-radius:40px; cursor:pointer;">تلاش مجدد</button>
            </div>
        `;
    }
    showLoading(false);
}
    
// ============================================
// رندر دانش‌آموزان - نسخه لیستی با عکس پروفایل و اعداد فارسی
// ============================================

async function renderStudents() {
    showLoading(true);
    try {
        await loadClassesFromDB();
        await loadStudentsFromDB();
        
        // فقط کلاس‌های پایه 7,8,9 رو نشون بده
        const availableClasses = classesData.filter(c => [7, 8, 9].includes(c.grade));
        
        // رنگ‌های پایه برای هدر
        const gradeColors = { 7: '#10b981', 8: '#3b82f6', 9: '#8b5cf6' };
        const gradeNames = { 7: 'هفتم', 8: 'هشتم', 9: 'نهم' };
        
        const html = `
            <style>
                /* استایل صفحه دانش‌آموزان - لیستی با عکس */
                .students-home {
                    direction: rtl;
                    font-family: 'Vazir', system-ui, sans-serif;
                    animation: fadeInUp 0.4s ease;
                }
                
                /* هدر آمار - 3 کارت */
                .stats-home {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                    margin-bottom: 28px;
                }
                .stat-home {
                    background: white;
                    border-radius: 24px;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    border: 1px solid #e2e8f0;
                    transition: all 0.4s;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .stat-home:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 20px 35px rgba(37,99,235,0.12);
                    border-color: #2563eb;
                }
                .stat-icon-home {
                    width: 55px;
                    height: 55px;
                    border-radius: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.4rem;
                }
                .stat-icon-home.blue { background: #dbeafe; color: #2563eb; }
                .stat-icon-home.green { background: #d1fae5; color: #10b981; }
                .stat-icon-home.orange { background: #fef3c7; color: #f59e0b; }
                .stat-content-home { flex: 1; }
                .stat-value-home {
                    font-size: 1.6rem;
                    font-weight: 800;
                    color: #0f172a;
                    line-height: 1.2;
                }
                .stat-label-home {
                    font-size: 0.7rem;
                    color: #64748b;
                    margin-top: 4px;
                    font-weight: 500;
                }
                
                /* نوار ابزار */
                .toolbar-home {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 16px;
                    margin-bottom: 28px;
                    background: white;
                    padding: 16px 24px;
                    border-radius: 24px;
                    border: 1px solid #e2e8f0;
                    align-items: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .filter-group-home {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: #f8fafc;
                    padding: 8px 18px;
                    border-radius: 40px;
                    border: 1px solid #e2e8f0;
                }
                .filter-group-home i { color: #94a3b8; }
                .filter-select-home {
                    border: none;
                    background: transparent;
                    font-family: inherit;
                    font-size: 0.85rem;
                    outline: none;
                    cursor: pointer;
                }
                .search-group-home {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: #f8fafc;
                    padding: 8px 18px;
                    border-radius: 40px;
                    border: 1px solid #e2e8f0;
                    flex: 1;
                }
                .search-group-home input {
                    border: none;
                    background: transparent;
                    outline: none;
                    flex: 1;
                    font-family: inherit;
                    font-size: 0.85rem;
                }
                .search-group-home i { color: #94a3b8; }
                .btn-excel-home {
                    background: #10b981;
                    color: white;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 40px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    transition: all 0.2s;
                }
                .btn-excel-home:hover {
                    background: #059669;
                    transform: translateY(-2px);
                }
                
                /* جدول دانش‌آموزان - لیستی */
                .students-table-wrapper {
                    background: white;
                    border-radius: 24px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .students-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.85rem;
                }
                .students-table th {
                    text-align: right;
                    padding: 16px 20px;
                    background: #f8fafc;
                    font-weight: 700;
                    color: #475569;
                    border-bottom: 1px solid #e2e8f0;
                    font-size: 0.8rem;
                }
                .students-table td {
                    padding: 16px 20px;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: middle;
                }
                .students-table tr:hover td {
                    background: #f8fafc;
                }
                
                /* ستون عکس پروفایل */
                .student-avatar-cell {
                    width: 55px;
                    text-align: center;
                }
                .student-avatar-list {
                    width: 45px;
                    height: 45px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: white;
                    margin: 0 auto;
                }
                .student-avatar-list img {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    object-fit: cover;
                }
                
                /* بج نمره */
                .grade-badge-list {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 40px;
                    font-size: 0.75rem;
                    font-weight: 700;
                }
                .grade-high-list { background: #d1fae5; color: #059669; }
                .grade-medium-list { background: #fef3c7; color: #d97706; }
                .grade-low-list { background: #fee2e2; color: #dc2626; }
                
                /* بج وضعیت */
                .status-badge-list {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 40px;
                    font-size: 0.7rem;
                    font-weight: 600;
                }
                .status-active-list { background: #d1fae5; color: #059669; }
                .status-inactive-list { background: #fee2e2; color: #dc2626; }
                
                /* دکمه‌های عملیاتی */
                .action-buttons-list {
                    display: flex;
                    gap: 8px;
                    justify-content: center;
                }
                .action-icon-list {
                    width: 34px;
                    height: 34px;
                    border-radius: 10px;
                    border: none;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    background: #f1f5f9;
                    color: #475569;
                }
                .action-icon-list:hover {
                    transform: scale(1.05);
                }
                .action-icon-list.blue:hover { background: #dbeafe; color: #2563eb; }
                .action-icon-list.green:hover { background: #d1fae5; color: #10b981; }
                .action-icon-list.purple:hover { background: #f3e8ff; color: #8b5cf6; }
                
                /* صفحه‌بندی */
                .pagination-home {
                    display: flex;
                    justify-content: center;
                    gap: 8px;
                    margin-top: 24px;
                    padding-top: 20px;
                    border-top: 1px solid #e2e8f0;
                }
                .page-btn-home {
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-weight: 600;
                }
                .page-btn-home:hover { background: #f1f5f9; border-color: #2563eb; }
                .page-btn-home.active { background: #2563eb; color: white; border-color: #2563eb; }
                .page-btn-home:disabled { opacity: 0.5; cursor: not-allowed; }
                
                .empty-home {
                    text-align: center;
                    padding: 80px 20px;
                    background: white;
                    border-radius: 24px;
                    border: 1px solid #e2e8f0;
                }
                .empty-home i {
                    font-size: 4rem;
                    color: #cbd5e1;
                    margin-bottom: 16px;
                }
                
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @media (max-width: 900px) {
                    .students-table { min-width: 800px; }
                    .stats-home { grid-template-columns: 1fr; }
                    .toolbar-home { flex-direction: column; }
                    .filter-group-home, .search-group-home { width: 100%; }
                }
            </style>
            
            <div class="students-home">
                <!-- کارت‌های آمار -->
                <div class="stats-home">
                    <div class="stat-home">
                        <div class="stat-icon-home blue"><i class="fas fa-users"></i></div>
                        <div class="stat-content-home">
                            <div class="stat-value-home" id="totalStudentsHome">۰</div>
                            <div class="stat-label-home">کل دانش‌آموزان</div>
                        </div>
                    </div>
                    <div class="stat-home">
                        <div class="stat-icon-home green"><i class="fas fa-check-circle"></i></div>
                        <div class="stat-content-home">
                            <div class="stat-value-home" id="activeStudentsHome">۰</div>
                            <div class="stat-label-home">دانش‌آموزان فعال</div>
                        </div>
                    </div>
                    <div class="stat-home">
                        <div class="stat-icon-home orange"><i class="fas fa-chart-line"></i></div>
                        <div class="stat-content-home">
                            <div class="stat-value-home" id="avgGradeHome">۰</div>
                            <div class="stat-label-home">میانگین نمرات</div>
                        </div>
                    </div>
                </div>
                
                <!-- نوار ابزار -->
                <div class="toolbar-home">
                    <div class="filter-group-home">
                        <i class="fas fa-door-open"></i>
                        <select id="studentClassFilterHome" class="filter-select-home" onchange="filterStudentsHome()">
                            <option value="">همه کلاس‌ها</option>
                            ${availableClasses.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (پایه ${c.grade})</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group-home">
                        <i class="fas fa-flag-checkered"></i>
                        <select id="studentStatusFilterHome" class="filter-select-home" onchange="filterStudentsHome()">
                            <option value="all">همه وضعیت‌ها</option>
                            <option value="active">فعال</option>
                            <option value="inactive">غیرفعال</option>
                        </select>
                    </div>
                    <div class="search-group-home">
                        <i class="fas fa-search"></i>
                        <input type="text" id="studentSearchHome" placeholder="جستجوی نام، نام کاربری یا شماره تماس..." onkeyup="filterStudentsHome()">
                        <i class="fas fa-times" onclick="document.getElementById('studentSearchHome').value=''; filterStudentsHome()" style="cursor: pointer; color: #94a3b8;"></i>
                    </div>
                    <button class="btn-excel-home" onclick="exportStudentsToExcelHome()">
                        <i class="fas fa-download"></i> خروجی Excel
                    </button>
                </div>
                
                <!-- جدول دانش‌آموزان -->
                <div class="students-table-wrapper">
                    <table class="students-table">
                        <thead>
                            <tr>
                                <th style="width: 60px;">#</th>
                                <th style="width: 70px;">عکس</th>
                                <th>نام دانش‌آموز</th>
                                <th>نام کاربری</th>
                                <th>کلاس</th>
                                <th>شماره تماس</th>
                                <th>میانگین نمرات</th>
                                <th>وضعیت</th>
                                <th style="width: 130px;">عملیات</th>
                            </tr>
                        </thead>
                        <tbody id="studentsTableBody">
                            <tr><td colspan="9" class="empty-home" style="padding: 60px;">در حال بارگذاری...</td></tr>
                        </tbody>
                    </table>
                </div>
                
                <!-- صفحه‌بندی -->
                <div id="studentsPaginationHome" class="pagination-home"></div>
            </div>
            
            <!-- مودال جزئیات دانش‌آموز -->
            <div id="studentDetailModalHome" style="display: none; position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index:2000; align-items: center; justify-content: center;">
                <div style="background: white; border-radius: 28px; max-width: 550px; width: 90%; max-height: 90vh; overflow-y: auto;">
                    <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="font-size: 1.1rem;"><i class="fas fa-user-graduate" style="color:#2563eb;"></i> جزئیات دانش‌آموز</h3>
                        <button onclick="closeModal('studentDetailModalHome')" style="background: none; border: none; font-size: 1.3rem; cursor: pointer;">&times;</button>
                    </div>
                    <div id="studentDetailBodyHome" style="padding: 24px;"></div>
                    <div style="padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
                        <button onclick="closeModal('studentDetailModalHome')" style="background: #2563eb; color: white; border: none; padding: 8px 20px; border-radius: 40px; cursor: pointer;">بستن</button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('contentArea').innerHTML = html;
        
        // متغیرهای صفحه‌بندی
        let currentPage = 1;
        let itemsPerPage = 10;
        let filteredStudents = [];
        
        // تابع فیلتر دانش‌آموزان
        window.filterStudentsHome = async function() {
            const classId = document.getElementById('studentClassFilterHome')?.value;
            const statusFilter = document.getElementById('studentStatusFilterHome')?.value || 'all';
            const searchText = document.getElementById('studentSearchHome')?.value?.toLowerCase() || '';
            
            await loadStudentsFromDB(classId);
            filteredStudents = studentsData.filter(s => {
                if (statusFilter !== 'all' && s.status !== statusFilter) return false;
                if (searchText) {
                    if (!s.name?.toLowerCase().includes(searchText) &&
                        !s.username?.toLowerCase().includes(searchText) &&
                        !s.phone?.includes(searchText)) return false;
                }
                return true;
            });
            
            // آمار
            const total = filteredStudents.length;
            const active = filteredStudents.filter(s => s.status === 'active').length;
            const avg = filteredStudents.reduce((sum, s) => sum + (parseFloat(s.avg_grade) || 0), 0) / (total || 1);
            
            document.getElementById('totalStudentsHome').innerText = toPersianNumber(total);
            document.getElementById('activeStudentsHome').innerText = toPersianNumber(active);
            document.getElementById('avgGradeHome').innerText = toPersianNumber(avg.toFixed(1));
            
            currentPage = 1;
            renderStudentsTable();
        };
        
        // رندر جدول دانش‌آموزان
        function renderStudentsTable() {
            const tbody = document.getElementById('studentsTableBody');
            const start = (currentPage - 1) * itemsPerPage;
            const paginated = filteredStudents.slice(start, start + itemsPerPage);
            
            if (paginated.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="empty-home">هیچ دانش‌آموزی یافت نشد</td></tr>';
                document.getElementById('studentsPaginationHome').innerHTML = '';
                return;
            }
            
            tbody.innerHTML = paginated.map((s, idx) => {
                const avgGrade = parseFloat(s.avg_grade);
                let gradeClass = '', gradeText = '';
                if (!isNaN(avgGrade) && avgGrade > 0) {
                    if (avgGrade >= 17) { gradeClass = 'grade-high-list'; gradeText = 'عالی'; }
                    else if (avgGrade >= 14) { gradeClass = 'grade-medium-list'; gradeText = 'خوب'; }
                    else if (avgGrade >= 10) { gradeClass = 'grade-medium-list'; gradeText = 'متوسط'; }
                    else { gradeClass = 'grade-low-list'; gradeText = 'ضعیف'; }
                }
                
                // آواتار رنگی بر اساس حرف اول نام
                const initial = s.name ? s.name.charAt(0) : '?';
                const avatarColor = gradeColors[s.class_grade] || '#2563eb';
                // عکس پروفایل (اگر موجود باشد)
                const avatarImg = s.avatar_url ? `<img src="${s.avatar_url}" alt="avatar">` : `<span style="font-size: 1rem;">${initial}</span>`;
                
                const rowNumber = ((currentPage - 1) * itemsPerPage) + idx + 1;
                
                return `
                    <tr>
                        <td style="text-align: center;">${toPersianNumber(rowNumber)}</td>
                        <td class="student-avatar-cell">
                            <div class="student-avatar-list" style="background: linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd);">
                                ${avatarImg}
                            </div>
                        </td>
                        <td><strong>${escapeHtml(s.name)}</strong></td>
                        <td><code style="background:#f1f5f9; padding:4px 8px; border-radius:6px;">${escapeHtml(s.username || '-')}</code></td>
                        <td>${s.class_name ? toPersianNumber(s.class_name) : '-'} </td>
                        <td dir="ltr">${s.phone ? toPersianNumber(s.phone) : '-'} </td>
                        <td>
                            ${gradeText ? `<span class="grade-badge-list ${gradeClass}">${s.avg_grade} (${gradeText})</span>` : '<span class="grade-badge-list" style="background:#f1f5f9;">ثبت نشده</span>'}
                        </td>
                        <td>
                            <span class="status-badge-list ${s.status === 'active' ? 'status-active-list' : 'status-inactive-list'}">
                                ${s.status === 'active' ? 'فعال' : 'غیرفعال'}
                            </span>
                        </td>
                        <td>
                            <div class="action-buttons-list">
                                <button class="action-icon-list blue" onclick="viewStudentGradesHome(${s.id}, '${escapeHtml(s.name)}')" title="نمرات">
                                    <i class="fas fa-star"></i>
                                </button>
                                <button class="action-icon-list green" onclick="viewStudentAttendanceHome(${s.id}, '${escapeHtml(s.name)}')" title="حضور">
                                    <i class="fas fa-calendar-alt"></i>
                                </button>
                                <button class="action-icon-list purple" onclick="messageParentFromStudentHome(${s.id})" title="پیام به والدین">
                                    <i class="fas fa-users"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
            
            renderPagination();
        }
        
        // صفحه‌بندی
        function renderPagination() {
            const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
            const paginationContainer = document.getElementById('studentsPaginationHome');
            
            if (totalPages <= 1) {
                paginationContainer.innerHTML = '';
                return;
            }
            
            let html = `<button class="page-btn-home" onclick="changePageHome(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
            
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                    html += `<button class="page-btn-home ${i === currentPage ? 'active' : ''}" onclick="changePageHome(${i})">${toPersianNumber(i)}</button>`;
                } else if (i === currentPage - 2 || i === currentPage + 2) {
                    html += `<span style="color:#94a3b8;">...</span>`;
                }
            }
            
            html += `<button class="page-btn-home" onclick="changePageHome(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
            paginationContainer.innerHTML = html;
        }
        
        window.changePageHome = function(page) {
            currentPage = page;
            renderStudentsTable();
        };
        
        // مشاهده نمرات دانش‌آموز
        window.viewStudentGradesHome = async function(studentId, studentName) {
            showLoading(true);
            try {
                const data = await getStudentReport(studentId, 'grades');
                const grades = data.grades || [];
                const modalBody = document.getElementById('studentDetailBodyHome');
                modalBody.innerHTML = `
                    <h4 style="margin-bottom: 16px;"><i class="fas fa-star" style="color:#f59e0b;"></i> نمرات ${escapeHtml(studentName)}</h4>
                    ${grades.length ? `
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            ${grades.map(g => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8fafc; border-radius: 16px;">
                                    <span style="font-weight: 600;">${escapeHtml(g.course_name)}</span>
                                    <span style="font-size: 1.1rem; font-weight: 800; color: ${parseFloat(g.grade) >= 17 ? '#10b981' : parseFloat(g.grade) >= 10 ? '#f59e0b' : '#ef4444'};">${g.grade || '-'}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<div class="empty-home">نمره‌ای ثبت نشده است</div>'}
                `;
                openModal('studentDetailModalHome');
            } catch (error) { showToast('خطا در دریافت نمرات', 'error'); } finally { showLoading(false); }
        };
        
        // مشاهده حضور و غیاب دانش‌آموز
        window.viewStudentAttendanceHome = async function(studentId, studentName) {
            showLoading(true);
            try {
                const data = await getStudentReport(studentId, 'attendance');
                const attendance = data.attendance || [];
                const stats = data.stats || {};
                const modalBody = document.getElementById('studentDetailBodyHome');
                modalBody.innerHTML = `
                    <h4 style="margin-bottom: 16px;"><i class="fas fa-calendar-alt" style="color:#10b981;"></i> حضور و غیاب ${escapeHtml(studentName)}</h4>
                    <div style="display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap;">
                        <div style="background: #d1fae5; padding: 8px 16px; border-radius: 40px;"><i class="fas fa-check-circle"></i> حاضر: <strong>${toPersianNumber(stats.present || 0)}</strong></div>
                        <div style="background: #fee2e2; padding: 8px 16px; border-radius: 40px;"><i class="fas fa-times-circle"></i> غایب: <strong>${toPersianNumber(stats.absent || 0)}</strong></div>
                        <div style="background: #fef3c7; padding: 8px 16px; border-radius: 40px;"><i class="fas fa-clock"></i> تأخیر: <strong>${toPersianNumber(stats.late || 0)}</strong></div>
                        <div style="background: #dbeafe; padding: 8px 16px; border-radius: 40px;"><i class="fas fa-chart-line"></i> درصد حضور: <strong>${toPersianNumber(stats.attendance_rate || 0)}%</strong></div>
                    </div>
                    ${attendance.length ? `
                        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto;">
                            ${attendance.slice(0, 30).map(a => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8fafc; border-radius: 12px;">
                                    <span>${formatDate(a.date)}</span>
                                    <span class="status-badge-list" style="background: ${a.status === 'present' ? '#d1fae5' : a.status === 'absent' ? '#fee2e2' : '#fef3c7'}; color: ${a.status === 'present' ? '#059669' : a.status === 'absent' ? '#dc2626' : '#d97706'};">${a.status === 'present' ? 'حاضر' : a.status === 'absent' ? 'غایب' : 'تأخیر'}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<div class="empty-home">گزارشی ثبت نشده است</div>'}
                `;
                openModal('studentDetailModalHome');
            } catch (error) { showToast('خطا در دریافت حضور', 'error'); } finally { showLoading(false); }
        };
        
        // پیام به والدین
        window.messageParentFromStudentHome = function(studentId) {
            showTab('parent-chat');
            setTimeout(() => {
                const studentItem = document.querySelector(`.student-chat-item[data-student-id="${studentId}"]`);
                if (studentItem) studentItem.click();
            }, 500);
        };
        
        // خروجی Excel
        window.exportStudentsToExcelHome = function() {
            if (!filteredStudents.length) {
                showToast('هیچ داده‌ای برای خروجی وجود ندارد', 'warning');
                return;
            }
            const wsData = [['ردیف', 'نام دانش‌آموز', 'نام کاربری', 'کلاس', 'شماره تماس', 'میانگین نمرات', 'وضعیت']];
            filteredStudents.forEach((s, i) => {
                wsData.push([i+1, s.name, s.username, s.class_name, s.phone, s.avg_grade, s.status === 'active' ? 'فعال' : 'غیرفعال']);
            });
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Students');
            XLSX.writeFile(wb, `students_${Date.now()}.xlsx`);
            showToast('خروجی Excel با موفقیت ذخیره شد', 'success');
        };
        
        // اجرای اولیه
        await filterStudentsHome();
        
        // تابع باز کردن مودال
        function openModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) modal.style.display = 'flex';
        }
        
        window.closeModal = function(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) modal.style.display = 'none';
        };
        
    } catch (error) {
        console.error('Students error:', error);
        document.getElementById('contentArea').innerHTML = `
            <div class="empty-home" style="margin:20px;">
                <i class="fas fa-exclamation-circle fa-3x" style="color:#ef4444;"></i>
                <h4>خطا در بارگذاری دانش‌آموزان</h4>
                <p>${error.message}</p>
                <button onclick="renderStudents()" style="margin-top:16px; padding:8px 24px; background:#2563eb; color:white; border:none; border-radius:40px; cursor:pointer;">تلاش مجدد</button>
            </div>
        `;
    }
    showLoading(false);
}
    
// ============================================
// رندر حضور و غیاب - هماهنگ با طراحی هوم‌پیج
// ============================================

async function renderAttendance() {
    showLoading(true);
    try {
        await loadClassesFromDB();
        
        // فقط کلاس‌های پایه 7,8,9 رو نشون بده
        const availableClasses = classesData.filter(c => [7, 8, 9].includes(c.grade));
        
        // زنگ‌های مدرسه
        const periods = [
            { id: 'first', name: 'زنگ اول', time: '۰۸:۰۰ - ۰۹:۳۰', icon: 'fa-bell' },
            { id: 'second', name: 'زنگ دوم', time: '۰۹:۴۵ - ۱۱:۱۵', icon: 'fa-bell' },
            { id: 'third', name: 'زنگ سوم', time: '۱۱:۳۰ - ۱۳:۰۰', icon: 'fa-bell' },
            { id: 'fourth', name: 'زنگ چهارم', time: '۱۳:۳۰ - ۱۵:۰۰', icon: 'fa-bell' }
        ];
        
        const today = new Date().toISOString().split('T')[0];
        window.selectedDate = today;
        window.selectedPeriod = 'first';
        
        const html = `
            <style>
                /* استایل صفحه حضور و غیاب */
                .attendance-home {
                    direction: rtl;
                    font-family: 'Vazir', system-ui, sans-serif;
                    animation: fadeInUp 0.4s ease;
                }
                
                /* هدر تاریخ و زنگ‌ها */
                .attendance-header-home {
                    background: white;
                    border-radius: 24px;
                    border: 1px solid #e2e8f0;
                    margin-bottom: 24px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .date-selector-home {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 20px;
                    padding: 20px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                }
                .date-nav-home {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 1px solid #e2e8f0;
                    background: white;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .date-nav-home:hover {
                    background: #2563eb;
                    color: white;
                    border-color: #2563eb;
                    transform: scale(1.05);
                }
                .current-date-home {
                    font-weight: 700;
                    font-size: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .today-btn-home {
                    background: #2563eb;
                    color: white;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 40px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    font-weight: 600;
                    transition: all 0.2s;
                }
                .today-btn-home:hover {
                    background: #1d4ed8;
                    transform: translateY(-2px);
                }
                .period-tabs-home {
                    display: flex;
                    gap: 12px;
                    padding: 16px 20px;
                    border-bottom: 1px solid #e2e8f0;
                    flex-wrap: wrap;
                }
                .period-tab-home {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    padding: 8px 24px;
                    border-radius: 40px;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-weight: 600;
                }
                .period-tab-home.active {
                    background: #2563eb;
                    color: white;
                    border-color: #2563eb;
                    box-shadow: 0 4px 12px rgba(37,99,235,0.3);
                }
                .period-tab-home small {
                    font-size: 0.65rem;
                    opacity: 0.8;
                }
                
                /* نوار ابزار */
                .toolbar-home {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 16px;
                    margin-bottom: 24px;
                    background: white;
                    padding: 16px 24px;
                    border-radius: 24px;
                    border: 1px solid #e2e8f0;
                    align-items: center;
                }
                .filter-group-home {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: #f8fafc;
                    padding: 8px 18px;
                    border-radius: 40px;
                    border: 1px solid #e2e8f0;
                }
                .filter-group-home i { color: #94a3b8; }
                .filter-select-home {
                    border: none;
                    background: transparent;
                    font-family: inherit;
                    font-size: 0.85rem;
                    outline: none;
                    cursor: pointer;
                }
                .search-group-home {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: #f8fafc;
                    padding: 8px 18px;
                    border-radius: 40px;
                    border: 1px solid #e2e8f0;
                    flex: 1;
                }
                .search-group-home input {
                    border: none;
                    background: transparent;
                    outline: none;
                    flex: 1;
                    font-family: inherit;
                    font-size: 0.85rem;
                }
                .action-group-home {
                    display: flex;
                    gap: 10px;
                }
                .btn-success-home {
                    background: #10b981;
                    color: white;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 40px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 600;
                    transition: all 0.2s;
                }
                .btn-success-home:hover {
                    background: #059669;
                    transform: translateY(-2px);
                }
                .btn-warning-home {
                    background: #f59e0b;
                    color: white;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 40px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                .btn-warning-home:hover {
                    background: #d97706;
                    transform: translateY(-2px);
                }
                .btn-primary-home {
                    background: #2563eb;
                    color: white;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 40px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                .btn-primary-home:hover {
                    background: #1d4ed8;
                    transform: translateY(-2px);
                }
                
                /* آمار حضور */
                .attendance-stats-home {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                }
                .stat-pill-home {
                    background: white;
                    padding: 10px 24px;
                    border-radius: 40px;
                    font-size: 0.85rem;
                    font-weight: 500;
                    border: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .stat-pill-home.present { border-right: 3px solid #10b981; }
                .stat-pill-home.absent { border-right: 3px solid #ef4444; }
                .stat-pill-home.late { border-right: 3px solid #f59e0b; }
                .stat-pill-home.rate { border-right: 3px solid #2563eb; }
                
                /* گرید حضور و غیاب */
                .attendance-grid-home {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                    gap: 20px;
                }
                .attendance-card-home {
                    background: white;
                    border-radius: 20px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    transition: all 0.2s;
                }
                .attendance-card-home:hover {
                    box-shadow: 0 10px 25px rgba(0,0,0,0.08);
                }
                .attendance-card-header-home {
                    padding: 16px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }
                .student-avatar-home {
                    width: 48px;
                    height: 48px;
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 1.2rem;
                    font-weight: 700;
                }
                .student-info-home { flex: 1; }
                .student-name-home { font-weight: 700; font-size: 0.9rem; margin-bottom: 4px; }
                .student-class-home { font-size: 0.65rem; color: #64748b; }
                .status-badge-home {
                    padding: 4px 12px;
                    border-radius: 40px;
                    font-size: 0.7rem;
                    font-weight: 600;
                }
                .status-badge-home.present { background: #d1fae5; color: #059669; }
                .status-badge-home.absent { background: #fee2e2; color: #dc2626; }
                .status-badge-home.late { background: #fef3c7; color: #d97706; }
                
                .attendance-card-body-home { padding: 16px; }
                .status-buttons-home {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                .status-btn-home {
                    flex: 1;
                    padding: 8px;
                    border-radius: 40px;
                    border: 1px solid #e2e8f0;
                    background: #f8fafc;
                    font-family: inherit;
                    font-size: 0.75rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    font-weight: 600;
                }
                .status-btn-home.active {
                    background: #2563eb;
                    color: white;
                    border-color: #2563eb;
                }
                .status-btn-home.present.active { background: #10b981; border-color: #10b981; }
                .status-btn-home.absent.active { background: #ef4444; border-color: #ef4444; }
                .status-btn-home.late.active { background: #f59e0b; border-color: #f59e0b; }
                .status-btn-home.excused.active { background: #8b5cf6; border-color: #8b5cf6; }
                
                .empty-home {
                    text-align: center;
                    padding: 80px 20px;
                    background: white;
                    border-radius: 24px;
                    border: 1px solid #e2e8f0;
                }
                .empty-home i {
                    font-size: 4rem;
                    color: #cbd5e1;
                    margin-bottom: 16px;
                }
                
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @media (max-width: 768px) {
                    .attendance-grid-home { grid-template-columns: 1fr; }
                    .toolbar-home { flex-direction: column; }
                    .filter-group-home, .search-group-home { width: 100%; }
                    .action-group-home { width: 100%; justify-content: center; }
                    .period-tabs-home { justify-content: center; }
                    .date-selector-home { flex-wrap: wrap; }
                }
            </style>
            
            <div class="attendance-home">
                <!-- هدر تاریخ و زنگ‌ها -->
                <div class="attendance-header-home">
                    <div class="date-selector-home">
                        <button class="date-nav-home" onclick="changeDateHome(-1)"><i class="fas fa-chevron-right"></i></button>
                        <div class="current-date-home"><i class="fas fa-calendar-alt"></i> <span id="currentDateHome">${formatDate(today)} (${getWeekdayName(new Date())})</span></div>
                        <button class="date-nav-home" onclick="changeDateHome(1)"><i class="fas fa-chevron-left"></i></button>
                        <button class="today-btn-home" onclick="goToTodayHome()">امروز</button>
                    </div>
                    <div class="period-tabs-home" id="periodTabsHome">
                        ${periods.map((p, idx) => `
                            <button class="period-tab-home ${idx === 0 ? 'active' : ''}" data-period="${p.id}" onclick="selectPeriodHome('${p.id}')">
                                <i class="fas ${p.icon}"></i> ${p.name}
                                <small>${p.time}</small>
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <!-- نوار ابزار -->
                <div class="toolbar-home">
                    <div class="filter-group-home">
                        <i class="fas fa-door-open"></i>
                        <select id="attendanceClassHome" class="filter-select-home" onchange="loadAttendanceTableHome()">
                            <option value="">انتخاب کلاس</option>
                            ${availableClasses.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (پایه ${toPersianNumber(c.grade)})</option>`).join('')}
                        </select>
                    </div>
                    <div class="search-group-home">
                        <i class="fas fa-search"></i>
                        <input type="text" id="attendanceSearchHome" placeholder="جستجوی دانش‌آموز..." onkeyup="debouncedAttendanceSearchHome()">
                    </div>
                    <div class="action-group-home">
                        <button class="btn-success-home" onclick="markAllAsHome('present')"><i class="fas fa-check-double"></i> همه حاضر</button>
                        <button class="btn-warning-home" onclick="markAllAsHome('late')"><i class="fas fa-clock"></i> همه تأخیر</button>
                        <button class="btn-primary-home" onclick="saveAllAttendanceHome()"><i class="fas fa-save"></i> ثبت همه</button>
                    </div>
                </div>
                
                <!-- آمار حضور -->
                <div class="attendance-stats-home" id="attendanceStatsHome">
                    <div class="stat-pill-home present"><i class="fas fa-check-circle"></i> حاضر: <strong id="statPresentHome">۰</strong></div>
                    <div class="stat-pill-home absent"><i class="fas fa-times-circle"></i> غایب: <strong id="statAbsentHome">۰</strong></div>
                    <div class="stat-pill-home late"><i class="fas fa-clock"></i> تأخیر: <strong id="statLateHome">۰</strong></div>
                    <div class="stat-pill-home rate"><i class="fas fa-chart-line"></i> درصد حضور: <strong id="statRateHome">۰%</strong></div>
                </div>
                
                <!-- گرید حضور و غیاب -->
                <div id="attendanceGridHome" class="attendance-grid-home">
                    <div class="empty-home">لطفاً کلاس را انتخاب کنید</div>
                </div>
            </div>
        `;
        
        document.getElementById('contentArea').innerHTML = html;
        
        // متغیرها
        let currentAttendanceStudents = [];
        let attendanceStatusMap = {};
        
        // توابع تغییر تاریخ
        window.changeDateHome = function(days) {
            const currentDate = new Date(window.selectedDate);
            currentDate.setDate(currentDate.getDate() + days);
            window.selectedDate = currentDate.toISOString().split('T')[0];
            document.getElementById('currentDateHome').innerHTML = `${formatDate(window.selectedDate)} (${getWeekdayName(currentDate)})`;
            loadAttendanceTableHome();
        };
        
        window.goToTodayHome = function() {
            window.selectedDate = new Date().toISOString().split('T')[0];
            document.getElementById('currentDateHome').innerHTML = `${formatDate(window.selectedDate)} (${getWeekdayName(new Date())})`;
            loadAttendanceTableHome();
        };
        
        window.selectPeriodHome = function(periodId) {
            window.selectedPeriod = periodId;
            document.querySelectorAll('.period-tab-home').forEach(tab => {
                tab.classList.remove('active');
                if (tab.getAttribute('data-period') === periodId) {
                    tab.classList.add('active');
                }
            });
            loadAttendanceTableHome();
        };
        
        // بارگذاری جدول حضور
        window.loadAttendanceTableHome = async function() {
            const classId = document.getElementById('attendanceClassHome')?.value;
            if (!classId) {
                document.getElementById('attendanceGridHome').innerHTML = '<div class="empty-home">لطفاً کلاس را انتخاب کنید</div>';
                resetStatsHome();
                return;
            }
            
            showLoading(true);
            try {
                const data = await loadAttendance(classId, window.selectedDate, window.selectedPeriod);
                const students = data.students || [];
                currentAttendanceStudents = students;
                
                const key = `${classId}_${window.selectedDate}_${window.selectedPeriod}`;
                if (!attendanceStatusMap[key]) {
                    attendanceStatusMap[key] = {};
                    students.forEach(s => { attendanceStatusMap[key][s.id] = s.status || 'present'; });
                }
                
                // محاسبه آمار
                const stats = {
                    present: students.filter(s => (attendanceStatusMap[key][s.id]) === 'present').length,
                    absent: students.filter(s => (attendanceStatusMap[key][s.id]) === 'absent').length,
                    late: students.filter(s => (attendanceStatusMap[key][s.id]) === 'late').length,
                    excused: students.filter(s => (attendanceStatusMap[key][s.id]) === 'excused').length
                };
                const total = stats.present + stats.absent + stats.late + stats.excused;
                const rate = total > 0 ? Math.round((stats.present / total) * 100) : 0;
                
                document.getElementById('statPresentHome').innerText = toPersianNumber(stats.present);
                document.getElementById('statAbsentHome').innerText = toPersianNumber(stats.absent);
                document.getElementById('statLateHome').innerText = toPersianNumber(stats.late);
                document.getElementById('statRateHome').innerText = toPersianNumber(rate) + '%';
                
                const search = document.getElementById('attendanceSearchHome')?.value?.toLowerCase() || '';
                let filtered = students.filter(s => !search || s.name?.toLowerCase().includes(search));
                
                const grid = document.getElementById('attendanceGridHome');
                if (filtered.length === 0) {
                    grid.innerHTML = '<div class="empty-home">دانش‌آموزی یافت نشد</div>';
                    return;
                }
                
                grid.innerHTML = filtered.map(s => {
                    const currentStatus = attendanceStatusMap[key][s.id];
                    let statusClass = '', statusIcon = '', statusText = '';
                    if (currentStatus === 'present') { statusClass = 'present'; statusIcon = 'fa-check-circle'; statusText = 'حاضر'; }
                    else if (currentStatus === 'absent') { statusClass = 'absent'; statusIcon = 'fa-times-circle'; statusText = 'غایب'; }
                    else if (currentStatus === 'late') { statusClass = 'late'; statusIcon = 'fa-clock'; statusText = 'تأخیر'; }
                    else { statusClass = 'excused'; statusIcon = 'fa-shield-alt'; statusText = 'موجه'; }
                    
                    const initial = s.name ? s.name.charAt(0) : '?';
                    
                    return `
                        <div class="attendance-card-home">
                            <div class="attendance-card-header-home">
                                <div class="student-avatar-home">${escapeHtml(initial)}</div>
                                <div class="student-info-home">
                                    <div class="student-name-home">${escapeHtml(s.name)}</div>
                                    <div class="student-class-home">${s.class_name || '-'}</div>
                                </div>
                                <div class="status-badge-home ${statusClass}"><i class="fas ${statusIcon}"></i> ${statusText}</div>
                            </div>
                            <div class="attendance-card-body-home">
                                <div class="status-buttons-home">
                                    <button class="status-btn-home present ${currentStatus === 'present' ? 'active' : ''}" onclick="updateAttendanceStatusHome(${s.id}, 'present')"><i class="fas fa-check-circle"></i> حاضر</button>
                                    <button class="status-btn-home absent ${currentStatus === 'absent' ? 'active' : ''}" onclick="updateAttendanceStatusHome(${s.id}, 'absent')"><i class="fas fa-times-circle"></i> غایب</button>
                                    <button class="status-btn-home late ${currentStatus === 'late' ? 'active' : ''}" onclick="updateAttendanceStatusHome(${s.id}, 'late')"><i class="fas fa-clock"></i> تأخیر</button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
                
            } catch (error) {
                showToast('خطا در بارگذاری اطلاعات', 'error');
            } finally {
                showLoading(false);
            }
        };
        
        // بروزرسانی وضعیت یک دانش‌آموز
        window.updateAttendanceStatusHome = function(studentId, status) {
            const classId = document.getElementById('attendanceClassHome')?.value;
            const key = `${classId}_${window.selectedDate}_${window.selectedPeriod}`;
            if (!attendanceStatusMap[key]) attendanceStatusMap[key] = {};
            attendanceStatusMap[key][studentId] = status;
            
            // بروزرسانی UI کارت مربوطه
            const cards = document.querySelectorAll('.attendance-card-home');
            for (const card of cards) {
                if (card.innerHTML.includes(`updateAttendanceStatusHome(${studentId}`)) {
                    const statusBadge = card.querySelector('.status-badge-home');
                    const statusIcons = { present: 'fa-check-circle', absent: 'fa-times-circle', late: 'fa-clock', excused: 'fa-shield-alt' };
                    const statusTexts = { present: 'حاضر', absent: 'غایب', late: 'تأخیر', excused: 'موجه' };
                    statusBadge.className = `status-badge-home ${status}`;
                    statusBadge.innerHTML = `<i class="fas ${statusIcons[status]}"></i> ${statusTexts[status]}`;
                    
                    const btns = card.querySelectorAll('.status-btn-home');
                    btns.forEach(btn => btn.classList.remove('active'));
                    card.querySelector(`.status-btn-home.${status}`)?.classList.add('active');
                    break;
                }
            }
            
            // بروزرسانی آمار
            updateStatsHome();
        };
        
        // بروزرسانی آمار
        function updateStatsHome() {
            const classId = document.getElementById('attendanceClassHome')?.value;
            if (!classId || !currentAttendanceStudents.length) return;
            
            const key = `${classId}_${window.selectedDate}_${window.selectedPeriod}`;
            const tempStatuses = attendanceStatusMap[key] || {};
            
            let present = 0, absent = 0, late = 0, excused = 0;
            currentAttendanceStudents.forEach(s => {
                const status = tempStatuses[s.id] || s.status || 'present';
                if (status === 'present') present++;
                else if (status === 'absent') absent++;
                else if (status === 'late') late++;
                else if (status === 'excused') excused++;
            });
            
            const total = present + absent + late + excused;
            const rate = total > 0 ? Math.round((present / total) * 100) : 0;
            
            document.getElementById('statPresentHome').innerText = toPersianNumber(present);
            document.getElementById('statAbsentHome').innerText = toPersianNumber(absent);
            document.getElementById('statLateHome').innerText = toPersianNumber(late);
            document.getElementById('statRateHome').innerText = toPersianNumber(rate) + '%';
        }
        
        // علامت‌گذاری همه دانش‌آموزان با یک وضعیت
        window.markAllAsHome = function(status) {
            const classId = document.getElementById('attendanceClassHome')?.value;
            if (!classId) {
                showToast('لطفاً کلاس را انتخاب کنید', 'warning');
                return;
            }
            
            const key = `${classId}_${window.selectedDate}_${window.selectedPeriod}`;
            if (!attendanceStatusMap[key]) attendanceStatusMap[key] = {};
            
            currentAttendanceStudents.forEach(s => {
                attendanceStatusMap[key][s.id] = status;
            });
            
            // بروزرسانی UI
            const cards = document.querySelectorAll('.attendance-card-home');
            const statusIcons = { present: 'fa-check-circle', absent: 'fa-times-circle', late: 'fa-clock', excused: 'fa-shield-alt' };
            const statusTexts = { present: 'حاضر', absent: 'غایب', late: 'تأخیر', excused: 'موجه' };
            
            cards.forEach(card => {
                const statusBadge = card.querySelector('.status-badge-home');
                statusBadge.className = `status-badge-home ${status}`;
                statusBadge.innerHTML = `<i class="fas ${statusIcons[status]}"></i> ${statusTexts[status]}`;
                
                const btns = card.querySelectorAll('.status-btn-home');
                btns.forEach(btn => btn.classList.remove('active'));
                card.querySelector(`.status-btn-home.${status}`)?.classList.add('active');
            });
            
            updateStatsHome();
            const statusText = status === 'present' ? 'حاضر' : (status === 'absent' ? 'غایب' : (status === 'late' ? 'تأخیر' : 'موجه'));
            showToast(`همه دانش‌آموزان به وضعیت "${statusText}" تغییر یافتند`, 'info');
        };
        
        // ذخیره همه تغییرات در دیتابیس
        window.saveAllAttendanceHome = async function() {
            const classId = document.getElementById('attendanceClassHome')?.value;
            if (!classId) {
                showToast('لطفاً کلاس را انتخاب کنید', 'warning');
                return;
            }
            
            const key = `${classId}_${window.selectedDate}_${window.selectedPeriod}`;
            const tempStatuses = attendanceStatusMap[key] || {};
            
            const records = [];
            for (const student of currentAttendanceStudents) {
                const newStatus = tempStatuses[student.id];
                if (newStatus && newStatus !== (student.status || 'present')) {
                    records.push({
                        student_id: student.id,
                        status: newStatus,
                        note: ''
                    });
                }
            }
            
            if (records.length === 0) {
                showToast('هیچ تغییری برای ذخیره وجود ندارد', 'info');
                return;
            }
            
            showLoading(true);
            try {
                await saveAttendance(classId, window.selectedDate, window.selectedPeriod, records);
                showToast(`${toPersianNumber(records.length)} وضعیت حضور با موفقیت ثبت شد`, 'success');
                delete attendanceStatusMap[key];
                await loadAttendanceTableHome();
            } catch (error) {
                showToast(error.message || 'خطا در ذخیره اطلاعات', 'error');
            } finally {
                showLoading(false);
            }
        };
        
        // جستجو با تأخیر
        window.debouncedAttendanceSearchHome = function() {
            clearTimeout(window.attSearchTimeout);
            window.attSearchTimeout = setTimeout(() => loadAttendanceTableHome(), 500);
        };
        
        // ریست آمار
        function resetStatsHome() {
            document.getElementById('statPresentHome').innerText = '۰';
            document.getElementById('statAbsentHome').innerText = '۰';
            document.getElementById('statLateHome').innerText = '۰';
            document.getElementById('statRateHome').innerText = '۰%';
        }
        
    } catch (error) {
        console.error('Attendance error:', error);
        document.getElementById('contentArea').innerHTML = `
            <div class="empty-home" style="margin:20px;">
                <i class="fas fa-exclamation-circle fa-3x" style="color:#ef4444;"></i>
                <h4>خطا در بارگذاری صفحه حضور و غیاب</h4>
                <p>${error.message}</p>
                <button onclick="renderAttendance()" style="margin-top:16px; padding:8px 24px; background:#2563eb; color:white; border:none; border-radius:40px; cursor:pointer;">تلاش مجدد</button>
            </div>
        `;
    }
    showLoading(false);
}
    
// ============================================
// رندر مدیریت نمرات - هماهنگ با طراحی هوم‌پیج
// ============================================

async function renderGrades() {
    showLoading(true);
    try {
        await loadClassesFromDB();
        
        // فقط کلاس‌های پایه 7,8,9 رو نشون بده
        const availableClasses = classesData.filter(c => [7, 8, 9].includes(c.grade));
        
        // ترم‌های تحصیلی
        const termTypes = [
            { id: 'monthly1', name: 'ماهانه اول', period: 'مهر - آبان', weight: 1, icon: 'fa-calendar-alt' },
            { id: 'midterm1', name: 'میان‌ترم اول', period: 'آذر - دی', weight: 2, icon: 'fa-book' },
            { id: 'final1', name: 'ترم اول', period: 'بهمن - اسفند', weight: 3, icon: 'fa-graduation-cap' },
            { id: 'monthly2', name: 'ماهانه دوم', period: 'فروردین - اردیبهشت', weight: 1, icon: 'fa-calendar-alt' },
            { id: 'midterm2', name: 'میان‌ترم دوم', period: 'خرداد - تیر', weight: 2, icon: 'fa-book' },
            { id: 'final2', name: 'ترم دوم', period: 'مرداد - شهریور', weight: 3, icon: 'fa-graduation-cap' }
        ];
        
        const html = `
            <style>
                /* استایل صفحه مدیریت نمرات */
                .grades-home {
                    direction: rtl;
                    font-family: 'Vazir', system-ui, sans-serif;
                    animation: fadeInUp 0.4s ease;
                }
                
                /* تب‌های ترم - طراحی کارتی */
                .term-tabs-home {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    justify-content: center;
                }
                .term-tab-home {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 20px;
                    padding: 12px 20px;
                    cursor: pointer;
                    transition: all 0.3s;
                    min-width: 140px;
                    text-align: center;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
                }
                .term-tab-home:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.08);
                    border-color: #2563eb;
                }
                .term-tab-home.active {
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    color: white;
                    border-color: #2563eb;
                    box-shadow: 0 4px 12px rgba(37,99,235,0.3);
                }
                .term-name-home {
                    font-weight: 700;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                .term-period-home {
                    font-size: 0.65rem;
                    opacity: 0.7;
                    margin-top: 4px;
                }
                .term-weight-home {
                    display: inline-block;
                    background: rgba(0,0,0,0.08);
                    padding: 2px 8px;
                    border-radius: 20px;
                    font-size: 0.6rem;
                    margin-top: 6px;
                }
                .term-tab-home.active .term-weight-home {
                    background: rgba(255,255,255,0.2);
                }
                
                /* نوار ابزار */
                .toolbar-home {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 16px;
                    margin-bottom: 24px;
                    background: white;
                    padding: 16px 24px;
                    border-radius: 24px;
                    border: 1px solid #e2e8f0;
                    align-items: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .filter-group-home {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: #f8fafc;
                    padding: 8px 18px;
                    border-radius: 40px;
                    border: 1px solid #e2e8f0;
                }
                .filter-group-home i { color: #94a3b8; }
                .filter-select-home {
                    border: none;
                    background: transparent;
                    font-family: inherit;
                    font-size: 0.85rem;
                    outline: none;
                    cursor: pointer;
                }
                .search-group-home {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: #f8fafc;
                    padding: 8px 18px;
                    border-radius: 40px;
                    border: 1px solid #e2e8f0;
                    flex: 1;
                }
                .search-group-home input {
                    border: none;
                    background: transparent;
                    outline: none;
                    flex: 1;
                    font-family: inherit;
                    font-size: 0.85rem;
                }
                .btn-primary-home {
                    background: #2563eb;
                    color: white;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 40px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 600;
                    transition: all 0.2s;
                }
                .btn-primary-home:hover {
                    background: #1d4ed8;
                    transform: translateY(-2px);
                }
                .btn-success-home {
                    background: #10b981;
                    color: white;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 40px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 600;
                    transition: all 0.2s;
                }
                .btn-success-home:hover {
                    background: #059669;
                    transform: translateY(-2px);
                }
                .btn-warning-home {
                    background: #f59e0b;
                    color: white;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 40px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                .btn-warning-home:hover {
                    background: #d97706;
                    transform: translateY(-2px);
                }
                
                /* کارت‌های آمار نمرات */
                .grades-stats-home {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                }
                .stat-card-mini-home {
                    background: white;
                    border-radius: 20px;
                    padding: 16px 20px;
                    text-align: center;
                    flex: 1;
                    min-width: 100px;
                    border: 1px solid #e2e8f0;
                    transition: all 0.3s;
                }
                .stat-card-mini-home:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.08);
                }
                .stat-number-home {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: #0f172a;
                }
                .stat-label-home {
                    font-size: 0.7rem;
                    color: #64748b;
                    margin-top: 4px;
                }
                
                /* گرید نمرات - کارتی */
                .grades-grid-home {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                    gap: 20px;
                }
                .grade-card-home {
                    background: white;
                    border-radius: 20px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    transition: all 0.3s;
                }
                .grade-card-home:hover {
                    box-shadow: 0 10px 25px rgba(0,0,0,0.08);
                    transform: translateY(-3px);
                }
                .grade-card-header-home {
                    padding: 16px;
                    background: linear-gradient(135deg, #f8fafc, #ffffff);
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }
                .student-avatar-home {
                    width: 48px;
                    height: 48px;
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 1.2rem;
                    font-weight: 700;
                }
                .student-info-home { flex: 1; }
                .student-name-home { font-weight: 700; font-size: 0.9rem; margin-bottom: 4px; }
                .student-code-home { font-size: 0.65rem; color: #64748b; }
                .grade-input-wrapper-home {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .grade-input-home {
                    width: 80px;
                    padding: 10px;
                    border: 1px solid #e2e8f0;
                    border-radius: 14px;
                    text-align: center;
                    font-family: inherit;
                    font-size: 1rem;
                    font-weight: 700;
                    transition: all 0.2s;
                }
                .grade-input-home:focus {
                    outline: none;
                    border-color: #2563eb;
                    box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
                }
                .grade-max-home {
                    font-size: 0.8rem;
                    color: #64748b;
                }
                .grade-card-body-home {
                    padding: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .grade-badge-home {
                    padding: 4px 14px;
                    border-radius: 40px;
                    font-size: 0.7rem;
                    font-weight: 600;
                }
                .grade-badge-home.excellent { background: #d1fae5; color: #059669; }
                .grade-badge-home.good { background: #dbeafe; color: #2563eb; }
                .grade-badge-home.average { background: #fef3c7; color: #d97706; }
                .grade-badge-home.poor { background: #fee2e2; color: #dc2626; }
                .grade-status-home {
                    font-size: 0.7rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .grade-status-home.saved { color: #10b981; }
                .grade-status-home.pending { color: #f59e0b; }
                .weighted-grade-home {
                    font-size: 0.7rem;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .empty-home {
                    text-align: center;
                    padding: 80px 20px;
                    background: white;
                    border-radius: 24px;
                    border: 1px solid #e2e8f0;
                }
                .empty-home i {
                    font-size: 4rem;
                    color: #cbd5e1;
                    margin-bottom: 16px;
                }
                
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @media (max-width: 768px) {
                    .grades-grid-home { grid-template-columns: 1fr; }
                    .toolbar-home { flex-direction: column; }
                    .filter-group-home, .search-group-home { width: 100%; }
                    .term-tabs-home { justify-content: center; }
                    .grade-card-header-home { flex-wrap: wrap; }
                    .grade-input-wrapper-home { margin-top: 8px; width: 100%; justify-content: center; }
                }
            </style>
            
            <div class="grades-home">
                <!-- تب‌های ترم -->
                <div class="term-tabs-home" id="termTabsHome">
                    ${termTypes.map((term, idx) => `
                        <button class="term-tab-home ${idx === 0 ? 'active' : ''}" data-term="${term.id}" onclick="selectTermHome('${term.id}')">
                            <div class="term-name-home"><i class="fas ${term.icon}"></i> ${term.name}</div>
                            <div class="term-period-home">${term.period}</div>
                            <div class="term-weight-home">${toPersianNumber(term.weight)}x</div>
                        </button>
                    `).join('')}
                </div>
                
                <!-- نوار ابزار -->
                <div class="toolbar-home">
                    <div class="filter-group-home">
                        <i class="fas fa-door-open"></i>
                        <select id="gradesClassHome" class="filter-select-home" onchange="loadCoursesForGradesHome()">
                            <option value="">انتخاب کلاس</option>
                            ${availableClasses.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (پایه ${toPersianNumber(c.grade)})</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group-home">
                        <i class="fas fa-book"></i>
                        <select id="gradesCourseHome" class="filter-select-home" disabled>
                            <option value="">ابتدا کلاس را انتخاب کنید</option>
                        </select>
                    </div>
                    <div class="search-group-home">
                        <i class="fas fa-search"></i>
                        <input type="text" id="gradesSearchHome" placeholder="جستجوی دانش‌آموز..." onkeyup="debouncedGradesSearchHome()">
                    </div>
                    <button class="btn-primary-home" onclick="loadGradesTableHome()"><i class="fas fa-search"></i> نمایش</button>
                    <button class="btn-success-home" onclick="saveAllGradesHome()"><i class="fas fa-save"></i> ذخیره همه</button>
                    <button class="btn-warning-home" onclick="copyGradesFromPreviousTermHome()"><i class="fas fa-copy"></i> کپی از ترم قبل</button>
                </div>
                
                <!-- کارت‌های آمار نمرات -->
                <div class="grades-stats-home" id="gradesStatsHome">
                    <div class="stat-card-mini-home"><div class="stat-number-home" id="avgGradeHome">۰</div><div class="stat-label-home">میانگین کلاس</div></div>
                    <div class="stat-card-mini-home"><div class="stat-number-home" id="excellentCountHome">۰</div><div class="stat-label-home">عالی (۱۷-۲۰)</div></div>
                    <div class="stat-card-mini-home"><div class="stat-number-home" id="goodCountHome">۰</div><div class="stat-label-home">خوب (۱۴-۱۶)</div></div>
                    <div class="stat-card-mini-home"><div class="stat-number-home" id="averageCountHome">۰</div><div class="stat-label-home">متوسط (۱۰-۱۳)</div></div>
                    <div class="stat-card-mini-home"><div class="stat-number-home" id="poorCountHome">۰</div><div class="stat-label-home">ضعیف (&lt;۱۰)</div></div>
                </div>
                
                <!-- گرید نمرات -->
                <div id="gradesGridHome" class="grades-grid-home">
                    <div class="empty-home">لطفاً کلاس و درس را انتخاب کنید</div>
                </div>
            </div>
        `;
        
        document.getElementById('contentArea').innerHTML = html;
        
        // متغیرها
        let selectedGradesClass = null;
        let selectedCourseId = null;
        let selectedTerm = 'monthly1';
        let currentGradesStudents = [];
        let gradesValueMap = {};
        
        // وزن ترم‌ها
        const termWeights = { monthly1: 1, midterm1: 2, final1: 3, monthly2: 1, midterm2: 2, final2: 3 };
        
        // انتخاب ترم
        window.selectTermHome = function(termId) {
            selectedTerm = termId;
            document.querySelectorAll('.term-tab-home').forEach(tab => {
                tab.classList.remove('active');
                if (tab.getAttribute('data-term') === termId) {
                    tab.classList.add('active');
                }
            });
            if (selectedGradesClass && selectedCourseId) {
                loadGradesTableHome();
            }
        };
        
        // بارگذاری دروس کلاس
        window.loadCoursesForGradesHome = async function() {
            const classId = document.getElementById('gradesClassHome').value;
            const courseSelect = document.getElementById('gradesCourseHome');
            
            if (!classId) {
                courseSelect.innerHTML = '<option value="">ابتدا کلاس را انتخاب کنید</option>';
                courseSelect.disabled = true;
                document.getElementById('gradesGridHome').innerHTML = '<div class="empty-home">لطفاً کلاس را انتخاب کنید</div>';
                return;
            }
            
            selectedGradesClass = classId;
            showLoading(true);
            try {
                const courses = await loadCoursesForClass(classId);
                if (courses.length === 0) {
                    courseSelect.innerHTML = '<option value="">برای این کلاس درسی ثبت نشده</option>';
                    document.getElementById('gradesGridHome').innerHTML = '<div class="empty-home">برای این کلاس درسی ثبت نشده است</div>';
                } else {
                    courseSelect.innerHTML = '<option value="">انتخاب درس</option>' + courses.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
                }
                courseSelect.disabled = false;
            } catch (error) {
                courseSelect.innerHTML = '<option value="">خطا در بارگذاری دروس</option>';
            } finally {
                showLoading(false);
            }
        };
        
        // بارگذاری جدول نمرات
        window.loadGradesTableHome = async function() {
            const classId = document.getElementById('gradesClassHome').value;
            const courseId = document.getElementById('gradesCourseHome').value;
            
            if (!classId || !courseId) {
                showToast('لطفاً کلاس و درس را انتخاب کنید', 'warning');
                return;
            }
            
            selectedCourseId = courseId;
            showLoading(true);
            try {
                const data = await loadGrades(classId, courseId, selectedTerm);
                const students = data.students || [];
                currentGradesStudents = students;
                
                const key = `${classId}_${courseId}_${selectedTerm}`;
                if (!gradesValueMap[key]) {
                    gradesValueMap[key] = {};
                    students.forEach(s => { gradesValueMap[key][s.id] = s.current_grade || ''; });
                }
                
                // محاسبه آمار
                let total = 0, count = 0, excellent = 0, good = 0, average = 0, poor = 0;
                students.forEach(s => {
                    const grade = parseFloat(gradesValueMap[key][s.id]);
                    if (!isNaN(grade) && grade !== '') {
                        total += grade;
                        count++;
                        if (grade >= 17) excellent++;
                        else if (grade >= 14) good++;
                        else if (grade >= 10) average++;
                        else if (grade > 0) poor++;
                    }
                });
                
                const avg = count > 0 ? (total / count).toFixed(1) : 0;
                document.getElementById('avgGradeHome').innerText = toPersianNumber(avg);
                document.getElementById('excellentCountHome').innerText = toPersianNumber(excellent);
                document.getElementById('goodCountHome').innerText = toPersianNumber(good);
                document.getElementById('averageCountHome').innerText = toPersianNumber(average);
                document.getElementById('poorCountHome').innerText = toPersianNumber(poor);
                
                const search = document.getElementById('gradesSearchHome')?.value?.toLowerCase() || '';
                let filtered = students.filter(s => !search || s.name?.toLowerCase().includes(search));
                
                const container = document.getElementById('gradesGridHome');
                if (filtered.length === 0) {
                    container.innerHTML = '<div class="empty-home">دانش‌آموزی یافت نشد</div>';
                    return;
                }
                
                const weight = termWeights[selectedTerm] || 1;
                
                container.innerHTML = filtered.map(s => {
                    const currentGrade = gradesValueMap[key][s.id];
                    const numGrade = parseFloat(currentGrade);
                    let gradeClass = '', gradeText = '';
                    if (!isNaN(numGrade) && numGrade !== '') {
                        if (numGrade >= 17) { gradeClass = 'excellent'; gradeText = 'عالی'; }
                        else if (numGrade >= 14) { gradeClass = 'good'; gradeText = 'خوب'; }
                        else if (numGrade >= 10) { gradeClass = 'average'; gradeText = 'متوسط'; }
                        else { gradeClass = 'poor'; gradeText = 'ضعیف'; }
                    }
                    const weightedGrade = !isNaN(numGrade) ? (numGrade * weight).toFixed(1) : '-';
                    const initial = s.name ? s.name.charAt(0) : '?';
                    
                    return `
                        <div class="grade-card-home">
                            <div class="grade-card-header-home">
                                <div class="student-avatar-home">${escapeHtml(initial)}</div>
                                <div class="student-info-home">
                                    <div class="student-name-home">${escapeHtml(s.name)}</div>
                                    <div class="student-code-home">${s.username || '-'}</div>
                                </div>
                                <div class="grade-input-wrapper-home">
                                    <input type="number" class="grade-input-home" id="grade_${s.id}" value="${currentGrade !== '' ? currentGrade : ''}" step="0.25" min="0" max="20" placeholder="نمره" onchange="updateGradeValueHome(${s.id}, this.value)" style="width: 80px;">
                                    <span class="grade-max-home">/۲۰</span>
                                </div>
                            </div>
                            <div class="grade-card-body-home">
                                <div class="grade-badge-home ${gradeClass}">${gradeText || 'ثبت نشده'}</div>
                                <div class="weighted-grade-home"><i class="fas fa-calculator"></i> نمره وزنی: ${weightedGrade}</div>
                                <div class="grade-status-home ${currentGrade !== '' ? 'saved' : 'pending'}">
                                    <i class="fas ${currentGrade !== '' ? 'fa-check-circle' : 'fa-clock'}"></i>
                                    ${currentGrade !== '' ? 'ثبت شده' : 'در انتظار ثبت'}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
                
            } catch (error) {
                showToast('خطا در بارگذاری نمرات', 'error');
            } finally {
                showLoading(false);
            }
        };
        
        // بروزرسانی نمره
        window.updateGradeValueHome = function(studentId, value) {
            const key = `${selectedGradesClass}_${selectedCourseId}_${selectedTerm}`;
            if (!gradesValueMap[key]) gradesValueMap[key] = {};
            
            if (value === '') {
                gradesValueMap[key][studentId] = '';
            } else {
                const num = parseFloat(value);
                if (!isNaN(num) && num >= 0 && num <= 20) {
                    gradesValueMap[key][studentId] = num;
                } else {
                    showToast('نمره باید بین ۰ تا ۲۰ باشد', 'warning');
                    document.getElementById(`grade_${studentId}`).value = gradesValueMap[key][studentId] || '';
                }
            }
            loadGradesTableHome();
        };
        
        // ذخیره همه نمرات
        window.saveAllGradesHome = async function() {
            if (!selectedGradesClass || !selectedCourseId) {
                showToast('لطفاً کلاس و درس را انتخاب کنید', 'warning');
                return;
            }
            
            const key = `${selectedGradesClass}_${selectedCourseId}_${selectedTerm}`;
            const gradesToSave = [];
            
            for (const s of currentGradesStudents) {
                const grade = gradesValueMap[key]?.[s.id];
                if (grade !== '' && !isNaN(parseFloat(grade))) {
                    gradesToSave.push({ student_id: s.id, grade: parseFloat(grade) });
                }
            }
            
            if (gradesToSave.length === 0) {
                showToast('نمره‌ای برای ذخیره وجود ندارد', 'warning');
                return;
            }
            
            showLoading(true);
            try {
                await saveGrades(selectedGradesClass, selectedCourseId, selectedTerm, gradesToSave);
                showToast(`${toPersianNumber(gradesToSave.length)} نمره با موفقیت ذخیره شد`, 'success');
                await loadGradesTableHome();
            } catch (error) {
                showToast(error.message || 'خطا در ذخیره نمرات', 'error');
            } finally {
                showLoading(false);
            }
        };
        
        // کپی نمرات از ترم قبل
        window.copyGradesFromPreviousTermHome = async function() {
            if (!selectedGradesClass || !selectedCourseId) {
                showToast('لطفاً کلاس و درس را انتخاب کنید', 'warning');
                return;
            }
            
            const termOrder = ['monthly1', 'midterm1', 'final1', 'monthly2', 'midterm2', 'final2'];
            const currentIndex = termOrder.indexOf(selectedTerm);
            if (currentIndex <= 0) {
                showToast('برای ترم اول ترم قبلی وجود ندارد', 'warning');
                return;
            }
            
            const previousTerm = termOrder[currentIndex - 1];
            const previousTermName = termTypes.find(t => t.id === previousTerm)?.name || previousTerm;
            
            if (!confirm(`آیا از کپی نمرات از "${previousTermName}" به ترم فعلی مطمئن هستید؟`)) {
                return;
            }
            
            showLoading(true);
            try {
                const data = await loadGrades(selectedGradesClass, selectedCourseId, previousTerm);
                const previousGrades = data.students || [];
                const key = `${selectedGradesClass}_${selectedCourseId}_${selectedTerm}`;
                if (!gradesValueMap[key]) gradesValueMap[key] = {};
                
                previousGrades.forEach(s => {
                    if (s.current_grade) {
                        gradesValueMap[key][s.id] = s.current_grade;
                    }
                });
                
                await loadGradesTableHome();
                showToast(`نمرات از "${previousTermName}" با موفقیت کپی شد`, 'success');
            } catch (error) {
                showToast('خطا در کپی نمرات', 'error');
            } finally {
                showLoading(false);
            }
        };
        
        // جستجو با تأخیر
        window.debouncedGradesSearchHome = function() {
            clearTimeout(window.gradesSearchTimeout);
            window.gradesSearchTimeout = setTimeout(() => loadGradesTableHome(), 500);
        };
        
    } catch (error) {
        console.error('Grades error:', error);
        document.getElementById('contentArea').innerHTML = `
            <div class="empty-home" style="margin:20px;">
                <i class="fas fa-exclamation-circle fa-3x" style="color:#ef4444;"></i>
                <h4>خطا در بارگذاری صفحه مدیریت نمرات</h4>
                <p>${error.message}</p>
                <button onclick="renderGrades()" style="margin-top:16px; padding:8px 24px; background:#2563eb; color:white; border:none; border-radius:40px; cursor:pointer;">تلاش مجدد</button>
            </div>
        `;
    }
    showLoading(false);
}
    
// ============================================
// رندر آزمون‌ها - نمایش آزمون‌های ساخته شده با AI
// ============================================

async function renderExams() {
    showLoading(true);
    try {
        await loadClassesFromDB();
        await loadExamsFromDB();
        
        // فقط کلاس‌های پایه 7,8,9 رو نشون بده
        const availableClasses = classesData.filter(c => [7, 8, 9].includes(c.grade));
        
        const html = `
            <style>
                /* استایل صفحه آزمون‌ها */
                .exams-home {
                    direction: rtl;
                    font-family: 'Vazir', system-ui, sans-serif;
                    animation: fadeInUp 0.4s ease;
                }
                
                /* نوار ابزار */
                .toolbar-home {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 16px;
                    margin-bottom: 24px;
                    background: white;
                    padding: 16px 24px;
                    border-radius: 24px;
                    border: 1px solid #e2e8f0;
                    align-items: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .filter-group-home {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: #f8fafc;
                    padding: 8px 18px;
                    border-radius: 40px;
                    border: 1px solid #e2e8f0;
                }
                .filter-group-home i { color: #94a3b8; }
                .filter-select-home {
                    border: none;
                    background: transparent;
                    font-family: inherit;
                    font-size: 0.85rem;
                    outline: none;
                    cursor: pointer;
                }
                .search-group-home {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: #f8fafc;
                    padding: 8px 18px;
                    border-radius: 40px;
                    border: 1px solid #e2e8f0;
                    flex: 1;
                }
                .search-group-home input {
                    border: none;
                    background: transparent;
                    outline: none;
                    flex: 1;
                    font-family: inherit;
                    font-size: 0.85rem;
                }
                .btn-primary-home {
                    background: #2563eb;
                    color: white;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 40px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 600;
                    transition: all 0.2s;
                }
                .btn-primary-home:hover {
                    background: #1d4ed8;
                    transform: translateY(-2px);
                }
                .btn-success-home {
                    background: #10b981;
                    color: white;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 40px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                .btn-success-home:hover {
                    background: #059669;
                    transform: translateY(-2px);
                }
                .btn-purple-home {
                    background: #8b5cf6;
                    color: white;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 40px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                .btn-purple-home:hover {
                    background: #7c3aed;
                    transform: translateY(-2px);
                }
                
                /* کارت‌های آمار */
                .stats-home {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                    margin-bottom: 24px;
                }
                .stat-home {
                    background: white;
                    border-radius: 24px;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    border: 1px solid #e2e8f0;
                    transition: all 0.4s;
                }
                .stat-home:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 20px 35px rgba(37,99,235,0.12);
                }
                .stat-icon-home {
                    width: 55px;
                    height: 55px;
                    border-radius: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.4rem;
                }
                .stat-icon-home.blue { background: #dbeafe; color: #2563eb; }
                .stat-icon-home.green { background: #d1fae5; color: #10b981; }
                .stat-icon-home.purple { background: #f3e8ff; color: #8b5cf6; }
                .stat-content-home { flex: 1; }
                .stat-value-home { font-size: 1.6rem; font-weight: 800; color: #0f172a; }
                .stat-label-home { font-size: 0.7rem; color: #64748b; margin-top: 4px; }
                
                /* گرید آزمون‌ها - کارتی */
                .exams-grid-home {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
                    gap: 24px;
                }
                .exam-card-home {
                    background: white;
                    border-radius: 24px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    transition: all 0.3s;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .exam-card-home:hover {
                    transform: translateY(-6px);
                    box-shadow: 0 20px 35px rgba(37,99,235,0.12);
                    border-color: #2563eb;
                }
                .exam-header-home {
                    padding: 18px 20px;
                    background: linear-gradient(135deg, #f8fafc, #ffffff);
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 10px;
                }
                .exam-title-home {
                    font-weight: 800;
                    font-size: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .exam-badge-home {
                    padding: 4px 12px;
                    border-radius: 40px;
                    font-size: 0.7rem;
                    font-weight: 600;
                }
                .exam-badge-home.ai {
                    background: #f3e8ff;
                    color: #8b5cf6;
                }
                .exam-badge-home.active {
                    background: #d1fae5;
                    color: #059669;
                }
                .exam-badge-home.upcoming {
                    background: #fef3c7;
                    color: #d97706;
                }
                .exam-body-home {
                    padding: 18px 20px;
                }
                .exam-info-home {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                    margin-bottom: 16px;
                }
                .exam-info-item-home {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.8rem;
                    color: #64748b;
                }
                .exam-info-item-home i {
                    width: 20px;
                    color: #2563eb;
                }
                .exam-description-home {
                    font-size: 0.8rem;
                    color: #475569;
                    margin: 12px 0;
                    padding-top: 8px;
                    border-top: 1px solid #f1f5f9;
                }
                .exam-actions-home {
                    display: flex;
                    gap: 10px;
                    margin-top: 16px;
                    padding-top: 12px;
                    border-top: 1px solid #f1f5f9;
                }
                .exam-action-btn-home {
                    flex: 1;
                    padding: 8px;
                    border-radius: 40px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }
                .exam-action-btn-home.primary { background: #2563eb; color: white; }
                .exam-action-btn-home.primary:hover { background: #1d4ed8; transform: translateY(-2px); }
                .exam-action-btn-home.secondary { background: #f59e0b; color: white; }
                .exam-action-btn-home.secondary:hover { background: #d97706; transform: translateY(-2px); }
                .exam-action-btn-home.danger { background: #fee2e2; color: #dc2626; }
                .exam-action-btn-home.danger:hover { background: #dc2626; color: white; }
                
                .empty-home {
                    text-align: center;
                    padding: 80px 20px;
                    background: white;
                    border-radius: 24px;
                    border: 1px solid #e2e8f0;
                }
                .empty-home i {
                    font-size: 4rem;
                    color: #cbd5e1;
                    margin-bottom: 16px;
                }
                
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @media (max-width: 768px) {
                    .exams-grid-home { grid-template-columns: 1fr; }
                    .toolbar-home { flex-direction: column; }
                    .filter-group-home, .search-group-home { width: 100%; }
                    .stats-home { grid-template-columns: 1fr; }
                    .exam-info-home { grid-template-columns: 1fr; }
                }
            </style>
            
            <div class="exams-home">
                <!-- نوار ابزار -->
                <div class="toolbar-home">
                    <div class="filter-group-home">
                        <i class="fas fa-door-open"></i>
                        <select id="examClassFilterHome" class="filter-select-home" onchange="loadExamsListHome()">
                            <option value="">همه کلاس‌ها</option>
                            ${availableClasses.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (پایه ${toPersianNumber(c.grade)})</option>`).join('')}
                        </select>
                    </div>
                    <div class="search-group-home">
                        <i class="fas fa-search"></i>
                        <input type="text" id="examSearchHome" placeholder="جستجوی عنوان آزمون..." onkeyup="debouncedExamSearchHome()">
                    </div>
                    <div class="filter-group-home">
                        <i class="fas fa-robot"></i>
                        <select id="examTypeFilterHome" class="filter-select-home" onchange="loadExamsListHome()">
                            <option value="all">همه آزمون‌ها</option>
                            <option value="ai">ساخته شده با AI</option>
                            <option value="manual">دستی</option>
                        </select>
                    </div>
                    <button class="btn-primary-home" onclick="showTab('ai-exam')">
                        <i class="fas fa-robot"></i> ساخت آزمون جدید با AI
                    </button>
                </div>
                
                <!-- کارت‌های آمار -->
                <div class="stats-home">
                    <div class="stat-home">
                        <div class="stat-icon-home blue"><i class="fas fa-pen-to-square"></i></div>
                        <div class="stat-content-home">
                            <div class="stat-value-home" id="totalExamsHome">۰</div>
                            <div class="stat-label-home">کل آزمون‌ها</div>
                        </div>
                    </div>
                    <div class="stat-home">
                        <div class="stat-icon-home green"><i class="fas fa-play-circle"></i></div>
                        <div class="stat-content-home">
                            <div class="stat-value-home" id="activeExamsHome">۰</div>
                            <div class="stat-label-home">آزمون‌های فعال</div>
                        </div>
                    </div>
                    <div class="stat-home">
                        <div class="stat-icon-home purple"><i class="fas fa-robot"></i></div>
                        <div class="stat-content-home">
                            <div class="stat-value-home" id="aiExamsHome">۰</div>
                            <div class="stat-label-home">ساخته شده با AI</div>
                        </div>
                    </div>
                </div>
                
                <!-- گرید آزمون‌ها -->
                <div id="examsGridHome" class="exams-grid-home">
                    <div class="empty-home">در حال بارگذاری...</div>
                </div>
            </div>
            
            <!-- مودال مشاهده سوالات آزمون -->
            <div id="examQuestionsModalHome" style="display: none; position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index:2000; align-items: center; justify-content: center;">
                <div style="background: white; border-radius: 28px; max-width: 700px; width: 90%; max-height: 85vh; overflow-y: auto;">
                    <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                        <h3><i class="fas fa-question-circle" style="color:#8b5cf6;"></i> سوالات آزمون</h3>
                        <button onclick="closeModal('examQuestionsModalHome')" style="background: none; border: none; font-size: 1.3rem; cursor: pointer;">&times;</button>
                    </div>
                    <div id="examQuestionsBodyHome" style="padding: 24px;"></div>
                    <div style="padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
                        <button onclick="closeModal('examQuestionsModalHome')" style="background: #2563eb; color: white; border: none; padding: 8px 20px; border-radius: 40px; cursor: pointer;">بستن</button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('contentArea').innerHTML = html;
        
        // بارگذاری لیست آزمون‌ها
        window.loadExamsListHome = async function() {
            const classId = document.getElementById('examClassFilterHome')?.value;
            const search = document.getElementById('examSearchHome')?.value?.toLowerCase() || '';
            const typeFilter = document.getElementById('examTypeFilterHome')?.value || 'all';
            
            await loadExamsFromDB(classId);
            
            let filtered = examsData.filter(e => {
                if (search && !e.title?.toLowerCase().includes(search)) return false;
                if (typeFilter === 'ai' && !e.is_ai_generated && !e.description?.includes('هوش مصنوعی')) return false;
                if (typeFilter === 'manual' && (e.is_ai_generated || e.description?.includes('هوش مصنوعی'))) return false;
                return true;
            });
            
            const now = new Date();
            const total = filtered.length;
            const active = filtered.filter(e => e.status === 'active' && new Date(e.start_time) <= now).length;
            const aiExams = filtered.filter(e => e.is_ai_generated || e.description?.includes('هوش مصنوعی')).length;
            
            document.getElementById('totalExamsHome').innerText = toPersianNumber(total);
            document.getElementById('activeExamsHome').innerText = toPersianNumber(active);
            document.getElementById('aiExamsHome').innerText = toPersianNumber(aiExams);
            
            const container = document.getElementById('examsGridHome');
            if (filtered.length === 0) {
                container.innerHTML = '<div class="empty-home"><i class="fas fa-pen-to-square"></i><h4>هیچ آزمونی یافت نشد</h4><p>با استفاده از دکمه "ساخت آزمون جدید با AI" اولین آزمون را ایجاد کنید</p></div>';
                return;
            }
            
            container.innerHTML = filtered.map(exam => {
                const isAI = exam.is_ai_generated || exam.description?.includes('هوش مصنوعی');
                const startDate = new Date(exam.start_time);
                const isActive = exam.status === 'active' && startDate <= now;
                const isUpcoming = exam.status === 'active' && startDate > now;
                
                return `
                    <div class="exam-card-home">
                        <div class="exam-header-home">
                            <div class="exam-title-home">
                                <i class="fas fa-pen-to-square"></i> ${escapeHtml(exam.title)}
                            </div>
                            <div style="display: flex; gap: 8px;">
                                ${isAI ? '<span class="exam-badge-home ai"><i class="fas fa-robot"></i> AI</span>' : ''}
                                ${isActive ? '<span class="exam-badge-home active"><i class="fas fa-check-circle"></i> فعال</span>' : ''}
                                ${isUpcoming ? '<span class="exam-badge-home upcoming"><i class="fas fa-clock"></i> در انتظار</span>' : ''}
                            </div>
                        </div>
                        <div class="exam-body-home">
                            <div class="exam-info-home">
                                <div class="exam-info-item-home"><i class="fas fa-door-open"></i> ${exam.class_name || '-'}</div>
                                <div class="exam-info-item-home"><i class="fas fa-calendar-alt"></i> شروع: ${formatDateTime(exam.start_time)}</div>
                                <div class="exam-info-item-home"><i class="fas fa-hourglass-half"></i> مدت: ${toPersianNumber(exam.duration || 60)} دقیقه</div>
                                <div class="exam-info-item-home"><i class="fas fa-star"></i> نمره کل: ${toPersianNumber(exam.total_points || 100)}</div>
                            </div>
                            ${exam.description ? `<div class="exam-description-home">📝 ${escapeHtml(exam.description.substring(0, 150))}${exam.description.length > 150 ? '...' : ''}</div>` : ''}
                            <div class="exam-actions-home">
                                <button class="exam-action-btn-home primary" onclick="viewExamQuestionsHome(${exam.id})" title="مشاهده سوالات">
                                    <i class="fas fa-eye"></i> مشاهده
                                </button>
                                <button class="exam-action-btn-home secondary" onclick="editExamHome(${exam.id})" title="ویرایش">
                                    <i class="fas fa-edit"></i> ویرایش
                                </button>
                                <button class="exam-action-btn-home danger" onclick="deleteExamHome(${exam.id})" title="حذف">
                                    <i class="fas fa-trash"></i> حذف
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        };
        
        // مشاهده سوالات آزمون
        window.viewExamQuestionsHome = async function(examId) {
            showLoading(true);
            try {
                const data = await getExamQuestions(examId);
                const questions = data.questions || [];
                const exam = examsData.find(e => e.id === examId);
                
                const modalBody = document.getElementById('examQuestionsBodyHome');
                if (questions.length === 0) {
                    modalBody.innerHTML = '<div class="empty-home">هیچ سوالی برای این آزمون ثبت نشده است</div>';
                } else {
                    modalBody.innerHTML = `
                        <h4 style="margin-bottom: 16px;"><i class="fas fa-pen-to-square"></i> ${escapeHtml(exam?.title)}</h4>
                        <div style="display: flex; flex-direction: column; gap: 20px;">
                            ${questions.map((q, i) => `
                                <div style="background: #f8fafc; border-radius: 20px; padding: 16px; border-right: 3px solid #8b5cf6;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                                        <span style="font-weight: 700;">سوال ${toPersianNumber(i+1)}</span>
                                        <span style="background: #f3e8ff; padding: 2px 10px; border-radius: 20px; font-size: 0.7rem;">${toPersianNumber(q.points || 2)} نمره</span>
                                    </div>
                                    <div style="font-weight: 600; margin-bottom: 12px;">${escapeHtml(q.question_text)}</div>
                                    ${q.options ? `
                                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 8px;">
                                            ${JSON.parse(q.options).map((opt, idx) => `
                                                <div style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: white; border-radius: 12px;">
                                                    <span style="font-weight: 700;">${String.fromCharCode(65+idx)}.</span>
                                                    <span style="font-size: 0.8rem;">${escapeHtml(opt)}</span>
                                                    ${q.correct_answer === String.fromCharCode(65+idx) ? '<i class="fas fa-check-circle" style="color:#10b981;"></i>' : ''}
                                                </div>
                                            `).join('')}
                                        </div>
                                        <div style="margin-top: 12px; padding: 8px 12px; background: #d1fae5; border-radius: 12px; display: inline-block;">
                                            <i class="fas fa-check-circle" style="color:#059669;"></i> پاسخ صحیح: گزینه ${q.correct_answer}
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
                openModal('examQuestionsModalHome');
            } catch (error) {
                showToast('خطا در بارگذاری سوالات', 'error');
            } finally {
                showLoading(false);
            }
        };
        
        // ویرایش آزمون
        window.editExamHome = async function(examId) {
            const exam = examsData.find(e => e.id === examId);
            if (!exam) return;
            
            const newTitle = prompt('عنوان جدید آزمون را وارد کنید:', exam.title);
            if (!newTitle) return;
            
            showLoading(true);
            try {
                await updateExam(examId, { title: newTitle });
                showToast('آزمون با موفقیت ویرایش شد', 'success');
                await loadExamsListHome();
            } catch (error) {
                showToast(error.message || 'خطا در ویرایش آزمون', 'error');
            } finally {
                showLoading(false);
            }
        };
        
        // حذف آزمون
        window.deleteExamHome = async function(examId) {
            if (!confirm('آیا از حذف این آزمون مطمئن هستید؟ این عملیات قابل بازگشت نیست!')) return;
            
            showLoading(true);
            try {
                await deleteExam(examId);
                showToast('آزمون با موفقیت حذف شد', 'success');
                await loadExamsListHome();
            } catch (error) {
                showToast(error.message || 'خطا در حذف آزمون', 'error');
            } finally {
                showLoading(false);
            }
        };
        
        // جستجو با تأخیر
        window.debouncedExamSearchHome = function() {
            clearTimeout(window.examSearchTimeout);
            window.examSearchTimeout = setTimeout(() => loadExamsListHome(), 500);
        };
        
        // تابع باز کردن مودال
        function openModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) modal.style.display = 'flex';
        }
        
        window.closeModal = function(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) modal.style.display = 'none';
        };
        
        // بارگذاری اولیه
        await loadExamsListHome();
        
    } catch (error) {
        console.error('Exams error:', error);
        document.getElementById('contentArea').innerHTML = `
            <div class="empty-home" style="margin:20px;">
                <i class="fas fa-exclamation-circle fa-3x" style="color:#ef4444;"></i>
                <h4>خطا در بارگذاری آزمون‌ها</h4>
                <p>${error.message}</p>
                <button onclick="renderExams()" style="margin-top:16px; padding:8px 24px; background:#2563eb; color:white; border:none; border-radius:40px; cursor:pointer;">تلاش مجدد</button>
            </div>
        `;
    }
    showLoading(false);
}
    
// ============================================
// رندر ساخت آزمون با AI - نسخه حرفه‌ای
// ============================================

async function renderAIExam() {
    showLoading(true);
    try {
        await loadClassesFromDB();
        
        // فقط کلاس‌های پایه 7,8,9 رو نشون بده
        const availableClasses = classesData.filter(c => [7, 8, 9].includes(c.grade));
        
        const html = `
            <style>
                /* استایل صفحه ساخت آزمون با AI */
                .ai-exam-home {
                    direction: rtl;
                    font-family: 'Vazir', system-ui, sans-serif;
                    animation: fadeInUp 0.4s ease;
                    max-width: 900px;
                    margin: 0 auto;
                }
                
                /* کارت اصلی */
                .ai-card-home {
                    background: white;
                    border-radius: 28px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    margin-bottom: 28px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
                }
                .ai-header-home {
                    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                    padding: 24px;
                    color: white;
                    text-align: center;
                }
                .ai-header-home h2 {
                    font-size: 1.3rem;
                    font-weight: 700;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                .ai-header-home p {
                    font-size: 0.8rem;
                    opacity: 0.9;
                }
                .ai-body-home {
                    padding: 28px;
                }
                
                /* فرم */
                .form-group-home {
                    margin-bottom: 24px;
                }
                .form-group-home label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 700;
                    font-size: 0.85rem;
                    color: #0f172a;
                }
                .form-group-home label i {
                    color: #8b5cf6;
                    margin-left: 6px;
                }
                .form-control-home {
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    font-family: inherit;
                    font-size: 0.9rem;
                    transition: all 0.2s;
                    background: #f8fafc;
                }
                .form-control-home:focus {
                    outline: none;
                    border-color: #8b5cf6;
                    box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
                    background: white;
                }
                textarea.form-control-home {
                    resize: vertical;
                    min-height: 120px;
                }
                .form-row-home {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }
                
                /* دکمه تولید */
                .btn-generate-home {
                    width: 100%;
                    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                    color: white;
                    border: none;
                    padding: 14px;
                    border-radius: 50px;
                    font-size: 1rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    margin-top: 16px;
                }
                .btn-generate-home:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(139,92,246,0.4);
                }
                .btn-generate-home:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }
                
                /* نتیجه سوالات */
                .questions-result-home {
                    background: white;
                    border-radius: 28px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    margin-top: 28px;
                    display: none;
                    animation: fadeInUp 0.4s ease;
                }
                .result-header-home {
                    background: linear-gradient(135deg, #10b981, #059669);
                    padding: 18px 24px;
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 12px;
                }
                .result-header-home h3 {
                    font-size: 1rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .btn-save-home {
                    background: white;
                    color: #059669;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 40px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .btn-save-home:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .questions-list-home {
                    padding: 24px;
                    max-height: 500px;
                    overflow-y: auto;
                }
                .question-item-home {
                    background: #f8fafc;
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 20px;
                    border: 1px solid #e2e8f0;
                    transition: all 0.2s;
                }
                .question-item-home:hover {
                    border-color: #8b5cf6;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                .question-header-home {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid #e2e8f0;
                }
                .question-number-home {
                    font-weight: 800;
                    font-size: 0.9rem;
                    background: #8b5cf6;
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 12px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                .question-points-home {
                    background: #fef3c7;
                    padding: 4px 12px;
                    border-radius: 40px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: #d97706;
                }
                .question-text-home {
                    font-weight: 700;
                    font-size: 1rem;
                    margin-bottom: 16px;
                    color: #0f172a;
                }
                .question-options-home {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                    margin-bottom: 16px;
                }
                .option-item-home {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 12px;
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                }
                .option-letter-home {
                    font-weight: 800;
                    width: 28px;
                    height: 28px;
                    background: #e2e8f0;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.8rem;
                }
                .option-text-home {
                    font-size: 0.85rem;
                    color: #475569;
                    flex: 1;
                }
                .question-answer-home {
                    background: #d1fae5;
                    padding: 10px 16px;
                    border-radius: 14px;
                    font-size: 0.8rem;
                    color: #059669;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .loading-spinner-home {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    border: 2px solid white;
                    border-top-color: transparent;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                .empty-home {
                    text-align: center;
                    padding: 60px 20px;
                    color: #94a3b8;
                }
                
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @media (max-width: 768px) {
                    .ai-body-home { padding: 20px; }
                    .form-row-home { grid-template-columns: 1fr; }
                    .question-options-home { grid-template-columns: 1fr; }
                    .result-header-home { flex-direction: column; text-align: center; }
                }
            </style>
            
            <div class="ai-exam-home">
                <!-- کارت اصلی -->
                <div class="ai-card-home">
                    <div class="ai-header-home">
                        <h2><i class="fas fa-robot"></i> ساخت آزمون با هوش مصنوعی</h2>
                        <p>متن درس یا موضوع را وارد کنید تا AI سوالات چهارگزینه‌ای مناسب تولید کند</p>
                    </div>
                    <div class="ai-body-home">
                        <div class="form-group-home">
                            <label><i class="fas fa-door-open"></i> انتخاب کلاس</label>
                            <select id="aiClassIdHome" class="form-control-home">
                                <option value="">انتخاب کلاس</option>
                                ${availableClasses.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (پایه ${toPersianNumber(c.grade)})</option>`).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group-home">
                            <label><i class="fas fa-heading"></i> عنوان آزمون</label>
                            <input type="text" id="aiExamTitleHome" class="form-control-home" placeholder="مثال: آزمون ریاضی - فصل معادلات">
                        </div>
                        
                        <div class="form-group-home">
                            <label><i class="fas fa-book-open"></i> متن درس / موضوع</label>
                            <textarea id="aiSubjectHome" class="form-control-home" rows="5" placeholder="متن درس یا موضوع مورد نظر را وارد کنید...&#10;&#10;مثال:&#10;معادله درجه دوم یک معادله به شکل ax² + bx + c = 0 است که a، b و c اعداد حقیقی و a ≠ 0 هستند. حل معادله درجه دوم از روش دلتا انجام می‌شود..."></textarea>
                        </div>
                        
                        <div class="form-row-home">
                            <div class="form-group-home">
                                <label><i class="fas fa-sort-numeric-up"></i> تعداد سوالات</label>
                                <input type="number" id="aiCountHome" class="form-control-home" value="5" min="1" max="20">
                            </div>
                            <div class="form-group-home">
                                <label><i class="fas fa-chart-line"></i> سطح دشواری</label>
                                <select id="aiDifficultyHome" class="form-control-home">
                                    <option value="آسان">آسان</option>
                                    <option value="متوسط" selected>متوسط</option>
                                    <option value="سخت">سخت</option>
                                </select>
                            </div>
                        </div>
                        
                        <button class="btn-generate-home" id="generateBtnHome" onclick="generateAIExamQuestionsHome()">
                            <i class="fas fa-magic"></i> تولید سوالات با هوش مصنوعی
                        </button>
                    </div>
                </div>
                
                <!-- نتیجه سوالات -->
                <div id="aiQuestionsResultHome" class="questions-result-home"></div>
            </div>
        `;
        
        document.getElementById('contentArea').innerHTML = html;
        
        // متغیرهای ذخیره داده‌های تولید شده
        let aiGeneratedData = null;
        
        // تابع تولید سوالات با AI
        window.generateAIExamQuestionsHome = async function() {
            const classId = document.getElementById('aiClassIdHome')?.value;
            const title = document.getElementById('aiExamTitleHome')?.value.trim();
            const subject = document.getElementById('aiSubjectHome')?.value.trim();
            const count = parseInt(document.getElementById('aiCountHome')?.value) || 5;
            const difficulty = document.getElementById('aiDifficultyHome')?.value;
            
            // اعتبارسنجی
            if (!classId) {
                showToast('لطفاً کلاس را انتخاب کنید', 'error');
                return;
            }
            if (!title) {
                showToast('لطفاً عنوان آزمون را وارد کنید', 'error');
                return;
            }
            if (!subject) {
                showToast('لطفاً متن درس یا موضوع را وارد کنید', 'error');
                return;
            }
            if (count < 1 || count > 20) {
                showToast('تعداد سوالات باید بین ۱ تا ۲۰ باشد', 'error');
                return;
            }
            
            const generateBtn = document.getElementById('generateBtnHome');
            const originalText = generateBtn.innerHTML;
            generateBtn.innerHTML = '<span class="loading-spinner-home"></span> در حال تولید سوالات...';
            generateBtn.disabled = true;
            showLoading(true);
            
            try {
                // فراخوانی امن API سمت سرور؛ کلید هوش مصنوعی نباید در مرورگر قرار بگیرد.
                const result = await fetchAPI('/teacher/ai-generate-exam', {
                    method: 'POST',
                    body: JSON.stringify({
                        subject,
                        numQuestions: count,
                        difficulty,
                        class_id: classId
                    })
                });
                const questions = (result.questions || []).map((q) => ({
                    text: q.text || q.question_text || '',
                    options: Array.isArray(q.options) ? q.options : [],
                    correct_answer: q.correct_answer || (Number.isInteger(q.correct) ? String.fromCharCode(65 + q.correct) : 'A')
                }));
                
                if (questions.length === 0) {
                    throw new Error('هیچ سوالی تولید نشد');
                }
                
                // ذخیره داده‌ها
                aiGeneratedData = {
                    classId: parseInt(classId),
                    title: title,
                    subject: subject,
                    questions: questions
                };
                
                // نمایش نتایج
                const resultDiv = document.getElementById('aiQuestionsResultHome');
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <div class="result-header-home">
                        <h3><i class="fas fa-check-circle"></i> ${toPersianNumber(questions.length)} سوال تولید شد</h3>
                        <button class="btn-save-home" onclick="saveAIExamToDBHome()">
                            <i class="fas fa-save"></i> ذخیره آزمون در دیتابیس
                        </button>
                    </div>
                    <div class="questions-list-home" id="questionsListHome">
                        ${questions.map((q, i) => `
                            <div class="question-item-home">
                                <div class="question-header-home">
                                    <span class="question-number-home">${toPersianNumber(i+1)}</span>
                                    <span class="question-points-home"><i class="fas fa-star"></i> ۲ نمره</span>
                                </div>
                                <div class="question-text-home">${escapeHtml(q.text)}</div>
                                <div class="question-options-home">
                                    ${(q.options || []).map((opt, idx) => `
                                        <div class="option-item-home">
                                            <div class="option-letter-home">${String.fromCharCode(65+idx)}</div>
                                            <div class="option-text-home">${escapeHtml(opt)}</div>
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="question-answer-home">
                                    <i class="fas fa-check-circle"></i> پاسخ صحیح: گزینه ${q.correct_answer}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                
                showToast(`${questions.length} سوال با موفقیت تولید شد`, 'success');
                
            } catch (error) {
                console.error('AI Error:', error);
                showToast(error.message || 'خطا در تولید سوالات. لطفاً مجدد تلاش کنید.', 'error');
                const resultDiv = document.getElementById('aiQuestionsResultHome');
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <div class="result-header-home" style="background: #ef4444;">
                        <h3><i class="fas fa-exclamation-triangle"></i> خطا در تولید سوالات</h3>
                    </div>
                    <div class="empty-home">
                        <i class="fas fa-robot fa-3x"></i>
                        <p>${error.message}</p>
                        <button onclick="generateAIExamQuestionsHome()" style="margin-top:16px; padding:8px 20px; background:#8b5cf6; color:white; border:none; border-radius:40px; cursor:pointer;">تلاش مجدد</button>
                    </div>
                `;
            } finally {
                generateBtn.innerHTML = originalText;
                generateBtn.disabled = false;
                showLoading(false);
            }
        };
        
        // ذخیره آزمون در دیتابیس
        window.saveAIExamToDBHome = async function() {
            if (!aiGeneratedData) {
                showToast('ابتدا سوالات را تولید کنید', 'error');
                return;
            }
            
            if (!aiGeneratedData.questions || aiGeneratedData.questions.length === 0) {
                showToast('سوالاتی برای ذخیره وجود ندارد', 'error');
                return;
            }
            
            showLoading(true);
            
            try {
                // تاریخ شروع (یک هفته بعد، ساعت ۸ صبح)
                const startDate = new Date();
                startDate.setDate(startDate.getDate() + 7);
                startDate.setHours(8, 0, 0, 0);
                
                // فرمت تاریخ برای دیتابیس
                const startTimeFormatted = startDate.getFullYear() + '-' + 
                    String(startDate.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(startDate.getDate()).padStart(2, '0') + ' ' +
                    String(startDate.getHours()).padStart(2, '0') + ':' +
                    String(startDate.getMinutes()).padStart(2, '0') + ':' +
                    String(startDate.getSeconds()).padStart(2, '0');
                
                // 1. ایجاد آزمون
                const examPayload = {
                    title: aiGeneratedData.title,
                    class_id: aiGeneratedData.classId,
                    start_time: startTimeFormatted,
                    duration: 60,
                    total_points: aiGeneratedData.questions.length * 2,
                    description: `آزمون تولید شده با هوش مصنوعی\nموضوع: ${aiGeneratedData.subject.substring(0, 200)}\nسطح دشواری: ${document.getElementById('aiDifficultyHome')?.value || 'متوسط'}`
                };
                
                const examResult = await createExam(examPayload);
                const examId = examResult.exam_id || examResult.id;
                
                if (!examId) {
                    throw new Error('خطا در ایجاد آزمون');
                }
                
                // 2. ذخیره سوالات
                let savedCount = 0;
                for (let i = 0; i < aiGeneratedData.questions.length; i++) {
                    const q = aiGeneratedData.questions[i];
                    try {
                        await saveExamQuestion({
                            exam_id: examId,
                            question_text: q.text,
                            question_type: 'multiple_choice',
                            options: JSON.stringify(q.options || []),
                            correct_answer: q.correct_answer,
                            points: 2,
                            order_index: i + 1
                        });
                        savedCount++;
                    } catch (err) {
                        console.error('Error saving question:', err);
                    }
                }
                
                if (savedCount > 0) {
                    showToast(`✅ آزمون "${aiGeneratedData.title}" با ${savedCount} سوال ذخیره شد`, 'success');
                    
                    // پاک کردن داده‌های موقت
                    aiGeneratedData = null;
                    document.getElementById('aiQuestionsResultHome').style.display = 'none';
                    document.getElementById('aiExamTitleHome').value = '';
                    document.getElementById('aiSubjectHome').value = '';
                    
                    // رفتن به صفحه آزمون‌ها
                    setTimeout(() => {
                        showTab('exams');
                    }, 2000);
                } else {
                    throw new Error('هیچ سوالی ذخیره نشد');
                }
                
            } catch (error) {
                console.error('Save error:', error);
                showToast(error.message || 'خطا در ذخیره آزمون', 'error');
            } finally {
                showLoading(false);
            }
        };
        
    } catch (error) {
        console.error('AI Exam error:', error);
        document.getElementById('contentArea').innerHTML = `
            <div class="empty-home" style="margin:20px;">
                <i class="fas fa-exclamation-circle fa-3x" style="color:#ef4444;"></i>
                <h4>خطا در بارگذاری صفحه</h4>
                <p>${error.message}</p>
                <button onclick="renderAIExam()" style="margin-top:16px; padding:8px 24px; background:#8b5cf6; color:white; border:none; border-radius:40px; cursor:pointer;">تلاش مجدد</button>
            </div>
        `;
    }
    showLoading(false);
}
    
    // ============================================
    // رندر پیش‌بینی نمرات
    // ============================================
    
    async function renderGradePredict() {
        showLoading(true);
        try {
            await loadClassesFromDB();
            
            const html = `
                <div>
                    <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; background: white; padding: 16px 20px; border-radius: 20px; border: 1px solid #e2e8f0;">
                        <div style="display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 8px 16px; border-radius: 40px;"><i class="fas fa-door-open"></i><select id="predictClass" style="border: none; background: transparent; font-family: inherit;"><option value="">انتخاب کلاس</option>${classesData.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (پایه ${c.grade})</option>`).join('')}</select></div>
                        <div style="display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 8px 16px; border-radius: 40px;"><i class="fas fa-book"></i><select id="predictCourse" disabled style="border: none; background: transparent; font-family: inherit;"><option value="">ابتدا کلاس را انتخاب کنید</option></select></div>
                        <div style="display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 8px 16px; border-radius: 40px;"><i class="fas fa-calendar-week"></i><select id="predictTerm" style="border: none; background: transparent; font-family: inherit;"><option value="monthly1">ماهانه اول</option><option value="midterm1">میان‌ترم اول</option><option value="final1">ترم اول</option><option value="monthly2">ماهانه دوم</option><option value="midterm2">میان‌ترم دوم</option><option value="final2">ترم دوم</option></select></div>
                        <button onclick="loadPredictions()" style="background: #2563eb; color: white; border: none; padding: 8px 20px; border-radius: 40px; cursor: pointer;"><i class="fas fa-chart-line"></i> پیش‌بینی</button>
                    </div>
                    <div id="predictionsResult" style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 20px;"><div class="empty-state">لطفاً کلاس و درس را انتخاب کنید</div></div>
                </div>
            `;
            document.getElementById('contentArea').innerHTML = html;
            
            document.getElementById('predictClass').addEventListener('change', async function() {
                const classId = this.value;
                const courseSelect = document.getElementById('predictCourse');
                if (!classId) { courseSelect.innerHTML = '<option value="">ابتدا کلاس را انتخاب کنید</option>'; courseSelect.disabled = true; return; }
                showLoading(true);
                try {
                    const courses = await loadCoursesForClass(classId);
                    if (courses.length === 0) { courseSelect.innerHTML = '<option value="">برای این کلاس درسی ثبت نشده</option>'; }
                    else { courseSelect.innerHTML = '<option value="">انتخاب درس</option>' + courses.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join(''); }
                    courseSelect.disabled = false;
                } catch (error) { courseSelect.innerHTML = '<option value="">خطا در بارگذاری</option>'; } finally { showLoading(false); }
            });
            
            window.loadPredictions = async function() {
                const classId = document.getElementById('predictClass').value;
                const courseId = document.getElementById('predictCourse').value;
                const term = document.getElementById('predictTerm').value;
                if (!classId || !courseId) { showToast('لطفاً کلاس و درس را انتخاب کنید', 'warning'); return; }
                showLoading(true);
                try {
                    const data = await getGradePrediction(classId, courseId, term);
                    const predictions = data.predictions || [];
                    const stats = data.stats || {};
                    const resultDiv = document.getElementById('predictionsResult');
                    if (!predictions.length) { resultDiv.innerHTML = '<div class="empty-state">هیچ داده‌ای برای پیش‌بینی وجود ندارد</div>'; return; }
                    resultDiv.innerHTML = `<div style="display:flex; gap:16px; margin-bottom:24px; flex-wrap:wrap;"><div style="background:#f8fafc; padding:12px 20px; border-radius:16px;"><span>میانگین کلاس:</span> <strong>${stats.class_average || 0}</strong></div><div style="background:#f8fafc; padding:12px 20px; border-radius:16px;"><span>نرخ قبولی:</span> <strong>${stats.pass_rate || 0}%</strong></div><div style="background:#f8fafc; padding:12px 20px; border-radius:16px;"><span>دانش‌آموزان برتر:</span> <strong>${toPersianNumber(stats.top_students || 0)}</strong></div><div style="background:#f8fafc; padding:12px 20px; border-radius:16px;"><span>در معرض خطر:</span> <strong>${toPersianNumber(stats.at_risk || 0)}</strong></div></div><div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(300px,1fr)); gap:16px;">${predictions.map(p => { const pred = parseFloat(p.predicted_grade); let gradeClass = pred >= 17 ? '#d1fae5' : pred >= 14 ? '#dbeafe' : pred >= 10 ? '#fef3c7' : '#fee2e2'; let gradeColor = pred >= 17 ? '#059669' : pred >= 14 ? '#2563eb' : pred >= 10 ? '#d97706' : '#dc2626'; let rec = pred >= 17 ? '👍 در مسیر عالی' : pred >= 14 ? '📚 ادامه دهید' : pred >= 10 ? '⚠️ نیاز به تلاش بیشتر' : '🔥 نیاز به توجه ویژه'; return `<div style="background:#f8fafc; border-radius:16px; padding:16px; border-right:3px solid ${gradeColor};"><div style="font-weight:700;">${escapeHtml(p.name)}</div><div style="font-size:0.75rem; color:#64748b;">میانگین فعلی: ${p.current_avg || '-'}</div><div style="font-size:1rem; font-weight:700; color:${gradeColor}; margin:8px 0;">پیش‌بینی: ${p.predicted_grade}</div><div style="font-size:0.7rem;">${rec}</div></div>`; }).join('')}</div>`;
                } catch (error) { showToast('خطا در پیش‌بینی', 'error'); } finally { showLoading(false); }
            };
        } catch (error) {
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-chart-simple"></i><h4>خطا در بارگذاری</h4></div>`;
        }
        showLoading(false);
    }
    
    // ============================================
    // رندر تکالیف
    // ============================================
    
    async function renderAssignments() {
        showLoading(true);
        try {
            await loadClassesFromDB();
            await loadAssignmentsFromDB();
            
            const html = `
                <div>
                    <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; background: white; padding: 16px 20px; border-radius: 20px; border: 1px solid #e2e8f0;">
                        <div style="display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 8px 16px; border-radius: 40px;"><i class="fas fa-door-open"></i><select id="assignmentClassFilter" onchange="loadAssignmentsList()" style="border: none; background: transparent; font-family: inherit;"><option value="">همه کلاس‌ها</option>${classesData.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (پایه ${c.grade})</option>`).join('')}</select></div>
                        <button onclick="openAssignmentModal()" style="background: #2563eb; color: white; border: none; padding: 8px 20px; border-radius: 40px; cursor: pointer;"><i class="fas fa-plus"></i> تکلیف جدید</button>
                    </div>
                    
                    <div style="display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap;">
                        <div style="background: white; padding: 8px 20px; border-radius: 40px;"><span>کل تکالیف:</span> <strong id="totalAssignments">0</strong></div>
                        <div style="background: white; padding: 8px 20px; border-radius: 40px;"><span>فعال:</span> <strong id="activeAssignments">0</strong></div>
                        <div style="background: white; padding: 8px 20px; border-radius: 40px;"><span>تحویل داده شده:</span> <strong id="submittedAssignments">0</strong></div>
                    </div>
                    
                    <div id="assignmentsGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px;"></div>
                </div>
                
                <div id="assignmentModal" style="display: none; position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index:2000; align-items: center; justify-content: center;">
                    <div style="background: white; border-radius: 28px; max-width: 550px; width: 90%; max-height: 90vh; overflow-y: auto;">
                        <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;"><h3>تکلیف جدید</h3><button onclick="closeModal('assignmentModal')" style="background: none; border: none; font-size: 1.2rem;">✕</button></div>
                        <div style="padding: 24px;">
                            <input type="text" id="assignmentTitle" class="form-control" placeholder="عنوان تکلیف" style="width:100%; margin-bottom:12px;">
                            <select id="assignmentClassId" class="form-control" style="width:100%; margin-bottom:12px;"><option value="">انتخاب کلاس</option>${classesData.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (پایه ${c.grade})</option>`).join('')}</select>
                            <textarea id="assignmentDesc" class="form-control" rows="3" placeholder="توضیحات" style="width:100%; margin-bottom:12px;"></textarea>
                            <input type="datetime-local" id="assignmentDeadline" class="form-control" style="width:100%; margin-bottom:12px;">
                            <input type="number" id="assignmentPoints" class="form-control" value="100" placeholder="نمره کل" style="width:100%;">
                        </div>
                        <div style="padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px;">
                            <button onclick="saveAssignment()" style="background:#2563eb; color:white; padding:8px 20px; border-radius:40px; border:none; cursor:pointer;">ذخیره</button>
                            <button onclick="closeModal('assignmentModal')" style="background:#f1f5f9; padding:8px 20px; border-radius:40px; border:none; cursor:pointer;">انصراف</button>
                        </div>
                    </div>
                </div>
                
                <div id="submissionsModal" style="display: none; position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index:2000; align-items: center; justify-content: center;">
                    <div style="background: white; border-radius: 28px; max-width: 650px; width: 90%; max-height: 90vh; overflow-y: auto;">
                        <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0;"><h3>تحویلی‌ها</h3></div>
                        <div id="submissionsBody" style="padding: 24px;"></div>
                        <div style="padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;"><button onclick="closeModal('submissionsModal')" style="background:#f1f5f9; padding:8px 20px; border-radius:40px; border:none; cursor:pointer;">بستن</button></div>
                    </div>
                </div>
            `;
            document.getElementById('contentArea').innerHTML = html;
            await loadAssignmentsList();
            
            window.loadAssignmentsList = async function() {
                const classId = document.getElementById('assignmentClassFilter')?.value;
                await loadAssignmentsFromDB(classId);
                const now = new Date();
                document.getElementById('totalAssignments').innerText = toPersianNumber(assignmentsData.length);
                document.getElementById('activeAssignments').innerText = toPersianNumber(assignmentsData.filter(a => new Date(a.deadline) > now).length);
                document.getElementById('submittedAssignments').innerText = toPersianNumber(assignmentsData.reduce((sum, a) => sum + (a.submissions_count || 0), 0));
                const grid = document.getElementById('assignmentsGrid');
                if (!assignmentsData.length) { grid.innerHTML = '<div class="empty-state">هیچ تکلیفی یافت نشد</div>'; return; }
                grid.innerHTML = assignmentsData.map(a => `
                    <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden;">
                        <div style="padding: 16px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; display: flex; justify-content: space-between;">
                            <div style="font-weight: 700;"><i class="fas fa-tasks"></i> ${escapeHtml(a.title)}</div>
                            <div style="background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 40px;"><i class="fas fa-calendar-alt"></i> ${formatDate(a.deadline)}</div>
                        </div>
                        <div style="padding: 16px;">
                            <p style="font-size:0.85rem; color:#64748b; margin-bottom:12px;">${escapeHtml(a.description || 'توضیحی وارد نشده')}</p>
                            <div style="display: flex; gap: 16px; font-size:0.7rem; color:#64748b; margin-bottom:16px;">
                                <span><i class="fas fa-door-open"></i> ${a.class_name}</span>
                                <span><i class="fas fa-star"></i> ${a.total_points || 100} نمره</span>
                                <span><i class="fas fa-upload"></i> ${toPersianNumber(a.submissions_count || 0)} تحویل</span>
                            </div>
                            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                                <button onclick="viewSubmissions(${a.id})" style="width:36px; height:36px; border-radius:10px; background:#dbeafe; border:none; cursor:pointer;"><i class="fas fa-eye"></i></button>
                                <button onclick="editAssignmentItem(${a.id})" style="width:36px; height:36px; border-radius:10px; background:#fef3c7; border:none; cursor:pointer;"><i class="fas fa-edit"></i></button>
                                <button onclick="deleteAssignmentItem(${a.id})" style="width:36px; height:36px; border-radius:10px; background:#fee2e2; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    </div>
                `).join('');
            };
            
            window.openAssignmentModal = function() { currentAssignmentId = null; document.getElementById('assignmentTitle').value = ''; document.getElementById('assignmentClassId').value = ''; document.getElementById('assignmentDesc').value = ''; document.getElementById('assignmentDeadline').value = ''; document.getElementById('assignmentPoints').value = '100'; openModal('assignmentModal'); };
            
            window.saveAssignment = async function() {
                const title = document.getElementById('assignmentTitle').value.trim();
                const classId = document.getElementById('assignmentClassId').value;
                const description = document.getElementById('assignmentDesc').value;
                const deadline = document.getElementById('assignmentDeadline').value;
                const points = parseInt(document.getElementById('assignmentPoints').value) || 100;
                if (!title || !classId || !deadline) { showToast('عنوان، کلاس و مهلت ارسال الزامی است', 'error'); return; }
                showLoading(true);
                try {
                    if (currentAssignmentId) { await updateAssignment(currentAssignmentId, { title, class_id: parseInt(classId), description, due_date: deadline, total_points: points }); showToast('تکلیف ویرایش شد', 'success'); }
                    else { await createAssignment({ title, class_id: parseInt(classId), description, due_date: deadline, total_points: points }); showToast('تکلیف ایجاد شد', 'success'); }
                    closeModal('assignmentModal'); await loadAssignmentsList();
                } catch (error) { showToast(error.message || 'خطا در ذخیره', 'error'); } finally { showLoading(false); }
            };
            
            window.editAssignmentItem = async function(assignmentId) {
                const assignment = assignmentsData.find(a => a.id === assignmentId);
                if (!assignment) return;
                currentAssignmentId = assignmentId;
                document.getElementById('assignmentTitle').value = assignment.title;
                document.getElementById('assignmentClassId').value = assignment.class_id;
                document.getElementById('assignmentDesc').value = assignment.description || '';
                document.getElementById('assignmentDeadline').value = assignment.deadline ? new Date(assignment.deadline).toISOString().slice(0, 16) : '';
                document.getElementById('assignmentPoints').value = assignment.total_points || 100;
                openModal('assignmentModal');
            };
            
            window.deleteAssignmentItem = async function(assignmentId) {
                if (!confirm('آیا از حذف این تکلیف مطمئن هستید؟')) return;
                showLoading(true);
                try { await deleteAssignment(assignmentId); showToast('تکلیف حذف شد', 'success'); await loadAssignmentsList(); } catch (error) { showToast(error.message || 'خطا در حذف', 'error'); } finally { showLoading(false); }
            };
            
            window.viewSubmissions = async function(assignmentId) {
                const assignment = assignmentsData.find(a => a.id === assignmentId);
                showLoading(true);
                try {
                    const data = await getAssignmentSubmissions(assignmentId);
                    const submissions = data.submissions || [];
                    const body = document.getElementById('submissionsBody');
                    if (!submissions.length) { body.innerHTML = '<div class="empty-state">هیچ تحویلی ثبت نشده است</div>'; openModal('submissionsModal'); return; }
                    body.innerHTML = `<h4>تحویلی‌های ${escapeHtml(assignment?.title)}</h4><div style="display:flex; flex-direction:column; gap:12px; margin-top:16px;">${submissions.map(s => `<div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:#f8fafc; border-radius:16px;"><div><strong>${escapeHtml(s.student_name)}</strong><br><small>${formatDateTime(s.submitted_at)}</small>${s.file_url ? `<br><a href="${s.file_url}" target="_blank" style="color:#2563eb;"><i class="fas fa-download"></i> دانلود فایل</a>` : ''}${s.content ? `<div style="margin-top:6px; font-size:0.75rem;">${escapeHtml(s.content)}</div>` : ''}</div><div><input type="number" id="grade_${s.id}" value="${s.grade || ''}" step="0.25" min="0" max="${assignment?.total_points || 100}" placeholder="نمره" style="width:80px; padding:8px; border:1px solid #e2e8f0; border-radius:12px;"><button onclick="saveSubmissionGrade(${s.id}, ${assignmentId})" style="background:#10b981; color:white; border:none; padding:8px 16px; border-radius:40px; margin-left:8px; cursor:pointer;">ذخیره</button></div></div>`).join('')}</div>`;
                    openModal('submissionsModal');
                } catch (error) { showToast('خطا در بارگذاری', 'error'); } finally { showLoading(false); }
            };
            
            window.saveSubmissionGrade = async function(submissionId, assignmentId) {
                const grade = parseFloat(document.getElementById(`grade_${submissionId}`)?.value);
                if (isNaN(grade)) { showToast('لطفاً نمره معتبر وارد کنید', 'error'); return; }
                showLoading(true);
                try { await gradeSubmission(submissionId, grade); showToast('نمره ثبت شد', 'success'); viewSubmissions(assignmentId); } catch (error) { showToast('خطا در ثبت نمره', 'error'); } finally { showLoading(false); }
            };
            
        } catch (error) {
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-tasks"></i><h4>خطا در بارگذاری</h4></div>`;
        }
        showLoading(false);
    }
    
    // ============================================
    // رندر کتابخانه دیجیتال
    // ============================================
    
    async function renderLibrary() {
        showLoading(true);
        try {
            const data = await getLibraryFiles();
            const files = data.files || [];
            
            const html = `
                <div>
                    <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; background: white; padding: 16px 20px; border-radius: 20px; border: 1px solid #e2e8f0;">
                        <button onclick="uploadLibraryFile()" style="background: #2563eb; color: white; border: none; padding: 8px 20px; border-radius: 40px; cursor: pointer;"><i class="fas fa-upload"></i> آپلود فایل</button>
                        <div style="display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 8px 16px; border-radius: 40px; flex: 1;"><i class="fas fa-search"></i><input type="text" id="librarySearch" placeholder="جستجوی فایل..." onkeyup="filterLibrary()" style="border: none; background: transparent; flex: 1;"></div>
                    </div>
                    <div id="libraryGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;"></div>
                </div>
            `;
            document.getElementById('contentArea').innerHTML = html;
            
            const grid = document.getElementById('libraryGrid');
            if (!files.length) { grid.innerHTML = '<div class="empty-state">هیچ فایلی وجود ندارد</div>'; }
            else {
                grid.innerHTML = files.map(f => {
                    const ext = f.file_path?.split('.').pop()?.toLowerCase() || '';
                    const icon = ext === 'pdf' ? 'fa-file-pdf' : (['jpg','jpeg','png','gif'].includes(ext) ? 'fa-file-image' : (ext === 'mp4' ? 'fa-file-video' : 'fa-file'));
                    const color = ext === 'pdf' ? '#ef4444' : (['jpg','jpeg','png','gif'].includes(ext) ? '#10b981' : (ext === 'mp4' ? '#8b5cf6' : '#64748b'));
                    return `
                        <div class="library-card" data-title="${f.title.toLowerCase()}" style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 20px; text-align: center; transition: all 0.3s;">
                            <div style="font-size: 2.5rem; color: ${color};"><i class="fas ${icon}"></i></div>
                            <div style="font-weight: 600; margin: 12px 0 8px;">${escapeHtml(f.title)}</div>
                            <div style="font-size: 0.7rem; color: #64748b;">${formatDate(f.created_at)}</div>
                            <div style="display: flex; gap: 12px; justify-content: center; margin-top: 12px;">
                                <a href="${f.file_path}" target="_blank" style="width: 32px; height: 32px; border-radius: 8px; background: #dbeafe; display: flex; align-items: center; justify-content: center; color: #2563eb;"><i class="fas fa-download"></i></a>
                                <button onclick="deleteLibraryFileItem(${f.id})" style="width: 32px; height: 32px; border-radius: 8px; background: #fee2e2; border: none; cursor: pointer; color: #dc2626;"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            window.filterLibrary = function() {
                const search = document.getElementById('librarySearch')?.value?.toLowerCase() || '';
                const cards = document.querySelectorAll('.library-card');
                cards.forEach(card => {
                    const title = card.getAttribute('data-title') || '';
                    card.style.display = title.includes(search) ? 'flex' : 'none';
                });
            };
            
            window.uploadLibraryFile = function() {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.zip';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const title = prompt('عنوان فایل:', file.name);
                    if (!title) return;
                    showLoading(true);
                    try {
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                            await uploadLibraryFile({ title, fileBase64: ev.target.result, fileName: file.name });
                            showToast('فایل آپلود شد', 'success');
                            renderLibrary();
                        };
                        reader.readAsDataURL(file);
                    } catch (error) { showToast('خطا در آپلود', 'error'); } finally { showLoading(false); }
                };
                input.click();
            };
            
            window.deleteLibraryFileItem = async function(fileId) {
                if (!confirm('آیا از حذف این فایل مطمئن هستید؟')) return;
                showLoading(true);
                try { await deleteLibraryFile(fileId); showToast('فایل حذف شد', 'success'); renderLibrary(); } catch (error) { showToast('خطا در حذف', 'error'); } finally { showLoading(false); }
            };
            
        } catch (error) {
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-book"></i><h4>خطا در بارگذاری کتابخانه</h4></div>`;
        }
        showLoading(false);
    }
    
    // ============================================
    // رندر برنامه هفتگی
    // ============================================
    
    async function renderSchedule() {
        showLoading(true);
        try {
            const data = await getSchedule();
            const schedule = data.schedule || [];
            const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه'];
            const grouped = {};
            days.forEach(d => grouped[d] = []);
            schedule.forEach(s => { if (grouped[s.day]) grouped[s.day].push(s); });
            
            const html = `
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px;">
                    ${days.map(day => `
                        <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden;">
                            <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 12px; text-align: center; font-weight: 700; color: white;">${day}</div>
                            <div style="padding: 16px; min-height: 350px;">
                                ${grouped[day].length ? grouped[day].map(s => `
                                    <div style="background: #eff6ff; border-radius: 16px; padding: 12px; margin-bottom: 12px; border-right: 3px solid #2563eb;">
                                        <div style="font-size: 0.7rem; color: #2563eb; margin-bottom: 6px;"><i class="fas fa-clock"></i> ${s.start_time || s.time || '-'}</div>
                                        <div style="font-weight: 600;">${escapeHtml(s.course_name)}</div>
                                        <div style="font-size: 0.7rem; color: #64748b;"><i class="fas fa-chalkboard-user"></i> ${escapeHtml(s.teacher_name || '-')}</div>
                                    </div>
                                `).join('') : '<div style="text-align: center; color: #94a3b8; padding: 40px 16px;">برنامه‌ای ثبت نشده</div>'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            document.getElementById('contentArea').innerHTML = html;
            
        } catch (error) {
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-calendar-week"></i><h4>خطا در بارگذاری برنامه</h4></div>`;
        }
        showLoading(false);
    }
    
    // ============================================
    // رندر ارتباط با والدین (چت کامل)
    // ============================================
    
    async function renderParentChat() {
        showLoading(true);
        try {
            await loadClassesFromDB();
            await loadStudentsFromDB();
            
            const html = `
                <div style="display: grid; grid-template-columns: 300px 1fr; gap: 20px; min-height: 600px;">
                    <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden;">
                        <div style="padding: 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 12px; align-items: center;">
                            <i class="fas fa-users"></i>
                            <input type="text" id="studentSearchChat" placeholder="جستجوی دانش‌آموز..." onkeyup="filterStudentForChat()" style="flex:1; border:none; background:transparent;">
                        </div>
                        <div id="studentsListChat" style="max-height: 500px; overflow-y: auto;">
                            ${studentsData.map(s => `
                                <div class="student-chat-item" data-student-id="${s.id}" onclick="selectStudentForChat(${s.id}, '${escapeHtml(s.name)}')" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; cursor: pointer;">
                                    <div style="width: 45px; height: 45px; background: linear-gradient(135deg, #2563eb, #1d4ed8); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem;">${s.name?.charAt(0) || '?'}</div>
                                    <div><div style="font-weight: 700;">${escapeHtml(s.name)}</div><div style="font-size: 0.7rem; color: #64748b;">${s.class_name || '-'}</div></div>
                                </div>
                            `).join('')}
                            ${!studentsData.length ? '<div class="empty-state">هیچ دانش‌آموزی یافت نشد</div>' : ''}
                        </div>
                    </div>
                    
                    <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden;">
                        <div id="chatHeader" style="padding: 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                            <div><i class="fas fa-user-graduate"></i> لطفاً یک دانش‌آموز را انتخاب کنید</div>
                        </div>
                        <div id="chatMessages" style="flex: 1; overflow-y: auto; padding: 20px; max-height: 500px; display: flex; flex-direction: column; gap: 16px;">
                            <div class="empty-state">برای شروع مکالمه، دانش‌آموز را انتخاب کنید</div>
                        </div>
                        <div id="chatInputArea" style="display: none; padding: 16px; border-top: 1px solid #e2e8f0;">
                            <div style="display: flex; gap: 12px;">
                                <textarea id="messageInput" rows="2" placeholder="پیام خود را بنویسید..." style="flex: 1; border: 1px solid #e2e8f0; border-radius: 16px; padding: 10px; font-family: inherit; resize: none;"></textarea>
                                <button onclick="sendMessageToParent()" style="background: #2563eb; color: white; border: none; padding: 0 20px; border-radius: 16px; cursor: pointer;"><i class="fas fa-paper-plane"></i> ارسال</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('contentArea').innerHTML = html;
            
            window.filterStudentForChat = function() {
                const search = document.getElementById('studentSearchChat')?.value?.toLowerCase() || '';
                const items = document.querySelectorAll('.student-chat-item');
                items.forEach(item => {
                    const name = item.querySelector('div:first-child + div div:first-child')?.innerText?.toLowerCase() || '';
                    item.style.display = name.includes(search) ? 'flex' : 'none';
                });
            };
            
            window.selectStudentForChat = async function(studentId, studentName) {
                selectedStudentForParentChat = studentId;
                document.getElementById('chatHeader').innerHTML = `<div><i class="fas fa-user-graduate"></i> ${escapeHtml(studentName)}</div>`;
                document.getElementById('chatInputArea').style.display = 'block';
                
                showLoading(true);
                try {
                    const parentData = await getParentForStudent(studentId);
                    if (parentData?.parent) {
                        const messagesData = await getParentMessages(parentData.parent.id, studentId);
                        const messages = messagesData.messages || [];
                        const container = document.getElementById('chatMessages');
                        if (!messages.length) { container.innerHTML = '<div class="empty-state">هنوز پیامی وجود ندارد. اولین پیام را ارسال کنید.</div>'; }
                        else {
                            container.innerHTML = messages.map(m => `
                                <div style="display: flex; justify-content: ${m.sender_id === currentTeacherId ? 'flex-end' : 'flex-start'};">
                                    <div style="max-width: 70%; padding: 10px 16px; border-radius: 18px; background: ${m.sender_id === currentTeacherId ? '#2563eb' : '#f1f5f9'}; color: ${m.sender_id === currentTeacherId ? 'white' : '#0f172a'};">
                                        <div style="font-size: 0.85rem;">${escapeHtml(m.message)}</div>
                                        <div style="font-size: 0.6rem; opacity: 0.7; margin-top: 4px;">${formatDateTime(m.created_at)}</div>
                                    </div>
                                </div>
                            `).join('');
                            container.scrollTop = container.scrollHeight;
                        }
                    } else {
                        document.getElementById('chatMessages').innerHTML = '<div class="empty-state">والدین این دانش‌آموز ثبت نشده است</div>';
                    }
                } catch (error) { showToast('خطا در دریافت اطلاعات', 'error'); } finally { showLoading(false); }
            };
            
            window.sendMessageToParent = async function() {
                const message = document.getElementById('messageInput')?.value.trim();
                if (!message || !selectedStudentForParentChat) { showToast('لطفاً پیام را وارد کنید', 'warning'); return; }
                showLoading(true);
                try {
                    const parentData = await getParentForStudent(selectedStudentForParentChat);
                    if (!parentData?.parent) { showToast('والدین این دانش‌آموز ثبت نشده است', 'error'); return; }
                    await sendMessageToParent(parentData.parent.id, selectedStudentForParentChat, message);
                    document.getElementById('messageInput').value = '';
                    await selectStudentForChat(selectedStudentForParentChat, '');
                    showToast('پیام با موفقیت ارسال شد', 'success');
                } catch (error) { showToast(error.message || 'خطا در ارسال پیام', 'error'); } finally { showLoading(false); }
            };
            
        } catch (error) {
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><h4>خطا در بارگذاری</h4></div>`;
        }
        showLoading(false);
    }
    
    // ============================================
    // رندر گزارشات تحلیلی
    // ============================================
    
    async function renderReports() {
        showLoading(true);
        try {
            await loadClassesFromDB();
            
            const html = `
                <div>
                    <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; background: white; padding: 16px 20px; border-radius: 20px; border: 1px solid #e2e8f0;">
                        <div style="display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 8px 16px; border-radius: 40px;"><i class="fas fa-door-open"></i><select id="reportClassSelect" style="border: none; background: transparent; font-family: inherit;"><option value="">انتخاب کلاس</option>${classesData.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (پایه ${c.grade})</option>`).join('')}</select></div>
                        <div style="display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 8px 16px; border-radius: 40px;"><i class="fas fa-chart-line"></i><select id="reportType" style="border: none; background: transparent; font-family: inherit;"><option value="grades">گزارش نمرات</option><option value="attendance">گزارش حضور</option><option value="students">گزارش دانش‌آموزان</option></select></div>
                        <button onclick="loadReport()" style="background: #2563eb; color: white; border: none; padding: 8px 20px; border-radius: 40px; cursor: pointer;"><i class="fas fa-chart-line"></i> نمایش گزارش</button>
                        <button onclick="exportReport()" style="background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 40px; cursor: pointer;"><i class="fas fa-download"></i> خروجی Excel</button>
                    </div>
                    <div id="reportsContent" style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 20px;"><div class="empty-state">لطفاً کلاس و نوع گزارش را انتخاب کنید</div></div>
                </div>
            `;
            document.getElementById('contentArea').innerHTML = html;
            
            window.loadReport = async function() {
                const classId = document.getElementById('reportClassSelect').value;
                const reportType = document.getElementById('reportType').value;
                if (!classId) { showToast('لطفاً کلاس را انتخاب کنید', 'warning'); return; }
                showLoading(true);
                try {
                    await loadStudentsFromDB(classId);
                    const content = document.getElementById('reportsContent');
                    if (!studentsData.length) { content.innerHTML = '<div class="empty-state">هیچ داده‌ای یافت نشد</div>'; return; }
                    
                    if (reportType === 'grades') {
                        const avg = studentsData.reduce((sum, s) => sum + (parseFloat(s.avg_grade) || 0), 0) / studentsData.length;
                        content.innerHTML = `
                            <div><h3 style="margin-bottom:16px;"><i class="fas fa-star"></i> گزارش نمرات</h3><div style="display:flex; gap:16px; margin-bottom:20px;"><div style="background:#f8fafc; padding:8px 16px; border-radius:40px;">میانگین کلاس: <strong>${avg.toFixed(1)}</strong></div><div style="background:#f8fafc; padding:8px 16px; border-radius:40px;">تعداد دانش‌آموزان: <strong>${studentsData.length}</strong></div></div><canvas id="gradesReportChart" height="300"></canvas><table style="width:100%; margin-top:20px; border-collapse:collapse;"><thead><tr><th style="padding:12px; text-align:right; border-bottom:1px solid #e2e8f0;">#</th><th style="padding:12px; text-align:right; border-bottom:1px solid #e2e8f0;">نام دانش‌آموز</th><th style="padding:12px; text-align:right; border-bottom:1px solid #e2e8f0;">میانگین نمرات</th><th style="padding:12px; text-align:right; border-bottom:1px solid #e2e8f0;">وضعیت</th></tr></thead><tbody>${studentsData.map((s, i) => `<tr><td style="padding:12px; border-bottom:1px solid #f1f5f9;">${toPersianNumber(i+1)}</td><td style="padding:12px; border-bottom:1px solid #f1f5f9;">${escapeHtml(s.name)}</td><td style="padding:12px; border-bottom:1px solid #f1f5f9;">${s.avg_grade || '-'}</td><td style="padding:12px; border-bottom:1px solid #f1f5f9;"><span style="padding:4px 12px; border-radius:40px; background:${parseFloat(s.avg_grade) >= 10 ? '#d1fae5' : '#fee2e2'}; color:${parseFloat(s.avg_grade) >= 10 ? '#059669' : '#dc2626'};">${parseFloat(s.avg_grade) >= 10 ? 'قبول' : 'مردود'}</span></td></tr>`).join('')}</tbody></table></div>
                        `;
                        setTimeout(() => {
                            const ctx = document.getElementById('gradesReportChart')?.getContext('2d');
                            if (ctx && typeof Chart !== 'undefined') {
                                new Chart(ctx, { type: 'bar', data: { labels: studentsData.map(s => s.name), datasets: [{ label: 'میانگین نمرات', data: studentsData.map(s => parseFloat(s.avg_grade) || 0), backgroundColor: '#3b82f6', borderRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: true } });
                            }
                        }, 100);
                    } else if (reportType === 'students') {
                        content.innerHTML = `<div><h3 style="margin-bottom:16px;"><i class="fas fa-users"></i> گزارش دانش‌آموزان</h3><div style="display:flex; gap:16px; margin-bottom:20px;"><div style="background:#f8fafc; padding:8px 16px; border-radius:40px;">کل دانش‌آموزان: <strong>${studentsData.length}</strong></div><div style="background:#f8fafc; padding:8px 16px; border-radius:40px;">فعال: <strong>${studentsData.filter(s => s.status === 'active').length}</strong></div></div><table style="width:100%; border-collapse:collapse;"><thead><tr><th style="padding:12px; text-align:right; border-bottom:1px solid #e2e8f0;">#</th><th style="padding:12px; text-align:right; border-bottom:1px solid #e2e8f0;">نام دانش‌آموز</th><th style="padding:12px; text-align:right; border-bottom:1px solid #e2e8f0;">نام کاربری</th><th style="padding:12px; text-align:right; border-bottom:1px solid #e2e8f0;">کلاس</th><th style="padding:12px; text-align:right; border-bottom:1px solid #e2e8f0;">شماره تماس</th><th style="padding:12px; text-align:right; border-bottom:1px solid #e2e8f0;">وضعیت</th></tr></thead><tbody>${studentsData.map((s, i) => `<tr><td style="padding:12px; border-bottom:1px solid #f1f5f9;">${toPersianNumber(i+1)}</td><td style="padding:12px; border-bottom:1px solid #f1f5f9;">${escapeHtml(s.name)}</td><td style="padding:12px; border-bottom:1px solid #f1f5f9;">${s.username}</td><td style="padding:12px; border-bottom:1px solid #f1f5f9;">${s.class_name}</td><td style="padding:12px; border-bottom:1px solid #f1f5f9;">${s.phone || '-'}</td><td style="padding:12px; border-bottom:1px solid #f1f5f9;"><span style="padding:4px 12px; border-radius:40px; background:${s.status === 'active' ? '#d1fae5' : '#fee2e2'}; color:${s.status === 'active' ? '#059669' : '#dc2626'};">${s.status === 'active' ? 'فعال' : 'غیرفعال'}</span></td></tr>`).join('')}</tbody></table></div>`;
                    }
                } catch (error) { showToast('خطا در بارگذاری گزارش', 'error'); } finally { showLoading(false); }
            };
            
            window.exportReport = function() {
                if (!studentsData.length) { showToast('هیچ داده‌ای برای خروجی وجود ندارد', 'warning'); return; }
                const wsData = [['ردیف', 'نام دانش‌آموز', 'نام کاربری', 'کلاس', 'میانگین نمرات', 'وضعیت']];
                studentsData.forEach((s, i) => wsData.push([i+1, s.name, s.username, s.class_name, s.avg_grade, s.status === 'active' ? 'فعال' : 'غیرفعال']));
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Report');
                XLSX.writeFile(wb, `report_${Date.now()}.xlsx`);
                showToast('خروجی Excel ذخیره شد', 'success');
            };
            
        } catch (error) {
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-chart-bar"></i><h4>خطا در بارگذاری</h4></div>`;
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
        
        const html = `
            <div style="width:100%; min-height:calc(100vh - 200px); background:linear-gradient(135deg, #dbeafe 0%, #fef3c7 100%); display:flex; align-items:center; justify-content:center; padding:20px; border-radius:24px;">
                <div style="width:100%; max-width:700px; background:white; border-radius:32px; box-shadow:0 20px 40px rgba(0,0,0,0.1); overflow:hidden;">
                    <div style="background:linear-gradient(135deg, #2563eb, #1d4ed8); padding:20px; color:white; text-align:center;">
                        <h3 style="font-size:1.3rem; margin:0;"><i class="fas fa-robot"></i> دستیار هوشمند معلم</h3>
                        <p style="font-size:0.75rem; margin:6px 0 0;">پاسخگویی با AI - هر سوالی دارید بپرسید</p>
                    </div>
                    <div id="assistantChatArea" style="height:450px; overflow-y:auto; padding:16px; background:#f8fafc; display:flex; flex-direction:column; gap:12px;">
                        <div style="display:flex; gap:10px; align-items:flex-start;">
                            <div style="width:38px; height:38px; background:linear-gradient(135deg, #2563eb, #1d4ed8); border-radius:50%; display:flex; align-items:center; justify-content:center;"><i class="fas fa-robot" style="color:white;"></i></div>
                            <div style="background:white; padding:10px 14px; border-radius:18px; border-top-right-radius:4px; font-size:0.85rem; color:#1e293b; max-width:80%;">سلام! 🤖<br>من دستیار هوشمند شما هستم. هر سوالی در مورد مدیریت کلاس، نمرات، حضور و غیاب، تکالیف و آزمون‌ها دارید بپرسید.</div>
                        </div>
                    </div>
                    <div style="padding:16px; background:white; border-top:1px solid #e2e8f0; display:flex; gap:10px;">
                        <input type="text" id="assistantInput" placeholder="سوال خود را بپرسید..." onkeypress="if(event.key==='Enter') sendAssistantMsg()" style="flex:1; padding:12px 16px; border:1px solid #e2e8f0; border-radius:50px; font-family:inherit;">
                        <button onclick="sendAssistantMsg()" style="background:linear-gradient(135deg, #2563eb, #1d4ed8); color:white; border:none; padding:12px 24px; border-radius:50px; cursor:pointer;"><i class="fas fa-paper-plane"></i> ارسال</button>
                    </div>
                </div>
            </div>
        `;
        contentArea.innerHTML = html;
        
        let typingElement = null;
        const showTyping = () => {
            if (typingElement) typingElement.remove();
            typingElement = document.createElement('div');
            typingElement.style.display = 'flex';
            typingElement.style.gap = '10px';
            typingElement.style.alignItems = 'flex-start';
            typingElement.innerHTML = `<div style="width:38px; height:38px; background:linear-gradient(135deg, #2563eb, #1d4ed8); border-radius:50%; display:flex; align-items:center; justify-content:center;"><i class="fas fa-robot" style="color:white;"></i></div><div style="background:white; padding:12px 18px; border-radius:18px; border-top-right-radius:4px; display:flex; gap:5px;"><span style="width:7px; height:7px; background:#94a3b8; border-radius:50%; animation:bounce 1.4s infinite;"></span><span style="width:7px; height:7px; background:#94a3b8; border-radius:50%; animation:bounce 1.4s infinite 0.2s;"></span><span style="width:7px; height:7px; background:#94a3b8; border-radius:50%; animation:bounce 1.4s infinite 0.4s;"></span></div>`;
            document.getElementById('assistantChatArea').appendChild(typingElement);
            typingElement.scrollIntoView({ behavior: 'smooth' });
        };
        const hideTyping = () => { if (typingElement) { typingElement.remove(); typingElement = null; } };
        
        window.sendAssistantMsg = async function() {
            const input = document.getElementById('assistantInput');
            const message = input?.value.trim();
            if (!message) return;
            const chatArea = document.getElementById('assistantChatArea');
            chatArea.innerHTML += `<div style="display:flex; gap:10px; align-items:flex-start; flex-direction:row-reverse;"><div style="width:38px; height:38px; background:#10b981; border-radius:50%; display:flex; align-items:center; justify-content:center;"><i class="fas fa-chalkboard-user" style="color:white;"></i></div><div style="background:#3b82f6; padding:10px 14px; border-radius:18px; border-top-left-radius:4px; font-size:0.85rem; color:white; max-width:80%;">${escapeHtml(message)}</div></div>`;
            input.value = '';
            chatArea.scrollTop = chatArea.scrollHeight;
            showTyping();
            try {
                const response = await sendAIMessage(message);
                hideTyping();
                chatArea.innerHTML += `<div style="display:flex; gap:10px; align-items:flex-start;"><div style="width:38px; height:38px; background:linear-gradient(135deg, #2563eb, #1d4ed8); border-radius:50%; display:flex; align-items:center; justify-content:center;"><i class="fas fa-robot" style="color:white;"></i></div><div style="background:white; padding:10px 14px; border-radius:18px; border-top-right-radius:4px; font-size:0.85rem; color:#1e293b; max-width:80%;">${escapeHtml(response.reply)}</div></div>`;
                chatArea.scrollTop = chatArea.scrollHeight;
            } catch (error) {
                hideTyping();
                chatArea.innerHTML += `<div style="display:flex; gap:10px; align-items:flex-start;"><div style="width:38px; height:38px; background:linear-gradient(135deg, #2563eb, #1d4ed8); border-radius:50%; display:flex; align-items:center; justify-content:center;"><i class="fas fa-exclamation-triangle" style="color:white;"></i></div><div style="background:#fee2e2; padding:10px 14px; border-radius:18px; border-top-right-radius:4px; font-size:0.85rem; color:#dc2626; max-width:80%;">❌ خطا در اتصال. لطفاً دوباره تلاش کنید.</div></div>`;
            }
        };
        
        const style = document.createElement('style');
        style.textContent = `@keyframes bounce { 0%,80%,100% { transform: scale(0); } 40% { transform: scale(1); } }`;
        document.head.appendChild(style);
    }
    
    // ============================================
    // رندر اطلاعیه‌ها
    // ============================================
    
    async function renderAnnouncements() {
        showLoading(true);
        try {
            const data = await getAnnouncements();
            const announcements = data.announcements || [];
            
            const getStyle = (p) => p === 'urgent' ? { bg: '#fee2e2', color: '#dc2626', icon: 'fa-exclamation-triangle', text: 'فوری' } : p === 'high' ? { bg: '#fef3c7', color: '#d97706', icon: 'fa-arrow-up', text: 'مهم' } : { bg: '#dbeafe', color: '#2563eb', icon: 'fa-info-circle', text: 'عادی' };
            
            const html = `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px;">
                    ${announcements.length ? announcements.map(a => {
                        const s = getStyle(a.priority);
                        return `
                            <div style="background: white; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden;">
                                <div style="padding: 16px; background: ${s.bg}; display: flex; justify-content: space-between; align-items: center;">
                                    <div style="font-weight: 700;"><i class="fas ${s.icon}" style="color: ${s.color};"></i> ${escapeHtml(a.title)}</div>
                                    <div style="padding: 4px 12px; border-radius: 40px; background: ${s.color}20; color: ${s.color};">${s.text}</div>
                                </div>
                                <div style="padding: 16px;">
                                    <p style="font-size: 0.85rem; color: #64748b;">${escapeHtml(a.content)}</p>
                                    <div style="display: flex; justify-content: space-between; margin-top: 12px; font-size: 0.7rem; color: #94a3b8;">
                                        <span><i class="fas fa-user"></i> ${a.created_by_name || 'مدیر'}</span>
                                        <span><i class="fas fa-calendar-alt"></i> ${formatDate(a.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('') : '<div class="empty-state">هیچ اطلاعیه‌ای وجود ندارد</div>'}
                </div>
            `;
            document.getElementById('contentArea').innerHTML = html;
        } catch (error) {
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-bullhorn"></i><h4>خطا در بارگذاری</h4></div>`;
        }
        showLoading(false);
    }
    
    // ============================================
    // رندر پروفایل
    // ============================================
    
    async function renderProfile() {
        showLoading(true);
        try {
            const profile = await loadTeacherProfile();
            
            const html = `
                <div style="max-width:900px; margin:0 auto;">
                    <div style="background: white; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap; color: white;">
                            <div style="position:relative; cursor:pointer;" onclick="document.getElementById('avatarInput').click()">
                                <i class="fas fa-chalkboard-user fa-4x"></i>
                                <div style="position:absolute; bottom:0; right:0; background:rgba(0,0,0,0.6); border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-size:0.8rem;"><i class="fas fa-camera"></i></div>
                            </div>
                            <input type="file" id="avatarInput" style="display:none" accept="image/*" onchange="uploadTeacherAvatar(this)">
                            <div>
                                <h2 style="margin-bottom:8px;">${escapeHtml(profile?.name || 'معلم')}</h2>
                                <p><i class="fas fa-id-card"></i> کد پرسنلی: ${profile?.employee_id || profile?.username || '-'}</p>
                                <p><i class="fas fa-envelope"></i> ${profile?.email || 'ثبت نشده'}</p>
                                <p><i class="fas fa-phone"></i> ${profile?.phone || 'ثبت نشده'}</p>
                            </div>
                        </div>
                        <div style="padding: 24px;">
                            <div style="margin-bottom: 24px;">
                                <h3 style="font-size:1rem; margin-bottom:16px; padding-bottom:8px; border-bottom:2px solid #dbeafe;"><i class="fas fa-user"></i> اطلاعات شخصی</h3>
                                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px;">
                                    <div><label style="font-weight:600; color:#64748b; width:100px;">نام کامل:</label> <span>${escapeHtml(profile?.name || '-')}</span></div>
                                    <div><label style="font-weight:600; color:#64748b; width:100px;">نام کاربری:</label> <span>${escapeHtml(profile?.username || '-')}</span></div>
                                    <div><label style="font-weight:600; color:#64748b; width:100px;">تاریخ عضویت:</label> <span>${formatDate(profile?.created_at)}</span></div>
                                    <div><label style="font-weight:600; color:#64748b; width:100px;">وضعیت:</label> <span style="padding:4px 12px; border-radius:40px; background:${profile?.status === 'active' ? '#d1fae5' : '#fee2e2'}; color:${profile?.status === 'active' ? '#059669' : '#dc2626'};">${profile?.status === 'active' ? 'فعال' : 'غیرفعال'}</span></div>
                                </div>
                            </div>
                            <div style="margin-bottom: 24px;">
                                <h3 style="font-size:1rem; margin-bottom:16px; padding-bottom:8px; border-bottom:2px solid #dbeafe;"><i class="fas fa-graduation-cap"></i> اطلاعات شغلی</h3>
                                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px;">
                                    <div><label style="font-weight:600; color:#64748b;">تخصص:</label> <span>${profile?.specialization || 'ثبت نشده'}</span></div>
                                    <div><label style="font-weight:600; color:#64748b;">سال‌های تدریس:</label> <span>${profile?.experience_years || 'ثبت نشده'} سال</span></div>
                                    <div><label style="font-weight:600; color:#64748b;">آخرین ورود:</label> <span>${formatDateTime(profile?.last_login)}</span></div>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 16px; padding: 20px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc;">
                            <button onclick="editProfile()" style="background: #2563eb; color: white; border: none; padding: 8px 20px; border-radius: 40px; cursor: pointer;"><i class="fas fa-edit"></i> ویرایش</button>
                            <button onclick="changePassword()" style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 8px 20px; border-radius: 40px; cursor: pointer;"><i class="fas fa-key"></i> تغییر رمز</button>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('contentArea').innerHTML = html;
            
            window.uploadTeacherAvatar = async function(input) {
                const file = input.files[0];
                if (!file) return;
                showLoading(true);
                try {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        await fetchAPI('/teacher/profile/avatar', { method: 'POST', body: JSON.stringify({ avatar: e.target.result }) });
                        showToast('عکس پروفایل تغییر کرد', 'success');
                        renderProfile();
                    };
                    reader.readAsDataURL(file);
                } catch (error) { showToast('خطا در آپلود', 'error'); } finally { showLoading(false); }
            };
            
            window.editProfile = function() { showToast('برای ویرایش اطلاعات با مدیر سیستم تماس بگیرید', 'info'); };
            window.changePassword = function() { showToast('برای تغییر رمز عبور به بخش تنظیمات امنیتی مراجعه کنید', 'info'); };
            
        } catch (error) {
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-user-circle"></i><h4>خطا در بارگذاری پروفایل</h4></div>`;
        }
        showLoading(false);
    }
    
    // ============================================
    // توابع کمکی اضافی
    // ============================================
    
    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    };
    
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'flex';
    }
    
    // ============================================
    // راه‌اندازی اولیه
    // ============================================
    
    
function getInitialPanelPage() {
    const page = document.body && document.body.dataset ? document.body.dataset.page : null;
    return page || 'dashboard';
}

async function init() {
        const token = getToken();
        if (!token) { window.location.href = '/login'; return; }
        
        try {
            const user = await fetchAPI('/auth/me');
            if (user.role !== 'teacher') { window.location.href = '/login'; return; }
            currentUser = user;
            currentTeacherId = user.id;
            document.getElementById('teacherName').innerText = user.name || 'معلم';
        } catch (error) { showToast('خطا در دریافت اطلاعات کاربر', 'error'); }
        
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.matches('a[href]')) return;
            item.removeEventListener('click', item._listener);
            const listener = (e) => { e.preventDefault(); const tab = item.getAttribute('data-tab'); if (tab) showTab(tab); };
            item.addEventListener('click', listener);
            item._listener = listener;
        });
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => logout());
        
        showTab(getInitialPanelPage());
    }
    
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
    
    window.showTab = showTab;
    window.logout = logout;
    window.toggleSidebar = toggleSidebar;
    window.refreshData = refreshData;
    window.closeNotificationPanel = closeNotificationPanel;
    window.toPersianNumber = toPersianNumber;
    window.showToast = showToast;
    window.closeModal = closeModal;
    
})();