import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: number;
}

interface MemoryRateLimitEntry {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, MemoryRateLimitEntry>();

function cleanupMemoryStore(now: number): void {
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetTime <= now) {
      memoryStore.delete(key);
    }
  }
}

function consumeFromMemory(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  cleanupMemoryStore(now);

  const current = memoryStore.get(key);
  if (!current || current.resetTime <= now) {
    const resetTime = now + windowMs;
    memoryStore.set(key, {
      count: 1,
      resetTime,
    });
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
      resetAt: resetTime,
    };
  }

  current.count += 1;
  memoryStore.set(key, current);

  return {
    allowed: current.count <= maxRequests,
    remaining: Math.max(0, maxRequests - current.count),
    resetAt: current.resetTime,
  };
}

function isSupabaseRateLimitAvailable(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function consumeFromPersistentStore(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  if (!isSupabaseRateLimitAvailable()) {
    return null;
  }

  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  try {
    const { data, error } = await supabaseAdmin.rpc('consume_rate_limit', {
      p_key: key,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.warn('Persistent rate limit fallback:', error.message);
      return null;
    }

    const row = Array.isArray(data) ? data[0] : null;
    if (!row) {
      return null;
    }

    return {
      allowed: Boolean(row.allowed),
      remaining: typeof row.remaining === 'number' ? row.remaining : 0,
      resetAt: row.reset_at ? new Date(row.reset_at).getTime() : undefined,
    };
  } catch (error) {
    console.warn('Persistent rate limit unavailable:', error);
    return null;
  }
}

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  return 'unknown';
}

export async function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): Promise<RateLimitResult> {
  const persisted = await consumeFromPersistentStore(key, maxRequests, windowMs);
  if (persisted) {
    return persisted;
  }

  return consumeFromMemory(key, maxRequests, windowMs);
}

export async function getRateLimitByIP(
  request: NextRequest,
  maxRequests: number = 10,
  windowMs: number = 60_000
): Promise<RateLimitResult> {
  const ip = getClientIP(request);
  return checkRateLimit(`ip:${ip}`, maxRequests, windowMs);
}

export async function getRateLimitByEmail(
  email: string,
  maxRequests: number = 5,
  windowMs: number = 60_000
): Promise<RateLimitResult> {
  return checkRateLimit(`email:${email.trim().toLowerCase()}`, maxRequests, windowMs);
}
