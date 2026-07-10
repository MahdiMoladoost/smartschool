import { AI_RATE_LIMITS } from '../config/constants.js';

// ذخیره درخواست‌های کاربران (در حافظه - برای Production از Redis استفاده کنید)
const userAIRequests = {};

function initializeUserAILimit(userId) {
    if (!userAIRequests[userId]) {
        userAIRequests[userId] = { hourly: [], daily: [] };
    }
}

export function checkAIRateLimit(userId) {
    initializeUserAILimit(userId);
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    userAIRequests[userId].hourly = userAIRequests[userId].hourly.filter(t => t > oneHourAgo);
    userAIRequests[userId].daily = userAIRequests[userId].daily.filter(t => t > oneDayAgo);
    
    if (userAIRequests[userId].hourly.length >= AI_RATE_LIMITS.requestsPerHour) {
        return {
            allowed: false,
            error: 'محدودیت درخواست‌های ساعتی رسیده است. لطفاً بعد از یک ساعت دوباره تلاش کنید.',
            remaining: {
                hourly: 0,
                daily: AI_RATE_LIMITS.requestsPerDay - userAIRequests[userId].daily.length
            }
        };
    }
    
    if (userAIRequests[userId].daily.length >= AI_RATE_LIMITS.requestsPerDay) {
        return {
            allowed: false,
            error: 'محدودیت درخواست‌های روزانه رسیده است. لطفاً فردا دوباره تلاش کنید.',
            remaining: {
                hourly: AI_RATE_LIMITS.requestsPerHour - userAIRequests[userId].hourly.length,
                daily: 0
            }
        };
    }
    
    return {
        allowed: true,
        remaining: {
            hourly: AI_RATE_LIMITS.requestsPerHour - userAIRequests[userId].hourly.length,
            daily: AI_RATE_LIMITS.requestsPerDay - userAIRequests[userId].daily.length
        }
    };
}

export function recordAIRequest(userId) {
    initializeUserAILimit(userId);
    const now = Date.now();
    userAIRequests[userId].hourly.push(now);
    userAIRequests[userId].daily.push(now);
}

export function getAIStats(userId) {
    initializeUserAILimit(userId);
    return {
        usage: {
            hourly: userAIRequests[userId].hourly.length,
            daily: userAIRequests[userId].daily.length
        }
    };
}