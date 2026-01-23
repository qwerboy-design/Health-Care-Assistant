import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock fetch globally
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({}),
} as any);

// Mock all dependencies
vi.mock('@/lib/supabase/customers', () => ({
  findCustomerByEmail: vi.fn(),
  updateLastLogin: vi.fn(),
}));

vi.mock('@/lib/supabase/credits', () => ({
  getCustomerCredits: vi.fn(),
}));

vi.mock('@/lib/auth/password', () => ({
  verifyPassword: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  createSession: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  getClientIP: vi.fn(),
  getRateLimitByIP: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// Import after mocking
import { POST } from '@/app/api/auth/login/route';
import { findCustomerByEmail, updateLastLogin } from '@/lib/supabase/customers';
import { getCustomerCredits } from '@/lib/supabase/credits';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { getClientIP, getRateLimitByIP } from '@/lib/rate-limit';
import { cookies } from 'next/headers';

describe('POST /api/auth/login - Credits Integration', () => {
  const mockCookieStore = {
    set: vi.fn(),
  };

  const mockCustomer = {
    id: 'customer-123',
    email: 'test@example.com',
    name: 'Test User',
    password_hash: 'hashed-password',
    auth_provider: 'password',
    approval_status: 'approved',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(getRateLimitByIP).mockReturnValue({ allowed: true } as any);
    vi.mocked(getClientIP).mockReturnValue('127.0.0.1');
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
    vi.mocked(createSession).mockResolvedValue({
      token: 'session-token',
      expiresAt: new Date(Date.now() + 86400000),
    } as any);
  });

  describe('Credits 返回', () => {
    it('應該在登入成功後返回用戶的 Credits', async () => {
      vi.mocked(findCustomerByEmail).mockResolvedValue(mockCustomer as any);
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(updateLastLogin).mockResolvedValue(undefined);
      vi.mocked(getCustomerCredits).mockResolvedValue(100);

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.credits).toBe(100);
      expect(getCustomerCredits).toHaveBeenCalledWith(mockCustomer.id);
    });

    it('應該在 Credits 為 0 時也正確返回', async () => {
      vi.mocked(findCustomerByEmail).mockResolvedValue(mockCustomer as any);
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(updateLastLogin).mockResolvedValue(undefined);
      vi.mocked(getCustomerCredits).mockResolvedValue(0);

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.credits).toBe(0);
    });

    it('應該在查詢 Credits 失敗時仍然允許登入', async () => {
      vi.mocked(findCustomerByEmail).mockResolvedValue(mockCustomer as any);
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(updateLastLogin).mockResolvedValue(undefined);
      vi.mocked(getCustomerCredits).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // 登入應該成功，但 Credits 為 0（預設值）
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.credits).toBe(0);
    });

    it('應該在密碼錯誤時不返回 Credits', async () => {
      vi.mocked(findCustomerByEmail).mockResolvedValue(mockCustomer as any);
      vi.mocked(verifyPassword).mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.data?.credits).toBeUndefined();
      expect(getCustomerCredits).not.toHaveBeenCalled();
    });

    it('應該在用戶不存在時不返回 Credits', async () => {
      vi.mocked(findCustomerByEmail).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'password123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.data?.credits).toBeUndefined();
      expect(getCustomerCredits).not.toHaveBeenCalled();
    });
  });
});
