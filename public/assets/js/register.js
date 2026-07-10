'use strict';

const API_BASE_URL = '/api/v1';
const TOTAL_STEPS = 5;

const form = document.getElementById('registerForm');
const messageContainer = document.getElementById('messageContainer');
const loadingOverlay = document.getElementById('loadingOverlay');
const successOverlay = document.getElementById('successOverlay');
const trackingCodeElement = document.getElementById('trackingCode');
const previousButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const submitButton = document.getElementById('submitButton');
const progressText = document.getElementById('formProgressText');
const reviewContent = document.getElementById('reviewContent');

const state = {
    currentStep: 1,
    files: {
        studentPhoto: null,
        reportCard: null,
        achievements: null
    }
};

const gradeNames = {
    1: 'اول', 2: 'دوم', 3: 'سوم', 4: 'چهارم', 5: 'پنجم', 6: 'ششم',
    7: 'هفتم', 8: 'هشتم', 9: 'نهم', 10: 'دهم', 11: 'یازدهم', 12: 'دوازدهم'
};

const relationNames = { father: 'پدر', mother: 'مادر', other: 'سایر' };

function byId(id) {
    return document.getElementById(id);
}

function value(id) {
    return (byId(id)?.value || '').trim();
}

function escapeHtml(input) {
    return String(input ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function normalizeDigits(input) {
    return String(input ?? '')
        .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
        .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

function toPersianDigits(input) {
    return String(input ?? '').replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

function onlyDigits(input, maxLength) {
    return normalizeDigits(input).replace(/\D/g, '').slice(0, maxLength);
}

function showMessage(message, type = 'error', timeout = 6500) {
    const icon = type === 'success' ? 'check-circle' : type === 'warning' ? 'triangle-exclamation' : 'circle-exclamation';
    messageContainer.innerHTML = `
        <div class="alert alert-${type}">
            <i class="fas fa-${icon}"></i>
            <span>${escapeHtml(message)}</span>
            <button type="button" aria-label="بستن پیام"><i class="fas fa-xmark"></i></button>
        </div>
    `;
    const alert = messageContainer.querySelector('.alert');
    alert?.querySelector('button')?.addEventListener('click', () => alert.remove());
    if (timeout) setTimeout(() => alert?.remove(), timeout);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setLoading(show) {
    loadingOverlay.classList.toggle('show', Boolean(show));
    submitButton.disabled = Boolean(show);
    nextButton.disabled = Boolean(show);
}

function setFieldError(id, message = '') {
    const field = byId(id);
    const error = byId(`${id}Error`);
    field?.classList.toggle('error', Boolean(message));
    field?.closest('.control, .document-uploader, .consent-box')?.classList.toggle('has-error', Boolean(message));
    if (error) {
        error.textContent = message;
        error.classList.toggle('show', Boolean(message));
    }
}

function clearStepErrors(step) {
    document.querySelector(`[data-form-step="${step}"]`)?.querySelectorAll('.field-error').forEach(item => {
        item.textContent = '';
        item.classList.remove('show');
    });
    document.querySelector(`[data-form-step="${step}"]`)?.querySelectorAll('.error, .has-error').forEach(item => {
        item.classList.remove('error', 'has-error');
    });
}

function isValidNationalCode(code) {
    const clean = onlyDigits(code, 10);
    if (!/^\d{10}$/.test(clean) || /^(\d)\1{9}$/.test(clean)) return false;
    const check = Number(clean[9]);
    const sum = clean.slice(0, 9).split('').reduce((total, digit, index) => total + Number(digit) * (10 - index), 0);
    const remainder = sum % 11;
    return check === (remainder < 2 ? remainder : 11 - remainder);
}

function isValidMobile(phone) {
    return /^09\d{9}$/.test(onlyDigits(phone, 11));
}

function isValidEmail(email) {
    return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidJalaliDate(date) {
    const normalized = normalizeDigits(date).replace(/-/g, '/');
    const match = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year < 1300 || year > 1500 || month < 1 || month > 12 || day < 1) return false;
    const maxDay = month <= 6 ? 31 : month <= 11 ? 30 : (isJalaliLeapYear(year) ? 30 : 29);
    return day <= maxDay;
}

function isJalaliLeapYear(year) {
    const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
    let jump = 0;
    let leapJ = -14;
    let previous = breaks[0];
    if (year < previous || year >= breaks[breaks.length - 1]) return false;
    for (let i = 1; i < breaks.length; i += 1) {
        const current = breaks[i];
        jump = current - previous;
        if (year < current) break;
        leapJ += Math.floor(jump / 33) * 8 + Math.floor((jump % 33) / 4);
        previous = current;
    }
    let n = year - previous;
    leapJ += Math.floor(n / 33) * 8 + Math.floor(((n % 33) + 3) / 4);
    if (jump % 33 === 4 && jump - n === 4) leapJ += 1;
    const leap = ((n + 1) % 33 - 1) % 4;
    return leap === 0;
}

function formatJalaliDate(input) {
    const digits = onlyDigits(input, 8);
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 4)}/${digits.slice(4)}`;
    return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6, 8)}`;
}

async function loadAvailableGrades() {
    const select = byId('requestedGrade');
    if (!select) return;
    select.disabled = true;
    select.innerHTML = '<option value="">در حال دریافت پایه‌های فعال...</option>';
    try {
        const response = await fetch(`${API_BASE_URL}/registration-grades`, {
            headers: { Accept: 'application/json' }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.error || 'دریافت پایه‌ها انجام نشد.');
        const grades = Array.isArray(data.grades) ? data.grades : [];
        if (!grades.length) {
            select.innerHTML = '<option value="">هیچ پایه فعالی توسط مدیر ثبت نشده است</option>';
            select.disabled = true;
            return;
        }
        select.innerHTML = '<option value="">انتخاب پایه</option>' + grades.map(item => {
            const grade = Number(item.grade);
            const label = item.label || gradeNames[grade] || `پایه ${toPersianDigits(grade)}`;
            return `<option value="${grade}">${escapeHtml(label)}</option>`;
        }).join('');
        select.disabled = false;
    } catch (error) {
        console.error('Error loading registration grades:', error);
        select.innerHTML = '<option value="">خطا در دریافت پایه‌ها</option>';
        select.disabled = true;
        showMessage('پایه‌های ثبت‌شده مدرسه دریافت نشد. صفحه را بازخوانی کنید.', 'warning');
    }
}

function validateStep(step) {
    clearStepErrors(step);
    let valid = true;
    const requireField = (id, condition, message) => {
        if (!condition) {
            setFieldError(id, message);
            valid = false;
        }
    };

    if (step === 1) {
        requireField('firstName', value('firstName').length >= 2, 'نام را کامل وارد کنید.');
        requireField('lastName', value('lastName').length >= 2, 'نام خانوادگی را کامل وارد کنید.');
        requireField('nationalCode', isValidNationalCode(value('nationalCode')), 'کد ملی معتبر ۱۰ رقمی وارد کنید.');
        requireField('birthDate', isValidJalaliDate(value('birthDate')), 'تاریخ تولد شمسی معتبر وارد کنید.');
        requireField('requestedGrade', Boolean(value('requestedGrade')), 'پایه درخواستی را انتخاب کنید.');
    }

    if (step === 2) {
        requireField('previousSchool', value('previousSchool').length >= 2, 'نام مدرسه سال گذشته را وارد کنید.');
        requireField('previousGrade', Boolean(value('previousGrade')), 'پایه سال گذشته را انتخاب کنید.');
        const average = normalizeDigits(value('previousAverage')).replace(',', '.');
        if (average && (Number.isNaN(Number(average)) || Number(average) < 0 || Number(average) > 20)) {
            setFieldError('previousAverage', 'معدل باید عددی بین صفر تا بیست باشد.');
            valid = false;
        }
        if (!state.files.reportCard) {
            setFieldError('reportCard', 'بارگذاری کارنامه رسمی سال گذشته الزامی است.');
            valid = false;
        }
    }

    if (step === 3) {
        requireField('guardianName', value('guardianName').length >= 2, 'نام ولی یا سرپرست اصلی را وارد کنید.');
        requireField('guardianRelation', Boolean(value('guardianRelation')), 'نسبت ولی با دانش‌آموز را انتخاب کنید.');
        requireField('guardianPhone', isValidMobile(value('guardianPhone')), 'شماره همراه معتبر ولی را وارد کنید.');
        if (value('fatherPhone') && !isValidMobile(value('fatherPhone'))) {
            setFieldError('fatherPhone', 'شماره همراه پدر معتبر نیست.');
            valid = false;
        }
        if (value('motherPhone') && !isValidMobile(value('motherPhone'))) {
            setFieldError('motherPhone', 'شماره همراه مادر معتبر نیست.');
            valid = false;
        }
        if (!isValidEmail(value('email'))) {
            setFieldError('email', 'نشانی ایمیل معتبر نیست.');
            valid = false;
        }
    }

    if (step === 4) {
        requireField('province', value('province').length >= 2, 'استان را وارد کنید.');
        requireField('city', value('city').length >= 2, 'شهر را وارد کنید.');
        requireField('postalCode', /^\d{10}$/.test(onlyDigits(value('postalCode'), 10)), 'کد پستی باید ۱۰ رقم باشد.');
        requireField('address', value('address').length >= 10, 'نشانی کامل محل سکونت را وارد کنید.');
    }

    if (step === 5) {
        const consent = byId('consent');
        if (!consent.checked) {
            setFieldError('consent', 'برای ثبت نهایی، صحت اطلاعات را تأیید کنید.');
            valid = false;
        }
    }

    if (!valid) {
        const firstError = document.querySelector(`[data-form-step="${step}"] .error, [data-form-step="${step}"] .has-error`);
        firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return valid;
}

function updateStepUI() {
    document.querySelectorAll('.form-step').forEach(section => {
        section.classList.toggle('is-active', Number(section.dataset.formStep) === state.currentStep);
    });
    document.querySelectorAll('.stepper-item').forEach(button => {
        const step = Number(button.dataset.step);
        button.classList.toggle('is-active', step === state.currentStep);
        button.classList.toggle('is-complete', step < state.currentStep);
        button.setAttribute('aria-current', step === state.currentStep ? 'step' : 'false');
    });
    previousButton.classList.toggle('is-hidden', state.currentStep === 1);
    nextButton.classList.toggle('is-hidden', state.currentStep === TOTAL_STEPS);
    submitButton.classList.toggle('is-hidden', state.currentStep !== TOTAL_STEPS);
    progressText.textContent = `مرحله ${toPersianDigits(state.currentStep)} از ${toPersianDigits(TOTAL_STEPS)}`;
    if (state.currentStep === TOTAL_STEPS) renderReview();
    document.querySelector('.registration-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function goToStep(step, validateCurrent = true) {
    if (step < 1 || step > TOTAL_STEPS) return;
    if (validateCurrent && step > state.currentStep && !validateStep(state.currentStep)) {
        showMessage('لطفاً موارد مشخص‌شده را تکمیل کنید.');
        return;
    }
    state.currentStep = step;
    updateStepUI();
}

function reviewItem(label, content, icon = 'circle-info') {
    return `<div class="review-item"><span class="review-icon"><i class="fas fa-${icon}"></i></span><div><small>${escapeHtml(label)}</small><strong>${escapeHtml(content || '—')}</strong></div></div>`;
}

function renderReview() {
    const studentName = `${value('firstName')} ${value('lastName')}`.trim();
    const guardianTitle = value('guardianGender') === 'male' ? 'آقای' : value('guardianGender') === 'female' ? 'خانم' : '';
    const reportName = state.files.reportCard?.name || 'بارگذاری نشده';
    const photoName = state.files.studentPhoto?.name || 'ثبت نشده';

    reviewContent.innerHTML = `
        <section class="review-section">
            <h3><i class="fas fa-user-graduate"></i> اطلاعات دانش‌آموز</h3>
            <div class="review-items">
                ${reviewItem('نام و نام خانوادگی', studentName, 'user')}
                ${reviewItem('کد ملی', value('nationalCode'), 'id-card')}
                ${reviewItem('تاریخ تولد', value('birthDate'), 'calendar-days')}
                ${reviewItem('پایه درخواستی', gradeNames[value('requestedGrade')], 'graduation-cap')}
                ${reviewItem('عکس دانش‌آموز', photoName, 'image')}
            </div>
        </section>
        <section class="review-section">
            <h3><i class="fas fa-school"></i> سوابق تحصیلی</h3>
            <div class="review-items">
                ${reviewItem('مدرسه سال گذشته', value('previousSchool'), 'building-columns')}
                ${reviewItem('پایه سال گذشته', gradeNames[value('previousGrade')], 'layer-group')}
                ${reviewItem('معدل', value('previousAverage') || 'ثبت نشده', 'chart-line')}
                ${reviewItem('کارنامه', reportName, 'file-lines')}
                ${reviewItem('افتخارات', value('achievementsDescription') || 'ثبت نشده', 'award')}
            </div>
        </section>
        <section class="review-section">
            <h3><i class="fas fa-people-roof"></i> والدین و سرپرست</h3>
            <div class="review-items">
                ${reviewItem('پدر', value('fatherName') || 'ثبت نشده', 'person')}
                ${reviewItem('شماره پدر', value('fatherPhone') || 'ثبت نشده', 'mobile-screen')}
                ${reviewItem('مادر', value('motherName') || 'ثبت نشده', 'person-dress')}
                ${reviewItem('شماره مادر', value('motherPhone') || 'ثبت نشده', 'mobile-screen')}
                ${reviewItem('ولی اصلی', `${guardianTitle} ${value('guardianName')}`.trim(), 'user-shield')}
                ${reviewItem('نسبت و شماره', `${relationNames[value('guardianRelation')] || '—'} | ${value('guardianPhone')}`, 'phone')}
            </div>
        </section>
        <section class="review-section">
            <h3><i class="fas fa-house"></i> محل سکونت</h3>
            <div class="review-items">
                ${reviewItem('استان و شهر', `${value('province')}، ${value('city')}`, 'city')}
                ${reviewItem('محله', value('district') || 'ثبت نشده', 'location-dot')}
                ${reviewItem('کد پستی', value('postalCode'), 'envelopes-bulk')}
                ${reviewItem('نشانی', value('address'), 'map-location-dot')}
            </div>
        </section>
    `;
}

function validateFile(file, config) {
    if (!file) return { ok: false, error: 'فایلی انتخاب نشده است.' };
    if (!config.types.includes(file.type)) return { ok: false, error: 'فرمت فایل انتخاب‌شده مجاز نیست.' };
    if (file.size > config.maxMb * 1024 * 1024) return { ok: false, error: `حجم فایل نباید بیشتر از ${toPersianDigits(config.maxMb)} مگابایت باشد.` };
    return { ok: true };
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('خواندن فایل انجام نشد.'));
        reader.readAsDataURL(file);
    });
}

async function handleFileSelection(key, file) {
    const configs = {
        studentPhoto: { maxMb: 4, types: ['image/jpeg', 'image/png', 'image/webp'] },
        reportCard: { maxMb: 8, types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] },
        achievements: { maxMb: 8, types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] }
    };
    const result = validateFile(file, configs[key]);
    if (!result.ok) {
        showMessage(result.error);
        byId(key).value = '';
        return;
    }
    try {
        const dataUrl = await fileToDataUrl(file);
        state.files[key] = { file, dataUrl, name: file.name, type: file.type };
        if (key === 'studentPhoto') {
            const preview = byId('studentPhotoPreview');
            preview.innerHTML = `<img src="${dataUrl}" alt="پیش‌نمایش عکس دانش‌آموز">`;
            preview.classList.add('has-image');
            byId('removeStudentPhoto').classList.remove('is-hidden');
        }
        if (key === 'reportCard') {
            byId('reportCardLabel').textContent = file.name;
            byId('reportCardDrop').classList.add('has-file');
            setFieldError('reportCard', '');
        }
        if (key === 'achievements') {
            byId('achievementsLabel').textContent = file.name;
            byId('achievements').closest('.document-uploader')?.classList.add('has-file');
        }
    } catch (error) {
        showMessage(error.message || 'فایل قابل خواندن نیست.');
    }
}

function removeStudentPhoto() {
    state.files.studentPhoto = null;
    byId('studentPhoto').value = '';
    byId('studentPhotoPreview').innerHTML = '<i class="fas fa-user"></i>';
    byId('studentPhotoPreview').classList.remove('has-image');
    byId('removeStudentPhoto').classList.add('is-hidden');
}

function syncGuardianFields() {
    const relation = value('guardianRelation');
    if (relation === 'father') {
        if (value('fatherName')) byId('guardianName').value = value('fatherName');
        if (value('fatherPhone')) byId('guardianPhone').value = value('fatherPhone');
        byId('guardianGender').value = 'male';
    } else if (relation === 'mother') {
        if (value('motherName')) byId('guardianName').value = value('motherName');
        if (value('motherPhone')) byId('guardianPhone').value = value('motherPhone');
        byId('guardianGender').value = 'female';
    }
}

async function checkDuplicate(nationalId) {
    try {
        const response = await fetch(`${API_BASE_URL}/registrations/check?nationalCode=${encodeURIComponent(nationalId)}`, {
            headers: { Accept: 'application/json' }
        });
        if (!response.ok) return null;
        return response.json();
    } catch (error) {
        console.warn('Duplicate check failed:', error);
        return null;
    }
}

function buildPayload() {
    return {
        first_name: value('firstName'),
        last_name: value('lastName'),
        full_name: `${value('firstName')} ${value('lastName')}`.trim(),
        national_id: onlyDigits(value('nationalCode'), 10),
        birth_date_jalali: normalizeDigits(value('birthDate')).replace(/-/g, '/'),
        grade: Number(value('requestedGrade')),
        previous_school: value('previousSchool'),
        previous_grade: Number(value('previousGrade')),
        previous_year_average: normalizeDigits(value('previousAverage')).replace(',', '.') || null,
        report_card_data: state.files.reportCard?.dataUrl || null,
        report_card_name: state.files.reportCard?.name || null,
        student_photo_data: state.files.studentPhoto?.dataUrl || null,
        student_photo_name: state.files.studentPhoto?.name || null,
        achievements_data: state.files.achievements?.dataUrl || null,
        achievements_name: state.files.achievements?.name || null,
        achievements_description: value('achievementsDescription') || null,
        health_notes: value('healthNotes') || null,
        special_needs: value('specialNeeds') || null,
        father_name: value('fatherName') || null,
        mother_name: value('motherName') || null,
        father_phone: onlyDigits(value('fatherPhone'), 11) || null,
        mother_phone: onlyDigits(value('motherPhone'), 11) || null,
        guardian_name: value('guardianName'),
        guardian_relation: value('guardianRelation'),
        guardian_phone: onlyDigits(value('guardianPhone'), 11),
        guardian_gender: value('guardianGender') || null,
        phone: onlyDigits(value('guardianPhone'), 11),
        email: value('email') || null,
        province: value('province'),
        city: value('city'),
        district: value('district') || null,
        postal_code: onlyDigits(value('postalCode'), 10),
        home_phone: normalizeDigits(value('homePhone')).replace(/[^\d]/g, '') || null,
        address: value('address')
    };
}

async function handleSubmit(event) {
    event.preventDefault();
    if (!validateStep(5)) return;

    for (let step = 1; step <= 4; step += 1) {
        if (!validateStep(step)) {
            state.currentStep = step;
            updateStepUI();
            showMessage(`اطلاعات مرحله ${toPersianDigits(step)} نیاز به اصلاح دارد.`);
            return;
        }
    }

    const payload = buildPayload();
    setLoading(true);
    try {
        const duplicate = await checkDuplicate(payload.national_id);
        if (duplicate?.exists) {
            const message = duplicate.tracking_code
                ? `برای این کد ملی قبلاً درخواست ثبت شده است. کد پیگیری: ${duplicate.tracking_code}`
                : 'برای این کد ملی قبلاً درخواست ثبت شده است.';
            throw new Error(message);
        }

        const response = await fetch(`${API_BASE_URL}/registrations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.error || 'ثبت درخواست انجام نشد.');

        trackingCodeElement.textContent = data.tracking_code || '—';
        successOverlay.classList.add('show');
        form.reset();
        state.files = { studentPhoto: null, reportCard: null, achievements: null };
        removeStudentPhoto();
        byId('reportCardLabel').textContent = 'تصویر یا PDF کارنامه را انتخاب کنید';
        byId('achievementsLabel').textContent = 'فایلی انتخاب نشده';
    } catch (error) {
        showMessage(error.message || 'خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید.');
    } finally {
        setLoading(false);
    }
}

// تقویم شمسی سبک و مستقل برای فیلد تاریخ تولد
function createJalaliDatePicker() {
    const input = byId('birthDate');
    if (!input) return;

    const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    const todayParts = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: 'numeric', day: 'numeric' })
        .formatToParts(new Date()).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
    let viewYear = Number(todayParts.year) || 1403;
    let viewMonth = Number(todayParts.month) || 1;

    const picker = document.createElement('div');
    picker.className = 'jalali-picker';
    picker.setAttribute('aria-hidden', 'true');
    picker.innerHTML = `
        <div class="jalali-picker__head">
            <button type="button" data-jalali-next aria-label="ماه بعد"><i class="fas fa-chevron-right"></i></button>
            <div class="jalali-picker__selectors">
                <button type="button" class="jalali-picker__selector" data-jalali-month-trigger aria-label="انتخاب ماه"><span data-jalali-month-label></span><i class="fas fa-chevron-down"></i></button>
                <button type="button" class="jalali-picker__selector" data-jalali-year-trigger aria-label="انتخاب سال"><span data-jalali-year-label></span><i class="fas fa-chevron-down"></i></button>
            </div>
            <button type="button" data-jalali-prev aria-label="ماه قبل"><i class="fas fa-chevron-left"></i></button>
        </div>
        <div class="jalali-picker__chooser jalali-picker__months" data-jalali-month-menu></div>
        <div class="jalali-picker__chooser jalali-picker__years" data-jalali-year-menu></div>
        <div class="jalali-picker__week"><span>ش</span><span>ی</span><span>د</span><span>س</span><span>چ</span><span>پ</span><span>ج</span></div>
        <div class="jalali-picker__days" data-jalali-days></div>
        <div class="jalali-picker__foot"><button type="button" data-jalali-today>امروز</button><button type="button" data-jalali-clear>پاک کردن</button></div>
    `;
    document.body.appendChild(picker);

    const monthMenu = picker.querySelector('[data-jalali-month-menu]');
    const yearMenu = picker.querySelector('[data-jalali-year-menu]');
    monthMenu.innerHTML = monthNames.map((name, index) => `<button type="button" data-jalali-month="${index + 1}">${name}</button>`).join('');
    const currentYear = Number(todayParts.year) || 1403;
    yearMenu.innerHTML = Array.from({ length: 101 }, (_, index) => currentYear + 1 - index)
        .filter(year => year >= 1300)
        .map(year => `<button type="button" data-jalali-year="${year}">${toPersianDigits(year)}</button>`).join('');

    function closeChoosers() {
        monthMenu.classList.remove('is-open');
        yearMenu.classList.remove('is-open');
    }

    function jalaliToGregorian(jy, jm, jd) {
        jy += 1595;
        let days = -355668 + (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4) + jd;
        days += jm < 7 ? (jm - 1) * 31 : ((jm - 7) * 30) + 186;
        let gy = 400 * Math.floor(days / 146097);
        days %= 146097;
        if (days > 36524) {
            gy += 100 * Math.floor(--days / 36524);
            days %= 36524;
            if (days >= 365) days += 1;
        }
        gy += 4 * Math.floor(days / 1461);
        days %= 1461;
        if (days > 365) {
            gy += Math.floor((days - 1) / 365);
            days = (days - 1) % 365;
        }
        let gd = days + 1;
        const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
        const salA = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        let gm = 1;
        while (gm <= 12 && gd > salA[gm]) {
            gd -= salA[gm];
            gm += 1;
        }
        return { gy, gm, gd };
    }

    function render() {
        picker.querySelector('[data-jalali-month-label]').textContent = monthNames[viewMonth - 1];
        picker.querySelector('[data-jalali-year-label]').textContent = toPersianDigits(viewYear);
        monthMenu.querySelectorAll('[data-jalali-month]').forEach(button => button.classList.toggle('is-selected', Number(button.dataset.jalaliMonth) === viewMonth));
        yearMenu.querySelectorAll('[data-jalali-year]').forEach(button => button.classList.toggle('is-selected', Number(button.dataset.jalaliYear) === viewYear));
        const { gy, gm, gd } = jalaliToGregorian(viewYear, viewMonth, 1);
        const gregorianWeekDay = new Date(gy, gm - 1, gd).getDay();
        const startOffset = (gregorianWeekDay + 1) % 7; // شنبه = صفر
        const daysCount = viewMonth <= 6 ? 31 : viewMonth <= 11 ? 30 : (isJalaliLeapYear(viewYear) ? 30 : 29);
        const selected = normalizeDigits(input.value).split('/').map(Number);
        let html = ''.padEnd(startOffset, ' ').split('').map(() => '<span class="jalali-picker__empty"></span>').join('');
        for (let day = 1; day <= daysCount; day += 1) {
            const isSelected = selected[0] === viewYear && selected[1] === viewMonth && selected[2] === day;
            const isToday = Number(todayParts.year) === viewYear && Number(todayParts.month) === viewMonth && Number(todayParts.day) === day;
            html += `<button type="button" data-jalali-day="${day}" class="${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}">${toPersianDigits(day)}</button>`;
        }
        picker.querySelector('[data-jalali-days]').innerHTML = html;
    }

    function position() {
        const rect = input.getBoundingClientRect();
        const viewportPadding = 12;
        const gap = 8;
        const width = Math.min(330, window.innerWidth - (viewportPadding * 2));

        // تقویم نسبت به خود صفحه نمایش موقعیت می‌گیرد تا داخل بخش اسکرولی فرم بریده نشود.
        picker.style.position = 'fixed';
        picker.style.zIndex = '9999';
        picker.style.width = `${width}px`;
        picker.style.maxHeight = `calc(100vh - ${viewportPadding * 2}px)`;
        picker.style.overflowY = 'auto';

        const left = Math.max(
            viewportPadding,
            Math.min(rect.right - width, window.innerWidth - width - viewportPadding)
        );

        const pickerHeight = Math.min(
            picker.scrollHeight || 360,
            window.innerHeight - (viewportPadding * 2)
        );
        const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
        const spaceAbove = rect.top - viewportPadding;

        let top;
        if (spaceBelow >= pickerHeight + gap) {
            top = rect.bottom + gap;
        } else if (spaceAbove >= pickerHeight + gap) {
            top = rect.top - pickerHeight - gap;
        } else {
            // اگر هیچ سمت فضای کامل نداشت، تقویم را کاملاً داخل viewport نگه می‌داریم.
            top = spaceAbove > spaceBelow
                ? Math.max(viewportPadding, rect.top - pickerHeight - gap)
                : Math.min(rect.bottom + gap, window.innerHeight - pickerHeight - viewportPadding);
        }

        top = Math.max(
            viewportPadding,
            Math.min(top, window.innerHeight - pickerHeight - viewportPadding)
        );

        picker.style.top = `${top}px`;
        picker.style.left = `${left}px`;
    }

    function open() {
        const existing = normalizeDigits(input.value).match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
        if (existing) {
            viewYear = Number(existing[1]);
            viewMonth = Number(existing[2]);
        }
        render();
        picker.style.visibility = 'hidden';
        picker.classList.add('is-open');
        picker.setAttribute('aria-hidden', 'false');
        position();
        picker.style.visibility = 'visible';
    }

    function close() {
        closeChoosers();
        picker.classList.remove('is-open');
        picker.setAttribute('aria-hidden', 'true');
    }

    input.addEventListener('focus', open);
    input.addEventListener('click', open);
    input.addEventListener('input', event => {
        event.target.value = formatJalaliDate(event.target.value);
        setFieldError('birthDate', '');
    });
    picker.addEventListener('click', event => {
        const monthTrigger = event.target.closest('[data-jalali-month-trigger]');
        if (monthTrigger) {
            yearMenu.classList.remove('is-open');
            monthMenu.classList.toggle('is-open');
            return;
        }
        const yearTrigger = event.target.closest('[data-jalali-year-trigger]');
        if (yearTrigger) {
            monthMenu.classList.remove('is-open');
            yearMenu.classList.toggle('is-open');
            yearMenu.querySelector('.is-selected')?.scrollIntoView({ block: 'center' });
            return;
        }
        const monthButton = event.target.closest('[data-jalali-month]');
        if (monthButton) {
            viewMonth = Number(monthButton.dataset.jalaliMonth);
            closeChoosers();
            render();
            return;
        }
        const yearButton = event.target.closest('[data-jalali-year]');
        if (yearButton) {
            viewYear = Number(yearButton.dataset.jalaliYear);
            closeChoosers();
            render();
            return;
        }
        const dayButton = event.target.closest('[data-jalali-day]');
        if (dayButton) {
            input.value = `${viewYear}/${String(viewMonth).padStart(2, '0')}/${String(dayButton.dataset.jalaliDay).padStart(2, '0')}`;
            setFieldError('birthDate', '');
            close();
            return;
        }
        if (event.target.closest('[data-jalali-prev]')) {
            closeChoosers();
            viewMonth -= 1;
            if (viewMonth < 1) { viewMonth = 12; viewYear -= 1; }
            render();
        }
        if (event.target.closest('[data-jalali-next]')) {
            closeChoosers();
            viewMonth += 1;
            if (viewMonth > 12) { viewMonth = 1; viewYear += 1; }
            render();
        }
        if (event.target.closest('[data-jalali-today]')) {
            viewYear = Number(todayParts.year);
            viewMonth = Number(todayParts.month);
            input.value = `${viewYear}/${String(viewMonth).padStart(2, '0')}/${String(todayParts.day).padStart(2, '0')}`;
            close();
        }
        if (event.target.closest('[data-jalali-clear]')) {
            input.value = '';
            close();
        }
    });
    document.addEventListener('mousedown', event => {
        if (!picker.contains(event.target) && event.target !== input) close();
    });
    window.addEventListener('resize', () => picker.classList.contains('is-open') && position());
    window.addEventListener('scroll', () => picker.classList.contains('is-open') && position(), true);
}

function bindEvents() {
    nextButton.addEventListener('click', () => goToStep(state.currentStep + 1));
    previousButton.addEventListener('click', () => goToStep(state.currentStep - 1, false));
    form.addEventListener('submit', handleSubmit);

    document.querySelectorAll('.stepper-item').forEach(button => {
        button.addEventListener('click', () => {
            const target = Number(button.dataset.step);
            if (target <= state.currentStep) goToStep(target, false);
        });
    });

    document.querySelectorAll('[data-file-target]').forEach(button => {
        button.addEventListener('click', () => byId(button.dataset.fileTarget)?.click());
    });
    ['studentPhoto', 'reportCard', 'achievements'].forEach(key => {
        byId(key)?.addEventListener('change', event => handleFileSelection(key, event.target.files?.[0]));
    });
    byId('studentPhotoPreview')?.addEventListener('click', () => byId('studentPhoto')?.click());
    byId('removeStudentPhoto')?.addEventListener('click', removeStudentPhoto);

    document.querySelectorAll('.document-uploader').forEach(zone => {
        zone.addEventListener('dragover', event => {
            event.preventDefault();
            zone.classList.add('is-dragging');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('is-dragging'));
        zone.addEventListener('drop', event => {
            event.preventDefault();
            zone.classList.remove('is-dragging');
            const input = zone.querySelector('input[type="file"]');
            if (input && event.dataTransfer.files?.[0]) handleFileSelection(input.id, event.dataTransfer.files[0]);
        });
    });

    ['nationalCode', 'postalCode'].forEach(id => {
        byId(id)?.addEventListener('input', event => {
            event.target.value = onlyDigits(event.target.value, 10);
            setFieldError(id, '');
        });
    });
    ['fatherPhone', 'motherPhone', 'guardianPhone'].forEach(id => {
        byId(id)?.addEventListener('input', event => {
            event.target.value = onlyDigits(event.target.value, 11);
            setFieldError(id, '');
        });
    });
    byId('homePhone')?.addEventListener('input', event => {
        event.target.value = normalizeDigits(event.target.value).replace(/[^\d-]/g, '').slice(0, 15);
    });
    byId('previousAverage')?.addEventListener('input', event => {
        event.target.value = normalizeDigits(event.target.value).replace(/[^\d.,]/g, '').slice(0, 5);
        setFieldError('previousAverage', '');
    });

    byId('guardianRelation')?.addEventListener('change', syncGuardianFields);
    ['fatherName', 'fatherPhone', 'motherName', 'motherPhone'].forEach(id => {
        byId(id)?.addEventListener('input', syncGuardianFields);
    });

    form.querySelectorAll('input, select, textarea').forEach(field => {
        field.addEventListener('change', () => setFieldError(field.id, ''));
    });

    successOverlay.addEventListener('click', event => {
        if (event.target === successOverlay) window.location.href = '/';
    });
}

bindEvents();
createJalaliDatePicker();
loadAvailableGrades();
updateStepUI();
