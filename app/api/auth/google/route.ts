import { NextRequest } from 'next/server';
import { googleOAuthSchema } from '@/lib/validation/schemas';
import { verifyGoogleToken } from '@/lib/auth/google-oauth';
import { findCustomerByEmail, findCustomerByOAuthId, createCustomer, updateLastLogin, linkOAuthId } from '@/lib/supabase/customers';
import { getCustomerCredits } from '@/lib/supabase/credits';
import { createSession } from '@/lib/auth/session';
import { getClientIP, getRateLimitByIP } from '@/lib/rate-limit';
import { errorResponse, successResponse, Errors } from '@/lib/errors';
import { cookies } from 'next/headers';

// 此路由使用 cookies() 設定 Session，必須動態渲染
export const dynamic = 'force-dynamic';

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
    const validation = googleOAuthSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const { idToken } = validation.data;

    // 驗證 Google Token
    const googleUser = await verifyGoogleToken(idToken);
    if (!googleUser) {
      return errorResponse('Google 認證失敗', 401);
    }

    if (!googleUser.email_verified) {
      return errorResponse('Google 帳號 Email 未驗證', 400);
    }

    // 檢查是否已有客戶
    let customer = await findCustomerByOAuthId(googleUser.sub);
    
    if (!customer) {
      // 檢查是否有相同 Email 的客戶
      customer = await findCustomerByEmail(googleUser.email);
      
      if (customer) {
        // 綁定 OAuth ID 到現有帳號
        await linkOAuthId(customer.id, googleUser.sub);
      } else {
        // 建立新客戶
        customer = await createCustomer({
          email: googleUser.email,
          name: googleUser.name,
          auth_provider: 'google',
          oauth_id: googleUser.sub,
        });
      }
    }

    // 檢查審核狀態
    if (customer.approval_status === 'pending') {
      return errorResponse(Errors.ACCOUNT_PENDING.message, 403);
    }
    if (customer.approval_status === 'rejected') {
      return errorResponse(Errors.ACCOUNT_REJECTED.message, 403);
    }

    // 更新最後登入時間
    await updateLastLogin(customer.id);

    // 建立 Session
    const clientIP = getClientIP(request);
    const { token, expiresAt } = await createSession(customer.id, customer.email, clientIP);

    // 設定 Cookie
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    // 查詢用戶 Credits
    let credits = 0;
    try {
      credits = await getCustomerCredits(customer.id);
    } catch (error) {
      console.error('查詢 Credits 失敗:', error);
      // 即使查詢失敗，仍然允許登入，Credits 預設為 0
    }

    return successResponse(
      {
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
        credits,
      },
      'Google 登入成功'
    );
  } catch (error) {
    console.error('Google OAuth 錯誤:', error);
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
  }
}
