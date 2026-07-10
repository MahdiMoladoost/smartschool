import { query, queryOne, execute } from '../config/database.js';
import { logAdminAction } from '../middleware/security.js';

// دریافت لیست اطلاعیه‌ها (برای ادمین)
export async function getAnnouncements(req, res) {
    try {
        const { target_role, is_active, limit = 50, offset = 0 } = req.query;
        
        let sql = `
            SELECT a.*, u.name as created_by_name,
                   (SELECT COUNT(*) FROM announcements_read WHERE announcement_id = a.id) as read_count
            FROM announcements a
            LEFT JOIN users u ON u.id = a.created_by
            WHERE 1=1
        `;
        const params = [];
        
        if (target_role && target_role !== 'all') {
            sql += ` AND a.target_role = ?`;
            params.push(target_role);
        }
        
        if (is_active !== undefined) {
            sql += ` AND a.is_active = ?`;
            params.push(is_active === 'true' ? 1 : 0);
        }
        
        sql += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));
        
        const announcements = await query(sql, params);
        
        // دریافت تعداد کل
        const countResult = await queryOne(`
            SELECT COUNT(*) as total FROM announcements
            WHERE 1=1 ${target_role && target_role !== 'all' ? 'AND target_role = ?' : ''}
        `, target_role && target_role !== 'all' ? [target_role] : []);
        
        res.json({
            success: true,
            announcements,
            total: countResult?.total || 0,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('خطا در دریافت اطلاعیه‌ها:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// دریافت اطلاعیه‌ها برای کاربر عادی (بر اساس نقش)
export async function getUserAnnouncements(req, res) {
    try {
        const userRole = req.user.role;
        const limit = parseInt(req.query.limit) || 10;
        
        const announcements = await query(`
            SELECT id, title, content, priority, created_at, created_by,
                   (SELECT COUNT(*) FROM announcements_read 
                    WHERE announcement_id = a.id AND user_id = ?) as is_read
            FROM announcements a
            WHERE (target_role = 'all' OR target_role = ?) AND is_active = 1
            ORDER BY 
                CASE priority 
                    WHEN 'urgent' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'normal' THEN 3 
                END,
                created_at DESC
            LIMIT ?
        `, [req.user.id, userRole, limit]);
        
        // تعداد اطلاعیه‌های خوانده نشده
        const unreadCount = await queryOne(`
            SELECT COUNT(*) as count
            FROM announcements a
            WHERE (target_role = 'all' OR target_role = ?) AND is_active = 1
            AND NOT EXISTS (
                SELECT 1 FROM announcements_read 
                WHERE announcement_id = a.id AND user_id = ?
            )
        `, [userRole, req.user.id]);
        
        res.json({
            success: true,
            announcements,
            unread_count: unreadCount?.count || 0
        });
    } catch (error) {
        console.error('خطا در دریافت اطلاعیه‌های کاربر:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// دریافت یک اطلاعیه خاص
export async function getAnnouncementById(req, res) {
    try {
        const { id } = req.params;
        
        const announcement = await queryOne(`
            SELECT a.*, u.name as created_by_name
            FROM announcements a
            LEFT JOIN users u ON u.id = a.created_by
            WHERE a.id = ?
        `, [id]);
        
        if (!announcement) {
            return res.status(404).json({ error: 'اطلاعیه یافت نشد' });
        }
        
        // اگر کاربر عادی است، خوانده شده ثبت شود
        if (req.user.role !== 'admin') {
            await execute(`
                INSERT IGNORE INTO announcements_read (announcement_id, user_id, read_at)
                VALUES (?, ?, NOW())
            `, [id, req.user.id]);
        }
        
        res.json({
            success: true,
            announcement
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ایجاد اطلاعیه جدید (فقط ادمین)
export async function createAnnouncement(req, res) {
    try {
        const { title, content, target_role, priority } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'عنوان و متن اطلاعیه الزامی است' });
        }
        
        const result = await execute(`
            INSERT INTO announcements (title, content, target_role, priority, created_by, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
        `, [title, content, target_role || 'all', priority || 'normal', req.user.id]);
        
        // لاگ فعالیت
        await logAdminAction(
            req.user.id,
            'create_announcement',
            'announcement',
            result.insertId,
            { title, target_role, priority },
            req.ip
        );
        
        res.json({
            success: true,
            message: 'اطلاعیه با موفقیت ارسال شد',
            announcement_id: result.insertId
        });
    } catch (error) {
        console.error('خطا در ایجاد اطلاعیه:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ویرایش اطلاعیه (فقط ادمین)
export async function updateAnnouncement(req, res) {
    try {
        const { id } = req.params;
        const { title, content, target_role, priority, is_active } = req.body;
        
        const existing = await queryOne('SELECT * FROM announcements WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'اطلاعیه یافت نشد' });
        }
        
        await execute(`
            UPDATE announcements 
            SET title = COALESCE(?, title),
                content = COALESCE(?, content),
                target_role = COALESCE(?, target_role),
                priority = COALESCE(?, priority),
                is_active = COALESCE(?, is_active)
            WHERE id = ?
        `, [title, content, target_role, priority, is_active, id]);
        
        await logAdminAction(
            req.user.id,
            'update_announcement',
            'announcement',
            id,
            { updated_fields: Object.keys(req.body) },
            req.ip
        );
        
        res.json({
            success: true,
            message: 'اطلاعیه با موفقیت به‌روزرسانی شد'
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// حذف اطلاعیه (فقط ادمین)
export async function deleteAnnouncement(req, res) {
    try {
        const { id } = req.params;
        
        const existing = await queryOne('SELECT * FROM announcements WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'اطلاعیه یافت نشد' });
        }
        
        await execute('DELETE FROM announcements WHERE id = ?', [id]);
        
        await logAdminAction(
            req.user.id,
            'delete_announcement',
            'announcement',
            id,
            { title: existing.title },
            req.ip
        );
        
        res.json({
            success: true,
            message: 'اطلاعیه با موفقیت حذف شد'
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// علامت‌گذاری اطلاعیه به عنوان خوانده شده
export async function markAsRead(req, res) {
    try {
        const { id } = req.params;
        
        await execute(`
            INSERT IGNORE INTO announcements_read (announcement_id, user_id, read_at)
            VALUES (?, ?, NOW())
        `, [id, req.user.id]);
        
        res.json({
            success: true,
            message: 'اطلاعیه به عنوان خوانده شده علامت‌گذاری شد'
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// علامت‌گذاری همه اطلاعیه‌ها به عنوان خوانده شده
export async function markAllAsRead(req, res) {
    try {
        const userRole = req.user.role;
        
        await execute(`
            INSERT IGNORE INTO announcements_read (announcement_id, user_id, read_at)
            SELECT id, ?, NOW()
            FROM announcements
            WHERE (target_role = 'all' OR target_role = ?) AND is_active = 1
            AND NOT EXISTS (
                SELECT 1 FROM announcements_read 
                WHERE announcement_id = announcements.id AND user_id = ?
            )
        `, [req.user.id, userRole, req.user.id]);
        
        res.json({
            success: true,
            message: 'همه اطلاعیه‌ها به عنوان خوانده شده علامت‌گذاری شدند'
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}