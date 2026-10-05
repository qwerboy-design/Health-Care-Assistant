import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const resendMocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: resendMocks.send };
  },
}));

import { sendOTPEmail } from '@/lib/email/resend';

describe('Resend email adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('RESEND_FROM_EMAIL', 'noreply@example.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fails closed when the Resend API key is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');

    await expect(
      sendOTPEmail({ to: 'user@example.com', name: 'Test User', otp: '123456' })
    ).rejects.toMatchObject({
      name: 'EmailDeliveryError',
      code: 'RESEND_API_KEY_MISSING',
    });
    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it('fails closed when the sender address is invalid', async () => {
    vi.stubEnv('RESEND_FROM_EMAIL', 'not-an-email');

    await expect(
      sendOTPEmail({ to: 'user@example.com', name: 'Test User', otp: '123456' })
    ).rejects.toMatchObject({
      name: 'EmailDeliveryError',
      code: 'RESEND_FROM_EMAIL_INVALID',
    });
    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it('fails closed when the sender address is missing', async () => {
    vi.stubEnv('RESEND_FROM_EMAIL', '');

    await expect(
      sendOTPEmail({ to: 'user@example.com', name: 'Test User', otp: '123456' })
    ).rejects.toMatchObject({
      name: 'EmailDeliveryError',
      code: 'RESEND_FROM_EMAIL_MISSING',
    });
    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it('exposes safe delivery metadata and never logs OTP or full recipient details', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    resendMocks.send.mockResolvedValue({
      data: null,
      error: {
        name: 'validation_error',
        message: 'The recipient user@example.com is not verified',
        statusCode: 422,
      },
    });

    await expect(
      sendOTPEmail({ to: 'user@example.com', name: 'Test User', otp: '123456' })
    ).rejects.toMatchObject({
      name: 'EmailDeliveryError',
      code: 'validation_error',
      status: 422,
    });

    const output = JSON.stringify([...consoleError.mock.calls, ...consoleLog.mock.calls]);
    expect(output).toContain('validation_error');
    expect(output).toContain('422');
    expect(output).not.toContain('user@example.com');
    expect(output).not.toContain('123456');
  });

  it('does not log the recipient on successful delivery', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    resendMocks.send.mockResolvedValue({ data: { id: 'message-123' }, error: null });

    await expect(
      sendOTPEmail({ to: 'user@example.com', name: 'Test User', otp: '123456' })
    ).resolves.toBeUndefined();

    expect(JSON.stringify(consoleLog.mock.calls)).not.toContain('user@example.com');
    expect(JSON.stringify(consoleLog.mock.calls)).not.toContain('123456');
  });
});
