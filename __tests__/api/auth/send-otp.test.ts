import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/customers', () => ({
  findCustomerByEmail: vi.fn(),
}));

vi.mock('@/lib/auth/otp-generator', () => ({
  generateOTP: vi.fn(),
  getOTPExpiryTime: vi.fn(),
}));

vi.mock('@/lib/supabase/otp', () => ({
  createOTPToken: vi.fn(),
  invalidateOTPToken: vi.fn(),
}));

vi.mock('@/lib/email/resend', () => ({
  sendOTPEmail: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  getRateLimitByIP: vi.fn(),
  getRateLimitByEmail: vi.fn(),
}));

import { POST } from '@/app/api/auth/send-otp/route';
import { findCustomerByEmail } from '@/lib/supabase/customers';
import { generateOTP, getOTPExpiryTime } from '@/lib/auth/otp-generator';
import { createOTPToken, invalidateOTPToken } from '@/lib/supabase/otp';
import { sendOTPEmail } from '@/lib/email/resend';
import { getRateLimitByIP, getRateLimitByEmail } from '@/lib/rate-limit';
import type { OTPToken } from '@/types';

describe('POST /api/auth/send-otp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRateLimitByIP).mockReturnValue({ allowed: true } as any);
    vi.mocked(getRateLimitByEmail).mockReturnValue({ allowed: true } as any);
    vi.mocked(invalidateOTPToken).mockResolvedValue(undefined);
    vi.mocked(generateOTP).mockReturnValue('123456');
    vi.mocked(getOTPExpiryTime).mockReturnValue(new Date(Date.now() + 300000));
  });

  it('returns generic success for unknown accounts without sending email', async () => {
    vi.mocked(findCustomerByEmail).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email: 'missing@example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(createOTPToken).not.toHaveBeenCalled();
    expect(sendOTPEmail).not.toHaveBeenCalled();
  });

  it('sends OTP for existing accounts', async () => {
    vi.mocked(findCustomerByEmail).mockResolvedValue({
      id: 'customer-123',
      email: 'test@example.com',
      name: 'Test User',
    } as any);
    vi.mocked(createOTPToken).mockResolvedValue({
      id: 'otp-123',
      email: 'test@example.com',
      token: '123456',
      used: false,
      expires_at: '2024-01-01T00:05:00Z',
      created_at: '2024-01-01T00:00:00Z',
    } satisfies OTPToken);
    vi.mocked(sendOTPEmail).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(createOTPToken).toHaveBeenCalled();
    expect(sendOTPEmail).toHaveBeenCalled();
  });

  it('returns a retryable error when the customer lookup infrastructure is unavailable', async () => {
    const databaseError = Object.assign(new Error('fetch failed'), {
      name: 'SupabaseQueryError',
      code: 'FETCH_FAILED',
    });
    vi.mocked(findCustomerByEmail).mockRejectedValue(databaseError);

    const response = await POST(
      new NextRequest('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('系統暫時無法處理請求，請稍後再試');
    expect(data.error).not.toContain('fetch failed');
    expect(sendOTPEmail).not.toHaveBeenCalled();
  });

  it('surfaces a retryable delivery error for an existing account without exposing recipient details', async () => {
    vi.mocked(findCustomerByEmail).mockResolvedValue({
      id: 'customer-123',
      email: 'user@example.com',
      name: 'Test User',
    } as any);
    vi.mocked(createOTPToken).mockResolvedValue({ id: 'otp-send-failure' } as OTPToken);
    vi.mocked(sendOTPEmail).mockRejectedValue(
      Object.assign(new Error('Resend rejected the request'), {
        name: 'EmailDeliveryError',
        code: 'RESEND_REJECTED',
        status: 422,
      })
    );

    const response = await POST(
      new NextRequest('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('驗證碼寄送失敗，請稍後再試');
    expect(data.error).not.toContain('user@example.com');
    expect(invalidateOTPToken).toHaveBeenCalledWith(expect.any(String));
  });
});
