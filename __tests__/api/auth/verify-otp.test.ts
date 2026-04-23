import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({}),
} as any);

vi.mock('@/lib/supabase/customers', () => ({
  findCustomerByEmail: vi.fn(),
  updateLastLogin: vi.fn(),
}));

vi.mock('@/lib/supabase/credits', () => ({
  getCustomerCredits: vi.fn(),
}));

vi.mock('@/lib/supabase/otp', () => ({
  verifyOTPToken: vi.fn(),
  markOTPTokenAsUsed: vi.fn(),
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

import { POST } from '@/app/api/auth/verify-otp/route';
import { findCustomerByEmail, updateLastLogin } from '@/lib/supabase/customers';
import { getCustomerCredits } from '@/lib/supabase/credits';
import { verifyOTPToken, markOTPTokenAsUsed } from '@/lib/supabase/otp';
import { createSession } from '@/lib/auth/session';
import { getClientIP, getRateLimitByIP } from '@/lib/rate-limit';
import { cookies } from 'next/headers';

describe('POST /api/auth/verify-otp - Credits Integration', () => {
  const mockCookieStore = {
    set: vi.fn(),
  };

  const mockCustomer = {
    id: 'customer-123',
    email: 'test@example.com',
    name: 'Test User',
    approval_status: 'approved',
  };

  const mockOTPToken = {
    id: 'otp-123',
    email: 'test@example.com',
    token: '123456',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getRateLimitByIP).mockReturnValue({ allowed: true } as any);
    vi.mocked(getClientIP).mockReturnValue('127.0.0.1');
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
    vi.mocked(createSession).mockResolvedValue({
      token: 'session-token',
      expiresAt: new Date(Date.now() + 86400000),
    } as any);
  });

  it('returns credits on successful OTP verification', async () => {
    vi.mocked(verifyOTPToken).mockResolvedValue({ valid: true, otpToken: mockOTPToken } as any);
    vi.mocked(markOTPTokenAsUsed).mockResolvedValue(undefined);
    vi.mocked(findCustomerByEmail).mockResolvedValue(mockCustomer as any);
    vi.mocked(updateLastLogin).mockResolvedValue(undefined);
    vi.mocked(getCustomerCredits).mockResolvedValue(150);

    const request = new NextRequest('http://localhost/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        token: '123456',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.credits).toBe(150);
    expect(data.data.token).toBeUndefined();
    expect(getCustomerCredits).toHaveBeenCalledWith(mockCustomer.id);
  });

  it('falls back to zero credits when credit lookup fails', async () => {
    vi.mocked(verifyOTPToken).mockResolvedValue({ valid: true, otpToken: mockOTPToken } as any);
    vi.mocked(markOTPTokenAsUsed).mockResolvedValue(undefined);
    vi.mocked(findCustomerByEmail).mockResolvedValue(mockCustomer as any);
    vi.mocked(updateLastLogin).mockResolvedValue(undefined);
    vi.mocked(getCustomerCredits).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        token: '123456',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.credits).toBe(0);
  });

  it('does not expose credits on invalid OTP', async () => {
    vi.mocked(verifyOTPToken).mockResolvedValue({ valid: false, otpToken: null });

    const request = new NextRequest('http://localhost/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        token: 'wrong-token',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.data?.credits).toBeUndefined();
    expect(getCustomerCredits).not.toHaveBeenCalled();
  });

  it('returns generic invalid OTP when the customer record is missing', async () => {
    vi.mocked(verifyOTPToken).mockResolvedValue({ valid: true, otpToken: mockOTPToken } as any);
    vi.mocked(markOTPTokenAsUsed).mockResolvedValue(undefined);
    vi.mocked(findCustomerByEmail).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        token: '123456',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(getCustomerCredits).not.toHaveBeenCalled();
  });
});
