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
          { label: 'وضعیت', render: row => editable ? `<select class="ux-att-status" data-student="${esc(row.id)}"><option value="present" ${row.status === 'present' ? 'selected' : ''}>حاضر</option><option value="absent" ${row.status === 'absent' ? 'selected' : ''}>غایب</option><option value="late" ${row.status === 'late' ? 'selected' : ''}>تأخیر</option><option value="excused" ${row.status === 'excused' ? 'selected' : ''}>موجه</option></select>` : esc(row.status || '—') },
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
    container.innerHTML = section('ثبت و ویرایش نمرات', `
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
          { label: 'نمره از ۲۰', render: row => `<input class="ux-grade" data-student="${esc(row.id)}" type="number" min="0" max="20" step="0.25" value="${esc(row.current_grade ?? '')}">` }
        ]) + '<div class="ux-form-actions"><button class="btn" id="uxSaveGrades">ذخیره همه نمرات</button></div>';
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
        <label class="ux-field">عنوان<input name="title" required></label>
        <label class="ux-field">کلاس<select name="class_id" required><option value="">انتخاب کلاس</option>${options(classRows)}</select></label>
        ${isExam ? '<label class="ux-field">زمان شروع<input name="start_time" type="datetime-local" required></label><label class="ux-field">مدت (دقیقه)<input name="duration" type="number" min="1" value="60" required></label>' : '<label class="ux-field">مهلت تحویل<input name="due_date" type="datetime-local" required></label>'}
        <label class="ux-field">نمره کل<input name="total_points" type="number" min="1" value="20" required></label>
        <label class="ux-field full">توضیحات<textarea name="description"></textarea></label>
        <div class="ux-form-actions full"><button class="btn" type="submit">ثبت</button></div>
      </form>`) + section(isExam ? 'آزمون‌های ثبت‌شده' : 'تکالیف ثبت‌شده', table(rows, [
        { label: 'عنوان', key: 'title' }, { label: 'کلاس', render: row => esc(row.class_name || row.class_id) },
        { label: 'زمان', render: row => dateText(row.start_time || row.due_date) }, { label: 'نمره', key: 'total_points' },
        { label: 'عملیات', render: row => isExam ? `<button class="btn danger ux-delete-exam" data-id="${esc(row.id)}">حذف</button>` : '<span class="badge active">فعال</span>' }
      ]));
    container.querySelector('#uxEntityForm').addEventListener('submit', async event => {
      event.preventDefault();
      const button = event.submitter;
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const payload = isExam
        ? { title: values.title, class_id: Number(values.class_id), start_time: values.start_time, duration: Number(values.duration), total_points: Number(values.total_points), description: values.description }
        : { title: values.title, class_id: Number(values.class_id), due_date: values.due_date, total_points: Number(values.total_points), description: values.description };
      busy(button, true, 'در حال ثبت...');
      try { await api(endpoint, { method: 'POST', body: JSON.stringify(payload) }); toast('اطلاعات ثبت شد.', 'success'); await renderEntity(container, kind); }
      catch (error) { toast(error.message, 'error'); }
      finally { busy(button, false); }
    });
    container.querySelectorAll('.ux-delete-exam').forEach(button => button.addEventListener('click', async () => {
      if (!confirm('آزمون حذف شود؟')) return;
      try { await api(`/teacher/exams/${button.dataset.id}`, { method: 'DELETE' }); toast('آزمون حذف شد.', 'success'); await renderEntity(container, kind); }
      catch (error) { toast(error.message, 'error'); }
    }));
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
    if (classRows[0]) { form.elements.class_id.value = classRows[0].id; await load(); }
  }

  async function renderResources(container) {
    const response = await api('/teacher/library').catch(() => ({ files: [], library: [] }));
    const rows = response.files || response.library || [];
    container.innerHTML = section('بارگذاری محتوای آموزشی', `<form id="uxUploadForm" class="ux-form-grid"><label class="ux-field">عنوان<input name="title" required></label><label class="ux-field">فایل<input name="file" type="file" required></label><div class="ux-form-actions full"><button class="btn" type="submit">بارگذاری</button></div></form>`) + section('کتابخانه معلم', table(rows, [{ label: 'عنوان', key: 'title' }, { label: 'نام فایل', render: row => esc(row.file_name || row.filename || '—') }, { label: 'تاریخ', render: row => dateText(row.created_at) }, { label: 'عملیات', render: row => `<button class="btn danger ux-delete-file" data-id="${esc(row.id)}">حذف</button>` }]));
    container.querySelector('#uxUploadForm').addEventListener('submit', async event => {
      event.preventDefault(); const button = event.submitter; const form = event.currentTarget; const file = form.elements.file.files[0];
      if (!file) return;
      const fileBase64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.onerror = reject; reader.readAsDataURL(file); });
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
    const response = await api('/teacher/announcements');
    container.innerHTML = section('اطلاعیه‌ها', table(response.announcements || [], [{ label: 'عنوان', key: 'title' }, { label: 'متن', render: row => esc(row.content || row.description || '—') }, { label: 'اولویت', render: row => `<span class="badge active">${esc(row.priority || 'عادی')}</span>` }, { label: 'تاریخ', render: row => dateText(row.created_at) }]));
  }

  async function renderProfile(container) {
    const response = await api('/teacher/profile');
    const profile = response.profile || response.teacher || response;
    container.innerHTML = section('ویرایش پروفایل', `<form id="uxProfileForm" class="ux-form-grid"><label class="ux-field">نام و نام خانوادگی<input name="full_name" value="${esc(profile.full_name || profile.name || '')}"></label><label class="ux-field">تلفن<input name="phone" value="${esc(profile.phone || '')}"></label><label class="ux-field">ایمیل<input name="email" type="email" value="${esc(profile.email || '')}"></label><label class="ux-field full">درباره من<textarea name="bio">${esc(profile.bio || '')}</textarea></label><div class="ux-form-actions full"><button class="btn" type="submit">ذخیره پروفایل</button></div></form>`);
    container.querySelector('#uxProfileForm').addEventListener('submit', async event => {
      event.preventDefault(); const button = event.submitter; const payload = Object.fromEntries(new FormData(event.currentTarget));
      busy(button, true, 'در حال ذخیره...');
      try { await api('/teacher/profile', { method: 'PUT', body: JSON.stringify(payload) }); toast('پروفایل ذخیره شد.', 'success'); }
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
    const titles = { 'student-feedback': 'بازخورد دانش‌آموز', 'student-messenger': 'پیام دانش‌آموز', 'parent-chat': 'پیام والدین', 'admin-messenger': 'پیام مدیر' };
    container.innerHTML = section(titles[page] || document.getElementById('pageTitle')?.textContent || 'دستیار هوشمند', `<form id="uxAssistantForm" class="ux-form-grid"><label class="ux-field full">شرح درخواست<textarea name="message" required placeholder="اطلاعات لازم را وارد کنید..."></textarea></label><div class="ux-form-actions full"><button class="btn" type="submit">تولید متن</button></div></form><div id="uxAssistantOutput"></div>`);
    container.querySelector('#uxAssistantForm').addEventListener('submit', async event => {
      event.preventDefault(); const button = event.submitter; const output = container.querySelector('#uxAssistantOutput'); const message = `${titles[page] || page}: ${new FormData(event.currentTarget).get('message')}`;
      busy(button, true, 'در حال تولید...'); output.innerHTML = state('loading', 'در حال پردازش');
      try { const response = await api('/teacher/assistant', { method: 'POST', body: JSON.stringify({ message }) }); const text = response.reply || ''; output.innerHTML = section('پیش‌نویس قابل استفاده', `<textarea id="uxGeneratedText" rows="9">${esc(text)}</textarea><div class="ux-form-actions"><button class="btn secondary" id="uxCopyText">کپی</button><button class="btn secondary" id="uxSaveDraft">ذخیره پیش‌نویس</button></div>`); output.querySelector('#uxCopyText').addEventListener('click', () => navigator.clipboard.writeText(output.querySelector('#uxGeneratedText').value)); output.querySelector('#uxSaveDraft').addEventListener('click', () => { const rows = JSON.parse(localStorage.getItem('teacherDrafts') || '[]'); rows.unshift({ page, text: output.querySelector('#uxGeneratedText').value, created_at: new Date().toISOString() }); localStorage.setItem('teacherDrafts', JSON.stringify(rows.slice(0, 200))); toast('پیش‌نویس ذخیره شد.', 'success'); }); }
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
    dashboard: renderOverview,
    schedule: renderOverview,
    classes: renderOverview,
    students: renderStudents,
    'attendance-create': renderAttendance,
    'attendance-view': renderAttendance,
    'grades-create': renderGrades,
    'grades-edit': renderGrades,
    grades: renderGrades,
    assignments: container => renderEntity(container, 'assignment'),
    'assignment-create': container => renderEntity(container, 'assignment'),
    'assignment-review': renderOverview,
    'student-feedback': renderAssistant,
    exams: container => renderEntity(container, 'exam'),
    'online-exam-create': container => renderEntity(container, 'exam'),
    'exam-results': renderOverview,
    'class-performance': renderOverview,
    'online-classes': renderOverview,
    'virtual-classes': renderOverview,
    'content-upload': renderResources,
    library: renderResources,
    announcements: renderAnnouncements,
    'student-messenger': renderAssistant,
    'parent-chat': renderAssistant,
    'admin-messenger': renderAssistant,
    reports: renderOverview,
    'student-report-cards': renderOverview,
    'discipline-report-create': renderDraft,
    'encouragement-create': renderDraft,
    'school-suggestions': renderDraft,
    profile: renderProfile,
    'change-password': renderPassword,
    'ai-exam-builder': renderAssistant,
    'ai-book-question-generator': renderAssistant,
    'ai-pdf-question-generator': renderAssistant,
    'ai-answer-key-generator': renderAssistant,
    'ai-auto-grading': renderAssistant,
    'ai-student-performance': renderAssistant,
    'ai-extra-question-suggestions': renderAssistant,
    'ai-exam-difficulty-analysis': renderAssistant
  };

  async function render({ force = false, page = PAGE } = {}) {
    const container = root();
    const handler = handlers[page];
    if (!container || !handler || runtime.rendering) return false;
    if (!force && !isPlaceholder(container)) return false;
    if (!force && runtime.renderedPage === page && container.dataset.dynamicRendered === '1') return true;
    runtime.rendering = true;
    runtime.renderedPage = page;
    container.dataset.dynamicRendered = '1';
    container.innerHTML = state('loading', 'در حال آماده‌سازی صفحه عملیاتی');
    try { await handler(container, page); window.PanelUX?.enhance?.(container); return true; }
    catch (error) { container.innerHTML = state('error', 'بارگذاری صفحه انجام نشد', error.message); return false; }
    finally { runtime.rendering = false; }
  }

  function queue() {
    clearTimeout(runtime.timer);
    runtime.timer = setTimeout(() => render().catch(console.error), 40);
  }

  window.PanelDynamicPages = Object.freeze({ render, api, isPlaceholder });
  document.addEventListener('DOMContentLoaded', () => {
    queue();
    new MutationObserver(queue).observe(root() || document.body, { childList: true, subtree: true });
  });
})();
