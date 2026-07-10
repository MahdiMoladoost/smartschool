import { query, queryOne, execute } from '../config/database.js';
import { checkAIRateLimit, recordAIRequest, getAIRateLimit } from '../middleware/security.js';

// محدوده مجاز سوالات برای هر نقش
const allowedTopics = {
    student: [
        'درس', 'مطالعه', 'تحصیل', 'نمره', 'آزمون', 'تکلیف', 'ریاضی', 'علوم', 'فارسی', 
        'انگلیسی', 'شیمی', 'فیزیک', 'تاریخ', 'جغرافیا', 'حل مسئله', 'تمرین', 
        'کمک درسی', 'مشاوره تحصیلی', 'برنامه ریزی', 'یادگیری'
    ],
    teacher: [
        'تدریس', 'روش تدریس', 'مدیریت کلاس', 'ارزشیابی', 'نمره دهی', 'طرح درس', 
        'آموزش', 'دانش‌آموز', 'کلاس', 'انضباط', 'اخلاق حرفه ای', 'آزمون سازی'
    ],
    parent: [
        'فرزند', 'تربیت', 'مدرسه', 'معلم', 'والدین', 'مشاوره', 'کمک به درس', 
        'رفتار', 'انضباط', 'ارتباط با مدرسه'
    ],
    admin: [
        'مدیریت مدرسه', 'آمار', 'گزارش', 'سیستم', 'تنظیمات', 'کاربران', 'امنیت'
    ]
};

// بررسی مجاز بودن سوال
function isQuestionAllowed(question, role) {
    const lowerQuestion = question.toLowerCase();
    const forbidden = [
        'سیاسی', 'رئیس جمهور', 'انتخابات', 'رهبر', 'نظامی', 'ارتش', 'سپاه', 
        'جنگ', 'سلاح', 'سکس', 'پورن', 'بی حجاب', 'مشروبات', 'شراب', 'خشونت', 
        'قتل', 'ترور', 'فحش', 'توهین', 'کشتار', 'اعتراض', 'اسلحه', 'مخدر'
    ];
    
    for (const word of forbidden) {
        if (lowerQuestion.includes(word)) {
            return { allowed: false, reason: 'سوال شما خارج از محدوده مجاز است.' };
        }
    }
    
    const topics = allowedTopics[role] || allowedTopics.student;
    let isAllowed = false;
    
    for (const topic of topics) {
        if (lowerQuestion.includes(topic)) {
            isAllowed = true;
            break;
        }
    }
    
    if (!isAllowed && role !== 'admin') {
        return { 
            allowed: false, 
            reason: 'سوال شما باید در مورد مسائل آموزشی، تحصیلی یا مدرسه باشد. لطفاً سوال خود را مرتبط‌تر کنید.' 
        };
    }
    
    return { allowed: true };
}

// دریافت تنظیمات هوش مصنوعی
async function getAISettings() {
    const settings = await query('SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE "ai_%"');
    const aiSettings = {};
    settings.forEach(s => {
        aiSettings[s.setting_key] = s.setting_value;
    });
    return aiSettings;
}

// فراخوانی API هوش مصنوعی
async function callAI(prompt, systemPrompt) {
    try {
        const settings = await getAISettings();
        
        if (settings.ai_enabled !== 'true') {
            return { success: false, error: 'دستیار هوش مصنوعی موقتاً غیرفعال است.' };
        }
        
        const response = await fetch(settings.ai_api_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.ai_api_key}`
            },
            body: JSON.stringify({
                model: settings.ai_model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 800
            })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        return { success: true, response: data.choices[0].message.content };
    } catch (error) {
        console.error('خطا در فراخوانی AI:', error);
        return { success: false, error: 'خطا در ارتباط با سرویس هوش مصنوعی. لطفاً دوباره تلاش کنید.' };
    }
}

// دریافت پیام سیستم بر اساس نقش
function getSystemPrompt(role) {
    const prompts = {
        student: `تو یک معلم خصوصی هوشمند و مهربان برای دانش‌آموزان مقطع متوسطه هستی.
        - پاسخ‌هایت را ساده، روان و قابل فهم بده.
        - از مثال‌های عینی و کاربردی استفاده کن.
        - اگر سوال خارج از درس و مدرسه است، مودبانه بگو که فقط در مورد مسائل درسی می‌توانی کمک کنی.
        - همیشه تشویق کننده باش و اعتماد به نفس دانش‌آموز را تقویت کن.
        - پاسخ‌ها را به فارسی روان و رسمی بنویس.`,
        
        teacher: `تو یک مشاور آموزشی و معاون پرورشی با تجربه هستی که به معلمان کمک می‌کنی.
        - راهکارهای عملی و اجرایی برای مدیریت کلاس و بهبود تدریس ارائه بده.
        - از تجارب موفق معلمان دیگر استفاده کن.
        - پاسخ‌هایت حرفه‌ای و مبتنی بر اصول تربیتی باشد.
        - به فارسی روان و تخصصی پاسخ بده.`,
        
        parent: `تو یک مشاور خانواده و روانشناس تربیتی هستی که به والدین کمک می‌کنی.
        - با صبر و حوصله به سوالات والدین پاسخ بده.
        - راهکارهای ساده و عملی برای بهبود ارتباط با فرزند و کمک به تحصیل او ارائه بده.
        - همیشه همدل و حمایت‌گر باش.
        - پاسخ‌ها را به فارسی روان و قابل فهم بنویس.`,
        
        admin: `تو یک مشاور مدیریت آموزشی هستی.
        - تحلیل‌های دقیق و مبتنی بر داده ارائه بده.
        - راهکارهای استراتژیک برای بهبود سیستم آموزشی مدرسه پیشنهاد بده.
        - پاسخ‌هایت رسمی، مختصر و مفید باشد.`
    };
    
    return prompts[role] || prompts.student;
}

// اندپوینت اصلی هوش مصنوعی
export async function askAI(req, res) {
    try {
        const { question } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;
        
        if (!question || question.trim().length === 0) {
            return res.status(400).json({ error: 'لطفاً سوال خود را وارد کنید.' });
        }
        
        if (question.length > 1000) {
            return res.status(400).json({ error: 'سوال شما خیلی طولانی است (حداکثر 1000 کاراکتر).' });
        }
        
        // بررسی محدودیت روزانه
        const limitCheck = await checkAIRateLimit(userId);
        if (!limitCheck.allowed) {
            return res.status(429).json({ 
                error: `❌ شما امروز به حداکثر ${limitCheck.limit} سوال رسیده‌اید. فردا دوباره تلاش کنید.`,
                remaining: 0,
                limit: limitCheck.limit
            });
        }
        
        // بررسی مجاز بودن سوال
        const allowedCheck = isQuestionAllowed(question, userRole);
        if (!allowedCheck.allowed) {
            // ذخیره لاگ سوال ممنوع
            await execute(
                `INSERT INTO ai_logs (user_id, user_role, question, response) 
                 VALUES (?, ?, ?, ?)`,
                [userId, userRole, question, 'BLOCKED: ' + allowedCheck.reason]
            );
            return res.status(403).json({ error: allowedCheck.reason });
        }
        
        // دریافت پاسخ از هوش مصنوعی
        const systemPrompt = getSystemPrompt(userRole);
        const aiResponse = await callAI(question, systemPrompt);
        
        let finalResponse = '';
        let errorMessage = null;
        
        if (aiResponse.success) {
            finalResponse = aiResponse.response;
        } else {
            errorMessage = aiResponse.error || 'متأسفانه در حال حاضر قادر به پاسخگویی نیستم. لطفاً دوباره تلاش کنید.';
            finalResponse = errorMessage;
        }
        
        // ذخیره لاگ
        await execute(
            `INSERT INTO ai_logs (user_id, user_role, question, response, tokens_used) 
             VALUES (?, ?, ?, ?, ?)`,
            [userId, userRole, question, finalResponse, null]
        );
        
        // ثبت درخواست برای محدودیت
        recordAIRequest(userId);
        
        // دریافت وضعیت باقی‌مانده
        const newLimitCheck = await checkAIRateLimit(userId);
        
        res.json({
            success: aiResponse.success,
            response: finalResponse,
            remaining: newLimitCheck.remaining,
            limit: newLimitCheck.limit,
            error: errorMessage
        });
        
    } catch (error) {
        console.error('خطا در AI:', error);
        res.status(500).json({ error: 'خطای داخلی سرور' });
    }
}

// دریافت آمار استفاده از هوش مصنوعی (فقط برای ادمین)
export async function getAIUsageStats(req, res) {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'دسترسی محدود به مدیران' });
        }
        
        const today = new Date().toISOString().split('T')[0];
        
        // آمار امروز
        const todayStats = await queryOne(`
            SELECT 
                COUNT(*) as total_requests,
                COUNT(DISTINCT user_id) as unique_users
            FROM ai_logs 
            WHERE DATE(created_at) = ?
        `, [today]);
        
        // بیشترین کاربران فعال
        const topUsers = await query(`
            SELECT 
                u.name,
                u.username,
                u.role,
                COUNT(*) as request_count
            FROM ai_logs al
            JOIN users u ON u.id = al.user_id
            WHERE DATE(al.created_at) = ?
            GROUP BY al.user_id
            ORDER BY request_count DESC
            LIMIT 10
        `, [today]);
        
        // آمار کل
        const totalStats = await queryOne(`
            SELECT 
                COUNT(*) as total_requests,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(CASE WHEN response LIKE 'BLOCKED%' THEN 1 END) as blocked_requests
            FROM ai_logs
        `);
        
        // آمار روزانه 30 روز اخیر
        const dailyStats = await query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as requests
            FROM ai_logs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);
        
        res.json({
            success: true,
            stats: {
                today: todayStats,
                total: totalStats,
                top_users: topUsers,
                daily_requests: dailyStats
            }
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}