import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = {
  push: vi.fn(),
  refresh: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

vi.mock('@/components/providers/LocaleProvider', () => ({
  useLocale: () => ({
    t: (key: string) => ({
      'register.title': 'Register',
      'register.subtitle': 'Create an account',
      'register.haveAccount': 'Already have an account?',
      'register.orUseEmail': 'Use email',
      'register.otpRegister': 'OTP registration',
      'register.passwordRegister': 'Password registration',
      'register.name': 'Name',
      'register.email': 'Email',
      'register.phone': 'Phone',
      'register.password': 'Password',
      'register.passwordHint': 'Use a strong password',
      'register.placeholderName': 'Your name',
      'register.placeholderEmail': 'you@example.com',
      'register.placeholderPhone': 'Phone number',
      'register.placeholderPassword': 'Password',
      'register.processing': 'Processing',
      'register.submit': 'Register',
      'register.codeSentTo': 'Code sent to',
      'register.verifying': 'Verifying',
      'register.verifyAndComplete': 'Verify',
      'register.resendCode': 'Resend code',
      'register.back': 'Back',
      'register.errorNetwork': 'Network error',
      'register.errorRegisterFailed': 'Registration failed',
      'register.errorVerifyFailed': 'Verification failed',
      'register.pendingApproval': 'Pending approval',
      'register.rejected': 'Rejected',
      'register.verifySuccess': 'Verified',
      'register.registerSuccess': 'Registered',
    }[key] || key),
  }),
}));

vi.mock('@/components/auth/GoogleLoginButton', () => ({
  GoogleLoginButton: () => null,
}));

vi.mock('@/components/auth/OTPInput', () => ({
  OTPInput: () => <input aria-label="OTP" />,
}));

vi.mock('@/components/auth/CountdownTimer', () => ({
  CountdownTimer: () => <span>countdown</span>,
}));

import RegisterPage from '@/app/(auth)/register/page';

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('moves to verification and enables resend when registration created the account but OTP delivery failed', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: { otpDeliveryFailed: true },
        message: '註冊已建立，但驗證碼寄送失敗，請稍後重試寄送',
      }),
    } as Response);
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { ok: true } }),
    } as Response);

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      expect(screen.getByText('註冊已建立，但驗證碼寄送失敗，請稍後重試寄送')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Resend code' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Register' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        '/api/auth/send-otp',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
