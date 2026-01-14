import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from './session';
import { findCustomerById } from '@/lib/supabase/customers';
import { errorResponse, Errors } from '@/lib/errors';

/**
 * 檢查指定用戶是否為管理員
 */
export async function isAdmin(customerId: string): Promise<boolean> {
  try {
    const customer = await findCustomerById(customerId);
    return customer?.role === 'admin';
  } catch (error) {
    console.error('檢查管理員權限錯誤:', error);
    return false;
  }
}

/**
 * 從請求中取得當前用戶 ID
 */
async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  
  if (!sessionToken) {
    return null;
  }
  
  const session = await verifySession(sessionToken);
  return session?.customerId || null;
}

/**
 * 驗證當前用戶是否為管理員（用於 API 路由）
 * 如果不是管理員，返回錯誤回應
 */
export async function requireAdmin(request: NextRequest): Promise<{ customerId: string } | NextResponse> {
  const customerId = await getCurrentUserId(request);
  
  if (!customerId) {
    return errorResponse(Errors.UNAUTHORIZED.message, 401);
  }
  
  const admin = await isAdmin(customerId);
  if (!admin) {
    return errorResponse(Errors.ADMIN_REQUIRED.message, 403);
  }
  
  return { customerId };
}
