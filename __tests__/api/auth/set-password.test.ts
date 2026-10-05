import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/customers', () => ({
  findCustomerByEmail: vi.fn(),
  updatePassword: vi.fn(),
  updateAuthProvider: vi.fn(),
}));

vi.mock('@/lib/auth/password', () => ({
  hashPassword: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  verifySession: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { POST } from '@/app/api/auth/set-password/route';
import { findCustomerByEmail } from '@/lib/supabase/customers';
import { verifySession } from '@/lib/auth/session';
import { cookies } from 'next/headers';

describe('POST /api/auth/set-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: 'session-token' }) } as any);
    vi.mocked(verifySession).mockResolvedValue({ email: 'user@example.com' } as any);
  });

  it('returns a retryable error when the customer lookup is unavailable', async () => {
    vi.mocked(findCustomerByEmail).mockRejectedValue(
      Object.assign(new Error('fetch failed'), {
        name: 'SupabaseQueryError',
        code: 'FETCH_FAILED',
      })
    );

    const response = await POST(
      new NextRequest('http://localhost/api/auth/set-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('系統暫時無法處理請求，請稍後再試');
  });
});
