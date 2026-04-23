import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { registerSchema } from '@/lib/validation/schemas';
import { findCustomerByEmail, createCustomer, checkPhoneExists } from '@/lib/supabase/customers';
import { generateOTP, getOTPExpiryTime } from '@/lib/auth/otp-generator';
import { createOTPToken } from '@/lib/supabase/otp';
import { sendOTPEmail } from '@/lib/email/resend';
import { hashPassword } from '@/lib/auth/password';
import { getRateLimitByIP, getRateLimitByEmail } from '@/lib/rate-limit';
import { errorResponse, successResponse, Errors } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const ipLimit = await getRateLimitByIP(request, 10);
    if (!ipLimit.allowed) {
      return errorResponse(Errors.TOO_MANY_REQUESTS.message, 429);
    }

    const body = await request.json();
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const { email, name, phone, password } = validation.data;

    const authProvider = password ? 'password' : 'otp';
    const passwordHash = password ? await hashPassword(password) : undefined;

    if (authProvider === 'otp') {
      if (!email) {
        return errorResponse('Email 為必填', 400);
      }

      const emailLimit = await getRateLimitByEmail(email, 5);
      if (!emailLimit.allowed) {
        return errorResponse(Errors.TOO_MANY_REQUESTS.message, 429);
      }

      const existingCustomer = await findCustomerByEmail(email);
      if (existingCustomer) {
        return errorResponse(Errors.EMAIL_EXISTS.message, 409);
      }
    }

    if (phone) {
      const phoneExists = await checkPhoneExists(phone);
      if (phoneExists) {
        return errorResponse(Errors.PHONE_EXISTS.message, 409);
      }
    }

    const buildPasswordPlaceholderEmail = (): string => {
      if (email) return email;
      if (phone) {
        const digits = phone.replace(/\D/g, '');
        const localPart = digits.length > 0 ? digits : `user-${randomUUID().slice(0, 8)}`;
        return `${localPart}@no-email.local`;
      }
      return `user-${randomUUID()}@no-email.local`;
    };

    const effectiveEmail = authProvider === 'password' ? buildPasswordPlaceholderEmail() : email;

    const customerInput =
      authProvider === 'password'
        ? {
            email: effectiveEmail,
            name,
            phone,
            password_hash: passwordHash,
            auth_provider: authProvider as 'password',
          }
        : {
            email: effectiveEmail,
            name,
            phone,
            password_hash: undefined,
            auth_provider: authProvider as 'otp',
          };

    const customer = await createCustomer(customerInput);

    if (authProvider === 'password') {
      return successResponse(
        {
          customerId: customer.id,
          email: customer.email,
          authProvider,
        },
        '註冊成功，請等待管理員審核'
      );
    }

    const toEmail = email;
    if (!toEmail) {
      return errorResponse('Email 為必填', 400);
    }

    const otp = generateOTP();
    const expiresAt = getOTPExpiryTime();

    await createOTPToken(toEmail, otp, expiresAt);
    await sendOTPEmail({ to: toEmail, name: customer.name, otp });

    return successResponse(
      {
        customerId: customer.id,
        email: customer.email,
        authProvider,
      },
      '註冊成功，請檢查 Email 驗證碼並完成登入'
    );
  } catch (error) {
    console.error('Register error:', error);
    const errorMessage = error instanceof Error ? error.message : '未知錯誤';
    return errorResponse(`${Errors.INTERNAL_ERROR.message}: ${errorMessage}`, 500);
  }
}
