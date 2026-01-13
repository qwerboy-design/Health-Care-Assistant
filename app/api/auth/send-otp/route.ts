import { NextRequest } from 'next/server';
import { sendOTPSchema } from '@/lib/validation/schemas';
import { findCustomerByEmail } from '@/lib/supabase/customers';
import { generateOTP, getOTPExpiryTime } from '@/lib/auth/otp-generator';
import { createOTPToken } from '@/lib/supabase/otp';
import { sendOTPEmail } from '@/lib/email/resend';
import { getRateLimitByEmail, getRateLimitByIP } from '@/lib/rate-limit';
import { errorResponse, successResponse, Errors } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - IP
    const ipLimit = getRateLimitByIP(request, 10);
    if (!ipLimit.allowed) {
      return errorResponse(Errors.TOO_MANY_REQUESTS.message, 429);
    }

    // 解析請求
    const body = await request.json();
    
    // 驗證輸入
    const validation = sendOTPSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const { email } = validation.data;

    // Rate limiting - Email
    const emailLimit = getRateLimitByEmail(email, 3);
    if (!emailLimit.allowed) {
      return errorResponse('發送過於頻繁，請稍後再試', 429);
    }

    // 查找客戶
    const customer = await findCustomerByEmail(email);
    if (!customer) {
      return errorResponse(Errors.USER_NOT_FOUND.message, 404);
    }

    // 生成並發送 OTP
    const otp = generateOTP();
    const expiresAt = getOTPExpiryTime();
    
    await createOTPToken(email, otp, expiresAt);
    await sendOTPEmail({ to: email, name: customer.name, otp });

    return successResponse(
      { email },
      'OTP 驗證碼已發送到您的 Email'
    );
  } catch (error) {
    console.error('發送 OTP 錯誤:', error);
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
  }
}
