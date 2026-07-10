// لاگ خطاهای سرور
export function logError(err, req, res, next) {
    const errorLog = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        ip: req.ip,
        user: req.user?.id || null,
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack
        }
    };
    
    console.error(JSON.stringify(errorLog, null, 2));
    
    // ذخیره در فایل (در محیط تولید)
    if (process.env.NODE_ENV === 'production') {
        const fs = require('fs');
        const path = require('path');
        const logFile = path.join(process.cwd(), 'logs', 'errors.log');
        const logDir = path.dirname(logFile);
        
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        fs.appendFileSync(logFile, JSON.stringify(errorLog) + '\n');
    }
    
    next(err);
}

// هندلر خطاهای نهایی
export function errorHandler(err, req, res, next) {
    const status = err.status || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'خطای داخلی سرور' 
        : err.message;
    
    res.status(status).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
}