import { POST } from '@/app/api/auth/register/route';
import { findCustomerByEmail, createCustomer, checkPhoneExists } from '@/lib/supabase/customers';
import { generateOTP, getOTPExpiryTime } from '@/lib/auth/otp-generator';
import { createOTPToken } from '@/lib/supabase/otp';
import { sendOTPEmail } from '@/lib/email/resend';
import { hashPassword } from '@/lib/auth/password';
import { getRateLimitByEmail } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { vi } from 'vitest';

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
      const mockCustomer = {
        id: 'customer-123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '0912345678',
        auth_provider: 'otp',
      };

      vi.mocked(findCustomerByEmail).mockResolvedValue(null);
      vi.mocked(checkPhoneExists).mockResolvedValue(false);
      vi.mocked(createCustomer).mockResolvedValue(mockCustomer);
      vi.mocked(generateOTP).mockReturnValue('123456');
      vi.mocked(getOTPExpiryTime).mockReturnValue(new Date());
      vi.mocked(createOTPToken).mockResolvedValue(undefined);
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
      const mockCustomer = {
        id: 'customer-456',
        email: 'password@example.com',
        name: 'Password User',
        phone: '0987654321',
        auth_provider: 'password',
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
      const mockCustomer = {
        id: 'customer-789',
        email: '0987654321@no-email.local',
        name: 'Password User',
        phone: '0987654321',
        auth_provider: 'password',
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
      vi.mocked(findCustomerByEmail).mockResolvedValue({ id: 'existing-user' });

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
});
