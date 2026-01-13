import { NextRequest } from 'next/server';
import { otpSchema } from '@/lib/validation/schemas';
import { findCustomerByEmail, updateLastLogin } from '@/lib/supabase/customers';
import { verifyOTPToken, markOTPTokenAsUsed } from '@/lib/supabase/otp';
import { createSession } from '@/lib/auth/session';
import { getClientIP, getRateLimitByIP } from '@/lib/rate-limit';
import { errorResponse, successResponse, Errors } from '@/lib/errors';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ipLimit = getRateLimitByIP(request, 10);
    if (!ipLimit.allowed) {
      return errorResponse(Errors.TOO_MANY_REQUESTS.message, 429);
    }

    // 解析請求
    const body = await request.json();
    
    // 驗證輸入
    const validation = otpSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const { email, token } = validation.data;

    // 驗證 OTP
    const { valid, otpToken } = await verifyOTPToken(email, token);
    if (!valid || !otpToken) {
      return errorResponse(Errors.INVALID_OTP.message, 400);
    }

    // 標記 OTP 為已使用
    await markOTPTokenAsUsed(otpToken.id);

    // 查找客戶
    const customer = await findCustomerByEmail(email);
    if (!customer) {
      return errorResponse(Errors.USER_NOT_FOUND.message, 404);
    }

    // 更新最後登入時間
    await updateLastLogin(customer.id);

    // 建立 Session
    const clientIP = getClientIP(request);
    const { token: sessionToken, expiresAt } = await createSession(
      customer.id,
      customer.email,
      clientIP
    );

    // 設定 Cookie
    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return successResponse(
      {
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
      },
      '驗證成功'
    );
  } catch (error) {
    console.error('驗證 OTP 錯誤:', error);
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
  }
}
