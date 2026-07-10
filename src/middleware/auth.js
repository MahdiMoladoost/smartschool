import jwt from 'jsonwebtoken';

export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'دسترسی غیرمجاز - توکن یافت نشد' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'change-me-in-development-only', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'توکن نامعتبر است' });
        }
        req.user = user;
        next();
    });
}

export function checkRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'احراز هویت نشده' });
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: `دسترسی محدود - نقش ${req.user.role} مجاز نیست`,
                requiredRoles: allowedRoles
            });
        }
        
        next();
    };
}

// میان‌افزار لاگ کردن درخواست‌ها
export function logger(req, res, next) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
}