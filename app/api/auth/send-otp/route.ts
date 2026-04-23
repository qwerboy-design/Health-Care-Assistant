import { NextRequest } from 'next/server';
import { sendOTPSchema } from '@/lib/validation/schemas';
import { findCustomerByEmail } from '@/lib/supabase/customers';
import { generateOTP, getOTPExpiryTime } from '@/lib/auth/otp-generator';
import { createOTPToken } from '@/lib/supabase/otp';
import { sendOTPEmail } from '@/lib/email/resend';
import { getRateLimitByEmail, getRateLimitByIP } from '@/lib/rate-limit';
import { errorResponse, successResponse, Errors } from '@/lib/errors';

const GENERIC_SUCCESS_MESSAGE = '如果此 Email 已註冊，驗證碼已寄出';

export async function POST(request: NextRequest) {
  try {
    const ipLimit = await getRateLimitByIP(request, 10);
    if (!ipLimit.allowed) {
      return errorResponse(Errors.TOO_MANY_REQUESTS.message, 429);
    }

    const body = await request.json();
    const validation = sendOTPSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const { email } = validation.data;

    const emailLimit = await getRateLimitByEmail(email, 3);
    if (!emailLimit.allowed) {
      return errorResponse(Errors.TOO_MANY_REQUESTS.message, 429);
    }

    const customer = await findCustomerByEmail(email);
    if (customer) {
      const otp = generateOTP();
      const expiresAt = getOTPExpiryTime();

      await createOTPToken(email, otp, expiresAt);
      await sendOTPEmail({ to: email, name: customer.name, otp });
    }

    return successResponse({ email }, GENERIC_SUCCESS_MESSAGE);
  } catch (error) {
    console.error('Send OTP error:', error);
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
  }
}
