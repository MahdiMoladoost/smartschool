(() => {
  'use strict';
  if (window.__teacherPortalReady) return;
  window.__teacherPortalReady = true;

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

  async function initializeTeacherShell() {
    const sidebar=document.getElementById('sidebar'),overlay=document.getElementById('teacherSidebarOverlay'),toggle=document.getElementById('teacherMenuToggle');
    if(!sidebar||!overlay||!toggle||sidebar.dataset.portalBound==='1')return;
    sidebar.dataset.portalBound='1';
    const mobile=()=>matchMedia('(max-width:1024px)').matches;
    const closeMobile=()=>{sidebar.classList.remove('active');overlay.classList.remove('show');toggle.setAttribute('aria-expanded','false');};
    const applyCollapsed=collapsed=>{body.classList.toggle('teacher-sidebar-collapsed',collapsed);toggle.setAttribute('aria-expanded',String(!collapsed));localStorage.setItem('teacherSidebarCollapsed',collapsed?'1':'0');};
    toggle.addEventListener('click',()=>{if(mobile()){const open=!sidebar.classList.contains('active');sidebar.classList.toggle('active',open);overlay.classList.toggle('show',open);toggle.setAttribute('aria-expanded',String(open));}else applyCollapsed(!body.classList.contains('teacher-sidebar-collapsed'));});
    overlay.addEventListener('click',closeMobile);sidebar.querySelectorAll('.nav-item').forEach(link=>{link.title=link.textContent.trim();link.addEventListener('click',closeMobile);});
    applyCollapsed(!mobile()&&localStorage.getItem('teacherSidebarCollapsed')==='1');
    addEventListener('resize',()=>{if(!mobile())closeMobile();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMobile();});
    const pageTitle=document.getElementById('pageTitle');if(pageTitle)pageTitle.textContent=document.title.split('|')[0].trim();
    document.getElementById('teacherRefreshBtn')?.addEventListener('click',async event=>{const button=event.currentTarget;button.querySelector('i')?.classList.add('fa-spin');button.disabled=true;try{await render({force:true,page:PAGE});toast('اطلاعات صفحه بروزرسانی شد.','success');}finally{button.disabled=false;setTimeout(()=>button.querySelector('i')?.classList.remove('fa-spin'),300);}});
    document.getElementById('fullscreenBtn')?.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('حالت تمام‌صفحه در این مرورگر در دسترس نیست.','warning');}});
    document.getElementById('globalSearch')?.addEventListener('input',event=>{const term=event.target.value.trim().toLowerCase();root()?.querySelectorAll('tbody tr,.td-action-grid>a,.td-notice-list>article,.ux-searchable').forEach(item=>{item.hidden=Boolean(term&&!item.textContent.toLowerCase().includes(term));});});
    document.getElementById('teacherLogout')?.addEventListener('click',async()=>{if(!await confirmOperation({title:'خروج از حساب',message:'از پنل معلم خارج می‌شوید. ادامه می‌دهید؟',confirmLabel:'خروج',danger:true}))return;localStorage.removeItem('token');localStorage.removeItem('user');location.href='/login';});
    const notificationButton=document.getElementById('notificationBtn'),notificationPanel=document.getElementById('teacherNotificationPanel');
    const closeNotices=()=>{notificationPanel?.classList.remove('show');notificationPanel?.setAttribute('aria-hidden','true');notificationButton?.setAttribute('aria-expanded','false');};
    notificationButton?.addEventListener('click',event=>{event.stopPropagation();const open=!notificationPanel.classList.contains('show');notificationPanel.classList.toggle('show',open);notificationPanel.setAttribute('aria-hidden',String(!open));notificationButton.setAttribute('aria-expanded',String(open));});notificationPanel?.querySelector('[data-close]')?.addEventListener('click',closeNotices);document.addEventListener('click',event=>{if(notificationPanel&&!notificationPanel.contains(event.target)&&!notificationButton?.contains(event.target))closeNotices();});
    try{
      const [settingsData,profileData,noticeData]=await Promise.all([api('/settings'),api('/teacher/profile'),api('/teacher/announcements').catch(()=>({announcements:[]}))]);
      const settings=settingsData.settings||settingsData||{},profile=profileData.profile||profileData.teacher||profileData||{},notices=noticeData.announcements||[];
      const schoolName=String(settings.school_name||'مدرسه هوشمند').trim(),subtitle=String(settings.school_slogan||'سیستم یکپارچه آموزشی').trim(),logo=String(settings.logo_url||settings.school_logo||settings.logo||'').trim();
      document.getElementById('teacherSchoolName').textContent=schoolName;document.getElementById('teacherSchoolSubtitle').textContent=subtitle;document.getElementById('teacherName').textContent=profile.name||'معلم';
      const logoBox=document.getElementById('teacherSchoolLogo'),avatarBox=document.getElementById('teacherAvatar');
      if(logo&&/^(https?:\/\/|\/)/i.test(logo)){const image=new Image();image.src=logo;image.alt=`لوگوی ${schoolName}`;image.addEventListener('error',()=>image.remove(),{once:true});logoBox.replaceChildren(image);}
      const avatar=String(profile.avatar_url||'').trim();if(avatar&&/^(https?:\/\/|\/)/i.test(avatar)){const image=new Image();image.src=avatar;image.alt=`تصویر ${profile.name||'معلم'}`;image.addEventListener('error',()=>image.remove(),{once:true});avatarBox.replaceChildren(image);}
      document.getElementById('notifBadge').textContent=fa(notices.length);const list=notificationPanel?.querySelector('.teacher-notification-list');if(list)list.innerHTML=notices.length?notices.slice(0,20).map(row=>`<article><strong>${esc(row.title||'اطلاعیه')}</strong><p>${esc(row.content||'')}</p><small>${dateText(row.created_at)}</small></article>`).join(''):state('empty','اعلانی وجود ندارد.');
    }catch(error){console.warn('Teacher portal shell:',error.message);}
  }

  const root = () => document.getElementById('contentArea') || document.getElementById('content') || document.querySelector('.content-area');
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const fa = value => String(value ?? 0).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[digit]);
  const today = () => new Date().toISOString().slice(0, 10);
  const dateText = value => value ? new Date(value).toLocaleString('fa-IR') : '—';
  const toast = (message, type = 'info') => window.PanelUX?.toast?.(message, type) || console[type === 'error' ? 'error' : 'log'](message);
  const busy = (button, state, label = '') => window.PanelUX?.setBusy?.(button, state, label) || (button && (button.disabled = state));
  const toLocalInput = value => value ? String(value).replace(' ', 'T').slice(0, 16) : '';
  const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const confirmOperation = options => window.PanelUX?.confirm?.(options) || Promise.resolve(window.confirm(options?.message || 'آیا مطمئن هستید؟'));

  function modalMarkup(id, title, bodyContent, { wide = false, footer = '' } = {}) {
    return `<div class="ux-modal-backdrop" id="${esc(id)}" aria-hidden="true"><section class="ux-modal ${wide ? 'ux-modal-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${esc(id)}Title"><div class="ux-modal-header"><h3 id="${esc(id)}Title">${esc(title)}</h3><button class="btn secondary small" type="button" data-close aria-label="بستن"><i class="fas fa-xmark"></i></button></div><div class="ux-modal-body">${bodyContent}</div>${footer ? `<div class="ux-modal-footer">${footer}</div>` : ''}</section></div>`;
  }

  function bindModal(modal) {
    if (!modal || modal.dataset.bound === '1') return modal;
    modal.dataset.bound = '1';
    let opener = null;
    const close = () => {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('ux-modal-open');
      opener?.focus?.();
    };
    modal.open = trigger => {
      opener = trigger || document.activeElement;
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('ux-modal-open');
      requestAnimationFrame(() => modal.querySelector('input:not([type="hidden"]),select,textarea,button')?.focus());
    };
    modal.close = close;
    modal.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', close));
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    modal.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab') return;
      const focusable = [...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]')];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    return modal;
  }

  function statusBadge(value, labels = {}) {
    const status = String(value ?? '').toLowerCase();
    const label = labels[status] || ({active:'فعال',published:'منتشرشده',draft:'پیش‌نویس',cancelled:'لغوشده',completed:'تکمیل‌شده',present:'حاضر',absent:'غایب',late:'تأخیر',excused:'موجه'})[status] || value || '—';
    const tone = ['active','published','completed','present'].includes(status) ? 'success' : ['draft','late'].includes(status) ? 'warning' : ['cancelled','absent'].includes(status) ? 'danger' : 'info';
    return `<span class="badge ${tone}">${esc(label)}</span>`;
  }

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
        result.innerHTML = kpis([{ label: 'حاضر', value: stats.present }, { label: 'غایب', value: stats.absent }, { label: 'تأخیر', value: stats.late }, { label: 'موجه', value: stats.excused }]) + (editable?'<div class="ux-toolbar ux-bulk-toolbar"><span>ثبت سریع:</span><button class="btn secondary small ux-set-attendance" data-status="present" type="button">همه حاضر</button><button class="btn secondary small ux-set-attendance" data-status="absent" type="button">همه غایب</button><button class="btn secondary small ux-set-attendance" data-status="late" type="button">همه تأخیر</button></div>':'') + table(rows, columns) + `<div class="ux-form-actions">${editable ? '<button class="btn" id="uxSaveAttendance">ذخیره حضور و غیاب</button>' : ''}<button class="btn secondary" id="uxAttendanceCsv">خروجی CSV</button></div>`;
        result.querySelectorAll('.ux-set-attendance').forEach(button=>button.addEventListener('click',()=>{result.querySelectorAll('.ux-att-status').forEach(select=>{select.value=button.dataset.status;select.dispatchEvent(new Event('change'));});toast(`وضعیت همه دانش‌آموزان تنظیم شد.`,'info');}));
        result.querySelector('#uxAttendanceCsv')?.addEventListener('click', () => download(`attendance-${dateInput.value}.csv`, ['student,status,note', ...rows.map(row => `"${row.name || row.full_name || ''}","${row.status || ''}","${row.note || row.notes || ''}"`)].join('\n'), 'text/csv;charset=utf-8'));
        result.querySelector('#uxSaveAttendance')?.addEventListener('click', async event => {
          const button = event.currentTarget;
          const records = [...result.querySelectorAll('.ux-att-status')].map(select => ({
            student_id: Number(select.dataset.student),
            status: select.value,
            note: result.querySelector(`.ux-att-note[data-student="${select.dataset.student}"]`)?.value.trim() || ''
          }));
          const summary=records.reduce((acc,item)=>(acc[item.status]=(acc[item.status]||0)+1,acc),{});
          if(!await confirmOperation({title:'ثبت حضور و غیاب',message:`وضعیت ${records.length} دانش‌آموز ذخیره شود؟ حاضر: ${summary.present||0}، غایب: ${summary.absent||0}، تأخیر: ${summary.late||0}، موجه: ${summary.excused||0}`,confirmLabel:'ذخیره نهایی'}))return;
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
        ]) + (editable ? '<div class="ux-toolbar ux-bulk-toolbar"><label class="ux-field"><span>نمره گروهی</span><input id="uxBulkGrade" type="number" min="0" max="20" step="0.25" placeholder="مثلاً ۱۸"></label><button class="btn secondary small" id="uxApplyBulkGrade" type="button">اعمال به خانه‌های خالی</button><button class="btn secondary small" id="uxClearGrades" type="button">پاک کردن ورودی‌ها</button></div><div class="ux-form-actions"><button class="btn" id="uxSaveGrades">ذخیره همه نمرات</button></div>' : '<div class="ux-form-actions"><button class="btn secondary" id="uxGradesCsv">خروجی CSV</button></div>');
        result.querySelector('#uxApplyBulkGrade')?.addEventListener('click',()=>{const value=result.querySelector('#uxBulkGrade').value;if(value===''||Number(value)<0||Number(value)>20)return toast('نمره گروهی معتبر وارد کنید.','warning');result.querySelectorAll('.ux-grade').forEach(input=>{if(input.value==='')input.value=value;});toast('نمره به خانه‌های خالی اعمال شد.','success');});
        result.querySelector('#uxClearGrades')?.addEventListener('click',async()=>{if(!await confirmOperation({title:'پاک کردن ورودی‌ها',message:'همه نمرات نمایش‌داده‌شده از فرم پاک شوند؟ این کار تا قبل از ذخیره روی سرور اثری ندارد.',confirmLabel:'پاک کردن',danger:true}))return;result.querySelectorAll('.ux-grade').forEach(input=>{input.value='';});});
        result.querySelector('#uxSaveGrades')?.addEventListener('click', async event => {
          const grades = [...result.querySelectorAll('.ux-grade')].filter(input => input.value !== '').map(input => ({ student_id: Number(input.dataset.student), grade: Number(input.value) }));
          if (!grades.length || grades.some(item => item.grade < 0 || item.grade > 20)) return toast('نمرات معتبر بین صفر و بیست وارد کنید.', 'warning');
          const button = event.currentTarget;
          if(!await confirmOperation({title:'ذخیره نمرات',message:`${grades.length} نمره برای کلاس و درس انتخاب‌شده ذخیره شود؟`,confirmLabel:'ذخیره نهایی'}))return;
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
    container.innerHTML=section(title,`<div class="ux-message-layout"><aside><label class="ux-field"><span>جستجوی مخاطب</span><input id="uxContactSearch" type="search" placeholder="نام یا کلاس"></label><label class="ux-field"><span>مخاطب</span><select id="uxMessageContact" size="8"><option value="">انتخاب مخاطب</option>${contacts.map(row=>`<option value="${esc(row.id)}">${esc(row.name)}${row.class_name?` — ${esc(row.class_name)}`:''}</option>`).join('')}</select></label><div class="ux-contact-summary"><i class="fas fa-address-book"></i><strong>${fa(contacts.length)}</strong><span>مخاطب در دسترس</span></div></aside><div class="ux-conversation"><div id="uxMessageList">${state('empty','مخاطب را انتخاب کنید.')}</div><form id="uxMessageForm"><div class="ux-message-composer"><textarea name="message" maxlength="3000" required placeholder="متن ${page==='school-suggestions'?'پیشنهاد':'پیام'} را بنویسید..."></textarea><small><span id="uxMessageCount">۰</span> از ۳۰۰۰</small></div><button class="btn" type="submit"><i class="fas fa-paper-plane"></i> ارسال</button></form></div></div>`);
    const select=container.querySelector('#uxMessageContact');const list=container.querySelector('#uxMessageList');const form=container.querySelector('#uxMessageForm');const contactSearch=container.querySelector('#uxContactSearch');
    async function load(){if(!select.value){list.innerHTML=state('empty','مخاطب را انتخاب کنید.');return;}list.innerHTML=state('loading','در حال دریافت گفتگو');try{const data=await api(`/teacher/messages/${select.value}`);const currentId=JSON.parse(localStorage.getItem('user')||'{}').id;const rows=data.messages||[];list.innerHTML=rows.length?`<div class="ux-chat-list">${rows.map(row=>`<article class="${Number(row.sender_id)===Number(currentId)?'mine':'theirs'}"><p>${esc(row.message)}</p><small>${dateText(row.created_at)}</small></article>`).join('')}</div>`:state('empty','هنوز پیامی ردوبدل نشده است.');list.scrollTop=list.scrollHeight;}catch(error){retryState(list,'دریافت گفتگو ناموفق بود',error,load);}}
    contactSearch.addEventListener('input',()=>{const term=contactSearch.value.trim().toLowerCase();[...select.options].forEach(option=>{if(!option.value)return;option.hidden=Boolean(term&&!option.textContent.toLowerCase().includes(term));});});form.elements.message.addEventListener('input',()=>{container.querySelector('#uxMessageCount').textContent=fa(form.elements.message.value.length);});select.addEventListener('change',load);form.addEventListener('submit',async event=>{event.preventDefault();if(!select.value)return toast('مخاطب را انتخاب کنید.','warning');const button=event.submitter;let message=new FormData(form).get('message').trim();if(page==='school-suggestions')message=`[پیشنهاد مدرسه] ${message}`;busy(button,true,'ارسال...');try{await api('/teacher/messages',{method:'POST',body:JSON.stringify({receiver_id:Number(select.value),message})});form.reset();container.querySelector('#uxMessageCount').textContent='۰';toast('پیام ارسال شد.','success');await load();}catch(error){toast(error.message,'error');}finally{busy(button,false);}});const requested=new URLSearchParams(location.search).get('contact_id');const initial=contacts.find(row=>String(row.id)===requested)||contacts[0];if(initial){select.value=initial.id;await load();}
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

  async function renderClassesComplete(container) {
    const rows = await classes();
    const occupied = rows.reduce((sum, row) => sum + Number(row.student_count || 0), 0);
    const capacity = rows.reduce((sum, row) => sum + Number(row.capacity || 0), 0);
    container.innerHTML = kpis([
      { label: 'کلاس‌های فعال', value: rows.length, help: 'کلاس‌های منتسب به شما' },
      { label: 'دانش‌آموزان', value: occupied, help: 'جمع دانش‌آموزان کلاس‌ها' },
      { label: 'ظرفیت کل', value: capacity || '—', help: 'ظرفیت تعریف‌شده کلاس‌ها' },
      { label: 'میانگین تراکم', value: rows.length ? Math.round(occupied / rows.length) : 0, help: 'دانش‌آموز در هر کلاس' }
    ]) + section('کلاس‌های من', `<div class="ux-toolbar"><label class="ux-search ux-grow"><i class="fas fa-magnifying-glass"></i><input id="uxClassSearch" placeholder="جستجو در نام یا پایه کلاس"></label><button class="btn secondary" id="uxClassCsv" type="button"><i class="fas fa-file-csv"></i> خروجی CSV</button></div><div id="uxClassTable">${table(rows, [
      { label: 'نام کلاس', render: row => `<strong>${esc(row.name)}</strong>` },
      { label: 'پایه', key: 'grade' },
      { label: 'دانش‌آموز', render: row => fa(row.student_count || 0) },
      { label: 'ظرفیت', render: row => fa(row.capacity || '—') },
      { label: 'اشغال', render: row => row.capacity ? `${fa(Math.round(Number(row.student_count || 0) / Number(row.capacity) * 100))}٪` : '—' },
      { label: 'عملیات', render: row => `<div class="ux-inline-actions"><button class="btn secondary small ux-class-detail" type="button" data-id="${esc(row.id)}"><i class="fas fa-eye"></i> جزئیات</button><a class="btn secondary small" href="/dashboard/teacher/students?class_id=${esc(row.id)}"><i class="fas fa-users"></i> دانش‌آموزان</a></div>` }
    ], 'کلاسی به این معلم اختصاص داده نشده است.')}</div>`) + modalMarkup('uxClassDetailModal', 'جزئیات کلاس', '<div id="uxClassDetailBody"></div>', { wide: true });
    const search = container.querySelector('#uxClassSearch');
    search?.addEventListener('input', () => container.querySelectorAll('#uxClassTable tbody tr').forEach(row => { row.hidden = !row.textContent.toLowerCase().includes(search.value.trim().toLowerCase()); }));
    container.querySelector('#uxClassCsv')?.addEventListener('click', () => download(`teacher-classes-${today()}.csv`, ['class,grade,students,capacity', ...rows.map(row => [row.name, row.grade, row.student_count, row.capacity].map(csvCell).join(','))].join('\n'), 'text/csv;charset=utf-8'));
    const modal = bindModal(container.querySelector('#uxClassDetailModal')); const modalBody = container.querySelector('#uxClassDetailBody');
    container.querySelectorAll('.ux-class-detail').forEach(button => button.addEventListener('click', async () => {
      modal.open(button); modalBody.innerHTML = state('loading', 'در حال دریافت جزئیات کلاس');
      try {
        const data = await api(`/teacher/classes/${button.dataset.id}`); const classData = data.class || {}; const studentRows = data.students || []; const courseRows = data.courses || [];
        modal.querySelector('h3').textContent = `جزئیات ${classData.name || 'کلاس'}`;
        modalBody.innerHTML = kpis([{label:'دانش‌آموزان',value:studentRows.length},{label:'دروس',value:courseRows.length},{label:'ظرفیت',value:classData.capacity||'—'},{label:'پایه',value:classData.grade||'—'}]) + `<div class="ux-modal-tabs"><button class="active" type="button" data-tab="students">دانش‌آموزان</button><button type="button" data-tab="courses">دروس</button></div><div data-pane="students">${table(studentRows,[{label:'نام',key:'name'},{label:'نام کاربری',key:'username'},{label:'تلفن',render:row=>esc(row.phone||'—')},{label:'ایمیل',render:row=>esc(row.email||'—')}],'دانش‌آموزی در کلاس ثبت نشده است.')}</div><div data-pane="courses" hidden>${table(courseRows,[{label:'درس',key:'name'},{label:'معلمان',render:row=>esc(row.teachers_name||'—')},{label:'برنامه',render:row=>esc(row.schedule||'—')}],'درسی برای کلاس ثبت نشده است.')}</div><div class="ux-form-actions"><a class="btn" href="/dashboard/teacher/students?class_id=${esc(classData.id)}">رفتن به فهرست دانش‌آموزان</a></div>`;
        modalBody.querySelectorAll('[data-tab]').forEach(tab => tab.addEventListener('click', () => { modalBody.querySelectorAll('[data-tab]').forEach(item => item.classList.toggle('active', item === tab)); modalBody.querySelectorAll('[data-pane]').forEach(pane => { pane.hidden = pane.dataset.pane !== tab.dataset.tab; }); }));
      } catch (error) { retryState(modalBody, 'دریافت جزئیات کلاس ناموفق بود', error, () => button.click()); }
    }));
  }

  async function renderStudentsComplete(container) {
    const classRows = await classes();
    container.innerHTML = section('فهرست دانش‌آموزان کلاس', `<form id="uxStudentFilter" class="ux-toolbar"><label class="ux-field"><span>کلاس</span><select name="class_id" required><option value="">انتخاب کلاس</option>${options(classRows)}</select></label><label class="ux-search ux-grow"><i class="fas fa-magnifying-glass"></i><input name="search" placeholder="جستجو نام، نام کاربری یا تماس"></label><button class="btn secondary" type="submit"><i class="fas fa-filter"></i> نمایش</button><button class="btn secondary" id="uxStudentsCsv" type="button"><i class="fas fa-file-csv"></i> خروجی</button></form><div id="uxStudentsResult">${state('empty', 'کلاس را انتخاب کنید.')}</div>`) + modalMarkup('uxStudentDetailModal', 'پرونده آموزشی دانش‌آموز', '<div id="uxStudentDetailBody"></div>', { wide: true });
    const form = container.querySelector('#uxStudentFilter'); const result = container.querySelector('#uxStudentsResult'); const modal = bindModal(container.querySelector('#uxStudentDetailModal')); const modalBody = container.querySelector('#uxStudentDetailBody'); let currentRows = [];
    const paint = () => {
      const term = form.elements.search.value.trim().toLowerCase(); const rows = currentRows.filter(row => !term || [row.name,row.full_name,row.username,row.phone,row.email].some(value => String(value || '').toLowerCase().includes(term)));
      result.innerHTML = kpis([{label:'تعداد دانش‌آموز',value:currentRows.length},{label:'میانگین کلاس',value:currentRows.length?(currentRows.reduce((sum,row)=>sum+Number(row.avg_grade||0),0)/currentRows.length).toFixed(1):'—'},{label:'فعال',value:currentRows.filter(row=>row.status==='active').length}]) + table(rows,[{label:'دانش‌آموز',render:row=>`<strong>${esc(row.name||row.full_name)}</strong><small class="ux-cell-subtitle">${esc(row.username||'')}</small>`},{label:'تماس',render:row=>esc(row.phone||row.email||'—')},{label:'میانگین',render:row=>fa(row.avg_grade??'—')},{label:'وضعیت',render:row=>statusBadge(row.status||'active')},{label:'عملیات',render:row=>`<div class="ux-inline-actions"><button class="btn secondary small ux-student-detail" data-id="${esc(row.id)}" type="button"><i class="fas fa-eye"></i> پرونده</button><a class="btn secondary small" href="/dashboard/teacher/student-messenger?contact_id=${esc(row.id)}"><i class="fas fa-message"></i> پیام</a></div>`}],'دانش‌آموزی مطابق فیلتر وجود ندارد.');
      result.querySelectorAll('.ux-student-detail').forEach(button => button.addEventListener('click', () => openStudent(button)));
    };
    async function load() { if (!form.elements.class_id.value) return toast('کلاس را انتخاب کنید.','warning'); result.innerHTML=state('loading','در حال دریافت دانش‌آموزان'); try{currentRows=await students(form.elements.class_id.value);paint();}catch(error){retryState(result,'دریافت دانش‌آموزان ناموفق بود',error,load);} }
    async function openStudent(button) {
      const student = currentRows.find(row => String(row.id) === button.dataset.id); if (!student) return; modal.open(button); modalBody.innerHTML=state('loading','در حال آماده‌سازی پرونده آموزشی');
      try {
        const [grades,attendance,parent] = await Promise.all([api(`/teacher/student-report/${student.id}?type=grades`),api(`/teacher/student-report/${student.id}?type=attendance`),api(`/teacher/parent/${student.id}`).catch(()=>({parent:null}))]);
        const gradeRows=grades.grades||[];const attendanceRows=attendance.attendance||[];const absent=attendanceRows.filter(row=>row.status==='absent').length;
        modal.querySelector('h3').textContent=`پرونده ${student.name||student.full_name}`;
        modalBody.innerHTML=kpis([{label:'میانگین',value:student.avg_grade??'—'},{label:'رکورد نمره',value:gradeRows.length},{label:'غیبت',value:absent},{label:'سرپرست',value:parent.parent?.name||'ثبت نشده'}])+`<div class="ux-profile-summary"><div><strong>${esc(student.name||student.full_name)}</strong><span>${esc(student.username||'')}</span></div><dl><div><dt>کلاس</dt><dd>${esc(student.class_name||'—')}</dd></div><div><dt>پایه</dt><dd>${esc(student.grade||'—')}</dd></div><div><dt>تلفن</dt><dd>${esc(student.phone||'—')}</dd></div><div><dt>ایمیل</dt><dd>${esc(student.email||'—')}</dd></div></dl></div><div class="ux-modal-tabs"><button class="active" type="button" data-tab="grades">نمرات</button><button type="button" data-tab="attendance">حضور و غیاب</button></div><div data-pane="grades">${table(gradeRows,[{label:'درس',key:'course_name'},{label:'کلاسی',key:'quiz'},{label:'تکلیف',key:'homework'},{label:'میان‌ترم',key:'midterm'},{label:'پایانی',key:'final_exam'},{label:'میانگین',key:'average'}],'نمره‌ای ثبت نشده است.')}</div><div data-pane="attendance" hidden>${table(attendanceRows,[{label:'تاریخ',render:row=>dateText(row.date)},{label:'وضعیت',render:row=>statusBadge(row.status)},{label:'توضیح',render:row=>esc(row.notes||'—')}],'سابقه‌ای ثبت نشده است.')}</div><div class="ux-form-actions"><a class="btn" href="/dashboard/teacher/student-messenger?contact_id=${esc(student.id)}"><i class="fas fa-message"></i> ارسال پیام</a><a class="btn secondary" href="/dashboard/teacher/student-report-cards?student_id=${esc(student.id)}"><i class="fas fa-chart-line"></i> گزارش کامل</a></div>`;
        modalBody.querySelectorAll('[data-tab]').forEach(tab=>tab.addEventListener('click',()=>{modalBody.querySelectorAll('[data-tab]').forEach(item=>item.classList.toggle('active',item===tab));modalBody.querySelectorAll('[data-pane]').forEach(pane=>{pane.hidden=pane.dataset.pane!==tab.dataset.tab;});}));
      } catch(error){retryState(modalBody,'دریافت پرونده ناموفق بود',error,()=>openStudent(button));}
    }
    form.addEventListener('submit',event=>{event.preventDefault();load();});form.elements.search.addEventListener('input',paint);container.querySelector('#uxStudentsCsv').addEventListener('click',()=>download(`students-${today()}.csv`,['name,username,class,grade,average',...currentRows.map(row=>[row.name||row.full_name,row.username,row.class_name,row.grade,row.avg_grade].map(csvCell).join(','))].join('\n'),'text/csv;charset=utf-8'));
    const requestedClass=new URLSearchParams(location.search).get('class_id');const initial=classRows.find(row=>String(row.id)===requestedClass)||classRows[0];if(initial){form.elements.class_id.value=initial.id;await load();}
  }

  async function renderScheduleComplete(container) {
    const [response,classRows]=await Promise.all([api('/teacher/schedule'),classes()]);const rows=response.schedule||[];const days=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه'];
    container.innerHTML=kpis([{label:'جلسه هفتگی',value:rows.length},{label:'کلاس‌ها',value:new Set(rows.map(row=>row.class_name)).size},{label:'دروس',value:new Set(rows.map(row=>row.course_name||row.subject)).size}])+section('برنامه هفتگی تدریس',`<div class="ux-toolbar"><label class="ux-field"><span>روز</span><select id="uxScheduleDay"><option value="">همه روزها</option>${days.map(day=>`<option>${day}</option>`).join('')}</select></label><label class="ux-field"><span>کلاس</span><select id="uxScheduleClass"><option value="">همه کلاس‌ها</option>${classRows.map(row=>`<option value="${esc(row.name)}">${esc(row.name)}</option>`).join('')}</select></label><button class="btn secondary" id="uxPrintSchedule"><i class="fas fa-print"></i> چاپ</button><button class="btn secondary" id="uxScheduleCsv"><i class="fas fa-file-csv"></i> خروجی</button></div><div id="uxScheduleTable"></div>`);
    const day=container.querySelector('#uxScheduleDay'),classSelect=container.querySelector('#uxScheduleClass'),target=container.querySelector('#uxScheduleTable');
    const paint=()=>{const filtered=rows.filter(row=>(!day.value||(row.day_name||row.day)===day.value)&&(!classSelect.value&&true||row.class_name===classSelect.value));target.innerHTML=table(filtered,[{label:'روز',render:row=>esc(row.day_name||row.day||'—')},{label:'زمان',render:row=>esc(row.start_time&&row.end_time?`${row.start_time} تا ${row.end_time}`:row.time||'—')},{label:'کلاس',key:'class_name'},{label:'پایه',key:'grade'},{label:'درس',render:row=>esc(row.course_name||row.subject||'—')},{label:'عملیات',render:row=>`<a class="btn secondary small" href="/dashboard/teacher/students?class_id=${esc(classRows.find(item=>item.name===row.class_name)?.id||'')}">فهرست کلاس</a>`}],'برای این فیلتر برنامه‌ای ثبت نشده است.');};day.addEventListener('change',paint);classSelect.addEventListener('change',paint);paint();container.querySelector('#uxPrintSchedule').addEventListener('click',()=>window.print());container.querySelector('#uxScheduleCsv').addEventListener('click',()=>download(`teacher-schedule-${today()}.csv`,['day,time,class,grade,course',...rows.map(row=>[row.day_name||row.day,row.time,row.class_name,row.grade,row.course_name||row.subject].map(csvCell).join(','))].join('\n'),'text/csv;charset=utf-8'));
  }

  async function renderEntityComplete(container, kind) {
    const isExam=kind==='exam';const endpoint=isExam?'/teacher/exams':'/teacher/assignments';const classRows=await classes();const response=await api(endpoint).catch(()=>({}));const rows=response[isExam?'exams':'assignments']||[];const noun=isExam?'آزمون':'تکلیف';
    const formBody=`<form id="uxEntityModalForm" class="ux-form-grid three"><input name="entity_id" type="hidden"><label class="ux-field full"><span>عنوان ${noun}</span><input name="title" maxlength="200" required placeholder="عنوان روشن و کوتاه"></label><label class="ux-field"><span>کلاس</span><select name="class_id" required><option value="">انتخاب کلاس</option>${options(classRows)}</select></label><label class="ux-field"><span>درس</span><select name="course_id" required><option value="">ابتدا کلاس را انتخاب کنید</option></select></label>${isExam?'<label class="ux-field"><span>زمان شروع</span><input name="start_time" type="datetime-local" required></label><label class="ux-field"><span>مدت (دقیقه)</span><input name="duration" type="number" min="1" max="600" value="60" required></label><label class="ux-field"><span>وضعیت انتشار</span><select name="is_published"><option value="0">پیش‌نویس</option><option value="1">منتشرشده</option></select></label>':'<label class="ux-field"><span>مهلت تحویل</span><input name="due_date" type="datetime-local" required></label>'}<label class="ux-field"><span>نمره کل</span><input name="total_points" type="number" min="1" max="1000" value="20" required></label><label class="ux-field full"><span>شرح و دستورالعمل</span><textarea name="description" maxlength="5000" placeholder="هدف، مراحل انجام و معیار ارزیابی"></textarea><small class="ux-field-hint">حداکثر ۵۰۰۰ نویسه</small></label><div class="ux-form-actions full"><button class="btn" type="submit"><i class="fas fa-check"></i> <span data-submit-label>ثبت ${noun}</span></button><button class="btn secondary" type="button" data-close>انصراف</button></div></form>`;
    container.innerHTML=kpis([{label:`کل ${noun}‌ها`,value:rows.length},{label:isExam?'منتشرشده':'پاسخ‌های دریافتی',value:isExam?rows.filter(row=>Number(row.is_published)===1).length:rows.reduce((sum,row)=>sum+Number(row.submissions_count||0),0)},{label:'فعال/آینده',value:rows.filter(row=>new Date(row.start_time||row.deadline||row.due_date)>new Date()).length},{label:'کلاس‌ها',value:new Set(rows.map(row=>row.class_id||row.class_name)).size}])+section(`مدیریت ${noun}‌ها`,`<div class="ux-toolbar"><button class="btn" id="uxNewEntity" type="button"><i class="fas fa-plus"></i> ایجاد ${noun}</button><label class="ux-search ux-grow"><i class="fas fa-magnifying-glass"></i><input id="uxEntitySearch" placeholder="جستجو عنوان، کلاس یا درس"></label><label class="ux-field"><span>کلاس</span><select id="uxEntityClassFilter"><option value="">همه کلاس‌ها</option>${options(classRows)}</select></label><button class="btn secondary" id="uxEntityCsv" type="button"><i class="fas fa-file-csv"></i> خروجی</button></div><div id="uxEntityTable"></div>`)+modalMarkup('uxEntityModal',`ایجاد ${noun}`,formBody,{wide:true})+modalMarkup('uxEntityDetailModal',`جزئیات ${noun}`,'<div id="uxEntityDetailBody"></div>',{wide:true})+(isExam?modalMarkup('uxQuestionModal','مدیریت سؤال‌های آزمون',`<form id="uxQuestionForm" class="ux-form-grid"><input name="exam_id" type="hidden"><input name="question_id" type="hidden"><label class="ux-field full"><span>متن سؤال</span><textarea name="question_text" required maxlength="4000"></textarea></label><label class="ux-field"><span>نوع سؤال</span><select name="question_type"><option value="single">تک‌گزینه‌ای</option><option value="multiple">چندگزینه‌ای</option><option value="descriptive">تشریحی</option></select></label><label class="ux-field"><span>بارم</span><input name="points" type="number" min="0.25" step="0.25" value="1" required></label><label class="ux-field full" data-options-field><span>گزینه‌ها</span><input name="options" placeholder="هر گزینه را با ویرگول جدا کنید"></label><label class="ux-field full"><span>پاسخ صحیح / راهنمای تصحیح</span><input name="correct_answer"></label><div class="ux-form-actions full"><button class="btn" type="submit"><i class="fas fa-plus"></i> <span data-question-label>افزودن سؤال</span></button><button class="btn secondary" type="button" id="uxResetQuestion">فرم سؤال جدید</button></div></form><div id="uxQuestionList"></div>`,{wide:true}):'');
    const createModal=bindModal(container.querySelector('#uxEntityModal')),detailModal=bindModal(container.querySelector('#uxEntityDetailModal')),form=container.querySelector('#uxEntityModalForm'),tableTarget=container.querySelector('#uxEntityTable'),search=container.querySelector('#uxEntitySearch'),classFilter=container.querySelector('#uxEntityClassFilter');
    let filteredRows=rows;
    let openQuestions=async()=>{};
    async function loadCourses(selected=''){const select=form.elements.course_id;const classId=form.elements.class_id.value;select.disabled=true;select.innerHTML='<option value="">در حال دریافت دروس...</option>';if(!classId){select.innerHTML='<option value="">ابتدا کلاس را انتخاب کنید</option>';select.disabled=false;return;}try{const data=await api(`/teacher/courses?class_id=${encodeURIComponent(classId)}`);select.innerHTML=`<option value="">انتخاب درس</option>${options(data.courses||[])}`;if(selected)select.value=String(selected);else if(data.courses?.[0])select.value=String(data.courses[0].id);}catch(error){select.innerHTML='<option value="">دریافت دروس ناموفق بود</option>';toast(error.message,'error');}finally{select.disabled=false;}}
    function resetForm(){form.reset();form.elements.entity_id.value='';form.elements.total_points.value='20';if(isExam){form.elements.duration.value='60';form.elements.is_published.value='0';}form.elements.course_id.innerHTML='<option value="">ابتدا کلاس را انتخاب کنید</option>';form.querySelector('[data-submit-label]').textContent=`ثبت ${noun}`;createModal.querySelector('h3').textContent=`ایجاد ${noun}`;}
    function paint(){const term=search.value.trim().toLowerCase(),classId=classFilter.value;filteredRows=rows.filter(row=>(!term||[row.title,row.class_name,row.course_name,row.description].some(value=>String(value||'').toLowerCase().includes(term)))&&(!classId||String(row.class_id)===classId));tableTarget.innerHTML=table(filteredRows,[{label:'عنوان',render:row=>`<strong>${esc(row.title)}</strong><small class="ux-cell-subtitle">${esc(row.course_name||'')}</small>`},{label:'کلاس',render:row=>esc(row.class_name||'—')},{label:isExam?'شروع':'مهلت',render:row=>dateText(row.start_time||row.deadline||row.due_date)},{label:'نمره',render:row=>fa(row.total_points||'—')},{label:'وضعیت',render:row=>isExam?statusBadge(Number(row.is_published)===1?'published':'draft'):statusBadge(new Date(row.deadline||row.due_date)>new Date()?'active':'completed')},{label:'عملیات',render:row=>`<div class="ux-inline-actions"><button class="btn secondary small ux-view-entity" data-id="${esc(row.id)}" type="button"><i class="fas fa-eye"></i> جزئیات</button>${isExam?`<button class="btn secondary small ux-questions" data-id="${esc(row.id)}" type="button"><i class="fas fa-list-ol"></i> سؤال‌ها</button>`:''}<button class="btn secondary small ux-edit-entity" data-id="${esc(row.id)}" type="button"><i class="fas fa-pen"></i> ویرایش</button><button class="btn danger small ux-delete-entity" data-id="${esc(row.id)}" type="button"><i class="fas fa-trash"></i> حذف</button></div>`}],`${noun}ی ثبت نشده است.`);bindRows();}
    function bindRows(){tableTarget.querySelectorAll('.ux-view-entity').forEach(button=>button.addEventListener('click',()=>{const row=rows.find(item=>String(item.id)===button.dataset.id);if(!row)return;detailModal.querySelector('h3').textContent=`جزئیات ${row.title}`;detailModal.querySelector('#uxEntityDetailBody').innerHTML=`<dl class="ux-detail-grid"><div><dt>عنوان</dt><dd>${esc(row.title)}</dd></div><div><dt>کلاس</dt><dd>${esc(row.class_name||'—')}</dd></div><div><dt>درس</dt><dd>${esc(row.course_name||'—')}</dd></div><div><dt>نمره کل</dt><dd>${fa(row.total_points||'—')}</dd></div><div><dt>${isExam?'شروع':'مهلت'}</dt><dd>${dateText(row.start_time||row.deadline||row.due_date)}</dd></div>${isExam?`<div><dt>مدت</dt><dd>${fa(row.duration||0)} دقیقه</dd></div>`:''}</dl><div class="ux-description-box"><strong>شرح</strong><p>${esc(row.description||'توضیحی ثبت نشده است.')}</p></div>`;detailModal.open(button);}));tableTarget.querySelectorAll('.ux-edit-entity').forEach(button=>button.addEventListener('click',async()=>{const row=rows.find(item=>String(item.id)===button.dataset.id);if(!row)return;resetForm();form.elements.entity_id.value=row.id;form.elements.title.value=row.title||'';form.elements.class_id.value=row.class_id||'';await loadCourses(row.course_id);form.elements.total_points.value=row.total_points||20;form.elements.description.value=row.description||'';if(isExam){form.elements.start_time.value=toLocalInput(row.start_time);form.elements.duration.value=row.duration||60;form.elements.is_published.value=Number(row.is_published)===1?'1':'0';}else form.elements.due_date.value=toLocalInput(row.deadline||row.due_date);form.querySelector('[data-submit-label]').textContent='ذخیره ویرایش';createModal.querySelector('h3').textContent=`ویرایش ${noun}`;createModal.open(button);}));tableTarget.querySelectorAll('.ux-delete-entity').forEach(button=>button.addEventListener('click',async()=>{const row=rows.find(item=>String(item.id)===button.dataset.id);if(!await confirmOperation({title:`حذف ${noun}`,message:`${noun} «${row?.title||''}» حذف شود؟ این عملیات قابل بازگشت نیست.`,confirmLabel:'حذف قطعی',danger:true}))return;busy(button,true,'حذف...');try{await api(`${endpoint}/${button.dataset.id}`,{method:'DELETE'});toast(`${noun} حذف شد.`,'success');await renderEntityComplete(container,kind);}catch(error){toast(error.message,'error');}finally{busy(button,false);}}));if(isExam)tableTarget.querySelectorAll('.ux-questions').forEach(button=>button.addEventListener('click',()=>openQuestions(button)));}
    form.elements.class_id.addEventListener('change',()=>loadCourses());container.querySelector('#uxNewEntity').addEventListener('click',button=>{resetForm();createModal.open(button.currentTarget);});search.addEventListener('input',paint);classFilter.addEventListener('change',paint);container.querySelector('#uxEntityCsv').addEventListener('click',()=>download(`teacher-${kind}s-${today()}.csv`,['title,class,course,date,points',...filteredRows.map(row=>[row.title,row.class_name,row.course_name,row.start_time||row.deadline||row.due_date,row.total_points].map(csvCell).join(','))].join('\n'),'text/csv;charset=utf-8'));
    form.addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter;const values=Object.fromEntries(new FormData(form));const payload={title:values.title.trim(),class_id:Number(values.class_id),course_id:Number(values.course_id),total_points:Number(values.total_points),description:values.description.trim(),...(isExam?{start_time:values.start_time,duration:Number(values.duration),is_published:values.is_published==='1'}:{due_date:values.due_date})};busy(button,true,'در حال ذخیره...');try{await api(values.entity_id?`${endpoint}/${values.entity_id}`:endpoint,{method:values.entity_id?'PUT':'POST',body:JSON.stringify(payload)});toast(values.entity_id?`${noun} ویرایش شد.`:`${noun} ثبت شد.`,'success');createModal.close();await renderEntityComplete(container,kind);}catch(error){toast(error.message,'error');}finally{busy(button,false);}});
    if(isExam){const questionModal=bindModal(container.querySelector('#uxQuestionModal')),qForm=container.querySelector('#uxQuestionForm'),qList=container.querySelector('#uxQuestionList');let questionRows=[];const resetQuestion=()=>{const examId=qForm.elements.exam_id.value;qForm.reset();qForm.elements.exam_id.value=examId;qForm.elements.question_id.value='';qForm.elements.points.value='1';qForm.querySelector('[data-question-label]').textContent='افزودن سؤال';};qForm.elements.question_type.addEventListener('change',()=>{qForm.querySelector('[data-options-field]').hidden=qForm.elements.question_type.value==='descriptive';});container.querySelector('#uxResetQuestion').addEventListener('click',resetQuestion);
      async function loadQuestions(){qList.innerHTML=state('loading','در حال دریافت سؤال‌ها');try{const data=await api(`/teacher/exams/${qForm.elements.exam_id.value}/questions`);questionRows=data.questions||[];const points=questionRows.reduce((sum,row)=>sum+Number(row.points||0),0);qList.innerHTML=kpis([{label:'تعداد سؤال',value:questionRows.length},{label:'جمع بارم',value:points}])+table(questionRows,[{label:'متن',render:row=>esc(row.question_text)},{label:'نوع',render:row=>esc({single:'تک‌گزینه‌ای',multiple:'چندگزینه‌ای',descriptive:'تشریحی'}[row.question_type]||row.question_type)},{label:'بارم',render:row=>fa(row.points)},{label:'عملیات',render:row=>`<div class="ux-inline-actions"><button class="btn secondary small ux-edit-question" data-id="${esc(row.id)}" type="button">ویرایش</button><button class="btn danger small ux-delete-question" data-id="${esc(row.id)}" type="button">حذف</button></div>`}],'هنوز سؤالی ثبت نشده است.');qList.querySelectorAll('.ux-edit-question').forEach(button=>button.addEventListener('click',()=>{const row=questionRows.find(item=>String(item.id)===button.dataset.id);if(!row)return;let opts=row.options;try{if(typeof opts==='string')opts=JSON.parse(opts);}catch{}let answer=row.correct_answer;try{if(typeof answer==='string')answer=JSON.parse(answer);}catch{}qForm.elements.question_id.value=row.id;qForm.elements.question_text.value=row.question_text||'';qForm.elements.question_type.value=row.question_type||'single';qForm.elements.points.value=row.points||1;qForm.elements.options.value=Array.isArray(opts)?opts.join('، '):'';qForm.elements.correct_answer.value=Array.isArray(answer)?answer.join('، '):answer||'';qForm.querySelector('[data-question-label]').textContent='ذخیره ویرایش سؤال';qForm.elements.question_text.focus();}));qList.querySelectorAll('.ux-delete-question').forEach(button=>button.addEventListener('click',async()=>{if(!await confirmOperation({title:'حذف سؤال',message:'این سؤال از آزمون حذف شود؟',confirmLabel:'حذف',danger:true}))return;try{await api(`/teacher/exam-questions/${button.dataset.id}`,{method:'DELETE'});toast('سؤال حذف شد.','success');await loadQuestions();}catch(error){toast(error.message,'error');}}));}catch(error){retryState(qList,'دریافت سؤال‌ها ناموفق بود',error,loadQuestions);}}
      openQuestions=async button=>{const row=rows.find(item=>String(item.id)===button.dataset.id);resetQuestion();qForm.elements.exam_id.value=button.dataset.id;questionModal.querySelector('h3').textContent=`سؤال‌های ${row?.title||'آزمون'}`;questionModal.open(button);await loadQuestions();};
      qForm.addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter,values=Object.fromEntries(new FormData(qForm));const opts=values.options.split('،').join(',').split(',').map(item=>item.trim()).filter(Boolean);if(values.question_type!=='descriptive'&&opts.length<2)return toast('برای سؤال گزینه‌ای حداقل دو گزینه وارد کنید.','warning');const payload={exam_id:Number(values.exam_id),question_text:values.question_text.trim(),question_type:values.question_type,options:opts,correct_answer:values.correct_answer.trim(),points:Number(values.points)};busy(button,true,'ذخیره...');try{await api(values.question_id?`/teacher/exam-questions/${values.question_id}`:'/teacher/exam-questions',{method:values.question_id?'PUT':'POST',body:JSON.stringify(payload)});toast(values.question_id?'سؤال ویرایش شد.':'سؤال اضافه شد.','success');resetQuestion();await loadQuestions();}catch(error){toast(error.message,'error');}finally{busy(button,false);}});
    }
    paint();
    if((!isExam&&PAGE==='assignment-create')||(isExam&&PAGE==='online-exam-create'))requestAnimationFrame(()=>container.querySelector('#uxNewEntity')?.click());
  }

  async function renderAssignmentReviewComplete(container) {
    const response=await api('/teacher/assignments');const assignmentRows=response.assignments||[];
    container.innerHTML=section('تصحیح و بازخورد تکالیف',`<form id="uxReviewFilter" class="ux-toolbar"><label class="ux-field ux-grow"><span>تکلیف</span><select name="assignment_id" required><option value="">انتخاب تکلیف</option>${assignmentRows.map(row=>`<option value="${esc(row.id)}">${esc(row.title)} — ${esc(row.class_name||'')}</option>`).join('')}</select></label><label class="ux-field"><span>وضعیت</span><select name="status"><option value="">همه پاسخ‌ها</option><option value="pending">در انتظار تصحیح</option><option value="graded">تصحیح‌شده</option></select></label><button class="btn secondary" type="submit"><i class="fas fa-list-check"></i> نمایش</button><button class="btn secondary" id="uxReviewCsv" type="button"><i class="fas fa-file-csv"></i> خروجی</button></form><div id="uxReviewResult">${state('empty','یک تکلیف را انتخاب کنید.')}</div>`)+modalMarkup('uxGradeSubmissionModal','ارزیابی پاسخ دانش‌آموز',`<div id="uxSubmissionPreview"></div><form id="uxSubmissionGradeForm" class="ux-form-grid"><input name="submission_id" type="hidden"><label class="ux-field"><span>نمره</span><input name="grade" type="number" min="0" step="0.25"></label><label class="ux-field full"><span>بازخورد معلم</span><textarea name="feedback" rows="6" maxlength="3000" placeholder="نقاط قوت، موارد قابل اصلاح و پیشنهاد بعدی"></textarea></label><div class="ux-form-actions full"><button class="btn" type="submit"><i class="fas fa-check"></i> ثبت ارزیابی</button><button class="btn secondary" type="button" data-close>انصراف</button></div></form>`,{wide:true});
    const filter=container.querySelector('#uxReviewFilter'),result=container.querySelector('#uxReviewResult'),modal=bindModal(container.querySelector('#uxGradeSubmissionModal')),gradeForm=container.querySelector('#uxSubmissionGradeForm'),preview=container.querySelector('#uxSubmissionPreview');let rows=[],assignment=null;
    function paint(){const status=filter.elements.status.value,filtered=rows.filter(row=>!status||(status==='graded'?Boolean(row.graded_at):!row.graded_at));const max=Number(assignment?.total_points||100);result.innerHTML=kpis([{label:'پاسخ‌های دریافتی',value:rows.length},{label:'تصحیح‌شده',value:rows.filter(row=>row.graded_at).length},{label:'در انتظار',value:rows.filter(row=>!row.graded_at).length},{label:'میانگین نمره',value:rows.some(row=>row.grade!=null)?(rows.filter(row=>row.grade!=null).reduce((sum,row)=>sum+Number(row.grade),0)/rows.filter(row=>row.grade!=null).length).toFixed(1):'—'}])+table(filtered,[{label:'دانش‌آموز',render:row=>`<strong>${esc(row.student_name)}</strong><small class="ux-cell-subtitle">${esc(row.username||'')}</small>`},{label:'زمان ارسال',render:row=>dateText(row.submitted_at)},{label:'وضعیت',render:row=>statusBadge(row.graded_at?'completed':'draft',{completed:'تصحیح‌شده',draft:'در انتظار'})},{label:`نمره از ${fa(max)}`,render:row=>fa(row.grade??'—')},{label:'بازخورد',render:row=>esc(row.feedback||'—')},{label:'عملیات',render:row=>`<button class="btn ${row.graded_at?'secondary':''} small ux-grade-submission" data-id="${esc(row.id)}" type="button"><i class="fas fa-pen-to-square"></i> ${row.graded_at?'ویرایش ارزیابی':'تصحیح'}</button>`}],'پاسخی مطابق فیلتر وجود ندارد.');result.querySelectorAll('.ux-grade-submission').forEach(button=>button.addEventListener('click',()=>{const row=rows.find(item=>String(item.id)===button.dataset.id);if(!row)return;gradeForm.elements.submission_id.value=row.id;gradeForm.elements.grade.max=String(max);gradeForm.elements.grade.value=row.grade??'';gradeForm.elements.feedback.value=row.feedback||'';preview.innerHTML=`<div class="ux-submission-card"><div><strong>${esc(row.student_name)}</strong><span>${dateText(row.submitted_at)}</span></div>${row.file_url?`<a class="btn secondary" href="${esc(row.file_url)}" target="_blank" rel="noopener"><i class="fas fa-paperclip"></i> مشاهده فایل ارسالی</a>`:''}<p>${esc(row.content||'پاسخ متنی ثبت نشده است.')}</p></div>`;modal.querySelector('h3').textContent=`ارزیابی پاسخ ${row.student_name}`;modal.open(button);}));}
    async function load(){const id=filter.elements.assignment_id.value;if(!id)return toast('تکلیف را انتخاب کنید.','warning');result.innerHTML=state('loading','در حال دریافت پاسخ‌ها');try{const data=await api(`/teacher/assignments/${id}/submissions`);rows=data.submissions||[];assignment=data.assignment||assignmentRows.find(row=>String(row.id)===id);paint();}catch(error){retryState(result,'دریافت پاسخ‌ها ناموفق بود',error,load);}}
    filter.addEventListener('submit',event=>{event.preventDefault();load();});filter.elements.status.addEventListener('change',paint);container.querySelector('#uxReviewCsv').addEventListener('click',()=>download(`assignment-review-${today()}.csv`,['student,username,submitted,grade,feedback',...rows.map(row=>[row.student_name,row.username,row.submitted_at,row.grade,row.feedback].map(csvCell).join(','))].join('\n'),'text/csv;charset=utf-8'));gradeForm.addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter,grade=gradeForm.elements.grade.value,feedback=gradeForm.elements.feedback.value.trim();if(grade===''&&!feedback)return toast('نمره یا بازخورد را وارد کنید.','warning');busy(button,true,'ذخیره...');try{await api(`/teacher/submissions/${gradeForm.elements.submission_id.value}`,{method:'PUT',body:JSON.stringify({grade,feedback})});toast('ارزیابی ذخیره شد.','success');modal.close();await load();}catch(error){toast(error.message,'error');}finally{busy(button,false);}});if(assignmentRows[0]){filter.elements.assignment_id.value=assignmentRows[0].id;await load();}
  }

  async function renderExamResultsComplete(container) {
    const response=await api('/teacher/exams');const examRows=response.exams||[];
    container.innerHTML=section('نتایج و تحلیل آزمون',`<form id="uxExamResultFilter" class="ux-toolbar"><label class="ux-field ux-grow"><span>آزمون</span><select name="exam_id" required><option value="">انتخاب آزمون</option>${examRows.map(row=>`<option value="${esc(row.id)}">${esc(row.title)} — ${esc(row.class_name||'')}</option>`).join('')}</select></label><label class="ux-search ux-grow"><i class="fas fa-magnifying-glass"></i><input name="search" placeholder="جستجو دانش‌آموز"></label><button class="btn secondary" type="submit">نمایش نتایج</button><button class="btn secondary" id="uxExamResultsCsv" type="button"><i class="fas fa-file-csv"></i> خروجی</button></form><div id="uxExamResults">${state('empty','یک آزمون را انتخاب کنید.')}</div>`)+modalMarkup('uxExamAttemptModal','جزئیات پاسخ آزمون','<div id="uxExamAttemptBody"></div>',{wide:true});
    const form=container.querySelector('#uxExamResultFilter'),result=container.querySelector('#uxExamResults'),modal=bindModal(container.querySelector('#uxExamAttemptModal')),modalBody=container.querySelector('#uxExamAttemptBody');let rows=[];
    function paint(){const term=form.elements.search.value.trim().toLowerCase(),filtered=rows.filter(row=>!term||String(row.student_name||row.name||'').toLowerCase().includes(term));const scores=rows.map(row=>Number(row.score??row.grade)).filter(Number.isFinite);result.innerHTML=kpis([{label:'شرکت‌کنندگان',value:rows.length},{label:'میانگین',value:scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1):'—'},{label:'بیشترین',value:scores.length?Math.max(...scores):'—'},{label:'کمترین',value:scores.length?Math.min(...scores):'—'}])+table(filtered,[{label:'دانش‌آموز',render:row=>`<strong>${esc(row.student_name||row.name)}</strong>`},{label:'نمره',render:row=>fa(row.score??row.grade??'—')},{label:'درصد',render:row=>row.percentage==null?'—':`${fa(row.percentage)}٪`},{label:'شروع',render:row=>dateText(row.started_at)},{label:'ارسال',render:row=>dateText(row.submitted_at)},{label:'عملیات',render:row=>`<button class="btn secondary small ux-attempt-detail" data-id="${esc(row.id)}" type="button"><i class="fas fa-eye"></i> جزئیات</button>`}],'نتیجه‌ای مطابق فیلتر وجود ندارد.');result.querySelectorAll('.ux-attempt-detail').forEach(button=>button.addEventListener('click',()=>{const row=rows.find(item=>String(item.id)===button.dataset.id);if(!row)return;let answers=row.answers;try{if(typeof answers==='string')answers=JSON.parse(answers);}catch{}modal.querySelector('h3').textContent=`پاسخ آزمون ${row.student_name||row.name}`;modalBody.innerHTML=kpis([{label:'نمره',value:row.score??row.grade??'—'},{label:'درصد',value:row.percentage??'—'},{label:'زمان شروع',value:dateText(row.started_at)},{label:'زمان ارسال',value:dateText(row.submitted_at)}])+section('پاسخ‌های ثبت‌شده',answers&&typeof answers==='object'?`<pre class="ux-json-preview">${esc(JSON.stringify(answers,null,2))}</pre>`:state('empty','جزئیات پاسخ ذخیره نشده است.'));modal.open(button);}));}
    async function load(){const id=form.elements.exam_id.value;if(!id)return;result.innerHTML=state('loading','در حال دریافت نتایج');try{const data=await api(`/teacher/exams/${id}/grades`);rows=data.results||data.grades||[];paint();}catch(error){retryState(result,'دریافت نتایج ناموفق بود',error,load);}}
    form.addEventListener('submit',event=>{event.preventDefault();load();});form.elements.search.addEventListener('input',paint);container.querySelector('#uxExamResultsCsv').addEventListener('click',()=>download(`exam-results-${today()}.csv`,['student,score,percentage,started,submitted',...rows.map(row=>[row.student_name||row.name,row.score??row.grade,row.percentage,row.started_at,row.submitted_at].map(csvCell).join(','))].join('\n'),'text/csv;charset=utf-8'));if(examRows[0]){form.elements.exam_id.value=examRows[0].id;await load();}
  }

  async function renderStudentActivityComplete(container,page=PAGE) {
    const type=page==='encouragement-create'?'encouragement':'discipline',label=type==='encouragement'?'تشویقی':'انضباطی';const [classRows,data]=await Promise.all([classes(),api(`/teacher/student-activities?type=${type}`)]);const rows=data.items||[];
    const formHtml=`<form id="uxActivityModalForm" class="ux-form-grid three"><input name="record_id" type="hidden"><label class="ux-field"><span>کلاس</span><select name="class_id" required><option value="">انتخاب کلاس</option>${options(classRows)}</select></label><label class="ux-field"><span>دانش‌آموز</span><select name="student_id" required><option value="">ابتدا کلاس را انتخاب کنید</option></select></label><label class="ux-field"><span>امتیاز</span><input name="points" type="number" value="${type==='encouragement'?1:-1}"></label><label class="ux-field full"><span>عنوان گزارش</span><input name="title" maxlength="200" required></label><label class="ux-field full"><span>شرح دقیق</span><textarea name="description" maxlength="3000" required placeholder="مشاهده عینی، زمان و توضیحات لازم"></textarea></label><div class="ux-form-actions full"><button class="btn" type="submit"><i class="fas fa-check"></i> <span data-label>ثبت گزارش</span></button><button class="btn secondary" type="button" data-close>انصراف</button></div></form>`;
    container.innerHTML=kpis([{label:`گزارش‌های ${label}`,value:rows.length},{label:'دانش‌آموزان',value:new Set(rows.map(row=>row.student_id)).size},{label:'مجموع امتیاز',value:rows.reduce((sum,row)=>sum+Number(row.points||0),0)}])+section(`سوابق ${label}`,`<div class="ux-toolbar"><button class="btn" id="uxNewActivity" type="button"><i class="fas fa-plus"></i> ثبت ${label}</button><label class="ux-search ux-grow"><i class="fas fa-magnifying-glass"></i><input id="uxActivitySearch" placeholder="جستجو دانش‌آموز، کلاس یا عنوان"></label><button class="btn secondary" id="uxActivityCsv"><i class="fas fa-file-csv"></i> خروجی</button></div><div id="uxActivityTable"></div>`)+modalMarkup('uxActivityModal',`ثبت گزارش ${label}`,formHtml,{wide:true});
    const modal=bindModal(container.querySelector('#uxActivityModal')),form=container.querySelector('#uxActivityModalForm'),target=container.querySelector('#uxActivityTable'),search=container.querySelector('#uxActivitySearch');let studentRows=[];
    async function loadStudents(selected=''){studentRows=await students(form.elements.class_id.value);form.elements.student_id.innerHTML=`<option value="">انتخاب دانش‌آموز</option>${options(studentRows)}`;if(selected)form.elements.student_id.value=String(selected);}
    const reset=()=>{form.reset();form.elements.record_id.value='';form.elements.points.value=type==='encouragement'?'1':'-1';form.elements.student_id.innerHTML='<option value="">ابتدا کلاس را انتخاب کنید</option>';form.querySelector('[data-label]').textContent='ثبت گزارش';modal.querySelector('h3').textContent=`ثبت گزارش ${label}`;};
    function paint(){const term=search.value.trim().toLowerCase(),filtered=rows.filter(row=>!term||[row.student_name,row.class_name,row.title,row.description].some(value=>String(value||'').toLowerCase().includes(term)));target.innerHTML=table(filtered,[{label:'دانش‌آموز',render:row=>`<strong>${esc(row.student_name)}</strong><small class="ux-cell-subtitle">${esc(row.class_name||'')}</small>`},{label:'عنوان',key:'title'},{label:'امتیاز',render:row=>fa(row.points||0)},{label:'تاریخ',render:row=>dateText(row.created_at)},{label:'عملیات',render:row=>`<div class="ux-inline-actions"><button class="btn secondary small ux-edit-activity" data-id="${esc(row.id)}" type="button">ویرایش</button><button class="btn danger small ux-delete-activity" data-id="${esc(row.id)}" type="button">حذف</button></div>`}],`گزارش ${label} ثبت نشده است.`);target.querySelectorAll('.ux-edit-activity').forEach(button=>button.addEventListener('click',async()=>{const row=rows.find(item=>String(item.id)===button.dataset.id);if(!row)return;reset();form.elements.record_id.value=row.id;form.elements.class_id.value=row.class_id||classRows.find(cls=>cls.name===row.class_name)?.id||'';await loadStudents(row.student_id);form.elements.points.value=row.points||0;form.elements.title.value=row.title||'';form.elements.description.value=row.description||'';form.querySelector('[data-label]').textContent='ذخیره ویرایش';modal.querySelector('h3').textContent=`ویرایش گزارش ${label}`;modal.open(button);}));target.querySelectorAll('.ux-delete-activity').forEach(button=>button.addEventListener('click',async()=>{if(!await confirmOperation({title:`حذف گزارش ${label}`,message:'این گزارش برای همیشه حذف شود؟',confirmLabel:'حذف',danger:true}))return;try{await api(`/teacher/student-activities/${button.dataset.id}`,{method:'DELETE'});toast('گزارش حذف شد.','success');await renderStudentActivityComplete(container,page);}catch(error){toast(error.message,'error');}}));}
    form.elements.class_id.addEventListener('change',()=>loadStudents());container.querySelector('#uxNewActivity').addEventListener('click',event=>{reset();modal.open(event.currentTarget);});search.addEventListener('input',paint);container.querySelector('#uxActivityCsv').addEventListener('click',()=>download(`teacher-${type}-${today()}.csv`,['student,class,title,description,points,date',...rows.map(row=>[row.student_name,row.class_name,row.title,row.description,row.points,row.created_at].map(csvCell).join(','))].join('\n'),'text/csv;charset=utf-8'));form.addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter,values=Object.fromEntries(new FormData(form)),payload={student_id:Number(values.student_id),title:values.title.trim(),description:values.description.trim(),points:Number(values.points||0),type};busy(button,true,'ذخیره...');try{await api(values.record_id?`/teacher/student-activities/${values.record_id}`:'/teacher/student-activities',{method:values.record_id?'PUT':'POST',body:JSON.stringify(payload)});toast(values.record_id?'گزارش ویرایش شد.':'گزارش ثبت شد.','success');modal.close();await renderStudentActivityComplete(container,page);}catch(error){toast(error.message,'error');}finally{busy(button,false);}});paint();
  }

  async function renderClassEventsComplete(container,page=PAGE) {
    const type=page==='virtual-classes'?'virtual_class':'online_class',label=type==='virtual_class'?'کلاس مجازی':'کلاس آنلاین';const data=await api(`/teacher/class-events?type=${type}`),rows=data.events||[];
    const formHtml=`<form id="uxEventModalForm" class="ux-form-grid three"><input name="event_id" type="hidden"><label class="ux-field full"><span>عنوان ${label}</span><input name="title" maxlength="200" required></label><label class="ux-field"><span>زمان شروع</span><input name="event_date" type="datetime-local" required></label><label class="ux-field"><span>وضعیت</span><select name="status"><option value="draft">پیش‌نویس</option><option value="published">منتشرشده</option><option value="completed">تکمیل‌شده</option><option value="cancelled">لغوشده</option></select></label><label class="ux-field full"><span>پیوند ورود یا محل</span><input name="location" maxlength="500" placeholder="https://..."></label><label class="ux-field full"><span>توضیحات و دستور ورود</span><textarea name="description" maxlength="3000"></textarea></label><div class="ux-form-actions full"><button class="btn" type="submit"><i class="fas fa-check"></i> <span data-label>ثبت کلاس</span></button><button class="btn secondary" type="button" data-close>انصراف</button></div></form>`;
    container.innerHTML=kpis([{label:`کل ${label}‌ها`,value:rows.length},{label:'آینده',value:rows.filter(row=>new Date(row.event_date)>new Date()).length},{label:'منتشرشده',value:rows.filter(row=>row.status==='published').length},{label:'پیش‌نویس',value:rows.filter(row=>row.status==='draft').length}])+section(`مدیریت ${label}`,`<div class="ux-toolbar"><button class="btn" id="uxNewEvent" type="button"><i class="fas fa-plus"></i> ایجاد ${label}</button><label class="ux-search ux-grow"><i class="fas fa-magnifying-glass"></i><input id="uxEventSearch" placeholder="جستجو عنوان یا توضیحات"></label></div><div id="uxEventTable"></div>`)+modalMarkup('uxEventModal',`ایجاد ${label}`,formHtml,{wide:true});
    const modal=bindModal(container.querySelector('#uxEventModal')),form=container.querySelector('#uxEventModalForm'),target=container.querySelector('#uxEventTable'),search=container.querySelector('#uxEventSearch');const reset=()=>{form.reset();form.elements.event_id.value='';form.elements.status.value='draft';form.querySelector('[data-label]').textContent='ثبت کلاس';modal.querySelector('h3').textContent=`ایجاد ${label}`;};
    function paint(){const term=search.value.trim().toLowerCase(),filtered=rows.filter(row=>!term||[row.title,row.description,row.location].some(value=>String(value||'').toLowerCase().includes(term)));target.innerHTML=table(filtered,[{label:'عنوان',render:row=>`<strong>${esc(row.title)}</strong>`},{label:'زمان',render:row=>dateText(row.event_date)},{label:'وضعیت',render:row=>statusBadge(row.status)},{label:'ورود',render:row=>/^https?:\/\//i.test(row.location||'')?`<a class="btn secondary small" href="${esc(row.location)}" target="_blank" rel="noopener"><i class="fas fa-arrow-up-right-from-square"></i> ورود</a>`:esc(row.location||'—')},{label:'عملیات',render:row=>`<div class="ux-inline-actions">${/^https?:\/\//i.test(row.location||'')?`<button class="btn secondary small ux-copy-event" data-url="${esc(row.location)}" type="button"><i class="fas fa-copy"></i></button>`:''}<button class="btn secondary small ux-edit-event" data-id="${esc(row.id)}" type="button">ویرایش</button><button class="btn danger small ux-delete-event" data-id="${esc(row.id)}" type="button">حذف</button></div>`}],`${label}ی ثبت نشده است.`);target.querySelectorAll('.ux-copy-event').forEach(button=>button.addEventListener('click',async()=>{await navigator.clipboard.writeText(button.dataset.url);toast('پیوند کلاس کپی شد.','success');}));target.querySelectorAll('.ux-edit-event').forEach(button=>button.addEventListener('click',()=>{const row=rows.find(item=>String(item.id)===button.dataset.id);if(!row)return;reset();form.elements.event_id.value=row.id;form.elements.title.value=row.title||'';form.elements.event_date.value=toLocalInput(row.event_date);form.elements.status.value=row.status||'draft';form.elements.location.value=row.location||'';form.elements.description.value=row.description||'';form.querySelector('[data-label]').textContent='ذخیره ویرایش';modal.querySelector('h3').textContent=`ویرایش ${label}`;modal.open(button);}));target.querySelectorAll('.ux-delete-event').forEach(button=>button.addEventListener('click',async()=>{if(!await confirmOperation({title:`حذف ${label}`,message:'این کلاس و پیوند آن حذف شود؟',confirmLabel:'حذف',danger:true}))return;try{await api(`/teacher/class-events/${button.dataset.id}`,{method:'DELETE'});toast('کلاس حذف شد.','success');await renderClassEventsComplete(container,page);}catch(error){toast(error.message,'error');}}));}
    container.querySelector('#uxNewEvent').addEventListener('click',event=>{reset();modal.open(event.currentTarget);});search.addEventListener('input',paint);form.addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter,values=Object.fromEntries(new FormData(form)),payload={title:values.title.trim(),event_date:values.event_date,status:values.status,location:values.location.trim(),description:values.description.trim(),type};if(payload.location&&!/^https?:\/\//i.test(payload.location))return toast('پیوند ورود باید با http یا https شروع شود.','warning');busy(button,true,'ذخیره...');try{await api(values.event_id?`/teacher/class-events/${values.event_id}`:'/teacher/class-events',{method:values.event_id?'PUT':'POST',body:JSON.stringify(payload)});toast(values.event_id?'کلاس ویرایش شد.':'کلاس ثبت شد.','success');modal.close();await renderClassEventsComplete(container,page);}catch(error){toast(error.message,'error');}finally{busy(button,false);}});paint();
  }

  async function renderResourcesComplete(container) {
    const [response,classRows]=await Promise.all([api('/teacher/library').catch(()=>({files:[]})),classes()]);const rows=response.files||response.library||[];
    const formHtml=`<form id="uxResourceModalForm" class="ux-form-grid three"><input name="resource_id" type="hidden"><label class="ux-field full"><span>عنوان محتوا</span><input name="title" maxlength="200" required></label><label class="ux-field"><span>کلاس</span><select name="class_id"><option value="">بدون کلاس مشخص</option>${options(classRows)}</select></label><label class="ux-field"><span>درس</span><select name="course_id"><option value="">بدون درس مشخص</option></select></label><label class="ux-field"><span>دسترسی</span><select name="visibility"><option value="class">کلاس انتخاب‌شده</option><option value="private">فقط خودم</option><option value="school">کل مدرسه</option></select></label><label class="ux-field full"><span>توضیحات</span><textarea name="description" maxlength="3000"></textarea></label><label class="ux-field full" data-file-field><span>فایل آموزشی</span><input name="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp,.zip"><small class="ux-field-hint">PDF، Office، تصویر، متن یا ZIP تا ۱۰ مگابایت</small></label><div class="ux-upload-preview" id="uxUploadPreview"></div><div class="ux-form-actions full"><button class="btn" type="submit"><i class="fas fa-cloud-arrow-up"></i> <span data-label>بارگذاری محتوا</span></button><button class="btn secondary" type="button" data-close>انصراف</button></div></form>`;
    container.innerHTML=kpis([{label:'منابع آموزشی',value:rows.length},{label:'کلاس‌محور',value:rows.filter(row=>row.visibility==='class').length},{label:'خصوصی',value:rows.filter(row=>row.visibility==='private').length},{label:'اشتراک مدرسه',value:rows.filter(row=>row.visibility==='school').length}])+section('کتابخانه محتوای آموزشی',`<div class="ux-toolbar"><button class="btn" id="uxNewResource" type="button"><i class="fas fa-cloud-arrow-up"></i> بارگذاری محتوا</button><label class="ux-search ux-grow"><i class="fas fa-magnifying-glass"></i><input id="uxResourceSearch" placeholder="جستجو عنوان یا توضیحات"></label><label class="ux-field"><span>دسترسی</span><select id="uxResourceVisibility"><option value="">همه</option><option value="class">کلاس</option><option value="private">خصوصی</option><option value="school">مدرسه</option></select></label></div><div id="uxResourceTable"></div>`)+modalMarkup('uxResourceModal','بارگذاری محتوای آموزشی',formHtml,{wide:true});
    const modal=bindModal(container.querySelector('#uxResourceModal')),form=container.querySelector('#uxResourceModalForm'),target=container.querySelector('#uxResourceTable'),search=container.querySelector('#uxResourceSearch'),visibility=container.querySelector('#uxResourceVisibility'),preview=container.querySelector('#uxUploadPreview');
    async function loadCourses(selected=''){const classId=form.elements.class_id.value;form.elements.course_id.innerHTML='<option value="">بدون درس مشخص</option>';if(!classId)return;try{const data=await api(`/teacher/courses?class_id=${encodeURIComponent(classId)}`);form.elements.course_id.innerHTML=`<option value="">بدون درس مشخص</option>${options(data.courses||[])}`;if(selected)form.elements.course_id.value=String(selected);}catch(error){toast(error.message,'error');}}
    const reset=()=>{form.reset();form.elements.resource_id.value='';form.elements.visibility.value='class';form.querySelector('[data-file-field]').hidden=false;form.elements.file.required=true;form.querySelector('[data-label]').textContent='بارگذاری محتوا';modal.querySelector('h3').textContent='بارگذاری محتوای آموزشی';preview.innerHTML='';};
    function paint(){const term=search.value.trim().toLowerCase(),filtered=rows.filter(row=>(!term||[row.title,row.description,row.resource_type].some(value=>String(value||'').toLowerCase().includes(term)))&&(!visibility.value||row.visibility===visibility.value));target.innerHTML=table(filtered,[{label:'عنوان',render:row=>`<strong>${esc(row.title)}</strong><small class="ux-cell-subtitle">${esc(row.description||'')}</small>`},{label:'نوع',render:row=>esc(String(row.resource_type||'file').toUpperCase())},{label:'دسترسی',render:row=>statusBadge(row.visibility,{class:'کلاس',private:'خصوصی',school:'مدرسه'})},{label:'تاریخ',render:row=>dateText(row.created_at)},{label:'عملیات',render:row=>`<div class="ux-inline-actions">${row.file_path?`<a class="btn secondary small" href="${esc(row.file_path)}" target="_blank" rel="noopener"><i class="fas fa-eye"></i> مشاهده</a>`:''}<button class="btn secondary small ux-edit-resource" data-id="${esc(row.id)}" type="button">ویرایش</button><button class="btn danger small ux-delete-resource" data-id="${esc(row.id)}" type="button">حذف</button></div>`}],'محتوای آموزشی ثبت نشده است.');target.querySelectorAll('.ux-edit-resource').forEach(button=>button.addEventListener('click',async()=>{const row=rows.find(item=>String(item.id)===button.dataset.id);if(!row)return;reset();form.elements.resource_id.value=row.id;form.elements.title.value=row.title||'';form.elements.class_id.value=row.class_id||'';await loadCourses(row.course_id);form.elements.visibility.value=row.visibility||'class';form.elements.description.value=row.description||'';form.querySelector('[data-file-field]').hidden=true;form.elements.file.required=false;form.querySelector('[data-label]').textContent='ذخیره مشخصات';modal.querySelector('h3').textContent='ویرایش مشخصات محتوا';modal.open(button);}));target.querySelectorAll('.ux-delete-resource').forEach(button=>button.addEventListener('click',async()=>{if(!await confirmOperation({title:'حذف محتوای آموزشی',message:'فایل و اطلاعات آن برای همیشه حذف شود؟',confirmLabel:'حذف فایل',danger:true}))return;try{await api(`/teacher/library/${button.dataset.id}`,{method:'DELETE'});toast('محتوا حذف شد.','success');await renderResourcesComplete(container);}catch(error){toast(error.message,'error');}}));}
    form.elements.class_id.addEventListener('change',()=>loadCourses());form.elements.file.addEventListener('change',()=>{const file=form.elements.file.files[0];preview.innerHTML=file?`<div class="ux-file-preview"><i class="fas fa-file"></i><div><strong>${esc(file.name)}</strong><span>${fa((file.size/1024/1024).toFixed(2))} مگابایت</span></div></div>`:'';});container.querySelector('#uxNewResource').addEventListener('click',event=>{reset();modal.open(event.currentTarget);});search.addEventListener('input',paint);visibility.addEventListener('change',paint);form.addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter,values=Object.fromEntries(new FormData(form));busy(button,true,'ذخیره...');try{if(values.resource_id){await api(`/teacher/library/${values.resource_id}`,{method:'PUT',body:JSON.stringify({title:values.title.trim(),description:values.description.trim(),class_id:values.class_id?Number(values.class_id):null,course_id:values.course_id?Number(values.course_id):null,visibility:values.visibility})});toast('مشخصات محتوا ویرایش شد.','success');}else{const file=form.elements.file.files[0];if(!file)throw new Error('فایل را انتخاب کنید');if(file.size>10*1024*1024)throw new Error('حجم فایل بیشتر از ۱۰ مگابایت است');const fileBase64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file);});await api('/teacher/library/upload',{method:'POST',body:JSON.stringify({title:values.title.trim(),description:values.description.trim(),class_id:values.class_id?Number(values.class_id):null,course_id:values.course_id?Number(values.course_id):null,visibility:values.visibility,fileBase64,fileName:file.name})});toast('محتوا بارگذاری شد.','success');}modal.close();await renderResourcesComplete(container);}catch(error){toast(error.message,'error');}finally{busy(button,false);}});paint();
  }

  async function renderAnnouncementsComplete(container) {
    const [response,classRows]=await Promise.all([api('/teacher/announcements'),classes()]);const rows=response.announcements||[];
    const formHtml=`<form id="uxAnnouncementModalForm" class="ux-form-grid"><label class="ux-field"><span>کلاس گیرنده</span><select name="class_id" required><option value="">انتخاب کلاس</option>${options(classRows)}</select></label><label class="ux-field"><span>اولویت</span><select name="priority"><option value="normal">عادی</option><option value="high">مهم</option><option value="urgent">فوری</option></select></label><label class="ux-field full"><span>عنوان اطلاعیه</span><input name="title" maxlength="200" required></label><label class="ux-field full"><span>متن اطلاعیه</span><textarea name="content" maxlength="5000" required></textarea><small class="ux-field-hint"><span id="uxAnnouncementCount">۰</span> از ۵۰۰۰ نویسه</small></label><div class="ux-form-actions full"><button class="btn" type="submit"><i class="fas fa-paper-plane"></i> ارسال اطلاعیه</button><button class="btn secondary" type="button" data-close>انصراف</button></div></form>`;
    container.innerHTML=kpis([{label:'اطلاعیه‌های مدرسه',value:rows.length},{label:'فوری',value:rows.filter(row=>row.priority==='urgent').length},{label:'مهم',value:rows.filter(row=>row.priority==='high').length},{label:'کلاس‌های من',value:classRows.length}])+section('مرکز اطلاع‌رسانی',`<div class="ux-toolbar"><button class="btn" id="uxNewAnnouncement" type="button"><i class="fas fa-plus"></i> اطلاعیه جدید</button><label class="ux-search ux-grow"><i class="fas fa-magnifying-glass"></i><input id="uxAnnouncementSearch" placeholder="جستجو در اطلاعیه‌های مدرسه"></label></div><div id="uxAnnouncementTable"></div>`)+modalMarkup('uxAnnouncementModal','ارسال اطلاعیه به کلاس',formHtml,{wide:true});
    const modal=bindModal(container.querySelector('#uxAnnouncementModal')),form=container.querySelector('#uxAnnouncementModalForm'),target=container.querySelector('#uxAnnouncementTable'),search=container.querySelector('#uxAnnouncementSearch');function paint(){const term=search.value.trim().toLowerCase(),filtered=rows.filter(row=>!term||[row.title,row.content,row.created_by_name].some(value=>String(value||'').toLowerCase().includes(term)));target.innerHTML=table(filtered,[{label:'عنوان',render:row=>`<strong>${esc(row.title)}</strong><small class="ux-cell-subtitle">${esc(row.created_by_name||'مدیریت مدرسه')}</small>`},{label:'متن',render:row=>esc(row.content||row.description||'—')},{label:'اولویت',render:row=>statusBadge(row.priority,{normal:'عادی',high:'مهم',urgent:'فوری'})},{label:'تاریخ',render:row=>dateText(row.created_at)}],'اطلاعیه‌ای وجود ندارد.');}
    container.querySelector('#uxNewAnnouncement').addEventListener('click',event=>{form.reset();form.elements.priority.value='normal';container.querySelector('#uxAnnouncementCount').textContent='۰';modal.open(event.currentTarget);});form.elements.content.addEventListener('input',()=>{container.querySelector('#uxAnnouncementCount').textContent=fa(form.elements.content.value.length);});search.addEventListener('input',paint);form.addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter,values=Object.fromEntries(new FormData(form));if(!await confirmOperation({title:'ارسال اطلاعیه',message:`اطلاعیه برای همه دانش‌آموزان کلاس انتخاب‌شده ارسال شود؟`,confirmLabel:'ارسال'}))return;busy(button,true,'در حال ارسال...');try{const result=await api('/teacher/announcements',{method:'POST',body:JSON.stringify({class_id:Number(values.class_id),title:values.title.trim(),content:values.content.trim(),priority:values.priority})});toast(result.message||'اطلاعیه ارسال شد.','success');modal.close();form.reset();}catch(error){toast(error.message,'error');}finally{busy(button,false);}});paint();
  }

  async function renderStudentReportsComplete(container,page=PAGE) {
    const classRows=await classes();const title=page==='class-performance'?'تحلیل عملکرد کلاس':page==='student-report-cards'?'کارنامه دانش‌آموز':'گزارش عملکرد تدریس';
    container.innerHTML=section(title,`<form id="uxReportFilter" class="ux-toolbar"><label class="ux-field"><span>کلاس</span><select name="class_id" required><option value="">انتخاب کلاس</option>${options(classRows)}</select></label><label class="ux-field ux-grow"><span>دانش‌آموز</span><select name="student_id" required><option value="">ابتدا کلاس را انتخاب کنید</option></select></label><label class="ux-field"><span>نوع گزارش</span><select name="type"><option value="grades">نمرات و عملکرد</option><option value="attendance">حضور و غیاب</option></select></label><button class="btn secondary" type="submit"><i class="fas fa-chart-line"></i> تهیه گزارش</button><button class="btn secondary" id="uxReportPrint" type="button"><i class="fas fa-print"></i> چاپ</button><button class="btn secondary" id="uxReportCsv" type="button"><i class="fas fa-file-csv"></i> خروجی</button></form><div id="uxReportResult">${state('empty','دانش‌آموز و نوع گزارش را انتخاب کنید.')}</div>`);
    const form=container.querySelector('#uxReportFilter'),result=container.querySelector('#uxReportResult');let currentRows=[];
    form.elements.class_id.addEventListener('change',async()=>{form.elements.student_id.disabled=true;form.elements.student_id.innerHTML='<option value="">در حال دریافت...</option>';try{const rows=await students(form.elements.class_id.value);form.elements.student_id.innerHTML=`<option value="">انتخاب دانش‌آموز</option>${options(rows)}`;const requested=new URLSearchParams(location.search).get('student_id');if(requested&&rows.some(row=>String(row.id)===requested))form.elements.student_id.value=requested;}finally{form.elements.student_id.disabled=false;}});
    form.addEventListener('submit',async event=>{event.preventDefault();if(!form.elements.student_id.value)return toast('دانش‌آموز را انتخاب کنید.','warning');result.innerHTML=state('loading','در حال تهیه گزارش');try{const data=await api(`/teacher/student-report/${form.elements.student_id.value}?type=${form.elements.type.value}`);if(form.elements.type.value==='attendance'){currentRows=data.attendance||[];const absent=currentRows.filter(row=>row.status==='absent').length,late=currentRows.filter(row=>row.status==='late').length,present=currentRows.filter(row=>row.status==='present').length;result.innerHTML=kpis([{label:'کل رکوردها',value:currentRows.length},{label:'حاضر',value:present},{label:'غایب',value:absent},{label:'تأخیر',value:late}])+section('سوابق حضور و غیاب',table(currentRows,[{label:'تاریخ',render:row=>dateText(row.date)},{label:'وضعیت',render:row=>statusBadge(row.status)},{label:'توضیح',render:row=>esc(row.notes||'—')}],'سابقه‌ای ثبت نشده است.'));}else{currentRows=data.grades||[];const averages=currentRows.map(row=>Number(row.average)).filter(Number.isFinite);result.innerHTML=kpis([{label:'دروس',value:currentRows.length},{label:'میانگین کل',value:averages.length?(averages.reduce((a,b)=>a+b,0)/averages.length).toFixed(1):'—'},{label:'بالاترین',value:averages.length?Math.max(...averages):'—'},{label:'نیازمند توجه',value:averages.filter(value=>value<12).length}])+section('وضعیت نمرات',table(currentRows,[{label:'درس',key:'course_name'},{label:'کلاسی',key:'quiz'},{label:'تکلیف',key:'homework'},{label:'میان‌ترم',key:'midterm'},{label:'پایانی',key:'final_exam'},{label:'پروژه',key:'project'},{label:'میانگین',key:'average'}],'نمره‌ای ثبت نشده است.'));}}catch(error){retryState(result,'تهیه گزارش ناموفق بود',error,()=>form.requestSubmit());}});
    container.querySelector('#uxReportPrint').addEventListener('click',()=>window.print());container.querySelector('#uxReportCsv').addEventListener('click',()=>{if(!currentRows.length)return toast('ابتدا گزارش را تهیه کنید.','warning');const keys=form.elements.type.value==='attendance'?['date','status','notes']:['course_name','quiz','homework','midterm','final_exam','project','average'];download(`teacher-report-${today()}.csv`,[keys.join(','),...currentRows.map(row=>keys.map(key=>csvCell(row[key])).join(','))].join('\n'),'text/csv;charset=utf-8');});if(classRows[0]){form.elements.class_id.value=classRows[0].id;form.elements.class_id.dispatchEvent(new Event('change'));}
  }

  const handlers = {
    dashboard: renderDashboard,
    schedule: renderScheduleComplete,
    classes: renderClassesComplete,
    students: renderStudentsComplete,
    'attendance-create': renderAttendance,
    'attendance-view': renderAttendance,
    'grades-create': renderGrades,
    'grades-edit': renderGrades,
    grades: renderGrades,
    assignments: container => renderEntityComplete(container, 'assignment'),
    'assignment-create': container => renderEntityComplete(container, 'assignment'),
    'assignment-review': renderAssignmentReviewComplete,
    'student-feedback': renderMessaging,
    exams: container => renderEntityComplete(container, 'exam'),
    'online-exam-create': container => renderEntityComplete(container, 'exam'),
    'exam-results': renderExamResultsComplete,
    'class-performance': renderStudentReportsComplete,
    'online-classes': renderClassEventsComplete,
    'virtual-classes': renderClassEventsComplete,
    'content-upload': renderResourcesComplete,
    library: renderResourcesComplete,
    announcements: renderAnnouncementsComplete,
    'student-messenger': renderMessaging,
    'parent-chat': renderParentMessaging,
    'admin-messenger': renderMessaging,
    reports: renderStudentReportsComplete,
    'student-report-cards': renderStudentReportsComplete,
    'discipline-report-create': renderStudentActivityComplete,
    'encouragement-create': renderStudentActivityComplete,
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

  window.TeacherPortal = Object.freeze({ render, api, isPlaceholder });
  document.addEventListener('DOMContentLoaded', () => {
    initializeTeacherShell();
    render({ force: true }).catch(console.error);
    new MutationObserver(queue).observe(root() || document.body, { childList: true, subtree: true });
  });
})();
