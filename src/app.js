import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// بارگذاری متغیرهای محیطی
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ایمپورت مسیرها
import apiRoutes from './routes/v1/index.js';

// ایجاد اپلیکیشن Express
const app = express();

// تنظیمات EJS - مسیر views در کنار src
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middlewareهای عمومی
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ============ فایل‌های استاتیک ============
// مسیر پابلیک (برای js، css، images)
app.use(express.static(path.join(__dirname, '../public')));

// مسیر assets (برای فایل‌های اضافی)
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// مسیر pages (برای فایل‌های HTML قدیمی)
app.use('/pages', express.static(path.join(__dirname, '../pages')));

// مسیر مستقیم برای فایل‌های CSS homepage
app.use('/assets/css/home page', express.static(
    path.join(__dirname, '../public/assets/css/home page')
));

// ============ Middleware تنظیمات ============
async function loadSettings(req, res, next) {
    try {
        res.locals.settings = {
            school_name: 'مدیریت هوشمند',
            school_slogan: 'دبیرستان دولتی',
            school_phone: '۰۲۱-۴۴۷۰۶۶۴۴',
            school_address: 'تهران، دهکده المپیک، خیابان جدی اردبیلی',
            support_phone: '۰۹۱۰۶۶۶۱۳۸۶',
            copyright_text: 'تمامی حقوق این سایت متعلق به مدیریت هوشمند می‌باشد.',
            footer_text: 'مدیریت هوشمند، پلتفرم جامع مدیریت مدارس با امکانات پیشرفته و پشتیبانی ۲۴ ساعته.'
        };
    } catch (error) {
        res.locals.settings = {};
    }
    next();
}

app.use(loadSettings);

// ============ مسیرهای صفحات ============

// صفحه درباره ما
app.get('/about', (req, res) => {
    try {
        res.render('pages/about', { 
            title: 'درباره ما',
            activePage: 'about'
        });
    } catch (error) {
        console.error('خطا در رندر about:', error);
        res.status(500).send(`خطا: ${error.message}`);
    }
});

// صفحه اصلی
app.get('/', (req, res) => {
    try {
        res.render('pages/homepage', { 
            title: 'صفحه اصلی',
            activePage: 'home'
        });
    } catch (error) {
        console.error('خطا در رندر homepage:', error);
        res.status(500).send(`خطا: ${error.message}`);
    }
});

// مسیرهای قدیمی HTML برای سازگاری
app.get('/pages/homepage/about.html', (req, res) => {
    res.redirect('/about');
});

app.get('/pages/homepage/homepage', (req, res) => {
    res.redirect('/');
});

// مسیرهای API
app.use('/api/v1', apiRoutes);

// مسیر ساده برای تست
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'سرور با موفقیت راه‌اندازی شد',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// مسیر تست برای بررسی تنظیمات
app.get('/test', (req, res) => {
    res.json({ 
        viewsPath: app.get('views'),
        cwd: process.cwd(),
        staticPaths: {
            public: path.join(__dirname, '../public'),
            assets: path.join(__dirname, '../assets')
        }
    });
});

// ============ مدیریت خطاها ============

// مدیریت خطاهای 404
app.use((req, res) => {
    console.log(`404 - مسیر یافت نشد: ${req.url}`);
    if (req.accepts('html')) {
        res.status(404).send(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head><meta charset="UTF-8"><title>404 - صفحه یافت نشد</title></head>
            <body style="font-family: Tahoma; text-align: center; padding: 50px;">
                <h1>❌ 404 - صفحه مورد نظر یافت نشد</h1>
                <p>مسیر درخواستی: ${req.url}</p>
                <a href="/" style="color: #2563eb;">بازگشت به صفحه اصلی</a>
                <hr>
                <small>مسیر Views: ${app.get('views')}</small>
            </body>
            </html>
        `);
    } else {
        res.status(404).json({ error: 'مسیر مورد نظر یافت نشد' });
    }
});

// مدیریت خطاهای سرور
app.use((err, req, res, next) => {
    console.error('خطای سرور:', err);
    if (req.accepts('html')) {
        res.status(500).send(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head><meta charset="UTF-8"><title>500 - خطای سرور</title></head>
            <body style="font-family: Tahoma; text-align: center; padding: 50px;">
                <h1>⚠️ خطای داخلی سرور</h1>
                <p>${err.message}</p>
                <pre style="text-align: left; background: #f4f4f4; padding: 10px; overflow: auto;">${err.stack}</pre>
                <a href="/" style="color: #2563eb;">بازگشت به صفحه اصلی</a>
            </body>
            </html>
        `);
    } else {
        res.status(500).json({ error: 'خطای داخلی سرور' });
    }
});

export default app;