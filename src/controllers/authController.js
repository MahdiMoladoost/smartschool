import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query, queryOne, execute } from '../config/database.js';

function generateToken(user) {
    return jwt.sign(
        { 
            id: user.id, 
            username: user.username, 
            role: user.role, 
            name: user.name 
        },
        process.env.JWT_SECRET || 'change-me-in-development-only',
        { expiresIn: '7d' }
    );
}

// لاگین با نام کاربری و رمز عبور
export async function login(req, res) {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است' });
        }
        
        // جستجوی کاربر در دیتابیس
        const user = await queryOne(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        
        if (!user) {
            return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
        }
        
        // بررسی رمز عبور
        const passwordValid = bcrypt.compareSync(password, user.password);
        
        if (!passwordValid) {
            return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
        }
        
        // به‌روزرسانی آخرین ورود
        await execute(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );
        
        // تولید توکن
        const token = generateToken(user);
        
        // حذف رمز عبور از خروجی
        const userData = { ...user };
        delete userData.password;
        
        res.json({
            success: true,
            token,
            user: userData,
            message: `خوش آمدید ${user.name}`
        });
        
    } catch (error) {
        console.error('خطا در لاگین:', error);
        res.status(500).json({ error: 'خطای سرور: ' + error.message });
    }
}

// درخواست کد OTP (ساده شده برای تست)
export async function sendOTP(req, res) {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'شماره تلفن الزامی است'
            });
        }
        
        // تولید کد 6 رقمی
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // ذخیره موقت OTP (در حافظه - برای Production از دیتابیس استفاده کنید)
        global.otpStore = global.otpStore || {};
        global.otpStore[phone] = {
            code: otp,
            expiresAt: Date.now() + 2 * 60 * 1000
        };
        
        console.log(`📱 OTP برای ${phone}: ${otp}`);
        
        res.json({
            success: true,
            message: 'کد تایید ارسال شد',
            devOTP: otp // فقط برای توسعه
        });
        
    } catch (error) {
        console.error('خطا در sendOTP:', error);
        res.status(500).json({ success: false, message: 'خطای سرور' });
    }
}

// تایید OTP
export async function verifyOTPAndLogin(req, res) {
    try {
        const { phone, otp } = req.body;
        
        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                message: 'شماره تلفن و کد تایید الزامی است'
            });
        }
        
        global.otpStore = global.otpStore || {};
        const stored = global.otpStore[phone];
        
        if (!stored) {
            return res.status(400).json({
                success: false,
                message: 'ابتدا کد تایید را درخواست کنید'
            });
        }
        
        if (Date.now() > stored.expiresAt) {
            delete global.otpStore[phone];
            return res.status(400).json({
                success: false,
                message: 'کد تایید منقضی شده است'
            });
        }
        
        if (otp !== stored.code) {
            return res.status(400).json({
                success: false,
                message: 'کد تایید اشتباه است'
            });
        }
        
        delete global.otpStore[phone];
        
        // پیدا کردن یا ایجاد کاربر
        let user = await queryOne('SELECT * FROM users WHERE phone = ?', [phone]);
        
        if (!user) {
            // ایجاد کاربر جدید
            const result = await execute(
                `INSERT INTO users (username, password, name, role, phone, status) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [phone, bcrypt.hashSync(phone, 10), `کاربر ${phone}`, 'student', phone, 'active']
            );
            
            user = await queryOne('SELECT * FROM users WHERE id = ?', [result.insertId]);
        }
        
        const token = generateToken(user);
        const userData = { ...user };
        delete userData.password;
        
        res.json({
            success: true,
            token,
            user: userData,
            message: 'ورود با موفقیت انجام شد'
        });
        
    } catch (error) {
        console.error('خطا در verifyOTP:', error);
        res.status(500).json({ success: false, message: 'خطای سرور' });
    }
}

// دریافت اطلاعات کاربر جاری
export async function getMe(req, res) {
    try {
        const user = await queryOne(
            'SELECT id, username, name, role, phone, email, class_name, status, created_at, last_login FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (!user) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }
        
        res.json(user);
        
    } catch (error) {
        console.error('خطا در getMe:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}