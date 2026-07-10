import { query, queryOne, execute } from '../config/database.js';
import { logAdminAction } from '../middleware/security.js';

// دریافت تمام تنظیمات
export async function getSettings(req, res) {
    try {
        const settings = await query('SELECT setting_key, setting_value, setting_type, description FROM settings');
        
        // تبدیل به فرمت key-value
        const settingsObject = {};
        settings.forEach(s => {
            let value = s.setting_value;
            if (s.setting_type === 'boolean') {
                value = value === 'true' || value === '1';
            } else if (s.setting_type === 'number') {
                value = parseFloat(value);
            } else if (s.setting_type === 'json') {
                try {
                    value = JSON.parse(value);
                } catch(e) {}
            }
            settingsObject[s.setting_key] = value;
        });
        
        res.json({
            success: true,
            settings: settingsObject
        });
    } catch (error) {
        console.error('خطا در دریافت تنظیمات:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// به‌روزرسانی تنظیمات
export async function updateSettings(req, res) {
    try {
        const { settings } = req.body;
        
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'فرمت تنظیمات نامعتبر است' });
        }
        
        for (const [key, value] of Object.entries(settings)) {
            let settingValue = value;
            let settingType = 'string';
            
            if (typeof value === 'boolean') {
                settingValue = value ? 'true' : 'false';
                settingType = 'boolean';
            } else if (typeof value === 'number') {
                settingValue = value.toString();
                settingType = 'number';
            } else if (typeof value === 'object') {
                settingValue = JSON.stringify(value);
                settingType = 'json';
            }
            
            await execute(`
                INSERT INTO settings (setting_key, setting_value, setting_type, updated_at) 
                VALUES (?, ?, ?, NOW()) 
                ON DUPLICATE KEY UPDATE 
                setting_value = VALUES(setting_value), 
                setting_type = VALUES(setting_type),
                updated_at = NOW()
            `, [key, settingValue, settingType]);
        }
        
        // لاگ فعالیت
        await logAdminAction(
            req.user.id, 
            'update_settings', 
            'settings', 
            null, 
            { updated_keys: Object.keys(settings) },
            req.ip
        );
        
        res.json({
            success: true,
            message: 'تنظیمات با موفقیت ذخیره شد'
        });
    } catch (error) {
        console.error('خطا در ذخیره تنظیمات:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// دریافت محدودیت‌های هوش مصنوعی برای کاربر جاری
export async function getAIRateLimitStatus(req, res) {
    try {
        const { checkAIRateLimit, getAIRateLimit } = await import('../middleware/security.js');
        const limit = await getAIRateLimit();
        const status = await checkAIRateLimit(req.user.id);
        
        // دریافت آمار استفاده امروز
        const today = new Date().toISOString().split('T')[0];
        const usage = await queryOne(`
            SELECT COUNT(*) as count 
            FROM ai_logs 
            WHERE user_id = ? AND DATE(created_at) = ?
        `, [req.user.id, today]);
        
        res.json({
            success: true,
            daily_limit: limit,
            used_today: usage?.count || 0,
            remaining: status.allowed ? status.remaining : 0,
            is_allowed: status.allowed
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// تنظیمات پیش‌فرض اولیه
export async function initDefaultSettings() {
    const defaultSettings = [
        { key: 'school_name', value: 'دبیرستان فرزانگان ناجا', type: 'string', desc: 'نام مدرسه' },
        { key: 'school_year', value: '1404-1405', type: 'string', desc: 'سال تحصیلی جاری' },
        { key: 'school_phone', value: '021-12345678', type: 'string', desc: 'شماره تماس مدرسه' },
        { key: 'school_address', value: 'تهران، خیابان ولیعصر، پلاک 123', type: 'string', desc: 'آدرس مدرسه' },
        { key: 'ai_api_key_configured', value: process.env.AI_API_KEY ? 'true' : 'false', type: 'boolean', desc: 'وضعیت تنظیم کلید هوش مصنوعی در محیط سرور' },
        { key: 'ai_api_base_url', value: process.env.AI_API_BASE_URL || 'https://api.gapgpt.app/v1', type: 'string', desc: 'آدرس پایه API هوش مصنوعی' },
        { key: 'ai_model', value: process.env.AI_DEFAULT_MODEL || 'gpt-4o', type: 'string', desc: 'مدل هوش مصنوعی' },
        { key: 'ai_daily_limit', value: '20', type: 'number', desc: 'حداکثر سوال در روز برای هر کاربر' },
        { key: 'ai_enabled', value: 'true', type: 'boolean', desc: 'فعال/غیرفعال کردن هوش مصنوعی' },
        { key: 'sms_api_key_configured', value: (process.env.SMS_API_KEY || process.env.KAVENEGAR_API_KEY) ? 'true' : 'false', type: 'boolean', desc: 'وضعیت تنظیم کلید پیامک در محیط سرور' },
        { key: 'sms_enabled', value: 'true', type: 'boolean', desc: 'فعال/غیرفعال کردن پیامک' },
        { key: 'maintenance_mode', value: 'false', type: 'boolean', desc: 'حالت تعمیرات' },
        { key: 'registration_open', value: 'true', type: 'boolean', desc: 'باز بودن ثبت‌نام' }
    ];
    
    for (const setting of defaultSettings) {
        await execute(`
            INSERT INTO settings (setting_key, setting_value, setting_type, description) 
            VALUES (?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
            setting_value = VALUES(setting_value),
            description = VALUES(description)
        `, [setting.key, setting.value, setting.type, setting.desc]);
    }
    
    console.log('✅ تنظیمات پیش‌فرض سیستم ایجاد شد');
}