import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { findCustomerById } from '@/lib/supabase/customers';
import { errorResponse, successResponse, Errors } from '@/lib/errors';
import { cookies } from 'next/headers';

// 此路由使用 cookies() 進行身份驗證，必須動態渲染
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/me/route.ts:7',message:'GET /api/auth/me entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ME'})}).catch(()=>{});
  // #endregion
  try {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/me/route.ts:11',message:'Before cookies()',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ME'})}).catch(()=>{});
    // #endregion
    const cookieStore = await cookies();
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/me/route.ts:14',message:'After cookies()',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ME'})}).catch(()=>{});
    // #endregion
    const sessionToken = cookieStore.get('session')?.value;
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/me/route.ts:17',message:'Session token check',data:{hasToken:!!sessionToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ME'})}).catch(()=>{});
    // #endregion

    if (!sessionToken) {
      return errorResponse(Errors.UNAUTHORIZED.message, 401);
    }

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/me/route.ts:24',message:'Before verifySession',data:{hasToken:!!sessionToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ME'})}).catch(()=>{});
    // #endregion
    const session = await verifySession(sessionToken);
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/me/route.ts:27',message:'After verifySession',data:{hasSession:!!session,customerId:session?.customerId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ME'})}).catch(()=>{});
    // #endregion
    if (!session) {
      return errorResponse(Errors.UNAUTHORIZED.message, 401);
    }

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/me/route.ts:32',message:'Before findCustomerById',data:{customerId:session.customerId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ME'})}).catch(()=>{});
    // #endregion
    const customer = await findCustomerById(session.customerId);
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/me/route.ts:35',message:'After findCustomerById',data:{found:!!customer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ME'})}).catch(()=>{});
    // #endregion
    if (!customer) {
      return errorResponse(Errors.USER_NOT_FOUND.message, 404);
    }

    return successResponse({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      authProvider: customer.auth_provider,
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/me/route.ts:47',message:'Error caught',data:{errorMessage:error instanceof Error?error.message:String(error),errorName:error instanceof Error?error.name:undefined,errorStack:error instanceof Error?error.stack?.substring(0,200):undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ME'})}).catch(()=>{});
    // #endregion
    console.error('獲取用戶資料錯誤:', error);
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
  }
}
