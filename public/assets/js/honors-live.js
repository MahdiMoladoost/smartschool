(function () {
    'use strict';

    const VERSION = 'honors-real-data-73';

    const CATEGORY_META = {
        international_medalists: { title: 'مدال‌آوران رقابت‌های بین‌المللی', short: 'بین‌المللی', icon: 'fa-medal' },
        sampad_acceptance: { title: 'پذیرفته‌شدگان مدارس تیزهوشان', short: 'تیزهوشان', icon: 'fa-school-flag' },
        art_honors: { title: 'افتخارات هنری', short: 'هنری', icon: 'fa-palette' },
        programming_robotics: { title: 'برنامه‌نویسی و رباتیک', short: 'برنامه‌نویسی', icon: 'fa-robot' },
        martial_arts: { title: 'افتخارات رزمی', short: 'رزمی', icon: 'fa-user-ninja' },
        research_innovation: { title: 'پژوهش و نوآوری', short: 'پژوهش', icon: 'fa-lightbulb' }
    };

    const PAGE_META = {
        ijmo: {
            pageKey: 'ijmo',
            category: 'international_medalists',
            title: 'مدال‌آوران IJMO',
            subtitle: 'نمایش افتخارآفرینان ثبت‌شده در پنل مدیر برای المپیاد ریاضی نوجوانان آسیا',
            icon: 'fa-medal'
        },
        sasmo: {
            pageKey: 'sasmo',
            category: 'international_medalists',
            title: 'مدال‌آوران SASMO',
            subtitle: 'نمایش افتخارآفرینان ثبت‌شده در پنل مدیر برای المپیاد ریاضی سنگاپور و مدارس آسیایی',
            icon: 'fa-award'
        },
        waterloo: {
            pageKey: 'waterloo',
            category: 'international_medalists',
            title: 'مدال‌آوران Waterloo',
            subtitle: 'نمایش افتخارآفرینان ثبت‌شده در پنل مدیر برای مسابقات دانشگاه واترلو',
            icon: 'fa-trophy'
        },
        sampad: {
            pageKey: 'sampad',
            category: 'sampad_acceptance',
            title: 'پذیرفته‌شدگان مدارس تیزهوشان',
            subtitle: 'فقط دانش‌آموزانی که از پنل مدیر ثبت شده‌اند در این صفحه نمایش داده می‌شوند.',
            icon: 'fa-school-flag'
        },
        art_honors: {
            pageKey: 'art_honors',
            category: 'art_honors',
            title: 'افتخارات هنری',
            subtitle: 'نمایش برگزیدگان هنری ثبت‌شده در پنل مدیر.',
            icon: 'fa-palette'
        },
        programming_robotics: {
            pageKey: 'programming_robotics',
            category: 'programming_robotics',
            title: 'برنامه‌نویسی و رباتیک',
            subtitle: 'نمایش افتخارآفرینان فناوری، کدنویسی و رباتیک ثبت‌شده در پنل مدیر.',
            icon: 'fa-robot'
        },
        martial_arts: {
            pageKey: 'martial_arts',
            category: 'martial_arts',
            title: 'افتخارات رزمی',
            subtitle: 'نمایش قهرمانان و برگزیدگان رزمی ثبت‌شده در پنل مدیر.',
            icon: 'fa-user-ninja'
        },
        research_innovation: {
            pageKey: 'research_innovation',
            category: 'research_innovation',
            title: 'پژوهش و نوآوری',
            subtitle: 'نمایش دانش‌آموزان پژوهشگر و نوآور ثبت‌شده در پنل مدیر.',
            icon: 'fa-lightbulb'
        },
        international_hub: {
            pageKey: 'international_hub',
            category: 'international_medalists',
            title: 'مدال‌آوران مسابقات بین‌المللی',
            subtitle: 'برای مشاهده افتخارآفرینان هر مسابقه، روی پوستر مربوطه کلیک کنید.',
            icon: 'fa-globe',
            hub: true
        }
    };


    const HONOR_CARD_TEMPLATES = {
        blue: '/public/assets/images/honors/templates/template-blue.png',
        green: '/public/assets/images/honors/templates/template-green.png',
        gold: '/public/assets/images/honors/templates/template-gold.png',
        red: '/public/assets/images/honors/templates/template-red.png',
        purple: '/public/assets/images/honors/templates/template-purple.png'
    };

    const HUB_LINKS = [
        {
            pageKey: 'sasmo',
            title: 'SASMO',
            subtitle: 'المپیاد ریاضی سنگاپور و مدارس آسیایی',
            href: '/pages/homepage/Honorable/SASMO.html?page=sasmo',
            icon: 'fa-award',
            image: '/public/assets/images/olampiad/sasmo-hub-card.png'
        },
        {
            pageKey: 'ijmo',
            title: 'IJMO',
            subtitle: 'المپیاد ریاضی نوجوانان آسیا',
            href: '/pages/homepage/Honorable/IJMO.html?page=ijmo',
            icon: 'fa-medal',
            image: '/public/assets/images/olampiad/ijmo-hub-card.png'
        },
        {
            pageKey: 'waterloo',
            title: 'Waterloo',
            subtitle: 'مسابقات ریاضی دانشگاه واترلو',
            href: '/pages/homepage/Honorable/WATERLOO.html?page=waterloo',
            icon: 'fa-trophy',
            image: '/public/assets/images/olampiad/waterloo-hub-card.png'
        }
    ];

    const HOMEPAGE_LINKS = [
        { selector: 'a[aria-label*="رقابت‌های بین‌المللی"]', category: 'international_medalists', href: '/pages/homepage/Honorable/olampiad.html?page=international_hub' },
        { selector: 'a[aria-label*="تیزهوشان"]', category: 'sampad_acceptance', href: '/pages/homepage/Honorable/tizhoshan.html?page=sampad' },
        { selector: 'a[aria-label*="هنری"]', category: 'art_honors', href: '/pages/homepage/Honorable/art.html?page=art_honors' },
        { selector: 'a[aria-label*="برنامه"]', category: 'programming_robotics', href: '/pages/homepage/Honorable/programming-robotics.html?page=programming_robotics' },
        { selector: 'a[aria-label*="رزمی"]', category: 'martial_arts', href: '/pages/homepage/Honorable/martial-arts.html?page=martial_arts' },
        { selector: 'a[aria-label*="پژوهش"]', category: 'research_innovation', href: '/pages/homepage/Honorable/research-innovation.html?page=research_innovation' }
    ];

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
    }

    function escapeCssUrl(value) {
        return String(value ?? '').replace(/[\\"'\n\r]/g, ch => `\\${ch}`);
    }

    function toPersianNumber(value) {
        return String(value ?? 0).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
    }

    function normalizeText(value) {
        return String(value ?? '').replace(/\s+/g, ' ').trim();
    }

    function firstValue(...values) {
        for (const value of values) {
            if (Array.isArray(value)) {
                const joined = value.map(normalizeText).filter(Boolean).join('، ');
                if (joined) return joined;
                continue;
            }
            const text = normalizeText(value);
            if (text) return text;
        }
        return '';
    }

    function parseHonorDetails(item = {}) {
        const raw = item.details_json || item.details || '{}';
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
        try {
            const parsed = JSON.parse(String(raw || '{}'));
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch {
            return {};
        }
    }

    function resolvePageInfo() {
        const bodyPage = document.body?.dataset?.honorPage;
        if (bodyPage && PAGE_META[bodyPage]) return PAGE_META[bodyPage];

        const url = new URL(window.location.href);
        const explicitPage = url.searchParams.get('page') || url.searchParams.get('page_key');
        if (explicitPage && PAGE_META[explicitPage]) return PAGE_META[explicitPage];

        const explicitCategory = url.searchParams.get('category');
        if (explicitCategory) {
            const fallbackPage = explicitCategory === 'sampad_acceptance' ? 'sampad' : explicitCategory;
            if (PAGE_META[fallbackPage]) return PAGE_META[fallbackPage];
        }

        const path = decodeURIComponent(url.pathname).toLowerCase();
        if (path.includes('tizhoshan')) return PAGE_META.sampad;
        if (path.includes('sasmo')) return PAGE_META.sasmo;
        if (path.includes('waterloo')) return PAGE_META.waterloo;
        if (path.includes('ijmo')) return PAGE_META.ijmo;
        if (path.includes('art.html')) return PAGE_META.art_honors;
        if (path.includes('programming-robotics')) return PAGE_META.programming_robotics;
        if (path.includes('martial-arts')) return PAGE_META.martial_arts;
        if (path.includes('research-innovation')) return PAGE_META.research_innovation;
        if (path.includes('olampiad')) return PAGE_META.international_hub;
        return null;
    }

    function fetchHonors(info = {}) {
        const params = new URLSearchParams({ _: String(Date.now()) });
        if (info.category) params.set('category', info.category);
        if (info.pageKey && !info.hub && info.pageKey !== info.category) params.set('page_key', info.pageKey);
        return fetch(`/api/v1/homepage/honors?${params.toString()}`, { cache: 'no-store' }).then(response => {
            if (!response.ok) throw new Error('خطا در دریافت اطلاعات افتخارآفرینان');
            return response.json();
        });
    }

    function injectStyles() {
        if (document.getElementById('honors-live-real-data-styles')) return;
        const style = document.createElement('style');
        style.id = 'honors-live-real-data-styles';
        style.textContent = `

            body[data-honor-page]{background:#f6f8fc!important;color:#0f172a!important}
            .honors-live-page{direction:rtl;font-family:Vazirmatn,'Vazir','Shabnam',Tahoma,sans-serif;min-height:60vh;background:linear-gradient(180deg,#f8fbff 0%,#eef5ff 42%,#f8fafc 100%);padding-bottom:2rem;overflow:hidden}
            .honors-page-hero{position:relative;padding:4.1rem 1.25rem 3rem;text-align:center;background:radial-gradient(circle at 20% 10%,rgba(96,165,250,.34),transparent 32%),linear-gradient(135deg,#0f172a,#1d4ed8 54%,#0f766e);color:#fff;isolation:isolate}
            .honors-page-hero:before{content:"";position:absolute;inset:18px;border:1px solid rgba(255,255,255,.16);border-radius:36px;pointer-events:none;z-index:-1}
            .honors-hero-icon{width:82px;height:82px;border-radius:28px;display:grid;place-items:center;margin:0 auto 1.15rem;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);box-shadow:0 24px 60px rgba(0,0,0,.18);font-size:2rem;color:#fff}
            .honors-page-hero h1{margin:0;font-size:clamp(1.8rem,4vw,3.2rem);font-weight:950;line-height:1.45;color:#fff!important}
            .honors-page-hero p{margin:.7rem auto 0;max-width:780px;color:rgba(255,255,255,.86);font-weight:850;line-height:2;font-size:1rem}
            .honors-live-shell{width:min(1240px,calc(100% - 32px));margin:-2rem auto 0;position:relative;z-index:2;background:rgba(255,255,255,.78);backdrop-filter:blur(14px);border:1px solid rgba(219,234,254,.92);border-radius:34px;box-shadow:0 24px 80px rgba(15,23,42,.10);padding:2rem 1.25rem 2.4rem}
            .honors-loading,.honors-empty,.honors-error{grid-column:1/-1;text-align:center;padding:3.4rem 1rem;border-radius:28px;border:1px dashed #bfdbfe;background:linear-gradient(180deg,#fff,#f8fbff);color:#64748b;box-shadow:0 14px 42px rgba(15,23,42,.05)}
            .honors-loading i,.honors-empty i,.honors-error i{width:76px;height:76px;border-radius:26px;display:grid;place-items:center;margin:0 auto 1rem;background:#eff6ff;color:#2563eb;font-size:2rem}
            .honors-error i{background:#fef2f2;color:#dc2626}
            .honors-empty h3,.honors-error h3{margin:0 0 .65rem;color:#10213f;font-size:1.25rem;font-weight:950}
            .honors-empty p,.honors-error p,.honors-loading p{margin:0;line-height:2;font-weight:850;color:#64748b}
            .honors-dynamic-year-root{width:100%;display:block;direction:rtl}
            .honors-year-section{margin:0 auto 3.05rem;padding-top:.15rem}
            .honors-year-section:last-child{margin-bottom:0}
            .honors-year-head{width:100%;max-width:1040px;margin:0 auto 1.55rem;padding:0;background:none;border:none;border-radius:0;box-shadow:none;position:relative;overflow:visible;text-align:center;direction:rtl}
            .honors-year-head:before{content:"";position:absolute;left:50%;top:-7px;transform:translateX(-50%) rotate(45deg);width:7px;height:7px;background:#d0a04b;border-radius:1px;z-index:3;box-shadow:none}
            .honors-year-head:after{content:"";position:absolute;left:50%;top:34px;transform:translateX(-50%);width:min(840px,86vw);height:1px;background:linear-gradient(90deg,#c3974e 0,#c3974e 39%,transparent 39%,transparent 61%,#c3974e 61%,#c3974e 100%);opacity:.85;z-index:0}
            .honors-year-main{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:18px;width:100%;height:58px;direction:ltr}
            .honors-year-line{height:0;max-width:330px;flex:1;background:none;position:relative;opacity:1;border-top:1px solid #c3974e}
            .honors-year-line:before{content:"";position:absolute;top:-3px;width:5px;height:5px;border-radius:50%;background:#c3974e}
            .honors-year-line:first-child:before{left:0}.honors-year-line:last-child:before{right:0}
            .honors-year-title{position:relative;z-index:2;display:inline-flex;align-items:center;justify-content:center;flex-direction:row;gap:14px;width:196px;height:43px;padding:0 12px;border-radius:18px;background:#07152c;border:2px solid #d3a04b;color:#eec567;font-family:Vazirmatn,'Vazir','Shabnam',Tahoma,sans-serif;font-weight:800;font-size:26px;line-height:43px;letter-spacing:.14em;white-space:nowrap;box-sizing:border-box;box-shadow:0 3px 9px rgba(15,23,42,.14),inset 0 0 0 1px rgba(255,255,255,.12);direction:ltr}
            .honors-year-title:before{content:"";position:absolute;inset:3px;border-radius:14px;border:1px solid rgba(211,160,75,.42);pointer-events:none}
            .honors-year-title i{order:0;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:rgba(211,160,75,.11);color:#eec567;border:1px solid rgba(211,160,75,.72);box-shadow:none;font-size:14px;margin:0;line-height:1;flex:0 0 32px}
            .honors-year-title span{order:1;display:inline-block;min-width:86px;text-align:center;direction:ltr;unicode-bidi:isolate}
            .honors-year-count{display:block;margin:2px auto 0;padding:0;background:none;border:none;box-shadow:none;color:#7b8490;font-weight:700;font-size:11px;line-height:1.8;white-space:normal}
            .honors-live-grid{display:grid;grid-template-columns:repeat(auto-fit,300px);justify-content:center;gap:1.6rem;align-items:start}
            .honor-live-card{--accent:#2563eb;--honor-template:none;position:relative;width:300px;height:450px;min-width:300px;max-width:300px;min-height:450px;max-height:450px;margin-inline:auto;border-radius:20px;overflow:hidden;background-color:#fff;background-image:var(--honor-template),linear-gradient(180deg,var(--accent) 0 18%,#fff 18% 100%);background-size:100% 100%,100% 100%;background-position:center;background-repeat:no-repeat;box-shadow:0 14px 38px rgba(15,23,42,.14);transition:transform .22s ease,box-shadow .22s ease}
            .honor-live-card:hover{transform:translateY(-6px);box-shadow:0 28px 72px rgba(15,23,42,.18)}
            .honor-theme-default,.honor-theme-international_medalists,.honor-theme-sampad_acceptance,.honor-theme-programming_robotics{--accent:#2563eb;--field-border:rgba(37,99,235,.22);--chip-bg:#eff6ff}
            .honor-theme-sasmo,.honor-theme-martial_arts{--accent:#ef4444;--field-border:rgba(239,68,68,.22);--chip-bg:#fff2f2}
            .honor-theme-waterloo{--accent:#059669;--field-border:rgba(5,150,105,.22);--chip-bg:#ecfdf5}
            .honor-theme-ijmo,.honor-theme-research_innovation{--accent:#6d28d9;--field-border:rgba(109,40,217,.22);--chip-bg:#f5f3ff}
            .honor-theme-art_honors{--accent:#c58b10;--field-border:rgba(197,139,16,.22);--chip-bg:#fffbeb}
            .honor-card-overlay{position:absolute;inset:0;z-index:2}
            .honor-card-chip-stage{position:absolute;left:8.2%;top:24.95%;width:38.6%;height:17.1%;background:#fff;border-radius:18px;z-index:7;pointer-events:none;box-shadow:none}
            .honor-card-chip{position:absolute;left:10.6%;width:31.4%;height:5.55%;text-align:center;color:var(--accent);font-family:Vazirmatn,'Vazir','Shabnam',Tahoma,sans-serif;font-weight:950;font-size:13px;line-height:1.05;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:0 23px 0 12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-radius:999px;z-index:8;background:var(--chip-bg,#fff2f2);box-shadow:inset 0 0 0 1.35px var(--accent);isolation:isolate;letter-spacing:0;will-change:transform;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
            .honor-card-chip:before{display:none}
            .honor-card-chip-label{display:flex;align-items:center;justify-content:center;width:100%;height:100%;line-height:1.05;transform:none;max-width:100%;overflow:hidden;text-overflow:ellipsis;text-align:center}
            .honor-card-chip:after{content:"";position:absolute;right:10px;top:50%;transform:translateY(-50%);width:12px;height:12px;background:var(--accent);opacity:.92;-webkit-mask-repeat:no-repeat;-webkit-mask-position:center;-webkit-mask-size:contain;mask-repeat:no-repeat;mask-position:center;mask-size:contain}
            .honor-card-chip-year:after{-webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='5' width='18' height='16' rx='2' ry='2'/%3E%3Cline x1='16' y1='3' x2='16' y2='7'/%3E%3Cline x1='8' y1='3' x2='8' y2='7'/%3E%3Cline x1='3' y1='11' x2='21' y2='11'/%3E%3C/svg%3E");mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='5' width='18' height='16' rx='2' ry='2'/%3E%3Cline x1='16' y1='3' x2='16' y2='7'/%3E%3Cline x1='8' y1='3' x2='8' y2='7'/%3E%3Cline x1='3' y1='11' x2='21' y2='11'/%3E%3C/svg%3E")}
            .honor-card-chip-group:after{-webkit-mask-image:url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20fill%3D%27black%27%20fill-rule%3D%27evenodd%27%20d%3D%27M10.15%203.25h7.6a3%203%200%200%201%203%203v7.6c0%20.8-.32%201.56-.88%202.12l-6.72%206.72a2.75%202.75%200%200%201-3.89%200l-7.95-7.95a2.75%202.75%200%200%201%200-3.89l6.72-6.72a3%203%200%200%201%202.12-.88Zm6.35%206.5a2.25%202.25%200%201%200%200-4.5%202.25%202.25%200%200%200%200%204.5Z%27%2F%3E%3C%2Fsvg%3E");mask-image:url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20fill%3D%27black%27%20fill-rule%3D%27evenodd%27%20d%3D%27M10.15%203.25h7.6a3%203%200%200%201%203%203v7.6c0%20.8-.32%201.56-.88%202.12l-6.72%206.72a2.75%202.75%200%200%201-3.89%200l-7.95-7.95a2.75%202.75%200%200%201%200-3.89l6.72-6.72a3%203%200%200%201%202.12-.88Zm6.35%206.5a2.25%202.25%200%201%200%200-4.5%202.25%202.25%200%200%200%200%204.5Z%27%2F%3E%3C%2Fsvg%3E")}
            .honor-card-chip-year{top:26.2%}
            .honor-card-chip-group{top:33.45%}
            .honor-card-avatar-wrap{position:absolute;right:31px;top:98px;width:96px;height:96px;border-radius:50%;overflow:visible;background:#fff;z-index:3;display:block;padding:0;box-sizing:border-box;border:1.5px solid rgba(255,96,96,.92);box-shadow:0 0 0 5px #fff;clip-path:none;-webkit-clip-path:none}
            .honor-card-avatar-wrap:before{content:none}.honor-card-avatar{display:none}.honor-card-avatar-fill{position:absolute;inset:4.5px;border-radius:50%;overflow:hidden;background-color:transparent;background-image:var(--avatar-image);background-size:cover;background-position:center center;background-repeat:no-repeat;display:block}.honor-card-avatar-placeholder{box-shadow:0 0 0 5px #fff}.honor-card-avatar-placeholder .honor-card-avatar-fallback{position:absolute;inset:7.5px;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 50% 30%,#fbfcfd 0%,#eef2f6 58%,#e3e9ef 100%);box-shadow:inset 0 0 0 1px rgba(212,219,226,.82);display:block}.honor-card-avatar-placeholder .honor-card-avatar-fallback:before{content:"";position:absolute;left:50%;top:19px;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:linear-gradient(180deg,#d6dce3,#c8d0d9);box-shadow:0 2px 4px rgba(148,163,184,.14)}.honor-card-avatar-placeholder .honor-card-avatar-fallback:after{content:"";position:absolute;left:50%;bottom:12px;width:40px;height:28px;margin-left:-20px;border-radius:40px 40px 16px 16px;background:linear-gradient(180deg,#d8dee6,#c8d0d9);box-shadow:0 -1px 0 rgba(255,255,255,.42) inset}
            .honor-card-name{position:absolute;left:10%;right:10%;top:43.8%;margin:0;text-align:center;color:#07152c;font-size:21px;font-weight:950;line-height:1.18;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:3}
            .honor-card-title{position:absolute;left:8%;right:8%;top:50.2%;height:26px;margin:0;text-align:center;color:var(--accent);font-size:11px;font-weight:850;line-height:1.28;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;z-index:3}
            .honor-card-fields{position:absolute;left:24px;right:24px;top:272px;height:122px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:56px 56px;gap:8px;z-index:7;direction:rtl;isolation:isolate;box-sizing:border-box}
            .honor-card-fields:before{content:"";position:absolute;inset:-16px 2px -8px;background:#fff;border-radius:18px;z-index:-1;box-shadow:0 0 0 1px rgba(255,255,255,.82)}
            .honor-card-field{position:relative!important;inset:auto!important;left:auto!important;top:auto!important;width:100%!important;height:auto!important;min-width:0;max-width:100%;color:#0f172a;box-sizing:border-box;border-radius:10px;background:#fff;border:1px solid var(--field-border, rgba(37,99,235,.22));box-shadow:none;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:4px 8px;isolation:isolate}
            .honor-card-field:before{content:"";position:absolute;inset:0;background:#fff;z-index:-1}
            .honor-card-field-label{display:block;width:100%;text-align:center;color:var(--accent);font-size:9.5px;font-weight:950;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-inline:2px;box-sizing:border-box}
            .honor-card-field-value{display:block;width:100%;text-align:center;color:#0f172a;font-size:12.4px;font-weight:900;line-height:1.16;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-inline:2px;box-sizing:border-box}
            .honors-hub-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.25rem;align-items:stretch}
            .honors-hub-poster{display:block;overflow:hidden;border-radius:34px;background:#fff;border:1px solid #e5edf7;box-shadow:0 18px 48px rgba(15,23,42,.10);text-decoration:none;transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease}
            .honors-hub-poster:hover{transform:translateY(-6px);box-shadow:0 30px 70px rgba(15,23,42,.16);border-color:#cbdcf8}
            .honors-hub-poster img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;background:#fff}
            @media(max-width:860px){.honors-live-grid{grid-template-columns:repeat(auto-fit,300px)}}
            @media(max-width:700px){.honors-live-shell{width:calc(100% - 18px);border-radius:26px;padding:1.2rem .72rem 1.6rem}.honors-page-hero{padding:3.2rem 1rem 2.5rem}.honors-year-head{padding-inline:0}.honors-year-head:after{width:92vw}.honors-year-main{gap:10px}.honors-year-line{max-width:95px}.honors-year-title{width:174px;height:40px;font-size:22px;padding-inline:10px}.honors-year-title i{width:29px;height:29px;font-size:12px}.honors-year-title span{min-width:72px}.honors-live-grid{grid-template-columns:repeat(auto-fit,300px);justify-content:center}.honor-live-card{width:300px;height:450px;min-width:300px;max-width:300px;min-height:450px;max-height:450px}.honors-hub-grid{grid-template-columns:1fr}}
        `;
        document.head.appendChild(style);
    }

    function ensurePageShell(info) {
        injectStyles();
        let root = document.getElementById('honorsDynamicYearRoot');
        if (!root) {
            const main = document.querySelector('main') || document.body;
            main.insertAdjacentHTML('beforeend', `<section class="honors-live-shell"><div id="honorsDynamicYearRoot" class="honors-dynamic-year-root"></div></section>`);
            root = document.getElementById('honorsDynamicYearRoot');
        }
        const heroTitle = document.querySelector('[data-honors-title]');
        const heroSubtitle = document.querySelector('[data-honors-subtitle]');
        const heroIcon = document.querySelector('[data-honors-icon]');
        if (heroTitle && info?.title) heroTitle.textContent = info.title;
        if (heroSubtitle && info?.subtitle) heroSubtitle.textContent = info.subtitle;
        if (heroIcon && info?.icon) heroIcon.className = `fas ${info.icon}`;
        return root;
    }

    function loadingHtml() {
        return `<div class="honors-loading"><i class="fas fa-spinner fa-spin"></i><p>در حال خواندن افتخارآفرینان ثبت‌شده از پنل مدیر...</p></div>`;
    }

    function emptyState(info) {
        return `<div class="honors-empty"><i class="fas ${escapeHtml(info?.icon || 'fa-trophy')}"></i><h3>هنوز افتخارآفرینی ثبت نشده است</h3><p>برای بخش «${escapeHtml(info?.title || 'افتخارآفرینان')}» هیچ رکورد فعالی در پنل مدیر وجود ندارد.</p></div>`;
    }

    function errorState(message) {
        return `<div class="honors-error"><i class="fas fa-circle-exclamation"></i><h3>نمایش افتخارآفرینان انجام نشد</h3><p>${escapeHtml(message || 'خطای نامشخص')}</p></div>`;
    }

    function honorYear(item = {}) {
        const details = parseHonorDetails(item);
        const faToEnDigits = value => normalizeText(value).replace(/[۰-۹٠-٩]/g, digit => {
            const fa = '۰۱۲۳۴۵۶۷۸۹';
            const ar = '٠١٢٣٤٥٦٧٨٩';
            const faIndex = fa.indexOf(digit);
            if (faIndex > -1) return String(faIndex);
            const arIndex = ar.indexOf(digit);
            return arIndex > -1 ? String(arIndex) : digit;
        });
        const extractYear = value => {
            const text = faToEnDigits(value);
            if (!text) return '';
            let match = text.match(/14\d{2}/);
            if (match) return match[0];
            match = text.match(/20\d{2}/);
            return match ? match[0] : '';
        };

        const explicitYearCandidates = [
            details.competition_year,
            details.contest_year,
            details.event_year,
            details.olympiad_year,
            details.exam_year,
            details.award_year,
            details.year,
            details.jalali_year,
            details.persian_year,
            item.competition_year,
            item.contest_year,
            item.event_year,
            item.olympiad_year,
            item.exam_year,
            item.award_year,
            item.year
        ];
        for (const candidate of explicitYearCandidates) {
            const year = extractYear(candidate);
            if (year) return year;
        }

        const dateCandidates = [
            details.competition_date,
            details.contest_date,
            details.event_date,
            details.award_date,
            details.academic_year,
            details.school_year,
            item.award_date
        ];
        for (const candidate of dateCandidates) {
            const year = extractYear(candidate);
            if (year) return year;
        }

        const fallbackCandidates = [
            item.created_at,
            item.updated_at
        ];
        for (const candidate of fallbackCandidates) {
            const year = extractYear(candidate);
            if (year) return year;
        }

        return 'بدون سال';
    }

    function sortYearGroups(groups) {
        return Array.from(groups.entries()).sort((a, b) => {
            const an = Number(String(a[0]).replace(/\D/g, ''));
            const bn = Number(String(b[0]).replace(/\D/g, ''));
            if (Number.isFinite(an) && Number.isFinite(bn) && an && bn) return bn - an;
            return String(b[0]).localeCompare(String(a[0]), 'fa');
        });
    }

    function groupHonorsByYear(honors = []) {
        const groups = new Map();
        honors.forEach(item => {
            const year = honorYear(item);
            if (!groups.has(year)) groups.set(year, []);
            groups.get(year).push(item);
        });
        return sortYearGroups(groups);
    }

    function cardRows(item, details) {
        const rows = [];
        const category = item.category;
        const className = firstValue(details.class_name, details.grade, details.school_grade, details.class_level, item.class_name, item.achievement_level);
        const level = firstValue(details.level, details.stage, details.competition_stage, details.round, details.exam_stage, item.achievement_level);
        if (className) rows.push(['پایه / کلاس', className]);

        if (category === 'international_medalists') {
            rows.push(['المپیاد', firstValue(details.olympiad_type, details.olympiad, item.achievement_title, 'بین‌المللی')]);
            rows.push(['دستاورد', firstValue(details.medal_type, details.place, item.rank_title, item.achievement_title)]);
            if (level) rows.push(['مرحله / سطح', level]);
        } else if (category === 'sampad_acceptance') {
            rows.push(['آزمون', firstValue(details.exam_type, item.achievement_title, 'سمپاد')]);
            rows.push(['دستاورد', firstValue(item.rank_title, details.rank ? `رتبه ${details.rank}` : '', item.achievement_title)]);
            if (level) rows.push(['مرحله / سطح', level]);
        } else if (category === 'art_honors') {
            rows.push(['رشته هنری', firstValue(details.art_type, item.achievement_title, 'هنری')]);
            rows.push(['دستاورد', firstValue(details.place, item.rank_title, item.achievement_title)]);
            if (level) rows.push(['سطح', level]);
        } else if (category === 'programming_robotics') {
            rows.push(['نوع رویداد', firstValue(details.competition_type, item.achievement_title, 'برنامه‌نویسی و رباتیک')]);
            const tech = Array.isArray(details.technologies) ? details.technologies : details.technology;
            rows.push(['فناوری / حوزه', firstValue(tech, details.field, item.achievement_level)]);
            rows.push(['دستاورد', firstValue(details.place, item.rank_title, item.achievement_title)]);
        } else if (category === 'martial_arts') {
            rows.push(['رشته', firstValue(details.sport_type, item.achievement_title, 'رزمی')]);
            rows.push(['رده', firstValue(details.weight_age, details.age_group, level)]);
            rows.push(['دستاورد', firstValue(details.place, item.rank_title, item.achievement_title)]);
        } else {
            rows.push(['نوع فعالیت', firstValue(details.activity_type, item.achievement_title, 'پژوهش')]);
            rows.push(['حوزه', firstValue(details.science_field, details.field, level)]);
            rows.push(['دستاورد', firstValue(details.place, item.rank_title, item.achievement_title)]);
        }

        const annualIndex = firstValue(details.annual_achievement_number, details.achievement_number, details.sequence_in_year, details.honor_sequence, details.year_rank);
        if (annualIndex) rows.push(['شماره دستاورد سال', annualIndex]);
        return rows.filter(([, value]) => normalizeText(value));
    }

    function initials(name = '') {
        const text = normalizeText(name);
        return text ? text[0] : '؟';
    }

    function inferThemeKey(item = {}, info = null, details = null) {
        if (info?.pageKey && ['sasmo', 'ijmo', 'waterloo'].includes(info.pageKey)) return info.pageKey;
        const parsed = details || parseHonorDetails(item);
        const combined = [item.achievement_title, item.rank_title, parsed.olympiad_type, parsed.olympiad].map(normalizeText).join(' ').toLowerCase();
        if (combined.includes('sasmo')) return 'sasmo';
        if (combined.includes('ijmo')) return 'ijmo';
        if (combined.includes('waterloo')) return 'waterloo';
        return item.category || 'international_medalists';
    }



    function templateColorKey(theme = 'default') {
        if (theme === 'waterloo') return 'green';
        if (theme === 'art_honors') return 'gold';
        if (theme === 'sasmo' || theme === 'martial_arts') return 'red';
        if (theme === 'ijmo' || theme === 'research_innovation') return 'purple';
        return 'blue';
    }

    function templateImageForTheme(theme = 'default') {
        const key = templateColorKey(theme);
        return HONOR_CARD_TEMPLATES[key] || HONOR_CARD_TEMPLATES.blue;
    }

    function themeDisplayLabel(item = {}, info = null, details = null) {
        const parsed = details || parseHonorDetails(item);
        if (info?.pageKey === 'sasmo') return 'SASMO';
        if (info?.pageKey === 'ijmo') return 'IJMO';
        if (info?.pageKey === 'waterloo') return 'Waterloo';
        const olympiad = firstValue(parsed.olympiad_type, parsed.olympiad);
        if (olympiad) return olympiad;
        return CATEGORY_META[item.category]?.short || 'افتخار';
    }

    function fieldIcon(label = '') {
        const text = normalizeText(label);
        if (text.includes('پایه') || text.includes('کلاس')) return 'fa-graduation-cap';
        if (text.includes('المپیاد') || text.includes('آزمون') || text.includes('نوع رویداد') || text.includes('رشته هنری') || text.includes('نوع فعالیت') || text.includes('رشته')) return 'fa-trophy';
        if (text.includes('دستاورد')) return 'fa-medal';
        if (text.includes('مرحله') || text.includes('سطح') || text.includes('رده') || text.includes('حوزه') || text.includes('فناوری')) return 'fa-signal';
        if (text.includes('سال')) return 'fa-calendar-alt';
        return 'fa-award';
    }

    function preferredRowLabels(category) {
        if (category === 'international_medalists') return ['پایه / کلاس', 'المپیاد', 'دستاورد', 'مرحله / سطح'];
        if (category === 'sampad_acceptance') return ['پایه / کلاس', 'آزمون', 'دستاورد', 'مرحله / سطح'];
        if (category === 'art_honors') return ['پایه / کلاس', 'رشته هنری', 'دستاورد', 'سطح'];
        if (category === 'programming_robotics') return ['پایه / کلاس', 'نوع رویداد', 'فناوری / حوزه', 'دستاورد'];
        if (category === 'martial_arts') return ['پایه / کلاس', 'رشته', 'دستاورد', 'رده'];
        return ['پایه / کلاس', 'نوع فعالیت', 'حوزه', 'دستاورد'];
    }

    function buildCardFields(item = {}, details = {}, info = null) {
        const rows = cardRows(item, details).map(([label, value]) => ({ label, value }));
        const preferred = preferredRowLabels(item.category);
        const selected = [];
        preferred.forEach(label => {
            const found = rows.find(row => row.label === label);
            if (found && !selected.some(entry => entry.label === found.label && entry.value === found.value)) selected.push(found);
        });
        rows.forEach(row => {
            if (selected.length >= 4) return;
            if (!selected.some(entry => entry.label === row.label && entry.value === row.value)) selected.push(row);
        });
        const fallbacks = [
            { label: 'سال / دوره', value: honorYear(item) },
            { label: 'دسته / حوزه', value: themeDisplayLabel(item, info, details) }
        ];
        fallbacks.forEach(row => {
            if (selected.length < 4 && normalizeText(row.value) && !selected.some(entry => entry.label === row.label)) selected.push(row);
        });
        return selected.slice(0, 4).map((row, index) => ({ label: row.label || ['پایه / کلاس','المپیاد','دستاورد','مرحله / سطح'][index] || 'اطلاعات', value: row.value || '---' }));
    }


    function compactFieldLabel(label = '') {
        const text = normalizeText(label);
        if (text.includes('پایه')) return 'پایه';
        if (text.includes('مرحله')) return 'مرحله';
        if (text.includes('دستاورد')) return 'دستاورد';
        if (text.includes('المپیاد')) return 'المپیاد';
        if (text.includes('آزمون')) return 'آزمون';
        if (text.includes('رشته')) return 'رشته';
        if (text.includes('فناوری') || text.includes('حوزه')) return 'حوزه';
        if (text.includes('رویداد')) return 'رویداد';
        if (text.includes('رده')) return 'رده';
        if (text.includes('سال')) return 'سال';
        return text.length > 9 ? `${text.slice(0, 8)}…` : text;
    }

    function compactFieldValue(value = '', label = '', item = {}, info = null) {
        let text = normalizeText(value);
        const field = normalizeText(label);
        const category = item.category || info?.category || '';
        if (!text) return '---';

        if (category === 'sampad_acceptance') {
            if (field.includes('آزمون')) {
                if (text.includes('تیزهوشان')) return 'تیزهوشان';
                if (text.includes('سمپاد')) return 'سمپاد';
                if (text.includes('نمونه')) return 'نمونه دولتی';
                return text.replace(/^آزمون\s*/,'').replace(/^ورودی\s*/,'') || text;
            }
            if (field.includes('مرحله') || field.includes('سطح')) {
                const stage = text.split(/[-–—،,]/)[0].trim();
                if (stage) return stage;
            }
        }

        if (category === 'programming_robotics' && (field.includes('رویداد') || field.includes('فناوری'))) {
            if (text.includes('رباتیک')) return 'رباتیک';
            if (text.includes('برنامه')) return 'برنامه‌نویسی';
        }

        if (category === 'research_innovation' && field.includes('حوزه')) {
            if (text.includes('نوآوری')) return 'نوآوری';
            if (text.includes('پژوهش')) return 'پژوهش';
        }

        text = text
            .replace(/^افتخارآفرینی\s+در\s+/,'')
            .replace(/^پذیرفته‌شده\s+/, '')
            .replace(/^آزمون\s+ورودی\s+/, '')
            .replace(/^مسابقات\s+/, '')
            .trim();

        if (text.length <= 15) return text;
        const cut = text.slice(0, 14).replace(/\s+\S*$/, '').trim();
        return `${cut || text.slice(0, 14)}…`;
    }

    function honorCard(item = {}, info = null) {
        const details = parseHonorDetails(item);
        const year = honorYear(item);
        const title = firstValue(item.achievement_title, item.rank_title, CATEGORY_META[item.category]?.title, 'افتخار ثبت‌شده');
        const imageSrc = firstValue(item.avatar_url, item.profile_photo, item.profile_image, item.photo);
        const rows = buildCardFields(item, details, info);
        while (rows.length < 4) rows.push({ label: 'اطلاعات', value: '---' });
        const theme = inferThemeKey(item, info, details) || 'default';
        const groupText = themeDisplayLabel(item, info, details);
        const templateSrc = templateImageForTheme(theme);
        const avatar = imageSrc ? `<div class="honor-card-avatar-wrap" role="img" aria-label="تصویر ${escapeHtml(item.student_name || 'دانش‌آموز')}"><div class="honor-card-avatar-fill" style="--avatar-image:url('${escapeCssUrl(imageSrc)}')"></div></div>` : `<div class="honor-card-avatar-wrap honor-card-avatar-placeholder" aria-hidden="true"><div class="honor-card-avatar-fallback"></div></div>`;
        return `
            <article class="honor-live-card honor-theme-${escapeHtml(theme)}" data-honor-id="${escapeHtml(item.id || '')}" style="--honor-template:url('${escapeHtml(templateSrc)}')">
                <div class="honor-card-overlay">
                    <div class="honor-card-chip-stage" aria-hidden="true"></div>
                    <div class="honor-card-chip honor-card-chip-year"><span class="honor-card-chip-label">${escapeHtml(toPersianNumber(year))}</span></div>
                    <div class="honor-card-chip honor-card-chip-group"><span class="honor-card-chip-label">${escapeHtml(toPersianNumber(groupText))}</span></div>
                    ${avatar}
                    <h3 class="honor-card-name">${escapeHtml(item.student_name || 'دانش‌آموز')}</h3>
                    <p class="honor-card-title">${escapeHtml(toPersianNumber(title))}</p>
                    <div class="honor-card-fields">
                        ${rows.slice(0,4).map((row, index) => `<div class="honor-card-field field-${index+1}"><span class="honor-card-field-label">${escapeHtml(compactFieldLabel(row.label))}</span><span class="honor-card-field-value">${escapeHtml(toPersianNumber(compactFieldValue(row.value, row.label, item, info)))}</span></div>`).join('')}
                    </div>
                </div>
            </article>`;
    }

    function renderListPage(info, payload) {
        const root = ensurePageShell(info);
        const honors = Array.isArray(payload?.honors) ? payload.honors.filter(item => Number(item?.is_active) !== 0) : [];
        if (!honors.length) {
            root.innerHTML = emptyState(info);
            return;
        }
        root.innerHTML = groupHonorsByYear(honors).map(([year, items]) => `
            <section class="honors-year-section" data-year="${escapeHtml(year)}">
                <div class="honors-year-head">
                    <div class="honors-year-main">
                        <span class="honors-year-line" aria-hidden="true"></span>
                        <div class="honors-year-title"><i class="fas fa-trophy"></i><span>${escapeHtml(String(year))}</span></div>
                        <span class="honors-year-line" aria-hidden="true"></span>
                    </div>
                    <div class="honors-year-count">افتخارآفرینان ثبت‌شده در این سال تحصیلی</div>
                </div>
                <div class="honors-live-grid">${items.map(item => honorCard(item, info)).join('')}</div>
            </section>
        `).join('');
    }

    function renderHubPage(info, payload) {
        const root = ensurePageShell(info);
        root.innerHTML = `
            <div class="honors-hub-grid">
                ${HUB_LINKS.map(link => `<a class="honors-hub-poster" href="${escapeHtml(link.href)}" aria-label="${escapeHtml(link.title)}">
                    <img src="${escapeHtml(link.image)}" alt="${escapeHtml(link.title)}" loading="lazy">
                </a>`).join('')}
            </div>`;
    }

    function applyMainHomepageLinks(payload) {
        if (!document.querySelector('.honorees-reference-grid')) return;
        const counts = payload?.counts || {};
        HOMEPAGE_LINKS.forEach(link => {
            let anchors = [];
            try { anchors = Array.from(document.querySelectorAll(link.selector)); } catch { anchors = []; }
            anchors.forEach(anchor => {
                if (!anchor || anchor.dataset.honorsLinked === VERSION) return;
                anchor.href = link.href;
                anchor.dataset.honorsLinked = VERSION;
                const count = Number(counts[link.category] || 0);
                anchor.dataset.honorCount = String(count);
                anchor.title = count > 0 ? `${toPersianNumber(count)} افتخار ثبت‌شده` : 'هنوز افتخاری در پنل مدیر ثبت نشده است';
            });
        });
    }

    function removePrehide() {
        document.getElementById('honorsInitialLoader')?.remove();
        document.getElementById('honors-live-prehide')?.remove();
        document.documentElement.classList.add('honors-page-ready');
        document.body?.classList.add('honors-page-ready');
    }

    function run() {
        injectStyles();
        const info = resolvePageInfo();
        const isHomepage = Boolean(document.querySelector('.honorees-reference-grid'));

        if (info) {
            const root = ensurePageShell(info);
            root.innerHTML = loadingHtml();
            fetchHonors(info).then(payload => {
                if (info.hub) renderHubPage(info, payload);
                else renderListPage(info, payload);
                removePrehide();
            }).catch(error => {
                root.innerHTML = errorState(error.message);
                removePrehide();
            });
            return;
        }

        if (isHomepage) {
            fetchHonors({}).then(applyMainHomepageLinks).catch(() => {}).finally(removePrehide);
            return;
        }
        removePrehide();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
})();
