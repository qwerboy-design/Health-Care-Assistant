import { POST } from '@/app/api/auth/register/route';
import { findCustomerByEmail, createCustomer, checkPhoneExists } from '@/lib/supabase/customers';
import { generateOTP, getOTPExpiryTime } from '@/lib/auth/otp-generator';
import { createOTPToken } from '@/lib/supabase/otp';
import { sendOTPEmail } from '@/lib/email/resend';
import { hashPassword } from '@/lib/auth/password';
import { getRateLimitByEmail } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { vi } from 'vitest';
import type { Customer, OTPToken } from '@/types';

// Mock dependencies (Vitest)
vi.mock('@/lib/supabase/customers', () => ({
  findCustomerByEmail: vi.fn(),
  createCustomer: vi.fn(),
  checkPhoneExists: vi.fn(),
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

vi.mock('@/lib/auth/password', () => ({
  hashPassword: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  getRateLimitByIP: vi.fn(() => ({ allowed: true })),
  getRateLimitByEmail: vi.fn(() => ({ allowed: true })),
  getClientIP: vi.fn(() => '127.0.0.1'),
}));

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.error to avoid noise in test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('回歸測試 - 現有功能', () => {
    it('應成功註冊使用 OTP 的用戶（需要 email）', async () => {
      // Arrange
      const mockCustomer: Customer = {
        id: 'customer-123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '0912345678',
        auth_provider: 'otp',
        approval_status: 'pending' as const,
        role: 'user' as const,
        credits: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(findCustomerByEmail).mockResolvedValue(null);
      vi.mocked(checkPhoneExists).mockResolvedValue(false);
      vi.mocked(createCustomer).mockResolvedValue(mockCustomer);
      vi.mocked(generateOTP).mockReturnValue('123456');
      vi.mocked(getOTPExpiryTime).mockReturnValue(new Date());
      vi.mocked(createOTPToken).mockResolvedValue({
        id: 'otp-123',
        email: 'test@example.com',
        token: '123456',
        used: false,
        expires_at: '2024-01-01T00:05:00Z',
        created_at: '2024-01-01T00:00:00Z',
      } satisfies OTPToken);
      vi.mocked(sendOTPEmail).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          phone: '0912345678',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.authProvider).toBe('otp');
      expect(createCustomer).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        phone: '0912345678',
        password_hash: undefined,
        auth_provider: 'otp',
      });
      expect(sendOTPEmail).toHaveBeenCalled();
    });

    it('應成功註冊使用密碼的用戶（需要 email）', async () => {
      // Arrange
      const mockCustomer: Customer = {
        id: 'customer-456',
        email: 'password@example.com',
        name: 'Password User',
        phone: '0987654321',
        auth_provider: 'password',
        approval_status: 'pending' as const,
        role: 'user' as const,
        credits: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(findCustomerByEmail).mockResolvedValue(null);
      vi.mocked(checkPhoneExists).mockResolvedValue(false);
      vi.mocked(createCustomer).mockResolvedValue(mockCustomer);
      vi.mocked(hashPassword).mockResolvedValue('hashed_password');

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'password@example.com',
          name: 'Password User',
          phone: '0987654321',
          password: 'SecurePass123',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.authProvider).toBe('password');
      expect(createCustomer).toHaveBeenCalledWith({
        email: 'password@example.com',
        name: 'Password User',
        phone: '0987654321',
        password_hash: 'hashed_password',
        auth_provider: 'password',
      });
      expect(sendOTPEmail).not.toHaveBeenCalled();
    });

    it('應成功註冊使用密碼的用戶（不需要 email）', async () => {
      // Arrange
      const mockCustomer: Customer = {
        id: 'customer-789',
        email: '0987654321@no-email.local',
        name: 'Password User',
        phone: '0987654321',
        auth_provider: 'password',
        approval_status: 'pending' as const,
        role: 'user' as const,
        credits: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(findCustomerByEmail).mockResolvedValue(null);
      vi.mocked(checkPhoneExists).mockResolvedValue(false);
      vi.mocked(createCustomer).mockResolvedValue(mockCustomer);
      vi.mocked(hashPassword).mockResolvedValue('hashed_password');

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Password User',
          phone: '0987654321',
          password: 'SecurePass123',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.authProvider).toBe('password');
      expect(createCustomer).toHaveBeenCalledWith({
        email: '0987654321@no-email.local',
        name: 'Password User',
        phone: '0987654321',
        password_hash: 'hashed_password',
        auth_provider: 'password',
      });
      expect(sendOTPEmail).not.toHaveBeenCalled();
      expect(findCustomerByEmail).not.toHaveBeenCalled();
      expect(getRateLimitByEmail).not.toHaveBeenCalled();
    });

    it('當 email 已存在時應回傳 409 錯誤', async () => {
      // Arrange
      vi.mocked(findCustomerByEmail).mockResolvedValue({
        id: 'existing-user',
        name: 'Existing User',
        auth_provider: 'otp',
        approval_status: 'pending',
        role: 'user',
        credits: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          name: 'Test User',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
    });

    it('當電話號碼已存在時應回傳 409 錯誤', async () => {
      // Arrange
      vi.mocked(findCustomerByEmail).mockResolvedValue(null);
      vi.mocked(checkPhoneExists).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          phone: '0912345678',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
    });
  });

  it('returns a retryable database error instead of continuing registration when the email lookup fails', async () => {
    vi.mocked(findCustomerByEmail).mockRejectedValue(
      Object.assign(new Error('fetch failed'), {
        name: 'SupabaseQueryError',
        code: 'FETCH_FAILED',
      })
    );

    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', name: 'Test User' }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('系統暫時無法處理請求，請稍後再試');
    expect(data.error).not.toContain('fetch failed');
    expect(createCustomer).not.toHaveBeenCalled();
  });

  it('tells a newly created OTP account to retry when Resend cannot deliver the code', async () => {
    const mockCustomer: Customer = {
      id: 'customer-delivery-failure',
      email: 'user@example.com',
      name: 'Test User',
      auth_provider: 'otp',
      approval_status: 'pending',
      role: 'user',
      credits: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    vi.mocked(findCustomerByEmail).mockResolvedValue(null);
    vi.mocked(checkPhoneExists).mockResolvedValue(false);
    vi.mocked(createCustomer).mockResolvedValue(mockCustomer);
    vi.mocked(createOTPToken).mockResolvedValue({} as OTPToken);
    vi.mocked(sendOTPEmail).mockRejectedValue(
      Object.assign(new Error('Resend rejected the request'), {
        name: 'EmailDeliveryError',
        code: 'RESEND_REJECTED',
        status: 422,
      })
    );

    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', name: 'Test User' }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.otpDeliveryFailed).toBe(true);
    expect(data.message).toBe('註冊已建立，但驗證碼寄送失敗，請稍後重試寄送');
    expect(JSON.stringify(data)).not.toContain('user@example.com');
    expect(createCustomer).toHaveBeenCalledOnce();
  });
});
