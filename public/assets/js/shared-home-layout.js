(function () {
    'use strict';

    const VERSION = 'shared-home-layout-05';

    const TOP_BAR_HTML = `
    <!-- Top Bar -->
    <div class="top-bar" data-shared-home-layout="top-bar">
        <div class="container">
            <div class="top-bar-info">
                <span><i class="fas fa-phone-alt"></i> <a href="tel:02144706644" id="schoolPhone">۰۲۱-۴۴۷۰۶۶۴۴</a></span>
                <span class="hidden-mobile"><i class="fas fa-map-marker-alt"></i> <span id="schoolAddress">تهران، خیابان اصلی، مدیریت هوشمند</span></span>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span class="hidden-mobile">پشتیبان: <a href="tel:09106661386" id="supportPhone">۰۹۱۰۶۶۶۱۳۸۶</a></span>
                <a href="/pages/homepage/auth/login.html" class="top-bar-btn"><i class="fas fa-user"></i> ورود</a>
            </div>
        </div>
    </div>`;

    const HEADER_HTML = `
    <!-- Header -->
    <header class="main-header" id="header" data-shared-home-layout="header">
        <div class="container nav-container">
            <a href="/" class="logo">
                <div class="logo-icon logo-image-wrap"><img src="/public/assets/images/logo.png" alt="لوگوی مدرسه هوشمند فرزانگان" loading="eager" onerror="this.onerror=null;this.src='/assets/images/logo.png';"></div>
                <div class="logo-text">
                    <h1 id="schoolName">مدیریت هوشمند</h1>
                    <p>سیستم یکپارچه آموزشی</p>
                </div>
            </a>
            <nav class="desktop-nav">
                <a href="/" class="nav-link active" data-shared-nav="home">صفحه اصلی</a>
                <div class="has-dropdown">
                    <a href="/pages/homepage/services.html" class="nav-link" data-shared-nav="services">خدمات <i class="fas fa-chevron-down"></i></a>
                    <div class="dropdown">
                        <a href="/pages/homepage/services.html#technology"><i class="fas fa-laptop-code"></i> آموزش تکنولوژی</a>
                        <a href="/pages/homepage/services.html#counseling"><i class="fas fa-hand-holding-heart"></i> مشاوره و راهنمایی</a>
                        <a href="/pages/homepage/services.html#specialized"><i class="fas fa-star"></i> کلاس‌های تخصصی</a>
                    </div>
                </div>
                <a href="/pages/homepage/about.html" class="nav-link" data-shared-nav="about">درباره ما</a>
                <a href="/pages/homepage/timeline.html" class="nav-link" data-shared-nav="timeline">تاریخچه</a>
                <a href="/pages/homepage/faq.html" class="nav-link" data-shared-nav="faq">سوالات متداول</a>
                <a href="/pages/homepage/contact.html" class="nav-link" data-shared-nav="contact">ارتباط با ما</a>
            </nav>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div class="header-actions">
                    <a href="/pages/homepage/auth/register.html" class="btn btn-primary" style="text-decoration: none; padding: 0.6rem 1.2rem;">
                        <i class="fas fa-user-plus"></i> ثبت‌نام
                    </a>
                </div>
                <button class="mobile-toggle" onclick="openMobileMenu()"><i class="fas fa-bars"></i></button>
            </div>
        </div>
    </header>`;

    const MOBILE_MENU_HTML = `
    <!-- Mobile Menu -->
    <div class="mobile-overlay" id="mobile-overlay" onclick="closeMobileMenu()" data-shared-home-layout="mobile-overlay"></div>
    <div class="mobile-menu" id="mobile-menu" data-shared-home-layout="mobile-menu">
        <div class="mobile-menu-header">
            <div class="logo">
                <div class="logo-icon logo-image-wrap mobile-logo-image-wrap"><img src="/public/assets/images/logo.png" alt="لوگوی مدرسه هوشمند فرزانگان" loading="eager" onerror="this.onerror=null;this.src='/assets/images/logo.png';"></div>
                <div class="logo-text"><h1 style="color: white; font-size: 1rem;">مدیریت هوشمند</h1></div>
            </div>
            <button class="mobile-menu-close" onclick="closeMobileMenu()"><i class="fas fa-times"></i></button>
        </div>
        <nav class="mobile-nav">
            <a href="/" onclick="closeMobileMenu()"><i class="fas fa-home"></i> صفحه اصلی</a>
            <div class="mobile-accordion">
                <div class="mobile-accordion-header" onclick="toggleAccordion(this)"><span><i class="fas fa-concierge-bell"></i> خدمات</span><i class="fas fa-chevron-down"></i></div>
                <div class="mobile-accordion-content">
                    <a href="/pages/homepage/services.html#technology" onclick="closeMobileMenu()">آموزش تکنولوژی</a>
                    <a href="/pages/homepage/services.html#counseling" onclick="closeMobileMenu()">مشاوره و راهنمایی</a>
                    <a href="/pages/homepage/services.html#specialized" onclick="closeMobileMenu()">کلاس‌های تخصصی</a>
                </div>
            </div>
            <a href="/pages/homepage/about.html" onclick="closeMobileMenu()"><i class="fas fa-building"></i> درباره ما</a>
            <a href="/pages/homepage/timeline.html" onclick="closeMobileMenu()"><i class="fas fa-history"></i> تاریخچه</a>
            <a href="/pages/homepage/faq.html" onclick="closeMobileMenu()"><i class="fas fa-question-circle"></i> سوالات متداول</a>
            <a href="/pages/homepage/contact.html" onclick="closeMobileMenu()"><i class="fas fa-phone"></i> ارتباط با ما</a>
            <div class="mobile-cta">
                <a href="/login" class="btn btn-primary btn-full" onclick="closeMobileMenu()"><i class="fas fa-sign-in-alt"></i> ورود به سامانه</a>
            </div>
        </nav>
    </div>`;

    const FOOTER_HTML = `
    <!-- Footer -->
        <footer class="footer" data-shared-home-layout="footer">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
                    <div class="logo">
                        <div class="logo-icon logo-image-wrap footer-logo-image-wrap"><img src="/public/assets/images/logo.png" alt="لوگوی مدرسه هوشمند فرزانگان" loading="lazy" onerror="this.onerror=null;this.src='/public/assets/img/honors/school-logo.png';"></div>
                        <div class="logo-text"><h3>مدرسه هوشمند فرزانگان</h3><p>سیستم یکپارچه آموزشی</p></div>
                    </div>
                    <p>مدیریت هوشمند، پلتفرم جامع مدیریت مدارس با امکانات پیشرفته و پشتیبانی ۲۴ ساعته.</p>
                </div>
                <div class="footer-links">
                    <h4>دسترسی سریع</h4>
                    <ul>
                        <li><a href="/">صفحه اصلی</a></li>
                        <li><a href="/pages/homepage/services.html">خدمات</a></li>
                        <li><a href="/pages/homepage/about.html">درباره ما</a></li>
                        <li><a href="/pages/homepage/contact.html">تماس با ما</a></li>
                    </ul>
                </div>
                <div class="footer-links footer-systems">
                    <h4>سامانه‌ها</h4>
                    <ul class="systems-links-list">
                        <li><a href="/pages/homepage/auth/login.html">ورود به سامانه</a></li>
                        <li><a href="/register">ثبت‌نام</a></li>
                        <li><a href="https://my.medu.ir" target="_blank" rel="noopener">مای مدیو</a></li>
                        <li><a href="https://shad.ir" target="_blank" rel="noopener">شاد</a></li>
                        <li><a href="https://www.roshd.ir" target="_blank" rel="noopener">رشد</a></li>
                        <li><a href="https://www.irtextbook.ir" target="_blank" rel="noopener">کتاب‌های درسی</a></li>
                        <li><a href="https://hamgam.medu.ir" target="_blank" rel="noopener">همگام</a></li>
                        <li><a href="https://noorino.medu.ir" target="_blank" rel="noopener">نورینو</a></li>
                        <li><a href="https://snd.medu.ir" target="_blank" rel="noopener">سناد</a></li>
                        <li><a href="https://sida.medu.ir" target="_blank" rel="noopener">سیدا</a></li>
                    </ul>
                </div>
                <div class="footer-links footer-contact">
                    <h4>تماس با ما</h4>
                    <ul>
                        <li><i class="fas fa-map-marker-alt"></i><span id="footerAddress">تهران</span></li>
                        <li><i class="fas fa-phone"></i><span dir="ltr" id="footerPhone">۰۲۱-۴۴۷۰۶۶۴۴</span></li>
                        <li><i class="fas fa-mobile-alt"></i><span dir="ltr" id="footerSupport">۰۹۱۰۶۶۶۱۳۸۶</span></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom"><p>تمامی حقوق متعلق به مدیریت هوشمند می‌باشد.</p><div class="social-links social-links-apps"><a href="#" class="social-app-link" aria-label="شاد"><img src="/public/assets/img/honors/shad-icon.png" alt="شاد" loading="lazy"></a><a href="#" class="social-app-link" aria-label="بله"><img src="/public/assets/img/honors/bale-icon.png" alt="بله" loading="lazy"></a><a href="#" class="social-app-link" aria-label="ایتا"><img src="/public/assets/img/honors/eitaa-clean-icon.png" alt="ایتا" loading="lazy"></a></div></div>
        </div>
    </footer>`;

    const HEAD_LINKS = [
        { id: 'shared-home-fa-css', href: '/public/assets/css/all.min.css', rel: 'stylesheet' },
        { id: 'shared-home-main-css', href: `/public/assets/css/home page/homepage.css?v=${VERSION}`, rel: 'stylesheet' },
        { id: 'shared-home-responsive-css', href: `/public/assets/css/home page/responsive.css?v=${VERSION}`, rel: 'stylesheet' }
    ];

    function ensureStyles() {
        if (!document.head) return;
        const hrefs = Array.from(document.querySelectorAll('link[href]')).map(link => link.getAttribute('href') || '');
        const hasFontAwesome = hrefs.some(href => href.includes('/all.min.css') || href.includes('font-awesome') || href.includes('fontawesome'));
        const hasHomepage = hrefs.some(href => href.includes('/home page/homepage.css'));
        const hasResponsive = hrefs.some(href => href.includes('/home page/responsive.css'));
        const shouldAdd = link => {
            if (link.id === 'shared-home-fa-css') return !hasFontAwesome;
            if (link.id === 'shared-home-main-css') return !hasHomepage;
            if (link.id === 'shared-home-responsive-css') return !hasResponsive;
            return true;
        };
        HEAD_LINKS.filter(shouldAdd).forEach(linkData => {
            if (document.getElementById(linkData.id)) return;
            const link = document.createElement('link');
            link.id = linkData.id;
            link.rel = linkData.rel;
            link.href = linkData.href;
            document.head.appendChild(link);
        });
    }

    function removeLegacyLayout() {
        const selectors = [
            'body > .top-bar',
            'body > header.main-header',
            'body > .main-header',
            'body > .mobile-overlay',
            'body > .mobile-menu',
            'body > .simple-honor-header',
            'body > nav.navbar',
            'body > .navbar',
            'body > #honorsUnifiedHeader',
            'body > footer',
            'body > footer.footer',
            'body > #honorsUnifiedFooter',
            'body > #ol-fixed-footer',
            'body > .honors-footer'
        ].join(',');

        document.querySelectorAll(selectors).forEach(el => {
            if (el.hasAttribute('data-shared-home-layout')) return;
            el.remove();
        });
        document.querySelectorAll('[data-honors-header-hidden], [data-honors-footer-hidden]').forEach(el => {
            el.style.display = '';
            el.removeAttribute('data-honors-header-hidden');
            el.removeAttribute('data-honors-footer-hidden');
        });
    }

    function getFooterAnchor() {
        return document.getElementById('scrollTop') ||
            Array.from(document.querySelectorAll('body > script')).find(script => {
                const src = script.getAttribute('src') || '';
                return src.includes('shared-home-layout.js');
            }) ||
            document.querySelector('body > script') ||
            null;
    }

    function setActiveNav() {
        const path = window.location.pathname.replace(/\/+/g, '/').toLowerCase();
        let current = 'home';
        if (path.includes('/services')) current = 'services';
        else if (path.includes('/about')) current = 'about';
        else if (path.includes('/timeline')) current = 'timeline';
        else if (path.includes('/faq')) current = 'faq';
        else if (path.includes('/contact')) current = 'contact';
        else if (path.includes('/honorable/') || path.includes('/school-website')) current = '';

        document.querySelectorAll('.desktop-nav .nav-link').forEach(link => link.classList.remove('active'));
        if (current) {
            document.querySelector(`.desktop-nav .nav-link[data-shared-nav="${current}"]`)?.classList.add('active');
        }
    }

    function installSharedLayout() {
        if (!document.body) return;
        ensureStyles();
        removeLegacyLayout();

        if (!document.querySelector('[data-shared-home-layout="top-bar"]')) {
            document.body.insertAdjacentHTML('afterbegin', TOP_BAR_HTML);
        }
        if (!document.querySelector('[data-shared-home-layout="header"]')) {
            const topBar = document.querySelector('[data-shared-home-layout="top-bar"]');
            if (topBar) topBar.insertAdjacentHTML('afterend', HEADER_HTML);
            else document.body.insertAdjacentHTML('afterbegin', HEADER_HTML);
        }
        if (!document.querySelector('[data-shared-home-layout="mobile-overlay"]')) {
            const header = document.querySelector('[data-shared-home-layout="header"]');
            if (header) header.insertAdjacentHTML('afterend', MOBILE_MENU_HTML);
            else document.body.insertAdjacentHTML('afterbegin', MOBILE_MENU_HTML);
        }
        if (!document.querySelector('[data-shared-home-layout="footer"]')) {
            const anchor = getFooterAnchor();
            if (anchor) anchor.insertAdjacentHTML('beforebegin', FOOTER_HTML);
            else document.body.insertAdjacentHTML('beforeend', FOOTER_HTML);
        }

        setActiveNav();
        document.body.setAttribute('data-shared-home-layout-ready', VERSION);
        document.documentElement.classList.remove('about-no-fouc-loading');
        document.documentElement.classList.add('about-no-fouc-ready');
    }

    window.openMobileMenu = function () {
        document.getElementById('mobile-menu')?.classList.add('active');
        document.getElementById('mobile-overlay')?.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeMobileMenu = function () {
        document.getElementById('mobile-menu')?.classList.remove('active');
        document.getElementById('mobile-overlay')?.classList.remove('active');
        document.body.style.overflow = '';
    };

    window.toggleAccordion = function (header) {
        const content = header?.nextElementSibling;
        if (!content) return;
        content.classList.toggle('active');
        const icon = header.querySelector('.fa-chevron-down');
        if (icon) icon.style.transform = content.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0)';
    };

    window.SmartSchoolSharedLayout = {
        version: VERSION,
        install: installSharedLayout
    };

    if (document.body) {
        installSharedLayout();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installSharedLayout, { once: true });
    } else if (!document.body) {
        installSharedLayout();
    }

    window.addEventListener('load', function () {
        setTimeout(installSharedLayout, 250);
    });
})();
