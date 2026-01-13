import { NextRequest } from 'next/server';

// 簡單的 rate limiting 實作（使用記憶體，適用於開發環境）
// 生產環境建議使用 Redis

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

// 清理過期的記錄
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 60000); // 每分鐘清理一次

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}

export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 分鐘
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  
  if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + windowMs,
    };
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  rateLimitStore[key].count++;
  
  if (rateLimitStore[key].count > maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  return { 
    allowed: true, 
    remaining: maxRequests - rateLimitStore[key].count 
  };
}

export function getRateLimitByIP(request: NextRequest, maxRequests: number = 10): { allowed: boolean; remaining: number } {
  const ip = getClientIP(request);
  return checkRateLimit(`ip:${ip}`, maxRequests);
}

export function getRateLimitByEmail(email: string, maxRequests: number = 5): { allowed: boolean; remaining: number } {
  return checkRateLimit(`email:${email}`, maxRequests);
}
