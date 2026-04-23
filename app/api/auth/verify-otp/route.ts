import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { otpSchema } from '@/lib/validation/schemas';
import { findCustomerByEmail, updateLastLogin } from '@/lib/supabase/customers';
import { getCustomerCredits } from '@/lib/supabase/credits';
import { verifyOTPToken, markOTPTokenAsUsed } from '@/lib/supabase/otp';
import { createSession } from '@/lib/auth/session';
import { getClientIP, getRateLimitByIP } from '@/lib/rate-limit';
import { errorResponse, successResponse, Errors } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const ipLimit = await getRateLimitByIP(request, 10);
    if (!ipLimit.allowed) {
      return errorResponse(Errors.TOO_MANY_REQUESTS.message, 429);
    }

    const body = await request.json();
    const validation = otpSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const { email, token } = validation.data;
    const { valid, otpToken } = await verifyOTPToken(email, token);
    if (!valid || !otpToken) {
      return errorResponse(Errors.INVALID_OTP.message, 400);
    }

    await markOTPTokenAsUsed(otpToken.id);

    const customer = await findCustomerByEmail(email);
    if (!customer) {
      return errorResponse(Errors.INVALID_OTP.message, 400);
    }

    if (customer.approval_status === 'pending') {
      return errorResponse(Errors.ACCOUNT_PENDING.message, 403);
    }
    if (customer.approval_status === 'rejected') {
      return errorResponse(Errors.ACCOUNT_REJECTED.message, 403);
    }

    await updateLastLogin(customer.id);

    if (!customer.email) {
      return errorResponse(Errors.INTERNAL_ERROR.message, 500);
    }

    const clientIP = getClientIP(request);
    const { token: sessionToken, expiresAt } = await createSession(
      customer.id,
      customer.email,
      clientIP
    );

    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    let credits = 0;
    try {
      credits = await getCustomerCredits(customer.id);
    } catch (error) {
      console.error('Failed to load credits during OTP login:', error);
    }

    return successResponse(
      {
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
        credits,
      },
      '驗證成功'
    );
  } catch (error) {
    console.error('Verify OTP error:', error);
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
  }
}
