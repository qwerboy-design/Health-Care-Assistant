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
import { createOTPToken } from '@/lib/supabase/otp';
import { sendOTPEmail } from '@/lib/email/resend';
import { getRateLimitByIP, getRateLimitByEmail } from '@/lib/rate-limit';

describe('POST /api/auth/send-otp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRateLimitByIP).mockReturnValue({ allowed: true } as any);
    vi.mocked(getRateLimitByEmail).mockReturnValue({ allowed: true } as any);
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
    vi.mocked(createOTPToken).mockResolvedValue(undefined);
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
});
