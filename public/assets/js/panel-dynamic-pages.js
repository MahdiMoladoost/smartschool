(() => {
  'use strict';
  if (window.__teacherDynamicPagesReady) return;
  window.__teacherDynamicPagesReady = true;

  const body = document.body;
  if (body?.dataset?.panel !== 'teacher') return;

  const PAGE = body.dataset.page || 'dashboard';
  const TOKEN = localStorage.getItem('token') || '';
  const PLACEHOLDER_PATTERN = /(API\s*Ready|Role-Based|آماده اتصال کامل|ساختار ماژولار|بخش ماژولار پنل|زیرساخت API|صفحه مستقل)/i;
  const runtime = { rendering: false, renderedPage: '', timer: 0 };

  async function alignTeacherSidebarWithAdmin() {
    const sidebar = document.getElementById('sidebar');
    const header = sidebar?.querySelector('.sidebar-header');
    const user = header?.querySelector('.user-info');
    const footer = sidebar?.querySelector('.sidebar-footer');
    if (!sidebar || !header || !user || !footer || sidebar.dataset.adminAligned === '1') return;
    sidebar.dataset.adminAligned = '1';
    const brand = document.createElement('div');
    brand.className = 'sidebar-brand';
    brand.innerHTML = '<div class="sidebar-school-logo" id="teacherSchoolLogo"><i class="fas fa-graduation-cap"></i></div><div class="sidebar-school-text"><strong id="teacherSchoolName" class="school-name">مدیریت هوشمند</strong><small id="teacherSchoolSubtitle">سیستم یکپارچه آموزشی</small></div>';
    header.replaceWith(brand);
    user.classList.add('admin-info');
    user.querySelector('.user-avatar')?.classList.add('admin-avatar');
    user.querySelector('.user-details')?.classList.add('admin-details');
    user.querySelector('.user-status')?.remove();
    const logout = document.createElement('button');
    logout.type = 'button';
    logout.className = 'admin-logout-toggle';
    logout.title = 'خروج از حساب';
    logout.setAttribute('aria-label', 'خروج از حساب');
    logout.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
    logout.addEventListener('click', () => window.logout?.());
    user.append(logout);
    footer.replaceChildren(user);
    let overlay = document.getElementById('teacherSidebarOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'teacherSidebarOverlay';
      overlay.className = 'teacher-sidebar-overlay';
      document.body.append(overlay);
    }
    const close = () => { sidebar.classList.remove('active'); overlay.classList.remove('show'); };
    overlay.addEventListener('click', close);
    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => requestAnimationFrame(() => overlay.classList.toggle('show', sidebar.classList.contains('active'))));
    sidebar.querySelectorAll('.nav-item[href]').forEach(item => item.addEventListener('click', close));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });

    const pageHeader=document.querySelector('.page-header');
    const currentTitle=document.getElementById('pageTitle')?.textContent?.trim()||'داشبورد معلم';
    if(pageHeader){
      pageHeader.innerHTML=`<div class="page-title"><h1><button class="admin-header-menu-toggle" id="adminHeaderSidebarToggle" title="جمع کردن منو" aria-label="جمع کردن منو" aria-pressed="false" type="button"><i class="fas fa-bars"></i></button><span id="pageTitle">${esc(currentTitle)}</span></h1></div><div class="header-actions"><div class="search-global"><i class="fas fa-search"></i><input type="text" placeholder="جستجوی سریع..." id="globalSearch"></div><button class="btn-icon" id="teacherRefreshBtn" title="بروزرسانی" type="button"><i class="fas fa-sync-alt" id="refreshIcon"></i></button><button class="btn-icon" id="notificationBtn" title="اعلانات" type="button"><i class="fas fa-bell"></i><span class="notification-badge" id="notifBadge">۰</span></button><button class="btn-icon" id="fullscreenBtn" title="تمام صفحه" type="button"><i class="fas fa-expand"></i></button></div>`;
      const toggle=pageHeader.querySelector('#adminHeaderSidebarToggle');
      const apply=collapsed=>{body.classList.toggle('teacher-sidebar-collapsed',collapsed);toggle.setAttribute('aria-pressed',String(collapsed));toggle.title=collapsed?'باز کردن منو':'جمع کردن منو';localStorage.setItem('teacherSidebarCollapsed',collapsed?'1':'0');};
      toggle.addEventListener('click',()=>{if(matchMedia('(max-width:1024px)').matches){sidebar.classList.toggle('active');overlay.classList.toggle('show',sidebar.classList.contains('active'));}else{apply(!body.classList.contains('teacher-sidebar-collapsed'));}});apply(!matchMedia('(max-width:1024px)').matches&&localStorage.getItem('teacherSidebarCollapsed')==='1');
      pageHeader.querySelector('#teacherRefreshBtn').addEventListener('click',async()=>{const icon=pageHeader.querySelector('#refreshIcon');icon.classList.add('fa-spin');try{await window.PanelDynamicPages?.render?.({force:true,page:PAGE});toast('اطلاعات بروزرسانی شد.','success');}finally{setTimeout(()=>icon.classList.remove('fa-spin'),350);}});
      pageHeader.querySelector('#fullscreenBtn').addEventListener('click',async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{toast('تمام‌صفحه در این مرورگر در دسترس نیست.','warning');}});
      pageHeader.querySelector('#globalSearch').addEventListener('input',event=>{const query=event.target.value.trim().toLowerCase();root()?.querySelectorAll('tbody tr,.td-action-grid>a,.td-notice-list>article').forEach(item=>{item.hidden=Boolean(query&&!item.textContent.toLowerCase().includes(query));});});
      const notificationPanel=document.createElement('aside');notificationPanel.id='teacherNotificationPanel';notificationPanel.className='teacher-notification-panel';notificationPanel.innerHTML='<header><strong><i class="fas fa-bell"></i> اعلانات</strong><button type="button" aria-label="بستن"><i class="fas fa-xmark"></i></button></header><div class="teacher-notification-list"></div>';document.body.append(notificationPanel);notificationPanel.querySelector('header button').addEventListener('click',()=>notificationPanel.classList.remove('show'));pageHeader.querySelector('#notificationBtn').addEventListener('click',event=>{event.stopPropagation();notificationPanel.classList.toggle('show');});document.addEventListener('click',event=>{if(!notificationPanel.contains(event.target)&&!pageHeader.querySelector('#notificationBtn').contains(event.target))notificationPanel.classList.remove('show');});
    }

    try{
      const [settingsData,profileData,noticeData]=await Promise.all([api('/settings'),api('/teacher/profile'),api('/teacher/announcements').catch(()=>({announcements:[]}))]);
      const settings=settingsData.settings||settingsData||{};const profile=profileData.profile||profileData.teacher||profileData||{};
      const schoolName=String(settings.school_name||'مدیریت هوشمند').trim();const slogan=String(settings.school_slogan||'سیستم یکپارچه آموزشی').trim();const logo=String(settings.logo_url||settings.school_logo||settings.logo||'').trim();
      document.getElementById('teacherSchoolName').textContent=schoolName;document.getElementById('teacherSchoolSubtitle').textContent=slogan;
      const logoBox=document.getElementById('teacherSchoolLogo');if(logo&&(/^(https?:\/\/|\/)/i.test(logo))){const img=document.createElement('img');img.src=logo;img.alt=`لوگوی ${schoolName}`;img.addEventListener('error',()=>{logoBox.innerHTML='<i class="fas fa-graduation-cap"></i>';},{once:true});logoBox.replaceChildren(img);}
      const name=user.querySelector('.admin-details h4');const role=user.querySelector('.admin-details p');const avatar=user.querySelector('.admin-avatar');if(name)name.textContent=profile.name||'معلم';if(role)role.textContent='معلم';const avatarUrl=String(profile.avatar_url||'').trim();if(avatarUrl&&(/^(https?:\/\/|\/)/i.test(avatarUrl))){const img=document.createElement('img');img.src=avatarUrl;img.alt=`تصویر ${profile.name||'معلم'}`;img.addEventListener('error',()=>{avatar.innerHTML='<i class="fas fa-chalkboard-user"></i>';},{once:true});avatar.replaceChildren(img);}
      const notices=noticeData.announcements||[];const badge=document.getElementById('notifBadge');if(badge)badge.textContent=fa(notices.length);const list=document.querySelector('#teacherNotificationPanel .teacher-notification-list');if(list)list.innerHTML=notices.length?notices.slice(0,8).map(row=>`<article><strong>${esc(row.title||'اطلاعیه')}</strong><p>${esc(row.content||'')}</p><small>${dateText(row.created_at)}</small></article>`).join(''):state('empty','اعلانی وجود ندارد.');
    }catch(error){console.warn('Teacher shell data could not be loaded:',error.message);}
  }

  const root = () => document.getElementById('contentArea') || document.getElementById('content') || document.querySelector('.content-area');
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const fa = value => String(value ?? 0).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[digit]);
  const today = () => new Date().toISOString().slice(0, 10);
  const dateText = value => value ? new Date(value).toLocaleString('fa-IR') : '—';
  const toast = (message, type = 'info') => window.PanelUX?.toast?.(message, type) || console[type === 'error' ? 'error' : 'log'](message);
  const busy = (button, state, label = '') => window.PanelUX?.setBusy?.(button, state, label) || (button && (button.disabled = state));

  async function api(endpoint, options = {}) {
    const response = await fetch(`/api/v1${endpoint}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({ success: false, error: 'پاسخ نامعتبر سرور' }));
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      location.href = '/login';
      throw new Error('نشست کاربری منقضی شده است');
    }
    if (!response.ok || payload.success === false) throw new Error(payload.error || payload.message || `خطای ${response.status}`);
    return payload.data || payload;
  }

  function state(type, title, message = '') {
    const icon = type === 'loading' ? 'fa-spinner fa-spin' : type === 'error' ? 'fa-circle-exclamation' : 'fa-inbox';
    return `<div class="ux-state ${type}"><i class="fas ${icon}"></i><h3>${esc(title)}</h3>${message ? `<p>${esc(message)}</p>` : ''}</div>`;
  }

  function actionButton(label, icon, href, tone = 'secondary') {
    return `<a class="btn ${tone}" href="${esc(href)}"><i class="fas ${esc(icon)}"></i><span>${esc(label)}</span></a>`;
  }

  function retryState(container, title, error, callback) {
    container.innerHTML = state('error', title, error?.message || 'خطای نامشخص') + '<div class="ux-retry"><button class="btn secondary" type="button"><i class="fas fa-rotate-right"></i> تلاش دوباره</button></div>';
    container.querySelector('.ux-retry button')?.addEventListener('click', callback);
  }

  function section(title, content, actions = '') {
    return `<section class="panel ux-dynamic-panel" data-operational-page="true"><div class="ux-section-header"><h3>${esc(title)}</h3>${actions}</div>${content}</section>`;
  }

  function table(rows, columns, empty = 'داده‌ای برای نمایش وجود ندارد.') {
    if (!Array.isArray(rows) || !rows.length) return state('empty', empty);
    return `<div class="ux-table-wrap"><table><thead><tr>${columns.map(column => `<th>${esc(column.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${columns.map(column => `<td>${column.render ? column.render(row) : esc(row[column.key] ?? '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function kpis(items) {
    return `<div class="ux-kpi-grid">${items.map(item => `<article class="ux-kpi"><span class="ux-kpi-label">${esc(item.label)}</span><strong class="ux-kpi-value">${fa(item.value ?? 0)}</strong>${item.help ? `<small>${esc(item.help)}</small>` : ''}</article>`).join('')}</div>`;
  }

  function options(rows, label = 'name') {
    return (rows || []).map(row => `<option value="${esc(row.id)}">${esc(row[label] || row.title || row.full_name || row.id)}</option>`).join('');
  }

  function isPlaceholder(container) {
    if (!container) return false;
    const text = container.textContent || '';
    return PLACEHOLDER_PATTERN.test(text) || Boolean(container.querySelector('.empty-state') && /ماژولار|اتصال|API/.test(text));
  }

  async function classes() {
    const data = await api('/teacher/classes');
    return data.classes || [];
  }

  async function students(classId) {
    if (!classId) return [];
    const data = await api(`/teacher/students?class_id=${encodeURIComponent(classId)}`);
    return data.students || [];
  }

  function download(name, content, type = 'text/plain;charset=utf-8') {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type }));
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function renderAttendance(container, page) {
    const classRows = await classes();
    const editable = page === 'attendance-create';
    container.innerHTML = section(editable ? 'ثبت حضور و غیاب' : 'مشاهده حضور و غیاب', `
      <form id="uxAttendanceFilter" class="ux-toolbar">
        <label class="ux-field ux-grow">کلاس<select name="class_id" required><option value="">انتخاب کلاس</option>${options(classRows)}</select></label>
        <label class="ux-field">تاریخ<input name="date" type="date" value="${today()}" required></label>
        <label class="ux-field">زنگ<select name="period"><option value="">روزانه</option><option value="1">زنگ ۱</option><option value="2">زنگ ۲</option><option value="3">زنگ ۳</option><option value="4">زنگ ۴</option><option value="5">زنگ ۵</option><option value="6">زنگ ۶</option></select></label>
        <button class="btn secondary" type="submit">بارگذاری</button>
      </form><div id="uxAttendanceResult">${state('empty', 'فیلترها را انتخاب کنید.')}</div>`);
    const form = container.querySelector('#uxAttendanceFilter');
    const result = container.querySelector('#uxAttendanceResult');

    async function load() {
      const data = new FormData(form);
      const classId = data.get('class_id');
      const dateInput = form.elements.date;
      const periodSelect = form.elements.period;
      if (!classId) return toast('کلاس را انتخاب کنید.', 'warning');
      result.innerHTML = state('loading', 'در حال دریافت حضور و غیاب');
      try {
        const response = await api(`/teacher/attendance?class_id=${encodeURIComponent(classId)}&date=${encodeURIComponent(dateInput.value)}&period=${encodeURIComponent(periodSelect.value)}`);
        const rows = response.students || [];
        const stats = response.stats || {};
        const columns = [
          { label: 'دانش‌آموز', render: row => esc(row.name || row.full_name) },
          { label: 'وضعیت', render: row => editable ? `<select class="ux-att-status" data-student="${esc(row.id)}"><option value="present" ${row.status === 'present' ? 'selected' : ''}>حاضر</option><option value="absent" ${row.status === 'absent' ? 'selected' : ''}>غایب</option><option value="late" ${row.status === 'late' ? 'selected' : ''}>تأخیر</option><option value="excused" ${row.status === 'excused' ? 'selected' : ''}>موجه</option></select>` : `<span class="badge active">${esc(({present:'حاضر',absent:'غایب',late:'تأخیر',excused:'موجه'})[row.status] || row.status || '—')}</span>` },
          { label: 'توضیح', render: row => editable ? `<input class="ux-att-note" data-student="${esc(row.id)}" value="${esc(row.note || row.notes || '')}">` : esc(row.note || row.notes || '—') }
        ];
        result.innerHTML = kpis([{ label: 'حاضر', value: stats.present }, { label: 'غایب', value: stats.absent }, { label: 'تأخیر', value: stats.late }, { label: 'موجه', value: stats.excused }]) + table(rows, columns) + `<div class="ux-form-actions">${editable ? '<button class="btn" id="uxSaveAttendance">ذخیره حضور و غیاب</button>' : ''}<button class="btn secondary" id="uxAttendanceCsv">خروجی CSV</button></div>`;
        result.querySelector('#uxAttendanceCsv')?.addEventListener('click', () => download(`attendance-${dateInput.value}.csv`, ['student,status,note', ...rows.map(row => `"${row.name || row.full_name || ''}","${row.status || ''}","${row.note || row.notes || ''}"`)].join('\n'), 'text/csv;charset=utf-8'));
        result.querySelector('#uxSaveAttendance')?.addEventListener('click', async event => {
          const button = event.currentTarget;
          const records = [...result.querySelectorAll('.ux-att-status')].map(select => ({
            student_id: Number(select.dataset.student),
            status: select.value,
            note: result.querySelector(`.ux-att-note[data-student="${select.dataset.student}"]`)?.value.trim() || ''
          }));
          busy(button, true, 'در حال ذخیره...');
          try {
            await api('/teacher/attendance', { method: 'POST', body: JSON.stringify({ class_id: Number(classId), date: dateInput.value, period: periodSelect.value, records }) });
            toast('حضور و غیاب ذخیره شد.', 'success');
            await load();
          } catch (error) { toast(error.message, 'error'); }
          finally { busy(button, false); }
        });
        window.PanelUX?.enhance?.(result);
      } catch (error) { result.innerHTML = state('error', 'دریافت حضور و غیاب ناموفق بود', error.message); }
    }

    form.addEventListener('submit', event => { event.preventDefault(); load(); });
    if (classRows[0]) { form.elements.class_id.value = classRows[0].id; await load(); }
  }

  async function renderGrades(container) {
    const classRows = await classes();
    const editable = PAGE !== 'grades';
    container.innerHTML = section(editable ? 'ثبت و ویرایش نمرات' : 'مشاهده نمرات', `
      <form id="uxGradesFilter" class="ux-toolbar">
        <label class="ux-field ux-grow">کلاس<select name="class_id" required><option value="">انتخاب کلاس</option>${options(classRows)}</select></label>
        <label class="ux-field ux-grow">درس<select name="course_id" required><option value="">ابتدا کلاس را انتخاب کنید</option></select></label>
        <label class="ux-field">نوبت<select name="term"><option value="monthly1">ارزشیابی اول</option><option value="monthly2">ارزشیابی دوم</option><option value="term1">نوبت اول</option><option value="term2">نوبت دوم</option></select></label>
        <label class="ux-field">نوع<select name="eval_type"><option value="quiz">کلاسی</option><option value="homework">تکلیف</option><option value="midterm">میان‌ترم</option><option value="final_exam">پایانی</option><option value="project">پروژه</option></select></label>
        <button class="btn secondary" type="submit">بارگذاری</button>
      </form><div id="uxGradesResult">${state('empty', 'کلاس و درس را انتخاب کنید.')}</div>`);
    const form = container.querySelector('#uxGradesFilter');
    const courseSelect = form.elements.course_id;
    const result = container.querySelector('#uxGradesResult');

    async function loadCourses() {
      courseSelect.innerHTML = '<option value="">در حال بارگذاری...</option>';
      if (!form.elements.class_id.value) return;
      try {
        const data = await api(`/teacher/courses?class_id=${encodeURIComponent(form.elements.class_id.value)}`);
        courseSelect.innerHTML = `<option value="">انتخاب درس</option>${options(data.courses || [])}`;
        if (data.courses?.[0]) courseSelect.value = data.courses[0].id;
      } catch (error) { courseSelect.innerHTML = '<option value="">دریافت دروس ناموفق بود</option>'; }
    }

    async function load() {
      const classId = form.elements.class_id.value;
      const courseId = courseSelect.value;
      const term = form.elements.term.value;
      const evalType = form.elements.eval_type.value;
      if (!classId || !courseId) return toast('کلاس و درس را انتخاب کنید.', 'warning');
      result.innerHTML = state('loading', 'در حال دریافت نمرات');
      try {
        const response = await api(`/teacher/grades?class_id=${encodeURIComponent(classId)}&course_id=${encodeURIComponent(courseId)}&term=${encodeURIComponent(term)}&eval_type=${encodeURIComponent(evalType)}`);
        const rows = response.students || [];
        result.innerHTML = table(rows, [
          { label: 'دانش‌آموز', render: row => esc(row.name || row.full_name) },
          { label: 'نام کاربری', key: 'username' },
          { label: 'نمره از ۲۰', render: row => editable ? `<input class="ux-grade" data-student="${esc(row.id)}" type="number" min="0" max="20" step="0.25" value="${esc(row.current_grade ?? '')}">` : `<strong>${fa(row.current_grade ?? '—')}</strong>` }
        ]) + (editable ? '<div class="ux-form-actions"><button class="btn" id="uxSaveGrades">ذخیره همه نمرات</button></div>' : '<div class="ux-form-actions"><button class="btn secondary" id="uxGradesCsv">خروجی CSV</button></div>');
        result.querySelector('#uxSaveGrades')?.addEventListener('click', async event => {
          const grades = [...result.querySelectorAll('.ux-grade')].filter(input => input.value !== '').map(input => ({ student_id: Number(input.dataset.student), grade: Number(input.value) }));
          if (!grades.length || grades.some(item => item.grade < 0 || item.grade > 20)) return toast('نمرات معتبر بین صفر و بیست وارد کنید.', 'warning');
          const button = event.currentTarget;
          busy(button, true, 'در حال ذخیره...');
          try {
            await api('/teacher/grades/bulk', { method: 'POST', body: JSON.stringify({ class_id: Number(classId), course_id: Number(courseId), term, eval_type: evalType, grades }) });
            toast('نمرات ذخیره شد.', 'success');
            await load();
          } catch (error) { toast(error.message, 'error'); }
          finally { busy(button, false); }
        });
        result.querySelector('#uxGradesCsv')?.addEventListener('click',()=>download(`grades-${today()}.csv`,['student,username,grade',...rows.map(row=>`"${row.name||row.full_name||''}","${row.username||''}","${row.current_grade??''}"`)].join('\n'),'text/csv;charset=utf-8'));
        window.PanelUX?.enhance?.(result);
      } catch (error) { result.innerHTML = state('error', 'دریافت نمرات ناموفق بود', error.message); }
    }

    form.elements.class_id.addEventListener('change', loadCourses);
    form.addEventListener('submit', event => { event.preventDefault(); load(); });
    if (classRows[0]) { form.elements.class_id.value = classRows[0].id; await loadCourses(); if (courseSelect.value) await load(); }
  }

  async function renderEntity(container, kind) {
    const isExam = kind === 'exam';
    const endpoint = isExam ? '/teacher/exams' : '/teacher/assignments';
    const classRows = await classes();
    const response = await api(endpoint).catch(() => ({}));
    const rows = response[isExam ? 'exams' : 'assignments'] || [];
    container.innerHTML = section(isExam ? 'ایجاد آزمون' : 'ایجاد تکلیف', `
      <form id="uxEntityForm" class="ux-form-grid three">
        <input name="entity_id" type="hidden">
        <label class="ux-field">عنوان<input name="title" required></label>
        <label class="ux-field">کلاس<select name="class_id" required><option value="">انتخاب کلاس</option>${options(classRows)}</select></label>
        ${isExam ? '<label class="ux-field">زمان شروع<input name="start_time" type="datetime-local" required></label><label class="ux-field">مدت (دقیقه)<input name="duration" type="number" min="1" value="60" required></label>' : '<label class="ux-field">مهلت تحویل<input name="due_date" type="datetime-local" required></label>'}
        <label class="ux-field">نمره کل<input name="total_points" type="number" min="1" value="20" required></label>
        <label class="ux-field full">توضیحات<textarea name="description"></textarea></label>
        <div class="ux-form-actions full"><button class="btn" type="submit">ثبت</button></div>
      </form>`) + section(isExam ? 'آزمون‌های ثبت‌شده' : 'تکالیف ثبت‌شده', table(rows, [
        { label: 'عنوان', key: 'title' }, { label: 'کلاس', render: row => esc(row.class_name || row.class_id) },
        { label: 'زمان', render: row => dateText(row.start_time || row.due_date || row.deadline) }, { label: 'نمره', key: 'total_points' },
        { label: 'عملیات', render: row => `<div class="ux-inline-actions">${isExam?`<button class="btn secondary ux-exam-questions" data-id="${esc(row.id)}" data-title="${esc(row.title)}"><i class="fas fa-list-ol"></i> سؤال‌ها</button>`:''}<button class="btn secondary ux-edit-entity" data-id="${esc(row.id)}"><i class="fas fa-pen"></i> ویرایش</button><button class="btn danger ux-delete-entity" data-id="${esc(row.id)}"><i class="fas fa-trash"></i> حذف</button></div>` }
      ]));
    container.querySelector('#uxEntityForm').addEventListener('submit', async event => {
      event.preventDefault();
      const button = event.submitter;
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const payload = isExam
        ? { title: values.title, class_id: Number(values.class_id), start_time: values.start_time, duration: Number(values.duration), total_points: Number(values.total_points), description: values.description }
        : { title: values.title, class_id: Number(values.class_id), due_date: values.due_date, total_points: Number(values.total_points), description: values.description };
      busy(button, true, 'در حال ثبت...');
      try { const entityId=values.entity_id; await api(entityId?`${endpoint}/${entityId}`:endpoint, { method: entityId?'PUT':'POST', body: JSON.stringify(payload) }); toast(entityId?'اطلاعات ویرایش شد.':'اطلاعات ثبت شد.', 'success'); await renderEntity(container, kind); }
      catch (error) { toast(error.message, 'error'); }
      finally { busy(button, false); }
    });
    container.querySelectorAll('.ux-delete-entity').forEach(button => button.addEventListener('click', async () => {
      if (!confirm(`${isExam ? 'آزمون' : 'تکلیف'} حذف شود؟ این عملیات قابل بازگشت نیست.`)) return;
      busy(button, true, 'در حال حذف...');
      try { await api(`${endpoint}/${button.dataset.id}`, { method: 'DELETE' }); toast(`${isExam ? 'آزمون' : 'تکلیف'} حذف شد.`, 'success'); await renderEntity(container, kind); }
      catch (error) { toast(error.message, 'error'); }
      finally { busy(button, false); }
    }));
    const entityForm=container.querySelector('#uxEntityForm');
    container.querySelectorAll('.ux-edit-entity').forEach(button=>button.addEventListener('click',()=>{const row=rows.find(item=>String(item.id)===button.dataset.id);if(!row)return;entityForm.elements.entity_id.value=row.id;entityForm.elements.title.value=row.title||'';entityForm.elements.class_id.value=row.class_id||'';entityForm.elements.total_points.value=row.total_points||20;entityForm.elements.description.value=row.description||'';if(isExam){entityForm.elements.start_time.value=String(row.start_time||'').replace(' ','T').slice(0,16);entityForm.elements.duration.value=row.duration||60;}else{entityForm.elements.due_date.value=String(row.deadline||row.due_date||'').replace(' ','T').slice(0,16);}entityForm.querySelector('button[type="submit"]').innerHTML='<i class="fas fa-check"></i> ذخیره ویرایش';entityForm.scrollIntoView({behavior:'smooth',block:'center'});}));
    if(isExam){
      container.insertAdjacentHTML('beforeend','<div class="ux-modal-backdrop" id="uxQuestionModal"><div class="ux-modal ux-modal-wide"><div class="ux-modal-header"><h3 id="uxQuestionModalTitle">مدیریت سؤال‌ها</h3><button class="btn secondary" type="button" data-close><i class="fas fa-xmark"></i></button></div><div class="ux-modal-body"><form id="uxQuestionForm" class="ux-form-grid"><input type="hidden" name="exam_id"><label class="ux-field full">متن سؤال<textarea name="question_text" required></textarea></label><label class="ux-field">نوع<select name="question_type"><option value="single">تک‌گزینه‌ای</option><option value="multiple">چندگزینه‌ای</option><option value="descriptive">تشریحی</option></select></label><label class="ux-field">بارم<input name="points" type="number" min="0.25" step="0.25" value="1"></label><label class="ux-field full">گزینه‌ها<input name="options" placeholder="گزینه‌ها را با ویرگول جدا کنید"></label><label class="ux-field full">پاسخ صحیح<input name="correct_answer" placeholder="متن یا شماره پاسخ صحیح"></label><div class="ux-form-actions full"><button class="btn" type="submit">افزودن سؤال</button></div></form><div id="uxQuestionList"></div></div></div></div>');
      const modal=container.querySelector('#uxQuestionModal'),qForm=container.querySelector('#uxQuestionForm'),qList=container.querySelector('#uxQuestionList');
      const close=()=>modal.classList.remove('show'); modal.querySelector('[data-close]').addEventListener('click',close); modal.addEventListener('click',event=>{if(event.target===modal)close();});
      async function loadQuestions(){const examId=qForm.elements.exam_id.value;qList.innerHTML=state('loading','در حال دریافت سؤال‌ها');try{const data=await api(`/teacher/exams/${examId}/questions`);qList.innerHTML=section('سؤال‌های آزمون',table(data.questions||[],[{label:'متن',key:'question_text'},{label:'نوع',key:'question_type'},{label:'بارم',render:row=>fa(row.points)},{label:'عملیات',render:row=>`<button class="btn danger ux-delete-question" data-id="${esc(row.id)}">حذف</button>`}],'هنوز سؤالی اضافه نشده است.'));qList.querySelectorAll('.ux-delete-question').forEach(button=>button.addEventListener('click',async()=>{if(!confirm('سؤال حذف شود؟'))return;try{await api(`/teacher/exam-questions/${button.dataset.id}`,{method:'DELETE'});toast('سؤال حذف شد.','success');await loadQuestions();}catch(error){toast(error.message,'error');}}));}catch(error){retryState(qList,'دریافت سؤال‌ها ناموفق بود',error,loadQuestions);}}
      container.querySelectorAll('.ux-exam-questions').forEach(button=>button.addEventListener('click',async()=>{qForm.elements.exam_id.value=button.dataset.id;modal.querySelector('#uxQuestionModalTitle').textContent=`سؤال‌های ${button.dataset.title}`;modal.classList.add('show');await loadQuestions();}));
      qForm.addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter;const values=Object.fromEntries(new FormData(qForm));const opts=values.options.split('،').join(',').split(',').map(value=>value.trim()).filter(Boolean);busy(button,true,'افزودن...');try{await api('/teacher/exam-questions',{method:'POST',body:JSON.stringify({exam_id:Number(values.exam_id),question_text:values.question_text,question_type:values.question_type,options:opts,correct_answer:values.correct_answer,points:Number(values.points)})});const examId=values.exam_id;qForm.reset();qForm.elements.exam_id.value=examId;toast('سؤال اضافه شد.','success');await loadQuestions();}catch(error){toast(error.message,'error');}finally{busy(button,false);}});
    }
  }

  async function renderDashboard(container) {
    const [dashboard, classRows, assignments, exams, schedule, announcements] = await Promise.all([
      api('/teacher/dashboard'), classes(), api('/teacher/assignments').catch(() => ({ assignments: [] })), api('/teacher/exams').catch(() => ({ exams: [] })), api('/teacher/schedule').catch(() => ({ schedule: [] })), api('/teacher/announcements').catch(() => ({ announcements: [] }))
    ]);
    const stats = dashboard.stats || {};
    const assignmentRows = assignments.assignments || [];
    const examRows = exams.exams || [];
    const scheduleRows = schedule.schedule || [];
    const noticeRows = announcements.announcements || [];
    const recent = [...assignmentRows.map(row => ({ ...row, kind: 'تکلیف', icon: 'fa-list-check', when: row.deadline || row.due_date })), ...examRows.map(row => ({ ...row, kind: 'آزمون', icon: 'fa-clipboard-question', when: row.start_time }))]
      .sort((a, b) => new Date(b.created_at || b.when || 0) - new Date(a.created_at || a.when || 0)).slice(0, 8);
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    if (pageTitle) pageTitle.textContent = 'داشبورد معلم';
    if (pageSubtitle) pageSubtitle.textContent = 'نمای کلی فعالیت‌های آموزشی و دسترسی سریع به امور روزانه';
    container.innerHTML = `<div class="td-dashboard">
      <section class="td-hero"><div class="td-hero-copy"><span class="td-kicker"><i class="fas fa-sparkles"></i> مرکز کار معلم</span><h2>مدیریت منظم کلاس، ارزیابی و آموزش</h2><p>وضعیت کلاس‌ها را ببینید و فعالیت‌های روزانه را بدون جابه‌جایی اضافه انجام دهید.</p><div class="td-hero-actions">${actionButton('ثبت حضور و غیاب', 'fa-user-check', '/dashboard/teacher/attendance-create', '')}${actionButton('ثبت نمرات', 'fa-pen-to-square', '/dashboard/teacher/grades-create')}${actionButton('ایجاد تکلیف', 'fa-plus', '/dashboard/teacher/assignment-create')}</div></div><div class="td-hero-summary"><div><i class="fas fa-calendar-day"></i><span>برنامه‌های ثبت‌شده</span><strong>${fa(scheduleRows.length)}</strong></div><div><i class="fas fa-bullhorn"></i><span>اطلاعیه‌ها</span><strong>${fa(noticeRows.length)}</strong></div></div></section>
      <section class="td-stats">
        <a href="/dashboard/teacher/classes" class="td-stat blue"><span class="td-stat-icon"><i class="fas fa-door-open"></i></span><span class="td-stat-copy"><small>کلاس‌های فعال</small><strong>${fa(stats.total_classes ?? classRows.length)}</strong><em>کلاس‌های منتسب به شما</em></span><i class="fas fa-arrow-left td-stat-arrow"></i></a>
        <a href="/dashboard/teacher/students" class="td-stat green"><span class="td-stat-icon"><i class="fas fa-user-graduate"></i></span><span class="td-stat-copy"><small>دانش‌آموزان</small><strong>${fa(stats.total_students ?? 0)}</strong><em>در تمام کلاس‌های شما</em></span><i class="fas fa-arrow-left td-stat-arrow"></i></a>
        <a href="/dashboard/teacher/assignments" class="td-stat orange"><span class="td-stat-icon"><i class="fas fa-list-check"></i></span><span class="td-stat-copy"><small>تکالیف ثبت‌شده</small><strong>${fa(stats.total_assignments ?? assignmentRows.length)}</strong><em>${fa(assignmentRows.reduce((sum, row) => sum + Number(row.submissions_count || 0), 0))} پاسخ دریافتی</em></span><i class="fas fa-arrow-left td-stat-arrow"></i></a>
        <a href="/dashboard/teacher/grades" class="td-stat violet"><span class="td-stat-icon"><i class="fas fa-chart-line"></i></span><span class="td-stat-copy"><small>میانگین نمرات</small><strong>${fa(stats.avg_grade ?? '—')}</strong><em>میانگین فعلی دروس</em></span><i class="fas fa-arrow-left td-stat-arrow"></i></a>
      </section>
      <section class="td-main-grid"><article class="td-panel td-schedule"><header><div><span class="td-panel-icon"><i class="fas fa-calendar-week"></i></span><div><h3>برنامه تدریس</h3><p>نمای سریع کلاس‌های برنامه‌ریزی‌شده</p></div></div><a href="/dashboard/teacher/schedule">برنامه کامل <i class="fas fa-arrow-left"></i></a></header><div class="td-panel-body">${table(scheduleRows.slice(0, 6), [{ label: 'روز', render: row => esc(row.day_name || row.day || '—') }, { label: 'زمان', render: row => esc(row.time || '—') }, { label: 'درس', render: row => esc(row.course_name || row.subject || '—') }, { label: 'کلاس', render: row => `<span class="td-class-chip">${esc(row.class_name || '—')}</span>` }], 'هنوز برنامه تدریسی ثبت نشده است.')}</div></article>
      <article class="td-panel td-actions"><header><div><span class="td-panel-icon"><i class="fas fa-bolt"></i></span><div><h3>دسترسی سریع</h3><p>عملیات پرکاربرد آموزشی</p></div></div></header><div class="td-action-grid"><a href="/dashboard/teacher/online-exam-create"><i class="fas fa-clipboard-question"></i><span><b>آزمون جدید</b><small>ایجاد آزمون آنلاین</small></span></a><a href="/dashboard/teacher/content-upload"><i class="fas fa-cloud-arrow-up"></i><span><b>محتوای آموزشی</b><small>بارگذاری فایل جدید</small></span></a><a href="/dashboard/teacher/student-feedback"><i class="fas fa-comment-dots"></i><span><b>بازخورد</b><small>ارسال برای دانش‌آموز</small></span></a><a href="/dashboard/teacher/announcements"><i class="fas fa-bullhorn"></i><span><b>اطلاعیه‌ها</b><small>مشاهده اطلاعیه مدرسه</small></span></a></div></article></section>
      <section class="td-bottom-grid"><article class="td-panel"><header><div><span class="td-panel-icon"><i class="fas fa-clock-rotate-left"></i></span><div><h3>آخرین فعالیت‌های آموزشی</h3><p>تکالیف و آزمون‌های اخیر شما</p></div></div><span class="td-count">${fa(recent.length)} مورد</span></header><div class="td-panel-body">${table(recent, [{ label: 'نوع', render: row => `<span class="td-kind"><i class="fas ${esc(row.icon)}"></i>${esc(row.kind)}</span>` }, { label: 'عنوان', key: 'title' }, { label: 'کلاس', render: row => esc(row.class_name || '—') }, { label: 'زمان', render: row => dateText(row.when) }, { label: 'وضعیت', render: row => `<span class="badge active">${esc(row.status || 'فعال')}</span>` }], 'هنوز تکلیف یا آزمونی ثبت نشده است.')}</div></article>
      <article class="td-panel td-notices"><header><div><span class="td-panel-icon"><i class="fas fa-bell"></i></span><div><h3>اطلاعیه‌های مدرسه</h3><p>آخرین پیام‌های قابل مشاهده</p></div></div><a href="/dashboard/teacher/announcements">مشاهده همه</a></header><div class="td-notice-list">${noticeRows.length ? noticeRows.slice(0, 4).map(row => `<article><span class="td-notice-dot"></span><div><strong>${esc(row.title || 'اطلاعیه')}</strong><p>${esc(row.content || row.description || 'بدون توضیح')}</p><small>${dateText(row.created_at)}</small></div></article>`).join('') : state('empty', 'اطلاعیه‌ای وجود ندارد.')}</div></article></section>
    </div>`;
  }

  async function renderClasses(container) {
    const rows = await classes();
    container.innerHTML = kpis([{ label: 'تعداد کلاس‌ها', value: rows.length }, { label: 'کل دانش‌آموزان', value: rows.reduce((sum, row) => sum + Number(row.student_count || 0), 0) }, { label: 'ظرفیت کل', value: rows.reduce((sum, row) => sum + Number(row.capacity || 0), 0) }]) + section('کلاس‌های من', `<div class="ux-toolbar"><label class="ux-search ux-grow"><i class="fas fa-magnifying-glass"></i><input id="uxClassSearch" placeholder="جستجو نام یا پایه کلاس"></label></div><div id="uxClassTable">${table(rows, [{ label: 'نام کلاس', key: 'name' }, { label: 'پایه', key: 'grade' }, { label: 'دانش‌آموز', render: row => fa(row.student_count || 0) }, { label: 'ظرفیت', render: row => fa(row.capacity || '—') }, { label: 'عملیات', render: row => `<a class="btn secondary" href="/dashboard/teacher/students?class_id=${esc(row.id)}">دانش‌آموزان</a>` }], 'کلاسی به این معلم اختصاص داده نشده است.')}</div>`);
    const search = container.querySelector('#uxClassSearch');
    search?.addEventListener('input', () => container.querySelectorAll('#uxClassTable tbody tr').forEach(row => { row.hidden = !row.textContent.includes(search.value.trim()); }));
  }

  async function renderSchedule(container) {
    const response = await api('/teacher/schedule');
    const rows = response.schedule || [];
    container.innerHTML = section('برنامه هفتگی تدریس', table(rows, [{ label: 'روز', render: row => esc(row.day_name || row.day || '—') }, { label: 'ساعت', render: row => esc(row.start_time && row.end_time ? `${row.start_time} تا ${row.end_time}` : row.time || '—') }, { label: 'کلاس', key: 'class_name' }, { label: 'پایه', key: 'grade' }, { label: 'درس', render:row=>esc(row.course_name||row.subject||'—') }], 'برنامه هفتگی برای شما ثبت نشده است.'), `<button class="btn secondary" id="uxPrintSchedule"><i class="fas fa-print"></i> چاپ برنامه</button>`);
    container.querySelector('#uxPrintSchedule')?.addEventListener('click', () => window.print());
  }

  async function renderOverview(container, mode = PAGE) {
    const classRows = await classes();
    const schedule = mode === 'schedule' || /classes/.test(mode) ? await api('/teacher/schedule').catch(() => ({ schedule: [] })) : { schedule: [] };
    const assignments = await api('/teacher/assignments').catch(() => ({ assignments: [] }));
    const exams = await api('/teacher/exams').catch(() => ({ exams: [] }));
    const rows = mode === 'schedule' || /classes/.test(mode) ? schedule.schedule || [] : mode.includes('assignment') ? assignments.assignments || [] : exams.exams || [];
    container.innerHTML = kpis([{ label: 'کلاس‌ها', value: classRows.length }, { label: 'تکالیف', value: assignments.assignments?.length || 0 }, { label: 'آزمون‌ها', value: exams.exams?.length || 0 }, { label: 'ردیف‌های قابل بررسی', value: rows.length }]) + section(document.getElementById('pageTitle')?.textContent || 'فضای کاری معلم', `<div class="ux-toolbar"><input id="uxOverviewSearch" class="ux-grow" placeholder="جستجو در جدول"><button class="btn secondary" id="uxOverviewCsv">خروجی CSV</button></div><div id="uxOverviewTable">${table(rows, [{ label: 'عنوان / کلاس', render: row => esc(row.title || row.class_name || row.name || 'رکورد') }, { label: 'شرح', render: row => esc(row.description || row.course_name || row.day_name || row.status || '—') }, { label: 'زمان', render: row => dateText(row.start_time || row.due_date || row.date) }, { label: 'وضعیت', render: row => `<span class="badge active">${esc(row.status || 'فعال')}</span>` }])}</div>`);
    const search = container.querySelector('#uxOverviewSearch');
    search.addEventListener('input', () => container.querySelectorAll('#uxOverviewTable tbody tr').forEach(row => { row.hidden = !row.textContent.toLowerCase().includes(search.value.toLowerCase()); }));
    container.querySelector('#uxOverviewCsv').addEventListener('click', () => download(`teacher-${mode}-${today()}.csv`, ['title,description,date', ...rows.map(row => `"${row.title || row.class_name || row.name || ''}","${row.description || row.course_name || ''}","${row.start_time || row.due_date || row.date || ''}"`)].join('\n'), 'text/csv;charset=utf-8'));
  }

  async function renderStudents(container) {
    const classRows = await classes();
    container.innerHTML = section('فهرست دانش‌آموزان', `<form id="uxStudentFilter" class="ux-toolbar"><label class="ux-field ux-grow">کلاس<select name="class_id"><option value="">انتخاب کلاس</option>${options(classRows)}</select></label><button class="btn secondary" type="submit">نمایش</button></form><div id="uxStudentsResult">${state('empty', 'کلاس را انتخاب کنید.')}</div>`);
    const form = container.querySelector('#uxStudentFilter');
    const result = container.querySelector('#uxStudentsResult');
    async function load() {
      const rows = await students(form.elements.class_id.value);
      result.innerHTML = table(rows, [{ label: 'نام', render: row => esc(row.name || row.full_name) }, { label: 'نام کاربری', key: 'username' }, { label: 'میانگین', render: row => esc(row.avg_grade ?? row.average ?? '—') }, { label: 'وضعیت', render: row => `<span class="badge active">${esc(row.status || 'فعال')}</span>` }]);
    }
    form.addEventListener('submit', event => { event.preventDefault(); load().catch(error => { result.innerHTML = state('error', 'دریافت دانش‌آموزان ناموفق بود', error.message); }); });
    const requestedClass = new URLSearchParams(location.search).get('class_id');
    const initialClass = classRows.find(row => String(row.id) === requestedClass) || classRows[0];
    if (initialClass) { form.elements.class_id.value = initialClass.id; await load(); }
  }

  async function renderAssignmentReview(container) {
    const response = await api('/teacher/assignments');
    const assignmentRows = response.assignments || [];
    container.innerHTML = section('تصحیح تکالیف', `<form id="uxReviewFilter" class="ux-toolbar"><label class="ux-field ux-grow">تکلیف<select name="assignment_id" required><option value="">انتخاب تکلیف</option>${assignmentRows.map(row => `<option value="${esc(row.id)}">${esc(row.title)} — ${esc(row.class_name || '')}</option>`).join('')}</select></label><button class="btn secondary" type="submit"><i class="fas fa-list-check"></i> نمایش پاسخ‌ها</button></form><div id="uxReviewResult">${state('empty','یک تکلیف را انتخاب کنید.')}</div>`);
    const form = container.querySelector('#uxReviewFilter'); const result = container.querySelector('#uxReviewResult');
    async function load() {
      const id = form.elements.assignment_id.value; if (!id) return;
      result.innerHTML = state('loading','در حال دریافت پاسخ‌ها');
      try {
        const data = await api(`/teacher/assignments/${id}/submissions`); const rows = data.submissions || []; const max = Number(data.assignment?.total_points || 100);
        result.innerHTML = kpis([{label:'پاسخ‌های دریافتی',value:rows.length},{label:'تصحیح‌شده',value:rows.filter(row=>row.graded_at).length},{label:'در انتظار',value:rows.filter(row=>!row.graded_at).length},{label:'نمره کل',value:max}]) + table(rows,[{label:'دانش‌آموز',render:row=>esc(row.student_name)},{label:'زمان ارسال',render:row=>dateText(row.submitted_at)},{label:'پاسخ',render:row=>row.file_url?`<a class="ux-text-link" href="${esc(row.file_url)}" target="_blank" rel="noopener">مشاهده فایل</a>`:esc(row.content||'—')},{label:`نمره از ${fa(max)}`,render:row=>`<input class="ux-sub-grade" data-id="${esc(row.id)}" type="number" min="0" max="${max}" step="0.25" value="${esc(row.grade??'')}">`},{label:'بازخورد',render:row=>`<input class="ux-sub-feedback" data-id="${esc(row.id)}" value="${esc(row.feedback||'')}" placeholder="بازخورد کوتاه">`},{label:'عملیات',render:row=>`<button class="btn ux-save-submission" data-id="${esc(row.id)}"><i class="fas fa-check"></i> ذخیره</button>`}], 'هنوز پاسخی برای این تکلیف ارسال نشده است.');
        result.querySelectorAll('.ux-save-submission').forEach(button=>button.addEventListener('click',async()=>{const id=button.dataset.id;const grade=result.querySelector(`.ux-sub-grade[data-id="${id}"]`).value;const feedback=result.querySelector(`.ux-sub-feedback[data-id="${id}"]`).value.trim();busy(button,true,'ذخیره...');try{await api(`/teacher/submissions/${id}`,{method:'PUT',body:JSON.stringify({grade,feedback})});toast('ارزیابی ذخیره شد.','success');await load();}catch(error){toast(error.message,'error');}finally{busy(button,false);}}));
      } catch(error){ retryState(result,'دریافت پاسخ‌ها ناموفق بود',error,load); }
    }
    form.addEventListener('submit',event=>{event.preventDefault();load();}); if(assignmentRows[0]){form.elements.assignment_id.value=assignmentRows[0].id;await load();}
  }

  async function renderExamResults(container) {
    const response = await api('/teacher/exams'); const examRows = response.exams || [];
    container.innerHTML = section('نتایج آزمون‌ها', `<form id="uxExamResultFilter" class="ux-toolbar"><label class="ux-field ux-grow">آزمون<select name="exam_id" required><option value="">انتخاب آزمون</option>${examRows.map(row=>`<option value="${esc(row.id)}">${esc(row.title)} — ${esc(row.class_name||'')}</option>`).join('')}</select></label><button class="btn secondary" type="submit">نمایش نتایج</button></form><div id="uxExamResults">${state('empty','یک آزمون را انتخاب کنید.')}</div>`);
    const form=container.querySelector('#uxExamResultFilter');const result=container.querySelector('#uxExamResults');
    async function load(){const id=form.elements.exam_id.value;if(!id)return;result.innerHTML=state('loading','در حال دریافت نتایج');try{const data=await api(`/teacher/exams/${id}/grades`);const rows=data.results||data.grades||[];const scores=rows.map(row=>Number(row.score??row.grade)).filter(Number.isFinite);result.innerHTML=kpis([{label:'شرکت‌کنندگان',value:rows.length},{label:'میانگین',value:scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1):'—'},{label:'بیشترین نمره',value:scores.length?Math.max(...scores):'—'},{label:'کمترین نمره',value:scores.length?Math.min(...scores):'—'}])+table(rows,[{label:'دانش‌آموز',render:row=>esc(row.student_name||row.name)},{label:'نمره',render:row=>fa(row.score??row.grade??'—')},{label:'زمان ارسال',render:row=>dateText(row.submitted_at)},{label:'وضعیت',render:row=>`<span class="badge active">${row.submitted_at?'تکمیل‌شده':'در انتظار'}</span>`}],'هنوز نتیجه‌ای برای این آزمون ثبت نشده است.');}catch(error){retryState(result,'دریافت نتایج ناموفق بود',error,load);}}
    form.addEventListener('submit',event=>{event.preventDefault();load();});if(examRows[0]){form.elements.exam_id.value=examRows[0].id;await load();}
  }

  async function renderMessaging(container, page = PAGE) {
    const role = page === 'admin-messenger' || page === 'school-suggestions' ? 'admin' : 'student';
    const response = await api(`/teacher/contacts?role=${role}`); const contacts=response.contacts||[];
    const title = page === 'student-feedback' ? 'بازخورد به دانش‌آموز' : page === 'school-suggestions' ? 'ارسال پیشنهاد به مدیریت مدرسه' : role === 'admin' ? 'پیام‌رسان با مدیریت' : 'پیام‌رسان دانش‌آموزان';
    container.innerHTML=section(title,`<div class="ux-message-layout"><aside><label class="ux-field">مخاطب<select id="uxMessageContact"><option value="">انتخاب مخاطب</option>${contacts.map(row=>`<option value="${esc(row.id)}">${esc(row.name)}${row.class_name?` — ${esc(row.class_name)}`:''}</option>`).join('')}</select></label><div class="ux-contact-summary"><i class="fas fa-address-book"></i><strong>${fa(contacts.length)}</strong><span>مخاطب در دسترس</span></div></aside><div class="ux-conversation"><div id="uxMessageList">${state('empty','مخاطب را انتخاب کنید.')}</div><form id="uxMessageForm"><textarea name="message" required placeholder="متن ${page==='school-suggestions'?'پیشنهاد':'پیام'} را بنویسید..."></textarea><button class="btn" type="submit"><i class="fas fa-paper-plane"></i> ارسال</button></form></div></div>`);
    const select=container.querySelector('#uxMessageContact');const list=container.querySelector('#uxMessageList');const form=container.querySelector('#uxMessageForm');
    async function load(){if(!select.value){list.innerHTML=state('empty','مخاطب را انتخاب کنید.');return;}list.innerHTML=state('loading','در حال دریافت گفتگو');try{const data=await api(`/teacher/messages/${select.value}`);const currentId=JSON.parse(localStorage.getItem('user')||'{}').id;const rows=data.messages||[];list.innerHTML=rows.length?`<div class="ux-chat-list">${rows.map(row=>`<article class="${Number(row.sender_id)===Number(currentId)?'mine':'theirs'}"><p>${esc(row.message)}</p><small>${dateText(row.created_at)}</small></article>`).join('')}</div>`:state('empty','هنوز پیامی ردوبدل نشده است.');list.scrollTop=list.scrollHeight;}catch(error){retryState(list,'دریافت گفتگو ناموفق بود',error,load);}}
    select.addEventListener('change',load);form.addEventListener('submit',async event=>{event.preventDefault();if(!select.value)return toast('مخاطب را انتخاب کنید.','warning');const button=event.submitter;let message=new FormData(form).get('message').trim();if(page==='school-suggestions')message=`[پیشنهاد مدرسه] ${message}`;busy(button,true,'ارسال...');try{await api('/teacher/messages',{method:'POST',body:JSON.stringify({receiver_id:Number(select.value),message})});form.reset();toast('پیام ارسال شد.','success');await load();}catch(error){toast(error.message,'error');}finally{busy(button,false);}});if(contacts[0]){select.value=contacts[0].id;await load();}
  }

  async function renderParentMessaging(container) {
    const classRows=await classes();
    container.innerHTML=section('پیام‌رسان با والدین',`<div class="ux-form-grid three"><label class="ux-field">کلاس<select id="uxParentClass"><option value="">انتخاب کلاس</option>${options(classRows)}</select></label><label class="ux-field">دانش‌آموز<select id="uxParentStudent"><option value="">ابتدا کلاس را انتخاب کنید</option></select></label><label class="ux-field">والد/سرپرست<input id="uxParentName" readonly value="—"></label></div><div id="uxParentConversation">${state('empty','دانش‌آموز را انتخاب کنید.')}</div><form id="uxParentMessageForm" class="ux-toolbar"><textarea name="message" class="ux-grow" required placeholder="متن پیام به والدین"></textarea><button class="btn" type="submit"><i class="fas fa-paper-plane"></i> ارسال</button></form>`);
    const classSelect=container.querySelector('#uxParentClass'),studentSelect=container.querySelector('#uxParentStudent'),name=container.querySelector('#uxParentName'),list=container.querySelector('#uxParentConversation'),form=container.querySelector('#uxParentMessageForm');let parent=null;
    async function loadStudents(){const rows=await students(classSelect.value);studentSelect.innerHTML=`<option value="">انتخاب دانش‌آموز</option>${options(rows)}`;parent=null;name.value='—';list.innerHTML=state('empty','دانش‌آموز را انتخاب کنید.');}
    async function loadParent(){if(!studentSelect.value)return;list.innerHTML=state('loading','در حال یافتن سرپرست');try{const data=await api(`/teacher/parent/${studentSelect.value}`);parent=data.parent;name.value=parent?.name||'سرپرست یافت نشد';if(!parent){list.innerHTML=state('empty','برای این دانش‌آموز سرپرستی ثبت نشده است.');return;}const messages=await api(`/teacher/parent-messages/${parent.id}`);list.innerHTML=(messages.messages||[]).length?`<div class="ux-chat-list">${messages.messages.map(row=>`<article><p>${esc(row.message)}</p><small>${dateText(row.created_at)}</small></article>`).join('')}</div>`:state('empty','هنوز پیامی ثبت نشده است.');}catch(error){retryState(list,'دریافت اطلاعات والد ناموفق بود',error,loadParent);}}
    classSelect.addEventListener('change',loadStudents);studentSelect.addEventListener('change',loadParent);form.addEventListener('submit',async event=>{event.preventDefault();if(!parent)return toast('والد معتبر انتخاب نشده است.','warning');const button=event.submitter;busy(button,true,'ارسال...');try{await api('/teacher/send-to-parent',{method:'POST',body:JSON.stringify({parent_id:parent.id,student_id:Number(studentSelect.value),message:new FormData(form).get('message').trim()})});form.reset();toast('پیام ارسال شد.','success');await loadParent();}catch(error){toast(error.message,'error');}finally{busy(button,false);}});if(classRows[0]){classSelect.value=classRows[0].id;await loadStudents();}
  }

  async function renderStudentActivity(container,page=PAGE){const type=page==='encouragement-create'?'encouragement':'discipline';const label=type==='encouragement'?'تشویقی':'انضباطی';const classRows=await classes();const data=await api(`/teacher/student-activities?type=${type}`);const rows=data.items||[];container.innerHTML=section(`ثبت گزارش ${label}`,`<form id="uxActivityForm" class="ux-form-grid three"><label class="ux-field">کلاس<select name="class_id" required><option value="">انتخاب کلاس</option>${options(classRows)}</select></label><label class="ux-field">دانش‌آموز<select name="student_id" required><option value="">ابتدا کلاس را انتخاب کنید</option></select></label><label class="ux-field">امتیاز<input name="points" type="number" value="0"></label><label class="ux-field full">عنوان<input name="title" required></label><label class="ux-field full">شرح<textarea name="description"></textarea></label><div class="ux-form-actions full"><button class="btn" type="submit">ثبت گزارش</button></div></form>`)+section(`سوابق ${label}`,table(rows,[{label:'دانش‌آموز',key:'student_name'},{label:'کلاس',key:'class_name'},{label:'عنوان',key:'title'},{label:'امتیاز',render:row=>fa(row.points||0)},{label:'تاریخ',render:row=>dateText(row.created_at)},{label:'عملیات',render:row=>`<button class="btn danger ux-delete-activity" data-id="${esc(row.id)}">حذف</button>`}],`گزارش ${label} ثبت نشده است.`));const form=container.querySelector('#uxActivityForm');form.elements.class_id.addEventListener('change',async()=>{form.elements.student_id.innerHTML=`<option value="">انتخاب دانش‌آموز</option>${options(await students(form.elements.class_id.value))}`;});form.addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter;const values=Object.fromEntries(new FormData(form));busy(button,true,'ثبت...');try{await api('/teacher/student-activities',{method:'POST',body:JSON.stringify({...values,type,student_id:Number(values.student_id),points:Number(values.points||0)})});toast('گزارش ثبت شد.','success');await renderStudentActivity(container,page);}catch(error){toast(error.message,'error');}finally{busy(button,false);}});container.querySelectorAll('.ux-delete-activity').forEach(button=>button.addEventListener('click',async()=>{if(!confirm('گزارش حذف شود؟'))return;try{await api(`/teacher/student-activities/${button.dataset.id}`,{method:'DELETE'});toast('گزارش حذف شد.','success');await renderStudentActivity(container,page);}catch(error){toast(error.message,'error');}}));if(classRows[0]){form.elements.class_id.value=classRows[0].id;form.elements.class_id.dispatchEvent(new Event('change'));}}

  async function renderClassEvents(container,page=PAGE){const type=page==='virtual-classes'?'virtual_class':'online_class';const label=type==='virtual_class'?'کلاس مجازی':'کلاس آنلاین';const data=await api(`/teacher/class-events?type=${type}`);const rows=data.events||[];container.innerHTML=section(`ایجاد ${label}`,`<form id="uxClassEventForm" class="ux-form-grid three"><label class="ux-field">عنوان<input name="title" required></label><label class="ux-field">زمان<input name="event_date" type="datetime-local" required></label><label class="ux-field">پیوند/محل<input name="location" placeholder="نشانی ورود به کلاس"></label><label class="ux-field full">توضیحات<textarea name="description"></textarea></label><label class="ux-field">وضعیت<select name="status"><option value="published">منتشرشده</option><option value="draft">پیش‌نویس</option></select></label><div class="ux-form-actions full"><button class="btn" type="submit">ثبت کلاس</button></div></form>`)+section(`${label}‌های ثبت‌شده`,table(rows,[{label:'عنوان',key:'title'},{label:'زمان',render:row=>dateText(row.event_date)},{label:'پیوند/محل',render:row=>/^https?:\/\//i.test(row.location||'')?`<a class="ux-text-link" href="${esc(row.location)}" target="_blank" rel="noopener">ورود امن</a>`:esc(row.location||'—')},{label:'وضعیت',render:row=>`<span class="badge active">${row.status==='draft'?'پیش‌نویس':'منتشرشده'}</span>`},{label:'عملیات',render:row=>`<button class="btn danger ux-delete-event" data-id="${esc(row.id)}">حذف</button>`}],`${label} ثبت نشده است.`));const form=container.querySelector('#uxClassEventForm');form.addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter;const payload={...Object.fromEntries(new FormData(form)),type};busy(button,true,'ثبت...');try{await api('/teacher/class-events',{method:'POST',body:JSON.stringify(payload)});toast('کلاس ثبت شد.','success');await renderClassEvents(container,page);}catch(error){toast(error.message,'error');}finally{busy(button,false);}});container.querySelectorAll('.ux-delete-event').forEach(button=>button.addEventListener('click',async()=>{if(!confirm('کلاس حذف شود؟'))return;try{await api(`/teacher/class-events/${button.dataset.id}`,{method:'DELETE'});toast('کلاس حذف شد.','success');await renderClassEvents(container,page);}catch(error){toast(error.message,'error');}}));}

  async function renderStudentReports(container,page=PAGE){const classRows=await classes();container.innerHTML=section(document.getElementById('pageTitle')?.textContent||'گزارش دانش‌آموز',`<form id="uxReportFilter" class="ux-toolbar"><label class="ux-field">کلاس<select name="class_id"><option value="">انتخاب کلاس</option>${options(classRows)}</select></label><label class="ux-field ux-grow">دانش‌آموز<select name="student_id"><option value="">ابتدا کلاس را انتخاب کنید</option></select></label><label class="ux-field">نوع گزارش<select name="type"><option value="grades">نمرات</option><option value="attendance">حضور و غیاب</option></select></label><button class="btn secondary" type="submit">دریافت گزارش</button></form><div id="uxReportResult">${state('empty','دانش‌آموز را انتخاب کنید.')}</div>`);const form=container.querySelector('#uxReportFilter'),result=container.querySelector('#uxReportResult');form.elements.class_id.addEventListener('change',async()=>{form.elements.student_id.innerHTML=`<option value="">انتخاب دانش‌آموز</option>${options(await students(form.elements.class_id.value))}`;});form.addEventListener('submit',async event=>{event.preventDefault();if(!form.elements.student_id.value)return toast('دانش‌آموز را انتخاب کنید.','warning');result.innerHTML=state('loading','در حال تهیه گزارش');try{const data=await api(`/teacher/student-report/${form.elements.student_id.value}?type=${form.elements.type.value}`);const attendance=data.attendance||[];const grades=data.grades||[];result.innerHTML=form.elements.type.value==='attendance'?table(attendance,[{label:'تاریخ',render:row=>dateText(row.date)},{label:'وضعیت',key:'status'},{label:'توضیح',render:row=>esc(row.notes||'—')}],'سابقه حضور و غیاب ثبت نشده است.'):table(grades,[{label:'درس',key:'course_name'},{label:'کلاسی',key:'quiz'},{label:'تکلیف',key:'homework'},{label:'میان‌ترم',key:'midterm'},{label:'پایانی',key:'final_exam'},{label:'میانگین',key:'average'}],'نمره‌ای ثبت نشده است.');}catch(error){retryState(result,'دریافت گزارش ناموفق بود',error,()=>form.requestSubmit());}});if(classRows[0]){form.elements.class_id.value=classRows[0].id;form.elements.class_id.dispatchEvent(new Event('change'));}}

  async function renderResources(container) {
    const response = await api('/teacher/library').catch(() => ({ files: [], library: [] }));
    const rows = response.files || response.library || [];
    container.innerHTML = section('بارگذاری محتوای آموزشی', `<form id="uxUploadForm" class="ux-form-grid"><label class="ux-field">عنوان<input name="title" required></label><label class="ux-field">فایل<input name="file" type="file" required></label><small class="ux-field-hint full">حداکثر حجم مجاز ۱۰ مگابایت است.</small><div class="ux-form-actions full"><button class="btn" type="submit">بارگذاری</button></div></form>`) + section('کتابخانه معلم', table(rows, [{ label: 'عنوان', key: 'title' }, { label: 'فایل', render: row => row.file_path ? `<a class="ux-text-link" href="${esc(row.file_path)}" target="_blank" rel="noopener">مشاهده/دریافت</a>` : esc(row.file_name || row.filename || '—') }, { label: 'تاریخ', render: row => dateText(row.created_at) }, { label: 'عملیات', render: row => `<button class="btn danger ux-delete-file" data-id="${esc(row.id)}">حذف</button>` }]));
    container.querySelector('#uxUploadForm').addEventListener('submit', async event => {
      event.preventDefault(); const button = event.submitter; const form = event.currentTarget; const file = form.elements.file.files[0];
      if (!file) return; if (file.size > 10 * 1024 * 1024) return toast('حجم فایل بیشتر از ۱۰ مگابایت است.', 'warning');
      const fileBase64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      busy(button, true, 'در حال بارگذاری...');
      try { await api('/teacher/library/upload', { method: 'POST', body: JSON.stringify({ title: form.elements.title.value.trim(), fileBase64, fileName: file.name }) }); toast('فایل بارگذاری شد.', 'success'); await renderResources(container); }
      catch (error) { toast(error.message, 'error'); }
      finally { busy(button, false); }
    });
    container.querySelectorAll('.ux-delete-file').forEach(button => button.addEventListener('click', async () => {
      try { await api(`/teacher/library/${button.dataset.id}`, { method: 'DELETE' }); toast('فایل حذف شد.', 'success'); await renderResources(container); }
      catch (error) { toast(error.message, 'error'); }
    }));
  }

  async function renderAnnouncements(container) {
    const [response, classRows] = await Promise.all([api('/teacher/announcements'), classes()]);
    container.innerHTML = section('ارسال اطلاعیه به کلاس', `<form id="uxAnnouncementForm" class="ux-form-grid"><label class="ux-field">کلاس<select name="class_id" required><option value="">انتخاب کلاس</option>${options(classRows)}</select></label><label class="ux-field">عنوان<input name="title" required></label><label class="ux-field full">متن اطلاعیه<textarea name="content" required></textarea></label><div class="ux-form-actions full"><button class="btn" type="submit"><i class="fas fa-paper-plane"></i> ارسال به دانش‌آموزان کلاس</button></div></form>`) + section('اطلاعیه‌های مدرسه', table(response.announcements || [], [{ label: 'عنوان', key: 'title' }, { label: 'متن', render: row => esc(row.content || row.description || '—') }, { label: 'اولویت', render: row => `<span class="badge active">${esc(row.priority || 'عادی')}</span>` }, { label: 'تاریخ', render: row => dateText(row.created_at) }]));
    container.querySelector('#uxAnnouncementForm').addEventListener('submit', async event => { event.preventDefault(); const button=event.submitter; const values=Object.fromEntries(new FormData(event.currentTarget)); busy(button,true,'در حال ارسال...'); try { const result=await api('/teacher/announcements',{method:'POST',body:JSON.stringify({...values,class_id:Number(values.class_id)})}); event.currentTarget.reset(); toast(result.message||'اطلاعیه ارسال شد.','success'); } catch(error){toast(error.message,'error');} finally{busy(button,false);} });
  }

  async function renderProfile(container) {
    const [response,dashboard] = await Promise.all([api('/teacher/profile'),api('/teacher/dashboard').catch(()=>({stats:{}}))]);
    const profile = response.profile || response.teacher || response;
    const stats=dashboard.stats||{};
    container.innerHTML = kpis([{label:'کلاس‌ها',value:stats.total_classes??profile.courses_count??0},{label:'دانش‌آموزان',value:stats.total_students??profile.students_count??0},{label:'نام کاربری',value:profile.username||'—'},{label:'عضویت',value:profile.created_at?dateText(profile.created_at):'—'}]) + section('ویرایش پروفایل', `<form id="uxProfileForm" class="ux-form-grid"><label class="ux-field">نام و نام خانوادگی<input name="name" required value="${esc(profile.full_name || profile.name || '')}"></label><label class="ux-field">تلفن<input name="phone" inputmode="tel" value="${esc(profile.phone || '')}"></label><label class="ux-field">ایمیل<input name="email" type="email" value="${esc(profile.email || '')}"></label><label class="ux-field">تصویر پروفایل<input id="uxProfileAvatar" type="file" accept="image/jpeg,image/png,image/webp"></label><div class="ux-form-actions full"><button class="btn" type="submit">ذخیره پروفایل</button></div></form>`);
    container.querySelector('#uxProfileForm').addEventListener('submit', async event => {
      event.preventDefault(); const button = event.submitter; const payload = Object.fromEntries(new FormData(event.currentTarget));
      busy(button, true, 'در حال ذخیره...');
      try { await api('/teacher/profile', { method: 'PUT', body: JSON.stringify(payload) }); const file=container.querySelector('#uxProfileAvatar').files[0]; if(file){if(file.size>2*1024*1024)throw new Error('حجم تصویر باید کمتر از ۲ مگابایت باشد');const avatar=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});await api('/teacher/profile/avatar',{method:'POST',body:JSON.stringify({avatar})});} toast('پروفایل ذخیره شد.', 'success'); }
      catch (error) { toast(error.message, 'error'); }
      finally { busy(button, false); }
    });
  }

  async function renderPassword(container) {
    container.innerHTML = section('تغییر رمز عبور', `<form id="uxPasswordForm" class="ux-form-grid"><label class="ux-field">رمز فعلی<input name="current_password" type="password" required></label><label class="ux-field">رمز جدید<input name="new_password" type="password" minlength="6" required></label><label class="ux-field">تکرار رمز<input name="confirm_password" type="password" minlength="6" required></label><div class="ux-form-actions full"><button class="btn" type="submit">تغییر رمز</button></div></form>`);
    container.querySelector('#uxPasswordForm').addEventListener('submit', async event => {
      event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const button = event.submitter;
      if (data.get('new_password') !== data.get('confirm_password')) return toast('تکرار رمز یکسان نیست.', 'warning');
      busy(button, true, 'در حال تغییر...');
      try { await api('/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password: data.get('current_password'), new_password: data.get('new_password') }) }); form.reset(); toast('رمز عبور تغییر کرد.', 'success'); }
      catch (error) { toast(error.message, 'error'); }
      finally { busy(button, false); }
    });
  }

  async function renderAssistant(container, page = PAGE) {
    const featureMap = {'ai-book-question-generator':'book_question_generation','ai-pdf-question-generator':'pdf_question_generation','ai-answer-key-generator':'answer_key_generation','ai-auto-grading':'automatic_grading','ai-extra-question-suggestions':'extra_question_suggestions','ai-exam-difficulty-analysis':'exam_difficulty_analysis','ai-exam':'quiz_generation','assistant':'teacher_assistant'};
    const title = document.getElementById('pageTitle')?.textContent || 'دستیار هوشمند معلم';
    const performance = page === 'ai-student-performance' || page === 'grade-predict';
    const quiz = page === 'ai-exam-builder' || page === 'ai-exam';
    const classRows = performance ? await classes() : [];
    container.innerHTML = section(title, `<form id="uxAssistantForm" class="ux-form-grid three">
      ${performance ? `<label class="ux-field">کلاس<select name="class_id" required><option value="">انتخاب کلاس</option>${options(classRows)}</select></label><label class="ux-field">دانش‌آموز<select name="student_id" required><option value="">ابتدا کلاس را انتخاب کنید</option></select></label>` : `<label class="ux-field">موضوع/درس<input name="subject" required placeholder="مثلاً ریاضی پایه هفتم"></label>`}
      ${quiz ? '<label class="ux-field">تعداد سؤال<input name="question_count" type="number" min="1" max="20" value="5"></label><label class="ux-field">سطح دشواری<select name="difficulty"><option value="easy">آسان</option><option value="medium" selected>متوسط</option><option value="hard">دشوار</option></select></label><label class="ux-field">پایه<input name="grade" placeholder="پایه تحصیلی"></label>' : ''}
      ${performance ? '' : `<label class="ux-field full">${quiz ? 'مبحث و اهداف آزمون' : 'متن منبع و شرح درخواست'}<textarea name="prompt" required rows="8" placeholder="اطلاعات دقیق لازم برای پردازش را وارد کنید..."></textarea></label>`}
      <div class="ux-form-actions full"><button class="btn" type="submit"><i class="fas fa-wand-magic-sparkles"></i> پردازش هوشمند</button><button class="btn secondary" type="reset">پاک کردن فرم</button></div></form><div id="uxAssistantOutput"></div>`);
    const form=container.querySelector('#uxAssistantForm');
    if(performance){form.elements.class_id.addEventListener('change',async()=>{form.elements.student_id.innerHTML=`<option value="">انتخاب دانش‌آموز</option>${options(await students(form.elements.class_id.value))}`;});if(classRows[0]){form.elements.class_id.value=classRows[0].id;form.elements.class_id.dispatchEvent(new Event('change'));}}
    form.addEventListener('submit', async event => {
      event.preventDefault(); const button = event.submitter; const output = container.querySelector('#uxAssistantOutput'); const values=Object.fromEntries(new FormData(form));
      busy(button, true, 'در حال تولید...'); output.innerHTML = state('loading', 'در حال پردازش');
      try { let response;if(performance){response=await api('/ai/teacher/performance-summary',{method:'POST',body:JSON.stringify({student_id:Number(values.student_id)})});}else if(quiz){response=await api('/ai/teacher/quiz-generator',{method:'POST',body:JSON.stringify({subject:values.subject,lesson:values.prompt,question_count:Number(values.question_count),difficulty:values.difficulty,grade:values.grade})});}else{response=await api('/ai/assist',{method:'POST',body:JSON.stringify({feature:featureMap[page]||page,prompt:`${title}\nدرس/موضوع: ${values.subject}\nدرخواست و منبع:\n${values.prompt}`})});}const text=response.response||response.reply||response.questions_text||'';if(!text)throw new Error('پاسخ قابل نمایش دریافت نشد');output.innerHTML = section('خروجی قابل بررسی', `<textarea id="uxGeneratedText" class="ux-ai-output" rows="14">${esc(text)}</textarea><div class="ux-form-actions"><button class="btn secondary" id="uxCopyText"><i class="fas fa-copy"></i> کپی</button><button class="btn secondary" id="uxDownloadText"><i class="fas fa-download"></i> دریافت متن</button></div>`); output.querySelector('#uxCopyText').addEventListener('click', async() => {await navigator.clipboard.writeText(output.querySelector('#uxGeneratedText').value);toast('متن کپی شد.','success');});output.querySelector('#uxDownloadText').addEventListener('click',()=>download(`teacher-ai-${page}-${today()}.txt`,output.querySelector('#uxGeneratedText').value)); }
      catch (error) { output.innerHTML = state('error', 'تولید متن ناموفق بود', error.message); }
      finally { busy(button, false); }
    });
  }

  async function renderDraft(container, page = PAGE) {
    const label = page === 'discipline-report-create' ? 'گزارش انضباطی' : page === 'encouragement-create' ? 'گزارش تشویقی' : 'پیشنهاد مدرسه';
    const classRows = await classes();
    container.innerHTML = section(`ثبت ${label}`, `<form id="uxDraftForm" class="ux-form-grid"><label class="ux-field">کلاس<select name="class_id"><option value="">انتخاب کلاس</option>${options(classRows)}</select></label><label class="ux-field">عنوان<input name="title" required></label><label class="ux-field full">شرح<textarea name="description" required></textarea></label><label class="ux-field full">اقدام پیشنهادی<textarea name="action"></textarea></label><div class="ux-form-actions full"><button class="btn" type="submit">ذخیره پیش‌نویس</button><button class="btn secondary" id="uxExportDrafts" type="button">خروجی JSON</button></div></form><div id="uxDraftList"></div>`);
    const key = 'teacherOperationalDrafts'; const list = container.querySelector('#uxDraftList');
    const paint = () => { const rows = JSON.parse(localStorage.getItem(key) || '[]').filter(row => row.page === page); list.innerHTML = section('پیش‌نویس‌های ذخیره‌شده', table(rows, [{ label: 'عنوان', key: 'title' }, { label: 'شرح', key: 'description' }, { label: 'اقدام', key: 'action' }, { label: 'تاریخ', render: row => dateText(row.created_at) }])); };
    container.querySelector('#uxDraftForm').addEventListener('submit', event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); const rows = JSON.parse(localStorage.getItem(key) || '[]'); rows.unshift({ ...values, page, created_at: new Date().toISOString() }); localStorage.setItem(key, JSON.stringify(rows.slice(0, 300))); event.currentTarget.reset(); paint(); toast('پیش‌نویس ذخیره شد.', 'success'); });
    container.querySelector('#uxExportDrafts').addEventListener('click', () => download(`teacher-drafts-${today()}.json`, localStorage.getItem(key) || '[]', 'application/json;charset=utf-8'));
    paint();
  }

  const handlers = {
    dashboard: renderDashboard,
    schedule: renderSchedule,
    classes: renderClasses,
    students: renderStudents,
    'attendance-create': renderAttendance,
    'attendance-view': renderAttendance,
    'grades-create': renderGrades,
    'grades-edit': renderGrades,
    grades: renderGrades,
    assignments: container => renderEntity(container, 'assignment'),
    'assignment-create': container => renderEntity(container, 'assignment'),
    'assignment-review': renderAssignmentReview,
    'student-feedback': renderMessaging,
    exams: container => renderEntity(container, 'exam'),
    'online-exam-create': container => renderEntity(container, 'exam'),
    'exam-results': renderExamResults,
    'class-performance': renderStudentReports,
    'online-classes': renderClassEvents,
    'virtual-classes': renderClassEvents,
    'content-upload': renderResources,
    library: renderResources,
    announcements: renderAnnouncements,
    'student-messenger': renderMessaging,
    'parent-chat': renderParentMessaging,
    'admin-messenger': renderMessaging,
    reports: renderStudentReports,
    'student-report-cards': renderStudentReports,
    'discipline-report-create': renderStudentActivity,
    'encouragement-create': renderStudentActivity,
    'school-suggestions': renderMessaging,
    profile: renderProfile,
    'change-password': renderPassword,
    'ai-exam-builder': renderAssistant,
    'ai-book-question-generator': renderAssistant,
    'ai-pdf-question-generator': renderAssistant,
    'ai-answer-key-generator': renderAssistant,
    'ai-auto-grading': renderAssistant,
    'ai-student-performance': renderAssistant,
    'ai-extra-question-suggestions': renderAssistant,
    'ai-exam-difficulty-analysis': renderAssistant,
    assistant: renderAssistant,
    'ai-exam': renderAssistant,
    'grade-predict': renderAssistant,
    attendance: renderAttendance,
    teacher: renderDashboard
  };

  async function render({ force = false, page = PAGE } = {}) {
    const container = root();
    const handler = handlers[page];
    if (!container || !handler || runtime.rendering) return false;
    if (!force && container.querySelector('[data-teacher-render-sentinel]')) return true;
    if (!force && container.dataset.dynamicRendered === '1') force = true;
    if (!force && !isPlaceholder(container)) return false;
    runtime.rendering = true;
    runtime.renderedPage = page;
    container.dataset.dynamicRendered = '1';
    container.innerHTML = state('loading', 'در حال آماده‌سازی صفحه عملیاتی');
    try { await handler(container, page); container.insertAdjacentHTML('beforeend','<span data-teacher-render-sentinel hidden></span>'); window.PanelUX?.enhance?.(container); return true; }
    catch (error) { retryState(container, 'بارگذاری صفحه انجام نشد', error, () => render({ force: true, page })); container.insertAdjacentHTML('beforeend','<span data-teacher-render-sentinel hidden></span>'); return false; }
    finally { runtime.rendering = false; }
  }

  function queue() {
    clearTimeout(runtime.timer);
    runtime.timer = setTimeout(() => render().catch(console.error), 40);
  }

  window.PanelDynamicPages = Object.freeze({ render, api, isPlaceholder });
  document.addEventListener('DOMContentLoaded', () => {
    alignTeacherSidebarWithAdmin();
    render({ force: true }).catch(console.error);
    new MutationObserver(queue).observe(root() || document.body, { childList: true, subtree: true });
  });
})();
