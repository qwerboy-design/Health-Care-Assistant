import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';
import { findCustomerById } from '@/lib/supabase/customers';
import { errorResponse, successResponse, Errors } from '@/lib/errors';

// 此路由使用 cookies() 進行身份驗證，必須動態渲染
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/admin-check
 * 檢查當前用戶是否為管理員（四步驗證）
 * 1. Session 是否存在
 * 2. Session 是否過期
 * 3. User 是否存在
 * 4. User role 是否為 admin
 */
export async function GET(request: NextRequest) {
  try {
    // 步驟 1: 檢查 Session 是否存在
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (!sessionToken) {
      return errorResponse('Session 不存在', 401);
    }

    // 步驟 2: 驗證 Session 是否過期
    const session = await verifySession(sessionToken);
    
    if (!session) {
      return errorResponse('Session 已過期或無效', 401);
    }

    // 步驟 3: 檢查 User 是否存在
    const customer = await findCustomerById(session.customerId);
    
    if (!customer) {
      return errorResponse('用戶不存在', 404);
    }

    // 步驟 4: 檢查 User role 是否為 admin
    if (customer.role !== 'admin') {
      return errorResponse('權限不足：需要管理員權限', 403);
    }

    // 所有檢查通過
    return successResponse({
      isAdmin: true,
      customerId: customer.id,
      email: customer.email,
    });
  } catch (error) {
    console.error('Admin check 錯誤:', error);
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
  }
}
