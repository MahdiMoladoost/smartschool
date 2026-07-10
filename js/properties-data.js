// ============================================
// MOLAFIND - Properties Data (اطلاعات سپاشهر)
// ============================================

const PROPERTIES_DATA = [
  {
    id: 1,
    name: "تعاونی توسعه و عمران سپاشهر",
    province: "تهران",
    city: "تهران",
    district: "منطقه ۲۲ - شهرک گلستان",
    type: "عمرانی و مسکن",
    description: "تعاونی برتر سال با لوح تقدیر مدیریت کیفیت و تعهد به زمان‌بندی پروژه‌ها. استفاده از برترین متریال روز دنیا در تمامی ساخت‌وسازها.",
    image: "images/building-1.png",
    badge: "تعاونی برتر سال",
    progress: 95,
    phone: "۰۲۱-۴۴۹۳۴۸۴۱",
    address: "تهران، منطقه ۲۲، شهرک گلستان",
    features: ["شفافیت مالی مطلق", "استاندارد مصالح", "تعهد به زمان‌بندی"]
  },
  {
    id: 2,
    name: "پروژه مسکونی الهیه - سپاشهر",
    province: "تهران",
    city: "تهران",
    district: "منطقه ۲۲",
    type: "مسکن لوکس",
    description: "پروژه لوکس الهیه با ۳۵٪ پیشرفت فیزیکی. یکی از پروژه‌های در حال توسعه تعاونی سپاشهر با کیفیت ساخت بالا.",
    image: "images/building-2.png",
    badge: "در حال توسعه",
    progress: 35,
    phone: "۰۲۱-۴۴۹۳۴۸۴۱",
    address: "تهران، منطقه ۲۲، الهیه",
    features: ["پروژه لوکس", "۳۵٪ پیشرفت", "کیفیت بالا"]
  },
  {
    id: 3,
    name: "پروژه دیپلمات - سپاشهر",
    province: "تهران",
    city: "تهران",
    district: "منطقه ۲۲",
    type: "مسکن لوکس",
    description: "پروژه دیپلمات با ۹۵٪ پیشرفت فیزیکی. یکی از شاهکارهای تکمیل‌شده تعاونی سپاشهر با ۱۲۵ واحد لوکس.",
    image: "images/building-3.png",
    badge: "۹۵٪ پیشرفت",
    progress: 95,
    phone: "۰۲۱-۴۴۹۳۴۸۴۱",
    address: "تهران، منطقه ۲۲، دیپلمات",
    features: ["۱۲۵ واحد لوکس", "۹۵٪ پیشرفت", "تحویل ۱۴۰۵"]
  },
  {
    id: 4,
    name: "پروژه سفیر S2 - سپاشهر",
    province: "تهران",
    city: "تهران",
    district: "منطقه ۲۲",
    type: "مسکن لوکس",
    description: "پروژه سفیر S2 با ۶۵٪ پیشرفت فیزیکی. پروژه‌ای با استانداردهای بین‌المللی و مصالح درجه یک.",
    image: "images/building-4.png",
    badge: "۶۵٪ پیشرفت",
    progress: 65,
    phone: "۰۲۱-۴۴۹۳۴۸۴۱",
    address: "تهران، منطقه ۲۲، سفیر",
    features: ["۶۵٪ پیشرفت", "مصالح درجه یک", "استاندارد بین‌المللی"]
  },
  {
    id: 5,
    name: "پروژه مسکونی ایران ۱ - سپاشهر",
    province: "تهران",
    city: "تهران",
    district: "منطقه ۲۲",
    type: "مسکن",
    description: "پروژه مسکونی ایران ۱ با ۹۲ واحد لوکس. تحویل شده در سال ۱۴۰۴ با کیفیت ساخت عالی.",
    image: "images/building-5.png",
    badge: "تحویل ۱۴۰۴",
    progress: 100,
    phone: "۰۲۱-۴۴۹۳۴۸۴۱",
    address: "تهران، منطقه ۲۲، ایران",
    features: ["۹۲ واحد لوکس", "تحویل ۱۴۰۴", "کیفیت عالی"]
  },
  {
    id: 6,
    name: "پروژه مسکونی سفیر - سپاشهر",
    province: "تهران",
    city: "تهران",
    district: "منطقه ۲۲",
    type: "مسکن لوکس",
    description: "پروژه مسکونی سفیر با ۱۲۵ واحد لوکس. تحویل شده در سال ۱۴۰۵ با امکانات مدرن و منحصر‌به‌فرد.",
    image: "images/building-6.png",
    badge: "تحویل ۱۴۰۵",
    progress: 100,
    phone: "۰۲۱-۴۴۹۳۴۸۴۱",
    address: "تهران، منطقه ۲۲، سفیر",
    features: ["۱۲۵ واحد لوکس", "تحویل ۱۴۰۵", "امکانات مدرن"]
  }
];

// ===== ابزارهای نمایش =====
function toPersianDigits(value) {
  return String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ===== تبدیل به کارت حرفه‌ای =====
function createPropertyCard(property) {
  const detailUrl = `cooperative-detail.html?id=${encodeURIComponent(property.id)}`;
  const progress = Number(property.progress) || 0;
  const safeName = escapeHtml(property.name);
  const safeImage = escapeHtml(property.image);
  const safeBadge = escapeHtml(property.badge);
  const safeAddress = escapeHtml(property.address);
  const safeProvince = escapeHtml(property.province);
  const safeCity = escapeHtml(property.city);
  const safeDistrict = escapeHtml(property.district);
  const safeDescription = escapeHtml(property.description);
  const safePhone = escapeHtml(property.phone);

  return `
    <article class="property-card">
      <div class="property-card__image">
        <a href="${detailUrl}" aria-label="مشاهده جزئیات ${safeName}">
          <img loading="lazy" src="${safeImage}" alt="${safeName}">
          <span class="property-card__overlay"></span>
        </a>
        <span class="badge">${safeBadge}</span>
        <button class="fav" type="button" aria-label="افزودن به علاقه‌مندی">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <div class="property-card__progress-float" aria-label="درصد پیشرفت">
          <strong>${toPersianDigits(progress)}٪</strong>
          <span>پیشرفت</span>
        </div>
      </div>

      <div class="property-card__body">
        <div class="meta">
          <span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${safeProvince}
          </span>
          <span>${safeCity}</span>
          <span>${safeDistrict}</span>
        </div>

        <h3><a href="${detailUrl}">${safeName}</a></h3>
        <p class="property-card__description">${safeDescription}</p>

        <div class="property-card__features">
          ${property.features.map(f => `<span><i>✓</i>${escapeHtml(f)}</span>`).join('')}
        </div>

        <div class="property-card__progress">
          <div class="property-card__progress-head">
            <span>وضعیت پیشرفت</span>
            <strong>${toPersianDigits(progress)}٪</strong>
          </div>
          <div class="bar"><i style="width:${Math.max(0, Math.min(100, progress))}%"></i></div>
        </div>

        <div class="property-card__footer">
          <div class="property-card__location" title="${safeAddress}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>${safeAddress}</span>
          </div>
          <a href="${detailUrl}" class="link">
            مشاهده جزئیات
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          </a>
        </div>
      </div>
    </article>
  `;
}

// ===== پر کردن کارت‌ها =====
document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('latestCoops');
  if (container) {
    container.innerHTML = PROPERTIES_DATA.map(createPropertyCard).join('');
  }
});