import { query, queryOne, execute } from '../config/database.js';
import { logAdminAction } from '../middleware/security.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '../../public/uploads');

// اطمینان از وجود پوشه آپلود
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ==========================================
// NEWS MANAGEMENT (اخبار)
// ==========================================

export async function getNews(req, res) {
    try {
        const { limit = 20, offset = 0, is_published } = req.query;
        
        let sql = `SELECT * FROM news WHERE 1=1`;
        const params = [];
        
        if (is_published !== undefined) {
            sql += ` AND is_published = ?`;
            params.push(is_published === 'true' ? 1 : 0);
        }
        
        sql += ` ORDER BY published_at DESC, created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));
        
        const news = await query(sql, params);
        
        const total = await queryOne(`SELECT COUNT(*) as count FROM news`);
        
        res.json({
            success: true,
            news,
            total: total?.count || 0
        });
    } catch (error) {
        console.error('خطا در دریافت اخبار:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

export async function getNewsForHomepage(req, res) {
    try {
        const news = await query(`
            SELECT id, title, summary, image_url, published_at
            FROM news 
            WHERE is_published = 1 
            ORDER BY published_at DESC 
            LIMIT 6
        `);
        
        res.json({
            success: true,
            news
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

export async function getNewsById(req, res) {
    try {
        const { id } = req.params;
        
        const news = await queryOne(`SELECT * FROM news WHERE id = ?`, [id]);
        if (!news) {
            return res.status(404).json({ error: 'خبر یافت نشد' });
        }
        
        // افزایش بازدید
        await execute(`UPDATE news SET views = views + 1 WHERE id = ?`, [id]);
        
        res.json({
            success: true,
            news
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

export async function createNews(req, res) {
    try {
        const { title, summary, content, image_url, is_published, published_at } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'عنوان و متن خبر الزامی است' });
        }
        
        const result = await execute(`
            INSERT INTO news (title, summary, content, image_url, is_published, published_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            title, 
            summary || null, 
            content, 
            image_url || null, 
            is_published ? 1 : 0,
            published_at || (is_published ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null),
            req.user.id
        ]);
        
        await logAdminAction(
            req.user.id,
            'create_news',
            'news',
            result.insertId,
            { title },
            req.ip
        );
        
        res.json({
            success: true,
            message: 'خبر با موفقیت ایجاد شد',
            news_id: result.insertId
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

export async function updateNews(req, res) {
    try {
        const { id } = req.params;
        const { title, summary, content, image_url, is_published } = req.body;
        
        const existing = await queryOne('SELECT * FROM news WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'خبر یافت نشد' });
        }
        
        await execute(`
            UPDATE news 
            SET title = COALESCE(?, title),
                summary = COALESCE(?, summary),
                content = COALESCE(?, content),
                image_url = COALESCE(?, image_url),
                is_published = COALESCE(?, is_published),
                published_at = CASE WHEN COALESCE(?, is_published) = 1 AND published_at IS NULL THEN NOW() ELSE published_at END
            WHERE id = ?
        `, [title, summary, content, image_url, is_published, is_published, id]);
        
        await logAdminAction(
            req.user.id,
            'update_news',
            'news',
            id,
            { title },
            req.ip
        );
        
        res.json({
            success: true,
            message: 'خبر با موفقیت به‌روزرسانی شد'
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

export async function deleteNews(req, res) {
    try {
        const { id } = req.params;
        
        const existing = await queryOne('SELECT * FROM news WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'خبر یافت نشد' });
        }
        
        await execute('DELETE FROM news WHERE id = ?', [id]);
        
        await logAdminAction(
            req.user.id,
            'delete_news',
            'news',
            id,
            { title: existing.title },
            req.ip
        );
        
        res.json({
            success: true,
            message: 'خبر با موفقیت حذف شد'
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// TOP STUDENTS (دانش‌آموزان برتر)
// ==========================================

export async function getTopStudents(req, res) {
    try {
        const { rank_type } = req.query;
        
        let sql = `
            SELECT ts.*, u.name as student_name, u.class_name
            FROM top_students ts
            JOIN users u ON u.id = ts.student_id
            WHERE ts.is_active = 1
        `;
        const params = [];
        
        if (rank_type && rank_type !== 'all') {
            sql += ` AND ts.rank_type = ?`;
            params.push(rank_type);
        }
        
        sql += ` ORDER BY ts.rank_position ASC, ts.created_at DESC`;
        
        const topStudents = await query(sql, params);
        
        res.json({
            success: true,
            topStudents
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

export async function createTopStudent(req, res) {
    try {
        const { student_id, rank_type, rank_position, achievement, year, image_url } = req.body;
        
        if (!student_id || !rank_type) {
            return res.status(400).json({ error: 'دانش‌آموز و نوع رتبه الزامی است' });
        }
        
        const result = await execute(`
            INSERT INTO top_students (student_id, rank_type, rank_position, achievement, year, image_url)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [student_id, rank_type, rank_position || null, achievement || null, year || null, image_url || null]);
        
        await logAdminAction(
            req.user.id,
            'create_top_student',
            'top_student',
            result.insertId,
            { student_id, rank_type },
            req.ip
        );
        
        res.json({
            success: true,
            message: 'دانش‌آموز برتر با موفقیت اضافه شد'
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

export async function deleteTopStudent(req, res) {
    try {
        const { id } = req.params;
        
        await execute('DELETE FROM top_students WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'دانش‌آموز برتر با موفقیت حذف شد'
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// SLIDER MANAGEMENT (اسلایدر)
// ==========================================

export async function getSliders(req, res) {
    try {
        const sliders = await query(`
            SELECT * FROM sliders 
            WHERE is_active = 1 
            ORDER BY order_position ASC
        `);
        
        res.json({
            success: true,
            sliders
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

export async function createSlider(req, res) {
    try {
        const { title, description, image_url, link_url, order_position } = req.body;
        
        if (!image_url) {
            return res.status(400).json({ error: 'آدرس تصویر الزامی است' });
        }
        
        const result = await execute(`
            INSERT INTO sliders (title, description, image_url, link_url, order_position)
            VALUES (?, ?, ?, ?, ?)
        `, [title || null, description || null, image_url, link_url || null, order_position || 0]);
        
        await logAdminAction(
            req.user.id,
            'create_slider',
            'slider',
            result.insertId,
            { title },
            req.ip
        );
        
        res.json({
            success: true,
            message: 'اسلایدر با موفقیت اضافه شد'
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

export async function updateSlider(req, res) {
    try {
        const { id } = req.params;
        const { title, description, image_url, link_url, order_position, is_active } = req.body;
        
        await execute(`
            UPDATE sliders 
            SET title = COALESCE(?, title),
                description = COALESCE(?, description),
                image_url = COALESCE(?, image_url),
                link_url = COALESCE(?, link_url),
                order_position = COALESCE(?, order_position),
                is_active = COALESCE(?, is_active)
            WHERE id = ?
        `, [title, description, image_url, link_url, order_position, is_active, id]);
        
        res.json({
            success: true,
            message: 'اسلایدر با موفقیت به‌روزرسانی شد'
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

export async function deleteSlider(req, res) {
    try {
        const { id } = req.params;
        
        await execute('DELETE FROM sliders WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'اسلایدر با موفقیت حذف شد'
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// GALLERY MANAGEMENT (گالری تصاویر)
// ==========================================

export async function getGallery(req, res) {
    try {
        const { category } = req.query;
        
        let sql = `SELECT * FROM gallery ORDER BY order_position ASC, created_at DESC`;
        const params = [];
        
        if (category) {
            sql = `SELECT * FROM gallery WHERE category = ? ORDER BY order_position ASC`;
            params.push(category);
        }
        
        const gallery = await query(sql, params);
        
        // دریافت دسته‌بندی‌ها
        const categories = await query(`SELECT DISTINCT category FROM gallery WHERE category IS NOT NULL`);
        
        res.json({
            success: true,
            gallery,
            categories: categories.map(c => c.category)
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

export async function createGalleryItem(req, res) {
    try {
        const { title, image_url, category, order_position } = req.body;
        
        if (!image_url) {
            return res.status(400).json({ error: 'آدرس تصویر الزامی است' });
        }
        
        const result = await execute(`
            INSERT INTO gallery (title, image_url, category, order_position)
            VALUES (?, ?, ?, ?)
        `, [title || null, image_url, category || null, order_position || 0]);
        
        await logAdminAction(
            req.user.id,
            'create_gallery_item',
            'gallery',
            result.insertId,
            { title, category },
            req.ip
        );
        
        res.json({
            success: true,
            message: 'تصویر با موفقیت به گالری اضافه شد'
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

export async function deleteGalleryItem(req, res) {
    try {
        const { id } = req.params;
        
        await execute('DELETE FROM gallery WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'تصویر با موفقیت حذف شد'
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// FILE UPLOAD (آپلود فایل)
// ==========================================

export async function uploadFile(req, res) {
    try {
        if (!req.files || !req.files.image) {
            return res.status(400).json({ error: 'فایلی ارسال نشده است' });
        }
        
        const file = req.files.image;
        const timestamp = Date.now();
        const ext = path.extname(file.name);
        const filename = `${timestamp}_${file.name}`;
        const uploadPath = path.join(UPLOAD_DIR, filename);
        
        // بررسی نوع فایل
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({ error: 'نوع فایل نامعتبر است. فقط تصاویر مجاز هستند.' });
        }
        
        // بررسی حجم (حداکثر 5 مگابایت)
        if (file.size > 5 * 1024 * 1024) {
            return res.status(400).json({ error: 'حجم فایل باید کمتر از 5 مگابایت باشد' });
        }
        
        await file.mv(uploadPath);
        
        const imageUrl = `/uploads/${filename}`;
        
        res.json({
            success: true,
            image_url: imageUrl,
            message: 'فایل با موفقیت آپلود شد'
        });
    } catch (error) {
        console.error('خطا در آپلود:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}