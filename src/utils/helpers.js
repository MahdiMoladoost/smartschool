import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// هش کردن پسورد
export function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}

// بررسی پسورد
export function verifyPassword(password, hashedPassword) {
    return bcrypt.compareSync(password, hashedPassword);
}

// تولید کد تصادفی
export function generateRandomCode(length = 6) {
    return Math.floor(Math.random() * (10 ** length - 1) + 10 ** (length - 1)).toString();
}

// تولید ID یکتا
export function generateId(prefix = '') {
    return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
}

// فرمت تاریخ به شمسی (موقت - برای نمایش)
export function toPersianDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('fa-IR');
}

// محاسبه میانگین نمرات
export function calculateAverage(grades) {
    if (!grades || grades.length === 0) return 0;
    const sum = grades.reduce((acc, grade) => acc + (grade.score || grade.average || 0), 0);
    return (sum / grades.length).toFixed(2);
}

// خواندن فایل JSON
export function readJSONFile(filePath) {
    try {
        const fullPath = path.join(__dirname, '../../src/data', filePath);
        if (fs.existsSync(fullPath)) {
            return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        }
        return null;
    } catch (error) {
        console.error(`خطا در خواندن فایل ${filePath}:`, error);
        return null;
    }
}

// نوشتن در فایل JSON
export function writeJSONFile(filePath, data) {
    try {
        const fullPath = path.join(__dirname, '../../src/data', filePath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`خطا در نوشتن فایل ${filePath}:`, error);
        return false;
    }
}

// گروه‌بندی آرایه بر اساس کلید
export function groupBy(array, key) {
    return array.reduce((result, item) => {
        const groupKey = item[key];
        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
    }, {});
}