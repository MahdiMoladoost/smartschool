import express from 'express';
import { getSettings } from '../controllers/settingsController.js';

const router = express.Router();

// Middleware برای ارسال تنظیمات به همه صفحات
async function loadSettings(req, res, next) {
    try {
        // دریافت تنظیمات از دیتابیس
        const settings = await getSettings();
        res.locals.settings = settings || {};
        res.locals.activePage = req.path.split('/').pop().replace('.html', '');
    } catch (error) {
        res.locals.settings = {};
    }
    next();
}

router.use(loadSettings);

// صفحات اصلی
router.get('/pages/homepage/homepage.html', (req, res) => {
    res.render('pages/homepage', { title: 'صفحه اصلی' });
});

router.get('/pages/homepage/about.html', (req, res) => {
    res.render('pages/about', { title: 'درباره ما' });
});

router.get('/pages/homepage/contact.html', (req, res) => {
    res.render('pages/contact', { title: 'ارتباط با ما' });
});

router.get('/pages/homepage/faq.html', (req, res) => {
    res.render('pages/faq', { title: 'سوالات متداول' });
});

router.get('/pages/homepage/services.html', (req, res) => {
    res.render('pages/services', { title: 'خدمات' });
});

router.get('/pages/homepage/timeline.html', (req, res) => {
    res.render('pages/timeline', { title: 'تاریخچه' });
});

export default router;