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
  findCustomerByOAuthId: vi.fn(),
  createCustomer: vi.fn(),
  updateLastLogin: vi.fn(),
  linkOAuthId: vi.fn(),
}));

vi.mock('@/lib/supabase/credits', () => ({
  getCustomerCredits: vi.fn(),
}));

vi.mock('@/lib/auth/google-oauth', () => ({
  verifyGoogleToken: vi.fn(),
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
import { POST } from '@/app/api/auth/google/route';
import {
  findCustomerByEmail,
  findCustomerByOAuthId,
  createCustomer,
  updateLastLogin,
  linkOAuthId
} from '@/lib/supabase/customers';
import { getCustomerCredits } from '@/lib/supabase/credits';
import { verifyGoogleToken } from '@/lib/auth/google-oauth';
import { createSession } from '@/lib/auth/session';
import { getClientIP, getRateLimitByIP } from '@/lib/rate-limit';
import { cookies } from 'next/headers';

describe('POST /api/auth/google - Credits Integration', () => {
  const mockCookieStore = {
    set: vi.fn(),
  };

  const mockGoogleUser = {
    sub: 'google-123',
    email: 'test@example.com',
    name: 'Test User',
    email_verified: true,
  };

  const mockCustomer = {
    id: 'customer-123',
    email: 'test@example.com',
    name: 'Test User',
    approval_status: 'approved',
    oauth_id: 'google-123',
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
    it('應該在 Google 登入成功後返回用戶的 Credits（現有用戶）', async () => {
      vi.mocked(verifyGoogleToken).mockResolvedValue(mockGoogleUser);
      vi.mocked(findCustomerByOAuthId).mockResolvedValue(mockCustomer as any);
      vi.mocked(updateLastLogin).mockResolvedValue(undefined);
      vi.mocked(getCustomerCredits).mockResolvedValue(200);

      const request = new NextRequest('http://localhost/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          idToken: 'google-id-token',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.credits).toBe(200);
      expect(getCustomerCredits).toHaveBeenCalledWith(mockCustomer.id);
    });

    it('應該在 Google 登入成功後返回用戶的 Credits（新用戶）', async () => {
      vi.mocked(verifyGoogleToken).mockResolvedValue(mockGoogleUser);
      vi.mocked(findCustomerByOAuthId).mockResolvedValue(null);
      vi.mocked(findCustomerByEmail).mockResolvedValue(null);
      vi.mocked(createCustomer).mockResolvedValue(mockCustomer as any);
      vi.mocked(updateLastLogin).mockResolvedValue(undefined);
      vi.mocked(getCustomerCredits).mockResolvedValue(100); // 新用戶預設 Credits

      const request = new NextRequest('http://localhost/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          idToken: 'google-id-token',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.credits).toBe(100);
      expect(createCustomer).toHaveBeenCalled();
      expect(getCustomerCredits).toHaveBeenCalledWith(mockCustomer.id);
    });

    it('應該在綁定現有帳號時返回 Credits', async () => {
      vi.mocked(verifyGoogleToken).mockResolvedValue(mockGoogleUser);
      vi.mocked(findCustomerByOAuthId).mockResolvedValue(null);
      vi.mocked(findCustomerByEmail).mockResolvedValue(mockCustomer as any);
      vi.mocked(linkOAuthId).mockResolvedValue(undefined);
      vi.mocked(updateLastLogin).mockResolvedValue(undefined);
      vi.mocked(getCustomerCredits).mockResolvedValue(250);

      const request = new NextRequest('http://localhost/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          idToken: 'google-id-token',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.credits).toBe(250);
      expect(linkOAuthId).toHaveBeenCalledWith(mockCustomer.id, mockGoogleUser.sub);
      expect(getCustomerCredits).toHaveBeenCalledWith(mockCustomer.id);
    });

    it('應該在查詢 Credits 失敗時仍然允許登入', async () => {
      vi.mocked(verifyGoogleToken).mockResolvedValue(mockGoogleUser);
      vi.mocked(findCustomerByOAuthId).mockResolvedValue(mockCustomer as any);
      vi.mocked(updateLastLogin).mockResolvedValue(undefined);
      vi.mocked(getCustomerCredits).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          idToken: 'google-id-token',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.credits).toBe(0);
    });

    it('應該在 Google Token 無效時不返回 Credits', async () => {
      vi.mocked(verifyGoogleToken).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          idToken: 'invalid-token',
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
