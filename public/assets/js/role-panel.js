const TOKEN = localStorage.getItem('token');
const USER = JSON.parse(localStorage.getItem('user') || 'null');
const PANEL = document.body.dataset.panel;
const PAGE = document.body.dataset.page || 'dashboard';

const CONFIG = {
  'principal': { title: 'پنل مدیر مدرسه', endpoint: '/principal/dashboard', allowed: ['principal','admin','super_admin'] },
  'executive-deputy': { title: 'پنل معاون اجرایی', endpoint: '/executive-deputy/dashboard', allowed: ['executive_deputy','principal','admin','super_admin'] },
  'cultural-deputy': { title: 'پنل معاون پرورشی و فرهنگی', endpoint: '/cultural-deputy/dashboard', allowed: ['cultural_deputy','principal','admin','super_admin'] },
  'counselor': { title: 'پنل مشاور', endpoint: '/counselor/dashboard', allowed: ['counselor','principal','admin','super_admin'] },
  'super-admin': { title: 'پنل راهبر ارشد', endpoint: '/principal/dashboard', allowed: ['super_admin'] }
};

const PAGE_TITLES = {
  "dashboard": "داشبورد راهبر",
  "students": "مدیریت پرونده دانش‌آموز",
  "student-case-file": "پرونده مشاوره دانش‌آموز",
  "session-report-create": "ثبت گزارش جلسات مشاوره",
  "requests": "درخواست‌های مشاوره",
  "appointments": "مدیریت نوبت‌دهی",
  "session-reservation": "رزرو جلسات",
  "academic-status": "مشاهده وضعیت تحصیلی دانش‌آموز",
  "grades": "مشاهده نمرات",
  "report-card": "مشاهده کارنامه",
  "attendance": "مدیریت حضور و غیاب",
  "discipline-cases": "مشاهده موارد انضباطی",
  "parent-communication": "مدیریت ارتباط با والدین",
  "student-communication": "ارتباط با دانش‌آموزان",
  "admin-communication": "ارتباط با مدیر",
  "study-plan-create": "ثبت برنامه مطالعاتی",
  "counseling-recommendations": "ثبت توصیه‌های مشاوره‌ای",
  "psychological-assessment": "ثبت ارزیابی روانشناسی",
  "personality-test": "تست شخصیت",
  "interest-test": "تست رغبت‌سنجی",
  "sessions": "جلسات مشاوره",
  "followups": "پیگیری‌ها",
  "reports": "گزارش‌های مدیریتی",
  "profile": "پروفایل معاون اجرایی",
  "ai-drop-detection": "تشخیص افت تحصیلی",
  "ai-behavior-analysis": "تحلیل رفتار دانش‌آموز",
  "ai-education-path": "پیشنهاد مسیر تحصیلی",
  "ai-dropout-risk": "تحلیل ریسک ترک تحصیل",
  "ai-exam-stress": "تحلیل استرس امتحان",
  "events": "مدیریت فعالیت‌های فرهنگی",
  "competitions": "مدیریت مسابقات",
  "competition-results": "ثبت نتایج مسابقات",
  "ceremonies": "مدیریت جشن‌ها و مراسم",
  "camps": "مدیریت اردوها",
  "religious-programs": "مدیریت برنامه‌های مذهبی",
  "recognition": "ثبت تشویقی‌ها",
  "behavior": "ثبت موارد انضباطی",
  "ethics-ranking": "رتبه‌بندی اخلاقی دانش‌آموزان",
  "gallery-manager": "مدیریت گالری تصاویر",
  "announcements": "اطلاعیه‌ها",
  "student-surveys": "نظرسنجی‌های دانش‌آموزی",
  "student-council-voting": "رأی‌گیری شورای دانش‌آموزی",
  "student-associations": "مدیریت انجمن‌های دانش‌آموزی",
  "participation": "مشارکت دانش‌آموزان",
  "ai-insights": "تحلیل هوشمند",
  "sms": "پیامک‌ها",
  "enrollment": "مدیریت ثبت‌نام دانش‌آموزان",
  "documents-approval": "تأیید مدارک ثبت‌نام",
  "student-transfer": "مدیریت جابجایی دانش‌آموزان",
  "classes": "مدیریت کلاس‌ها",
  "courses": "مدیریت دروس",
  "schedule": "مدیریت برنامه هفتگی",
  "report-cards": "مدیریت کارنامه‌ها",
  "report-card-issue": "صدور کارنامه",
  "report-card-print": "چاپ کارنامه",
  "report-card-pdf": "خروجی PDF کارنامه",
  "bulk-sms": "ارسال پیامک گروهی",
  "tickets": "مدیریت تیکت‌ها",
  "student-statistics": "گزارش آماری دانش‌آموزان",
  "forms": "مدیریت فرم‌های مدرسه",
  "staff-activity-reports": "گزارش فعالیت پرسنل",
  "backup": "پشتیبان‌گیری اطلاعات",
  "analytics": "تحلیل‌های کلان",
  "users": "کاربران",
  "activity": "فعالیت سیستم",
  "roles": "نقش‌ها و دسترسی‌ها",
  "security": "امنیت",
  "ai": "هوش مصنوعی",
  "backups": "پشتیبان‌گیری",
  "settings": "تنظیمات"
};

function esc(value){return String(value ?? '').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
function faNum(value){return String(value ?? 0).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);}
function toast(message){const t=document.createElement('div');t.className='toast';t.textContent=message;document.body.appendChild(t);setTimeout(()=>t.remove(),3500);}
function logout(){localStorage.removeItem('token');localStorage.removeItem('user');location.href='/login';}
window.logout=logout;
window.toggleRoleSidebar=()=>{document.getElementById('sidebar')?.classList.toggle('open');document.getElementById('overlay')?.classList.toggle('show');};

async function api(endpoint, options={}){
  const res = await fetch('/api/v1'+endpoint,{...options,headers:{'Content-Type':'application/json','Authorization':'Bearer '+TOKEN,...(options.headers||{})}});
  const data = await res.json().catch(()=>({success:false,message:'پاسخ نامعتبر سرور'}));
  if(res.status===401||res.status===403){throw new Error(data.message||data.error||'دسترسی مجاز نیست');}
  if(!res.ok||data.success===false){throw new Error(data.message||data.error||'خطا در درخواست');}
  return data.data || data;
}

function guard(){
  if(!TOKEN||!USER){location.href='/login';return false;}
  const cfg=CONFIG[PANEL];
  if(!cfg){document.body.innerHTML='<main class="state">پنل ناشناخته است.</main>';return false;}
  if(!cfg.allowed.includes(USER.role)){document.body.innerHTML='<main class="state">دسترسی شما به این پنل مجاز نیست.</main>';return false;}
  document.getElementById('panelTitle').textContent=cfg.title;
  document.getElementById('userName').textContent=USER.name||USER.username||'کاربر';
  document.getElementById('userRole').textContent=USER.role;
  document.getElementById('pageTitle').textContent=PAGE_TITLES[PAGE]||PAGE;
  document.querySelector(`[data-tab="${PAGE}"]`)?.classList.add('active');
  return true;
}

function renderCards(kpis={}){
  const cards=[['دانش‌آموزان',kpis.students,'fa-user-graduate'],['معلمان',kpis.teachers,'fa-chalkboard-user'],['کلاس‌ها',kpis.classes,'fa-door-open'],['درخواست مشاوره باز',kpis.open_counseling_requests,'fa-heart-pulse']];
  return `<div class="cards">${cards.map(c=>`<div class="card"><div class="label"><i class="fas ${c[2]}"></i> ${c[0]}</div><div class="value">${faNum(c[1]||0)}</div></div>`).join('')}</div>`;
}
function table(rows, columns){
  if(!rows?.length)return '<div class="state">داده‌ای برای نمایش وجود ندارد.</div>';
  return `<div class="table-wrap"><table class="data-table"><thead><tr>${columns.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${columns.map(c=>`<td>${c.render?c.render(r):esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function announcements(rows=[]){return table(rows,[{label:'عنوان',key:'title'},{label:'اولویت',render:r=>`<span class="badge ${esc(r.priority)}">${esc(r.priority||'normal')}</span>`},{label:'تاریخ',render:r=>esc((r.created_at||'').slice(0,10))}]);}
function aiForm(){return `<form class="form" id="aiForm"><label>نوع درخواست<select name="feature"><option value="performance_summary">خلاصه عملکرد</option><option value="lesson_plan">طرح درس</option><option value="quiz_generation">تولید آزمون</option><option value="attendance_risk">تحلیل ریسک حضور</option><option value="counseling_summary">خلاصه مشاوره</option></select></label><label>متن درخواست<textarea name="prompt" required placeholder="درخواست خود را بنویسید..."></textarea></label><button class="btn">ارسال به هوش مصنوعی</button><div id="aiResult" class="panel" style="display:none"></div></form>`;}
function smsForm(){return `<form class="form" id="smsForm"><div class="form-row"><label>شماره گیرنده<input name="recipient_number" placeholder="0912..." required></label><label>نوع پیام<select name="event_type"><option value="manual">دستی</option><option value="announcement">اطلاعیه</option><option value="attendance_parent_alert">هشدار حضور</option><option value="meeting_reminder">یادآوری جلسه</option></select></label></div><label>متن پیامک<textarea name="message" maxlength="1000" required></textarea></label><button class="btn">ثبت/ارسال پیامک</button></form>`;}

async function renderPage(){
  const cfg=CONFIG[PANEL];
  const content=document.getElementById('content');
  content.innerHTML='<div class="state">در حال بارگذاری...</div>';
  const [overview, specific] = await Promise.all([
    api('/portal/overview').catch(() => ({ kpis: {}, announcements: [], activities: [] })),
    api(cfg.endpoint).catch(() => ({ kpis: {}, announcements: [], activities: [] }))
  ]);
  let html=renderCards(overview.kpis||specific.kpis||{});

  if(['dashboard','analytics','reports'].includes(PAGE)){
    html += `<div class="grid"><section class="panel"><h3>آخرین اطلاعیه‌ها</h3>${announcements(overview.announcements||[])}</section><section class="panel"><h3>خلاصه پنل</h3><p>این صفحه به API امن نقش شما متصل است و فقط داده‌های مجاز را نمایش می‌دهد.</p></section></div>`;
  } else if(PAGE==='requests'){
    const data=await api('/counselor/requests');
    html+=`<section class="panel"><h3>درخواست‌های مشاوره</h3>${table(data.requests,[{label:'دانش‌آموز',key:'student_name'},{label:'اولویت',render:r=>`<span class="badge ${esc(r.priority)}">${esc(r.priority)}</span>`},{label:'وضعیت',render:r=>`<span class="badge ${esc(r.status)}">${esc(r.status)}</span>`},{label:'خلاصه',key:'summary'}])}</section>`;
  } else if(PAGE==='sessions'){
    const data=await api('/counselor/sessions');
    html+=`<section class="panel"><h3>جلسات مشاوره</h3>${table(data.sessions,[{label:'دانش‌آموز',key:'student_name'},{label:'زمان',render:r=>esc(String(r.session_at||'').replace('T',' ').slice(0,16))},{label:'ریسک',key:'risk_level'},{label:'خلاصه عمومی',key:'public_summary'}])}</section>`;
  } else if(PAGE==='events'){
    const data=await api('/cultural/events');
    html+=`<section class="panel"><h3>رویدادهای فرهنگی/مدرسه</h3>${table(data.events,[{label:'عنوان',key:'title'},{label:'نوع',key:'event_type'},{label:'تاریخ',render:r=>esc(String(r.event_date||'').slice(0,10))},{label:'وضعیت',key:'status'}])}</section>`;
  } else if(['activity','participation','recognition','behavior'].includes(PAGE)){
    const data=await api('/cultural/activity-records').catch(()=>({records:overview.activities||[]}));
    html+=`<section class="panel"><h3>سوابق فعالیت و تشویق</h3>${table(data.records,[{label:'دانش‌آموز',key:'student_name'},{label:'عنوان',key:'title'},{label:'نوع',key:'activity_type'},{label:'امتیاز',key:'points'}])}</section>`;
  } else if(PAGE==='roles'){
    const data=await api('/rbac/roles');
    html+=`<section class="panel"><h3>نقش‌ها</h3>${table(data.roles,[{label:'نام سیستمی',key:'name'},{label:'عنوان',key:'title'},{label:'توضیح',key:'description'}])}</section>`;
  } else if(PAGE==='sms'){
    const logs=await api('/sms/logs').catch(()=>({logs:[]}));
    html+=`<section class="panel"><h3>ارسال پیامک</h3>${smsForm()}</section><section class="panel"><h3>آخرین پیامک‌ها</h3>${table(logs.logs,[{label:'گیرنده',key:'recipient_number'},{label:'وضعیت',key:'status'},{label:'نوع',key:'event_type'},{label:'تاریخ',render:r=>esc(String(r.created_at||'').slice(0,16))}])}</section>`;
  } else if(['ai','ai-insights'].includes(PAGE)){
    html+=`<section class="panel"><h3>دستیار هوشمند نقش شما</h3>${aiForm()}</section>`;
  } else {
    html+=`<section class="panel"><h3>${esc(PAGE_TITLES[PAGE]||PAGE)}</h3><p>زیرساخت API و RBAC این بخش آماده است. اطلاعات اصلی از داشبورد نقش و APIهای مرتبط خوانده می‌شود.</p>${announcements(overview.announcements||[])}</section>`;
  }
  content.innerHTML=html;
  bindForms();
}
function bindForms(){
  document.getElementById('aiForm')?.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.target);const box=document.getElementById('aiResult');box.style.display='block';box.textContent='در حال پردازش...';try{const data=await api('/ai/assist',{method:'POST',body:JSON.stringify({feature:fd.get('feature'),prompt:fd.get('prompt')})});box.innerHTML='<h3>پاسخ</h3><p>'+esc(data.response).replace(/\n/g,'<br>')+'</p>';}catch(err){box.textContent=err.message;}});
  document.getElementById('smsForm')?.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.target);try{await api('/sms/send',{method:'POST',body:JSON.stringify(Object.fromEntries(fd.entries()))});toast('درخواست پیامک ثبت شد.');renderPage();}catch(err){toast(err.message);}});
}

document.addEventListener('DOMContentLoaded',()=>{if(guard())renderPage().catch(err=>{document.getElementById('content').innerHTML='<div class="state">'+esc(err.message)+'</div>';});});
