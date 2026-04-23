import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { googleOAuthSchema } from '@/lib/validation/schemas';
import { verifyGoogleToken } from '@/lib/auth/google-oauth';
import {
  findCustomerByEmail,
  findCustomerByOAuthId,
  createCustomer,
  updateLastLogin,
  linkOAuthId,
} from '@/lib/supabase/customers';
import { getCustomerCredits } from '@/lib/supabase/credits';
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
    const validation = googleOAuthSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const { idToken } = validation.data;
    const googleUser = await verifyGoogleToken(idToken);
    if (!googleUser) {
      return errorResponse('Google 驗證失敗', 401);
    }

    if (!googleUser.email_verified) {
      return errorResponse('Google Email 尚未驗證', 400);
    }

    let customer = await findCustomerByOAuthId(googleUser.sub);

    if (!customer) {
      customer = await findCustomerByEmail(googleUser.email);

      if (customer) {
        await linkOAuthId(customer.id, googleUser.sub);
      } else {
        customer = await createCustomer({
          email: googleUser.email,
          name: googleUser.name,
          auth_provider: 'google',
          oauth_id: googleUser.sub,
        });
      }
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
    const { token, expiresAt } = await createSession(customer.id, customer.email, clientIP);

    const cookieStore = await cookies();
    cookieStore.set('session', token, {
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
      console.error('Failed to load credits during Google login:', error);
    }

    return successResponse(
      {
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
        credits,
        token,
      },
      'Google 登入成功'
    );
  } catch (error) {
    console.error('Google OAuth error:', error);
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
  }
}
