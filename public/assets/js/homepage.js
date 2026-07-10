// ============================================
// HOMEPAGE JS - اتصال به دیتابیس از طریق API
// ============================================

const API_BASE_URL = '/api/v1';

// ============================================
// LOAD DATA FROM MYSQL
// ============================================

async function loadDataFromMySQL() {
    try {
        // 1. دریافت آمار داشبورد (تعداد دانش‌آموزان، معلمان، دروس، کلاس‌ها)
        const statsRes = await fetch(`${API_BASE_URL}/admin/dashboard/stats`);
        const statsData = await statsRes.json();
        
        if (statsData.success && statsData.stats) {
            const stats = statsData.stats;
            
            // بروزرسانی آمار در صفحه
            const statStudents = document.getElementById('statStudents');
            const statStudentsFloat = document.getElementById('statStudentsFloat');
            const statTeachersFloat = document.getElementById('statTeachersFloat');
            const statCourses = document.getElementById('statCourses');
            
            if (statStudents) {
                const studentCount = stats.students || 220;
                statStudents.textContent = studentCount.toLocaleString('fa-IR');
                statStudents.setAttribute('data-target', studentCount);
            }
            if (statStudentsFloat) {
                const studentsFloat = (stats.students || 220).toLocaleString('fa-IR');
                statStudentsFloat.textContent = `${studentsFloat}+`;
            }
            if (statTeachersFloat) {
                const teachersFloat = (stats.teachers || 15).toLocaleString('fa-IR');
                statTeachersFloat.textContent = `${teachersFloat}+`;
            }
            if (statCourses) {
                const coursesCount = stats.courses || 45;
                statCourses.textContent = coursesCount.toLocaleString('fa-IR');
                statCourses.setAttribute('data-target', coursesCount);
            }
        }
        
        // 2. دریافت تنظیمات (نام مدرسه، تلفن، آدرس، ایمیل)
        const settingsRes = await fetch(`${API_BASE_URL}/settings`);
        const settingsData = await settingsRes.json();
        
        if (settingsData.success && settingsData.settings) {
            const settings = settingsData.settings;
            
            // بروزرسانی اطلاعات تماس در هدر و فوتر
            const schoolName = document.getElementById('schoolName');
            const schoolPhone = document.getElementById('schoolPhone');
            const schoolAddress = document.getElementById('schoolAddress');
            const supportPhone = document.getElementById('supportPhone');
            const footerPhone = document.getElementById('footerPhone');
            const footerAddress = document.getElementById('footerAddress');
            const footerSupport = document.getElementById('footerSupport');
            
            if (schoolName && settings.school_name) schoolName.textContent = settings.school_name;
            if (schoolPhone && settings.school_phone) schoolPhone.textContent = settings.school_phone;
            if (schoolAddress && settings.school_address) schoolAddress.textContent = settings.school_address;
            if (supportPhone && settings.support_phone) supportPhone.textContent = settings.support_phone;
            if (footerPhone && settings.school_phone) footerPhone.textContent = settings.school_phone;
            if (footerAddress && settings.school_address) footerAddress.textContent = settings.school_address;
            if (footerSupport && settings.support_phone) footerSupport.textContent = settings.support_phone;
            
            // بروزرسانی عنوان صفحه
            if (settings.school_name) {
                document.title = `${settings.school_name} | سیستم مدیریت یکپارچه آموزشی`;
            }
        }
        
        // 3. اخبار صفحه اصلی فقط از بخش «اخبار صفحه اصلی» بارگذاری می‌شود.
        // اطلاعیه‌های پنل اطلاعیه‌ها نباید در این قسمت نمایش داده شوند.
        
    } catch (error) {
        console.error('خطا در اتصال به دیتابیس:', error);
        // در صورت خطا، از داده‌های پیش‌فرض استفاده می‌شود که در HTML وجود دارد
    }
}

// ============================================
// CHATBOT FUNCTIONS
// ============================================

let isChatOpen = false;

function toggleChatPanel() {
    const panel = document.getElementById('chatbotPanelFarz');
    if (panel) {
        panel.classList.toggle('active');
        isChatOpen = panel.classList.contains('active');
    }
}

function closeChatPanel() {
    const panel = document.getElementById('chatbotPanelFarz');
    if (panel) panel.classList.remove('active');
    isChatOpen = false;
}

async function sendChatMessage() {
    const input = document.getElementById('chatbotInputFarz');
    if (!input) return;
    const message = input.value.trim();
    if (!message) return;
    
    addChatMessage(message, true);
    input.value = '';
    showChatTyping();
    
    try {
        const response = await fetch('/api/chat/public', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });
        const data = await response.json();
        hideChatTyping();
        if (data.reply) {
            addChatMessage(data.reply, false);
        } else {
            addChatMessage('پاسخی دریافت نشد. لطفاً دوباره تلاش کنید.', false);
        }
    } catch (error) {
        console.error('Chat error:', error);
        hideChatTyping();
        addChatMessage('در حال حاضر چت‌بات در دسترس نیست. لطفاً بعداً تلاش کنید.', false);
    }
}

function sendQuickMessage(question) {
    const input = document.getElementById('chatbotInputFarz');
    if (input) input.value = question;
    sendChatMessage();
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

function addChatMessage(text, isUser) {
    const container = document.getElementById('chatbotMessagesFarz');
    if (!container) return;
    const div = document.createElement('div');
    div.className = isUser ? 'message-user-farz' : 'message-bot-farz';
    if (isUser) {
        div.innerHTML = '<div class="user-avatar-farz"><i class="fas fa-user"></i></div><div class="user-text-farz">' + escapeHtml(text) + '</div>';
    } else {
        div.innerHTML = '<div class="bot-avatar-farz"><i class="fas fa-robot"></i></div><div class="bot-text-farz">' + escapeHtml(text) + '</div>';
    }
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function showChatTyping() {
    const container = document.getElementById('chatbotMessagesFarz');
    if (!container) return;
    const existing = document.getElementById('typingIndicator');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = 'message-bot-farz';
    div.id = 'typingIndicator';
    div.innerHTML = '<div class="bot-avatar-farz"><i class="fas fa-robot"></i></div><div class="typing-farz"><span></span><span></span><span></span></div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function hideChatTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}


// ============================================
// ANIMATION COUNTERS
// ============================================

function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        if (isNaN(target)) return;
        const suffix = counter.getAttribute('data-suffix') || '';
        let count = 0;
        const step = Math.ceil(target / 60);
        const update = () => {
            count += step;
            if (count < target) {
                counter.innerText = count + suffix;
                requestAnimationFrame(update);
            } else {
                counter.innerText = target.toLocaleString('fa-IR') + suffix;
            }
        };
        update();
    });
}

// ============================================
// MOBILE MENU FUNCTIONS
// ============================================

function openMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-overlay');
    if (menu) menu.classList.add('active');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-overlay');
    if (menu) menu.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

function toggleAccordion(header) {
    const content = header.nextElementSibling;
    const icon = header.querySelector('.fa-chevron-down');
    if (content) content.classList.toggle('active');
    if (icon) {
        icon.style.transform = content && content.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0)';
    }
}

// ============================================
// SCROLL EFFECTS
// ============================================

function handleScrollEffects() {
    const header = document.getElementById('header');
    const scrollBtn = document.getElementById('scrollTop');
    
    if (header) {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }
    
    if (scrollBtn) {
        if (window.scrollY > 500) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    }
}

// ============================================
// TYPEWRITER EFFECT
// ============================================

function initTypewriter() {
    const texts = ["مدیریت یکپارچه مدارس", "هوشمندانه و حرفه‌ای", "سیستم پیشرفته آموزشی"];
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const typewriterEl = document.getElementById('typewriter');
    
    if (!typewriterEl) return;
    
    function typeWriter() {
        const currentText = texts[textIndex];
        if (isDeleting) {
            typewriterEl.innerHTML = currentText.substring(0, charIndex - 1) + '<span class="cursor" aria-hidden="true"></span>';
            charIndex--;
            if (charIndex === 0) {
                isDeleting = false;
                textIndex = (textIndex + 1) % texts.length;
            }
        } else {
            typewriterEl.innerHTML = currentText.substring(0, charIndex + 1) + '<span class="cursor" aria-hidden="true"></span>';
            charIndex++;
            if (charIndex === currentText.length) {
                isDeleting = true;
                setTimeout(typeWriter, 2000);
                return;
            }
        }
        setTimeout(typeWriter, isDeleting ? 70 : 120);
    }
    
    setTimeout(typeWriter, 500);
}

// ============================================
// INTERSECTION OBSERVER FOR COUNTERS
// ============================================

function initCounterObserver() {
    const statsSection = document.getElementById('stats');
    if (!statsSection) return;
    
    let animated = false;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !animated) {
                animated = true;
                animateCounters();
            }
        });
    }, { threshold: 0.5 });
    
    observer.observe(statsSection);
}

// ============================================
// CHATBOT INITIALIZATION
// ============================================
// ============================================
// CHATBOT INITIALIZATION
// ============================================

function initChatbot() {
    const chatBtn = document.getElementById('chatbotButtonFarz');
    const chatClose = document.getElementById('chatbotCloseFarz');
    
    if (chatBtn) {
        chatBtn.onclick = function(e) {
            e.stopPropagation();
            toggleChatPanel();
        };
    }
    if (chatClose) {
        chatClose.onclick = function() {
            closeChatPanel();
        };
    }
    
    // بستن چت با کلیک خارج از آن
    document.addEventListener('click', function(e) {
        const panel = document.getElementById('chatbotPanelFarz');
        const btn = document.getElementById('chatbotButtonFarz');
        if (panel && panel.classList.contains('active')) {
            if (!panel.contains(e.target) && btn && !btn.contains(e.target)) {
                closeChatPanel();
            }
        }
    });
    
    // بستن با کلید ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeChatPanel();
            closeMobileMenu();
        }
    });
}

// ============================================
// AOS INITIALIZATION
// ============================================

function initAOS() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
            offset: 100
        });
    }
}

// ============================================
// QURAN VERSE ROTATION (OPTIONAL)
// ============================================

const quranVerses = [
    {
        text: "اِقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ",
        translation: "بخوان به نام پروردگارت که آفرید",
        reference: "سوره علق (۹۶) - آیه ۱"
    },
    {
        text: "وَقُل رَّبِّ زِدْنِي عِلْمًا",
        translation: "و بگو پروردگارا بر دانشم بیفزای",
        reference: "سوره طه (۲۰) - آیه ۱۱۴"
    },
    {
        text: "يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ",
        translation: "خداوند کسانی را که ایمان آورده و کسانی را که علم داده شده، درجات بالایی می‌بخشد",
        reference: "سوره مجادله (۵۸) - آیه ۱۱"
    }
];

let verseIndex = 0;
function rotateQuranVerse() {
    const quranText = document.getElementById('quranText');
    const quranTranslation = document.getElementById('quranTranslation');
    const quranReference = document.getElementById('quranReference');
    
    if (!quranText) return;
    
    verseIndex = (verseIndex + 1) % quranVerses.length;
    const verse = quranVerses[verseIndex];
    
    quranText.style.opacity = '0';
    quranTranslation.style.opacity = '0';
    quranReference.style.opacity = '0';
    
    setTimeout(() => {
        if (quranText) quranText.textContent = verse.text;
        if (quranTranslation) quranTranslation.textContent = verse.translation;
        if (quranReference) quranReference.textContent = verse.reference;
        
        quranText.style.opacity = '1';
        quranTranslation.style.opacity = '1';
        quranReference.style.opacity = '1';
    }, 500);
}

// ============================================
// LOAD SETTINGS INTO SPECIFIC ELEMENTS
// ============================================

async function loadSettingsToElements() {
    try {
        const response = await fetch(`${API_BASE_URL}/settings`);
        const data = await response.json();
        
        if (data.success && data.settings) {
            const settings = data.settings;
            
            // بروزرسانی تمام عناصر دارای id مرتبط
            const elements = {
                schoolName: settings.school_name,
                schoolPhone: settings.school_phone,
                schoolAddress: settings.school_address,
                supportPhone: settings.support_phone,
                footerPhone: settings.school_phone,
                footerAddress: settings.school_address,
                footerSupport: settings.support_phone
            };
            
            for (const [id, value] of Object.entries(elements)) {
                const element = document.getElementById(id);
                if (element && value) element.textContent = value;
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// ============================================
// INITIALIZE ALL
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // بارگذاری داده‌ها از دیتابیس
    loadDataFromMySQL();
    loadSettingsToElements();
    
    // راه‌اندازی کامپوننت‌ها
    initTypewriter();
    initCounterObserver();
    initChatbot();
    initAOS();
    
    // افکت اسکرول
    window.addEventListener('scroll', handleScrollEffects);
    handleScrollEffects();
    
    // چرخش آیات قرآن (هر 10 ثانیه)
    setInterval(rotateQuranVerse, 10000);
    
    // بستن منو موبایل با کلیک روی لینک‌ها
    document.querySelectorAll('.mobile-nav a, .mobile-accordion-content a').forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });
});

// ============================================
// EXPORT GLOBAL FUNCTIONS
// ============================================

window.openMobileMenu = openMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.toggleAccordion = toggleAccordion;
window.toggleChatPanel = toggleChatPanel;
window.closeChatPanel = closeChatPanel;
window.sendChatMessage = sendChatMessage;
window.sendQuickMessage = sendQuickMessage;
window.handleChatKeyPress = handleChatKeyPress;
// ============================================
// PREMIUM HOMEPAGE SECTIONS - NEWS/GALLERY/CAROUSELS
// ============================================

const homepageDefaultNewsItems = [
    {
        title: 'آغاز ثبت‌نام دوره تابستانی رباتیک',
        summary: 'دوره‌های تخصصی رباتیک برای دانش‌آموزان علاقه‌مند در تابستان امسال برگزار می‌شود.',
        category: 'news',
        event_date: '2026-06-10',
        image_url: '/assets/images/homepage-final/news-robotics-feature.png',
        is_featured: 1,
        link_url: '#news-events'
    },
    {
        title: 'کسب مقام برتر در مسابقات برنامه‌نویسی',
        summary: 'تیم دانش‌آموزی ما در مسابقات کشوری برنامه‌نویسی موفق به کسب مقام اول شد.',
        category: 'success',
        event_date: '2026-05-28',
        image_url: '/assets/images/homepage-final/news-trophy.png',
        link_url: '#news-events'
    },
    {
        title: 'اطلاعیه جلسه اولیا و مربیان',
        summary: 'جلسه اولیا و مربیان در روز سه‌شنبه ساعت ۱۷ برگزار خواهد شد.',
        category: 'notice',
        event_date: '2026-05-16',
        image_url: '/assets/images/homepage-final/news-megaphone.png',
        link_url: '#news-events'
    },
    {
        title: 'کارگاه آموزشی هوش مصنوعی',
        summary: 'یک روز کارگاه عملی و پروژه‌محور برای دانش‌آموزان علاقه‌مند.',
        category: 'event',
        event_date: '2026-05-18',
        image_url: '/assets/images/homepage-final/news-ai-workshop.png',
        link_url: '#news-events'
    },
    {
        title: 'نمایشگاه هنر و خلاقیت دانش‌آموزان',
        summary: 'نمایش آثار هنری و پروژه‌های خلاقانه دانش‌آموزان در تالار مدرسه.',
        category: 'event',
        event_date: '2026-05-25',
        image_url: '/assets/images/homepage-final/news-art-exhibition.png',
        link_url: '#news-events'
    },
    {
        title: 'برگزاری جشنواره دستاوردهای دانش‌آموزی',
        summary: 'جشنواره سالانه معرفی پروژه‌ها و دستاوردهای برتر دانش‌آموزان.',
        category: 'event',
        event_date: '2026-05-22',
        image_url: '/assets/images/homepage-final/news-student-festival.png',
        link_url: '#news-events'
    }
];

const homepageDefaultGalleryItems = [
    { title: 'کلاس هوشمند', subtitle: 'محیط آموزشی پویا', category: 'educational', image_url: '/assets/images/homepage-final/gallery-smart-class.png', icon: 'fa-users' },
    { title: 'برنامه‌نویسی', subtitle: 'آموزش فناوری', category: 'technology', image_url: '/assets/images/homepage-final/gallery-programming.png', icon: 'fa-code' },
    { title: 'رباتیک', subtitle: 'پروژه‌های هوشمند', category: 'technology', image_url: '/assets/images/homepage-final/gallery-robotics.png', icon: 'fa-robot' },
    { title: 'قرآنی', subtitle: 'آموزش قرآن', category: 'quran', image_url: '/assets/images/homepage-final/gallery-quran.png', icon: 'fa-book-open' },
    { title: 'هنری', subtitle: 'خلاقیت دانش‌آموزان', category: 'art', image_url: '/assets/images/homepage-final/gallery-art.png', icon: 'fa-palette' },
    { title: 'ورزشی', subtitle: 'نشاط و مهارت', category: 'sports', image_url: '/assets/images/homepage-final/gallery-sports.png', icon: 'fa-futbol' },
    { title: 'کلاس پروژه', subtitle: 'یادگیری گروهی', category: 'educational', image_url: '/assets/images/homepage-final/gallery-smart-class-alt.png', icon: 'fa-chalkboard-user' },
    { title: 'لابراتوار کدنویسی', subtitle: 'تمرین عملی', category: 'technology', image_url: '/assets/images/homepage-final/gallery-programming-alt.png', icon: 'fa-laptop-code' },
    { title: 'مسابقات رباتیک', subtitle: 'تجربه ساخت', category: 'technology', image_url: '/assets/images/homepage-final/gallery-robotics-alt.png', icon: 'fa-microchip' }
];

let homepageGalleryItems = homepageDefaultGalleryItems.slice();
let homepageGalleryCarouselIndex = 0;
let homepageGalleryTimer = null;
let homepageCurrentGalleryFilter = 'all';
let homepageAllNewsItems = [];
let homepageCurrentNewsFilter = 'all';

function homepageEscape(value) {
    return String(value ?? '').replace(/[&<>"']/g, function(char) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
}


function trimHomepageNewsText(text, maxLength) {
    const cleanText = String(text || '').replace(/\s+/g, ' ').trim();
    if (cleanText.length <= maxLength) return cleanText;
    return `${cleanText.slice(0, maxLength).trim()}…`;
}

function homepageCategoryLabel(category) {
    const labels = { news: 'اخبار', event: 'رویدادها', notice: 'اطلاعیه‌ها', success: 'موفقیت‌ها' };
    return labels[category] || 'اخبار';
}

function homepageCategoryClass(category) {
    if (category === 'success') return 'success';
    if (category === 'notice') return 'notice';
    if (category === 'event') return 'event';
    return 'featured';
}

function homepageFormatDateParts(dateValue) {
    const fallback = { day: '—', month: 'به‌زودی', full: 'به‌زودی', iso: '' };
    if (!dateValue) return fallback;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return { ...fallback, full: homepageEscape(dateValue) };
    const parts = new Intl.DateTimeFormat('fa-IR', { day: '2-digit', month: 'long', year: 'numeric' }).formatToParts(date);
    const day = parts.find(part => part.type === 'day')?.value || '—';
    const month = parts.find(part => part.type === 'month')?.value || 'رویداد';
    const year = parts.find(part => part.type === 'year')?.value || '';
    return { day, month, full: `${year}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]), iso: date.toISOString().slice(0, 10) };
}

function normalizeHomepageNewsCategory(value, item = {}) {
    const raw = String(value || '').trim().toLowerCase();
    const faRaw = String(value || '').trim();
    if (['news', 'خبر', 'اخبار', 'article'].includes(raw) || ['خبر', 'اخبار'].includes(faRaw)) return 'news';
    if (['event', 'events', 'رویداد', 'رویدادها', 'calendar'].includes(raw) || ['رویداد', 'رویدادها'].includes(faRaw)) return 'event';
    if (['notice', 'notices', 'announcement', 'announcements', 'اطلاعیه', 'اطلاعیه‌ها', 'اطلاعیه ها'].includes(raw) || ['اطلاعیه', 'اطلاعیه‌ها', 'اطلاعیه ها'].includes(faRaw)) return 'notice';
    if (['success', 'successes', 'achievement', 'achievements', 'honor', 'honours', 'موفقیت', 'موفقیت‌ها', 'موفقیت ها', 'افتخار'].includes(raw) || ['موفقیت', 'موفقیت‌ها', 'موفقیت ها', 'افتخار'].includes(faRaw)) return 'success';
    if (item && item.priority === 'urgent') return 'notice';
    return 'news';
}

function normalizeHomepageNewsItem(item) {
    const fullContent = item.full_content || item.content || item.body || item.description || item.summary || 'جزئیات این خبر به‌زودی اعلام می‌شود.';
    return {
        title: item.title || 'خبر مدرسه',
        summary: item.summary || item.excerpt || fullContent || 'جزئیات این خبر به‌زودی اعلام می‌شود.',
        content: fullContent,
        category: normalizeHomepageNewsCategory(item.category || item.type || item.kind, item),
        event_date: item.event_date || item.created_at || item.updated_at,
        image_url: item.image_url || item.cover_image_url || '/assets/images/homepage-final/news-robotics-feature.png',
        link_url: item.link_url || '#news-events',
        is_featured: Number(item.is_featured || item.is_pinned || 0)
    };
}

function renderHomepageNewsMessage(title, description, icon = 'far fa-newspaper') {
    const container = document.getElementById('homepageNewsEvents');
    if (!container) return;
    container.className = 'homepage-news-final hn-count-0';
    container.innerHTML = `
        <div class="hn-empty">
            <i class="${icon}" aria-hidden="true"></i>
            <h3>${homepageEscape(title)}</h3>
            <p>${homepageEscape(description)}</p>
        </div>`;
}

function buildHomepageNewsVisibleItems() {
    const normalized = Array.isArray(homepageAllNewsItems) ? homepageAllNewsItems.slice() : [];
    const filtered = homepageCurrentNewsFilter === 'all'
        ? normalized
        : normalized.filter(item => item.category === homepageCurrentNewsFilter);
    return filtered
        .sort((a, b) => {
            const featuredDiff = Number(b.is_featured || 0) - Number(a.is_featured || 0);
            if (featuredDiff !== 0) return featuredDiff;
            const aTime = new Date(a.event_date || 0).getTime() || 0;
            const bTime = new Date(b.event_date || 0).getTime() || 0;
            return bTime - aTime;
        })
        .slice(0, 10);
}

function homepageNewsCardHTML(item, index) {
    const date = homepageFormatDateParts(item.event_date);
    const category = item.category || 'news';
    const isFeatured = Number(item.is_featured) === 1;
    const textLimit = isFeatured ? 135 : 78;
    const linkLabel = category === 'event' ? 'جزئیات رویداد' : category === 'notice' ? 'مشاهده اطلاعیه' : category === 'success' ? 'مشاهده موفقیت' : 'مشاهده خبر';
    const chipLabel = isFeatured ? 'خبر ویژه' : homepageCategoryLabel(category);
    return `
        <article class="hn-card hn-card-${index + 1}${isFeatured ? ' hn-featured' : ''}" data-category="${homepageEscape(category)}" data-news-index="${index}">
            <img class="hn-img" src="${homepageEscape(item.image_url)}" alt="${homepageEscape(item.title)}" loading="eager" decoding="async">
            <div class="hn-overlay"></div>
            <span class="hn-chip hn-chip-${homepageCategoryClass(category)}">${isFeatured ? '<i class="fas fa-star"></i> ' : ''}${chipLabel}</span>
            <div class="hn-date"><span>${date.day}</span><small>${date.month}</small></div>
            <div class="hn-body">
                <time${date.iso ? ` datetime="${date.iso}"` : ''}><i class="far fa-calendar"></i> ${date.full}</time>
                <h3>${homepageEscape(item.title)}</h3>
                <p>${homepageEscape(trimHomepageNewsText(item.summary, textLimit))}</p>
                <a href="#" class="hn-read-more" data-news-index="${index}" aria-label="نمایش کامل ${homepageEscape(item.title)}">${linkLabel} <i class="fas fa-arrow-left"></i></a>
            </div>
        </article>`;
}

function renderHomepageNewsGrid(items) {
    const container = document.getElementById('homepageNewsEvents');
    if (!container) return;

    const visibleItems = Array.isArray(items) ? items : [];

    if (!homepageAllNewsItems.length) {
        renderHomepageNewsMessage('هنوز خبری برای صفحه اصلی ثبت نشده است', 'این بخش فقط خبرهای ثبت‌شده در صفحه «اخبار صفحه اصلی» را نمایش می‌دهد.');
        return;
    }

    if (!container.querySelector('.hn-grid') || container.dataset.renderedNewsCount !== String(homepageAllNewsItems.length)) {
        container.dataset.renderedNewsCount = String(homepageAllNewsItems.length);
        container.innerHTML = `<div class="hn-grid" data-news-count="${homepageAllNewsItems.length}">${homepageAllNewsItems.map(homepageNewsCardHTML).join('')}</div>`;
    }

    updateHomepageNewsVisibleCards(visibleItems);
}

function updateHomepageNewsVisibleCards(visibleItems) {
    const container = document.getElementById('homepageNewsEvents');
    if (!container) return;
    const cards = Array.from(container.querySelectorAll('.hn-card'));
    const visibleIndexes = new Set((visibleItems || []).map(item => homepageAllNewsItems.indexOf(item)).filter(index => index >= 0));
    const count = visibleIndexes.size;

    Array.from(container.classList).forEach(cls => {
        if (cls.startsWith('hn-count-')) container.classList.remove(cls);
    });

    if (!count) {
        const activeLabel = document.querySelector(`.news-filter[data-news-filter="${homepageCurrentNewsFilter}"]`)?.textContent?.replace(/\s+/g, ' ').trim() || 'این دسته‌بندی';
        container.classList.add('homepage-news-final', 'hn-count-0');
        container.innerHTML = `
            <div class="hn-empty">
                <i class="fas fa-filter" aria-hidden="true"></i>
                <h3>${homepageEscape(`برای «${activeLabel}» موردی ثبت نشده است`)}</h3>
                <p>با انتخاب فیلتر «همه» همه خبرهای ثبت‌شده دوباره نمایش داده می‌شوند.</p>
            </div>`;
        container.dataset.renderedNewsCount = '';
        return;
    }

    container.classList.add('homepage-news-final', `hn-count-${count}`);
    const grid = container.querySelector('.hn-grid');
    if (grid) grid.dataset.newsCount = String(count);

    let slot = 1;
    cards.forEach(card => {
        card.classList.remove('hn-hidden');
        for (let i = 1; i <= 10; i += 1) card.classList.remove(`hn-card-${i}`);
        const index = Number(card.dataset.newsIndex);
        if (visibleIndexes.has(index)) {
            card.classList.add(`hn-card-${slot}`);
            slot += 1;
        } else {
            card.classList.add('hn-hidden');
        }
    });
}

function renderHomepageNewsEvents(items) {
    homepageAllNewsItems = Array.isArray(items)
        ? items.map(normalizeHomepageNewsItem).filter(item => item.title && item.summary).slice(0, 10)
        : [];
    const container = document.getElementById('homepageNewsEvents');
    if (container) container.dataset.renderedNewsCount = '';
    renderHomepageNewsGrid(buildHomepageNewsVisibleItems());
}


function extractHomepageNewsArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.news)) return data.news;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.homepage_news)) return data.homepage_news;
    if (Array.isArray(data?.data?.news)) return data.data.news;
    if (Array.isArray(data?.data?.items)) return data.data.items;
    return [];
}

function homepageNewsAuthHeaders() {
    try {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    } catch (_) {
        return {};
    }
}

async function loadHomepageNewsEvents() {
    try {
        const response = await fetch(`${API_BASE_URL}/homepage/news?limit=10&_=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });
        const data = await response.json().catch(() => ({}));
        let news = extractHomepageNewsArray(data);

        // fallback مخصوص زمان تست مدیر: اگر route عمومی به‌خاطر نسخه قدیمی سرور خالی برگشت،
        // از همان API پنل مدیر هم امتحان می‌کنیم. برای کاربران عادی این بخش اجرا نمی‌شود.
        if ((!data.success || !news.length) && homepageNewsAuthHeaders().Authorization) {
            const adminResponse = await fetch(`${API_BASE_URL}/admin/homepage-news?_=${Date.now()}`, {
                cache: 'no-store',
                headers: {
                    ...homepageNewsAuthHeaders(),
                    'Cache-Control': 'no-cache'
                }
            }).catch(() => null);
            if (adminResponse && adminResponse.ok) {
                const adminData = await adminResponse.json().catch(() => ({}));
                const adminNews = extractHomepageNewsArray(adminData)
                    .filter(item => Number(item?.is_active ?? 1) === 1)
                    .slice(0, 10);
                if (adminNews.length) news = adminNews;
            }
        }

        renderHomepageNewsEvents(news);
    } catch (error) {
        console.warn('Homepage news loading failed:', error);
        renderHomepageNewsEvents([]);
    }
}

function applyHomepageNewsFilter(filter) {
    homepageCurrentNewsFilter = filter || 'all';
    const container = document.getElementById('homepageNewsEvents');
    if (container && !container.querySelector('.hn-grid')) {
        container.dataset.renderedNewsCount = '';
    }
    renderHomepageNewsGrid(buildHomepageNewsVisibleItems());
}

function initHomepageNewsFilters() {
    document.querySelectorAll('.news-filter').forEach(button => {
        button.addEventListener('click', () => {
            const nextFilter = button.dataset.newsFilter || 'all';
            if (button.classList.contains('active') && homepageCurrentNewsFilter === nextFilter) return;
            document.querySelectorAll('.news-filter').forEach(item => item.classList.remove('active'));
            button.classList.add('active');
            applyHomepageNewsFilter(nextFilter);
        });
    });
}


function homepageNewsTextToHtml(text) {
    const clean = String(text || '').trim() || 'متن کامل این خبر هنوز ثبت نشده است.';
    return clean
        .split(/\n{2,}/)
        .map(part => part.trim())
        .filter(Boolean)
        .map(part => `<p>${homepageEscape(part).replace(/\n/g, '<br>')}</p>`)
        .join('');
}

function ensureHomepageNewsModal() {
    let modal = document.getElementById('homepageNewsModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'homepageNewsModal';
    modal.className = 'homepage-news-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
        <div class="hn-modal-backdrop" data-news-modal-close></div>
        <div class="hn-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="homepageNewsModalTitle" tabindex="-1">
            <button type="button" class="hn-modal-close" data-news-modal-close aria-label="بستن خبر"><i class="fas fa-times"></i></button>
            <div class="hn-modal-media"><img id="homepageNewsModalImage" src="" alt="" loading="lazy"></div>
            <div class="hn-modal-content">
                <div class="hn-modal-meta">
                    <span id="homepageNewsModalChip" class="hn-modal-chip">اخبار</span>
                    <time id="homepageNewsModalDate"></time>
                </div>
                <h3 id="homepageNewsModalTitle"></h3>
                <div class="hn-modal-text" id="homepageNewsModalText"></div>
            </div>
        </div>`;
    document.body.appendChild(modal);
    return modal;
}

function openHomepageNewsModal(index) {
    const item = homepageAllNewsItems[Number(index)];
    if (!item) return;
    const modal = ensureHomepageNewsModal();
    const date = homepageFormatDateParts(item.event_date);
    const image = modal.querySelector('#homepageNewsModalImage');
    const chip = modal.querySelector('#homepageNewsModalChip');
    const dateEl = modal.querySelector('#homepageNewsModalDate');
    const title = modal.querySelector('#homepageNewsModalTitle');
    const text = modal.querySelector('#homepageNewsModalText');
    const dialog = modal.querySelector('.hn-modal-dialog');

    if (image) {
        image.src = item.image_url || '/assets/images/homepage-final/news-robotics-feature.png';
        image.alt = item.title || 'خبر مدرسه';
    }
    if (chip) {
        chip.className = `hn-modal-chip hn-modal-${homepageCategoryClass(item.category)}`;
        chip.innerHTML = `${Number(item.is_featured) === 1 ? '<i class="fas fa-star"></i> ' : ''}${Number(item.is_featured) === 1 ? 'خبر ویژه' : homepageCategoryLabel(item.category)}`;
    }
    if (dateEl) {
        dateEl.textContent = date.full;
        if (date.iso) dateEl.setAttribute('datetime', date.iso);
        else dateEl.removeAttribute('datetime');
    }
    if (title) title.textContent = item.title || 'خبر مدرسه';
    if (text) text.innerHTML = homepageNewsTextToHtml(item.content || item.summary);

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('homepage-news-modal-open');
    setTimeout(() => dialog?.focus(), 20);
}

function closeHomepageNewsModal() {
    const modal = document.getElementById('homepageNewsModal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('homepage-news-modal-open');
}

function initHomepageNewsModal() {
    document.addEventListener('click', event => {
        const readMore = event.target.closest('.hn-read-more');
        if (readMore) {
            event.preventDefault();
            event.stopPropagation();
            openHomepageNewsModal(readMore.dataset.newsIndex);
            return;
        }
        if (event.target.closest('[data-news-modal-close]')) {
            event.preventDefault();
            closeHomepageNewsModal();
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeHomepageNewsModal();
    });
}

function normalizeHomepageGalleryItem(item) {
    return {
        title: item.title || 'تصویر مدرسه',
        subtitle: item.subtitle || item.alt_text || '',
        category: item.category || 'educational',
        image_url: item.image_url || '/assets/images/homepage-final/gallery-smart-class.png',
        icon: item.icon || 'fa-image'
    };
}

function setHomepageGalleryLayoutClass(count = 0) {
    const grid = document.getElementById('homepageGalleryGrid');
    if (!grid) return;
    Array.from(grid.classList).forEach(cls => {
        if (cls.startsWith('gallery-count-') || cls.startsWith('gallery-visible-')) grid.classList.remove(cls);
    });
    const safeCount = Math.max(0, Math.min(Number(count) || 0, 10));
    grid.classList.add(`gallery-count-${safeCount}`, `gallery-visible-${safeCount}`);
}

function renderHomepageGallery(items) {
    const grid = document.getElementById('homepageGalleryGrid');
    if (!grid) return;
    homepageGalleryItems = Array.isArray(items) ? items.map(normalizeHomepageGalleryItem).filter(item => item.title && item.image_url) : [];
    const visible = homepageGalleryItems.slice(0, 10);
    setHomepageGalleryLayoutClass(visible.length);
    if (!visible.length) {
        grid.innerHTML = `
            <div class="gallery-empty-state">
                <i class="fas fa-images"></i>
                <h3>هنوز تصویری برای گالری ثبت نشده است</h3>
                <p>تصاویر فعال ثبت‌شده در پنل مدیریت گالری، در این بخش نمایش داده می‌شوند.</p>
            </div>`;
        return;
    }
    grid.innerHTML = visible.map((item, index) => `
        <article class="gallery-item gallery-item-${index + 1}" data-gallery-category="${homepageEscape(item.category)}" tabindex="0">
            <img src="${homepageEscape(item.image_url)}" alt="${homepageEscape(item.alt_text || item.title)}" loading="lazy">
            <div class="gallery-overlay"><p>${homepageEscape(item.title)}</p><span><i class="fas ${homepageEscape(item.icon || 'fa-image')}"></i> ${homepageEscape(item.subtitle || 'مشاهده تصویر')}</span></div>
        </article>
    `).join('');
    applyHomepageGalleryFilter(homepageCurrentGalleryFilter);
}

async function loadHomepageGallery() {
    try {
        const response = await fetch(`${API_BASE_URL}/homepage/gallery?_=${Date.now()}`, { cache: 'no-store' });
        const data = await response.json();
        renderHomepageGallery(data.success && Array.isArray(data.gallery) ? data.gallery : []);
    } catch (error) {
        renderHomepageGallery([]);
    }
}

function applyHomepageGalleryFilter(filter) {
    homepageCurrentGalleryFilter = filter || 'all';
    const grid = document.getElementById('homepageGalleryGrid');
    if (!grid) return;
    let visibleCount = 0;
    grid.querySelectorAll('.gallery-item').forEach(item => {
        const show = homepageCurrentGalleryFilter === 'all' || item.dataset.galleryCategory === homepageCurrentGalleryFilter;
        item.style.display = show ? '' : 'none';
        if (show) visibleCount += 1;
    });
    if (grid.querySelector('.gallery-empty-state')) {
        setHomepageGalleryLayoutClass(0);
        return;
    }
    setHomepageGalleryLayoutClass(visibleCount);
    if (visibleCount === 0 && !grid.querySelector('.gallery-filter-empty')) {
        grid.insertAdjacentHTML('beforeend', '<div class="gallery-empty-state gallery-filter-empty"><i class="fas fa-filter"></i><h3>تصویری در این دسته نیست</h3><p>از پنل مدیریت گالری برای این دسته تصویر فعال ثبت کنید.</p></div>');
    } else if (visibleCount > 0) {
        grid.querySelector('.gallery-filter-empty')?.remove();
    }
}

function initHomepageGalleryFilters() {
    document.querySelectorAll('.gallery-filter').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.gallery-filter').forEach(item => item.classList.remove('active'));
            button.classList.add('active');
            applyHomepageGalleryFilter(button.dataset.galleryFilter || 'all');
        });
    });
}

function startHomepageGalleryCarousel() {
    // در نسخه جدید گالری با چیدمان ثابت ۱ تا ۱۰ تصویر نمایش داده می‌شود.
    // اسلایدر قدیمی غیرفعال است تا چیدمان انتخاب‌شده بهم نریزد.
    if (homepageGalleryTimer) clearInterval(homepageGalleryTimer);
    homepageGalleryTimer = null;
}


const homepageTestimonials = [
    {
        name: 'محمد حسینی',
        role: 'دانشجوی مهندسی کامپیوتر',
        avatar: '/assets/images/homepage-final/avatar-mohammad.png',
        text: 'هوش‌یار تجربه یادگیری من را کاملاً متحول کرد. توضیحات مفهومی، تمرین‌های هوشمند و بازخوردهای دقیق باعث شد در کمترین زمان بیشترین پیشرفت را داشته باشم.'
    },
    {
        name: 'علی رضایی',
        role: 'توسعه‌دهنده فرانت‌اند',
        avatar: '/assets/images/homepage-final/avatar-ali.png',
        text: 'محتوای آموزشی بسیار باکیفیت و کاربردی ارائه می‌دهد. پشتیبانی عالی و مسیرهای یادگیری شخصی‌سازی شده باعث شده همیشه انگیزه داشته باشیم.'
    },
    {
        name: 'سارا احمدی',
        role: 'طراح UI/UX',
        avatar: '/assets/images/homepage-final/avatar-sara.png',
        text: 'من با کمک‌های هوشمند این پلتفرم از پایه شروع کردم و الان به سطح خیلی خوبی رسیدم. پیشنهاد می‌کنم هر کسی که می‌خواهد حرفه‌ای یاد بگیرد امتحانش کند.'
    },
    {
        name: 'مریم احمدی',
        role: 'مشاور آموزشی',
        avatar: '/assets/images/homepage-final/avatar-sara.png',
        text: 'گزارش‌ها و داشبوردهای مدرسه باعث شد تصمیم‌گیری‌ها سریع‌تر و دقیق‌تر انجام شود و والدین هم بهتر در جریان وضعیت دانش‌آموزان باشند.'
    },
    {
        name: 'حسین کریمی',
        role: 'مدیر مدرسه',
        avatar: '/assets/images/homepage-final/avatar-mohammad.png',
        text: 'مدیریت کلاس‌ها، حضور و غیاب و ارتباط با خانواده‌ها در یک مسیر منظم قرار گرفت. تجربه استفاده برای تیم ما بسیار ساده و کاربردی بود.'
    }
];

function initTestimonialsCarousel() {
    const carousel = document.getElementById('testimonialsCarousel');
    const dots = Array.from(document.querySelectorAll('[data-testimonial-dot]'));
    if (!carousel) return;
    const cards = Array.from(carousel.querySelectorAll('[data-testimonial-card]'));
    if (cards.length < 3) return;
    let index = 0;

    function fillCard(card, testimonial, positionClass) {
        card.classList.remove('prev', 'next', 'active', 'testimonial-main', 'testimonial-side');
        if (positionClass === 'active') card.classList.add('testimonial-main', 'active');
        if (positionClass === 'prev') card.classList.add('testimonial-side', 'prev');
        if (positionClass === 'next') card.classList.add('testimonial-side', 'next');

        const text = card.querySelector('.testimonial-text');
        const name = card.querySelector('.testimonial-info h4');
        const role = card.querySelector('.testimonial-info p');
        const avatar = card.querySelector('.testimonial-author img');
        if (text) text.textContent = testimonial.text;
        if (name) name.textContent = testimonial.name;
        if (role) role.textContent = testimonial.role;
        if (avatar) {
            avatar.src = testimonial.avatar;
            avatar.alt = testimonial.name;
        }
    }

    function setActive(nextIndex) {
        index = (nextIndex + homepageTestimonials.length) % homepageTestimonials.length;
        const prev = (index - 1 + homepageTestimonials.length) % homepageTestimonials.length;
        const next = (index + 1) % homepageTestimonials.length;
        carousel.classList.add('is-changing');
        fillCard(cards[0], homepageTestimonials[prev], 'prev');
        fillCard(cards[1], homepageTestimonials[index], 'active');
        fillCard(cards[2], homepageTestimonials[next], 'next');
        dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
        setTimeout(() => carousel.classList.remove('is-changing'), 260);
    }

    dots.forEach(dot => dot.addEventListener('click', () => setActive(Number(dot.dataset.testimonialDot || 0))));
    setActive(0);
    setInterval(() => setActive(index + 1), 5600);
}

function initPremiumQuranVerses() {
    if (Array.isArray(quranVerses)) {
        quranVerses.splice(0, quranVerses.length,
            {
                text: 'يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ',
                translation: 'خداوند کسانی را که ایمان آورده و کسانی را که علم داده شده، درجات بالایی می‌بخشد.',
                reference: 'سوره مجادله (۵۸) - آیه ۱۱'
            },
            {
                text: 'وَقُل رَّبِّ زِدْنِي عِلْمًا',
                translation: 'و بگو پروردگارا بر دانشم بیفزای.',
                reference: 'سوره طه (۲۰) - آیه ۱۱۴'
            },
            {
                text: 'اِقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ',
                translation: 'بخوان به نام پروردگارت که آفرید.',
                reference: 'سوره علق (۹۶) - آیه ۱'
            }
        );
    }
}

function initHomepagePremiumSections() {
    initPremiumQuranVerses();
    initHomepageNewsFilters();
    initHomepageNewsModal();
    initHomepageGalleryFilters();
    loadHomepageNewsEvents();
    loadHomepageGallery().then(startHomepageGalleryCarousel);
    initTestimonialsCarousel();
}

document.addEventListener('DOMContentLoaded', initHomepagePremiumSections);
