import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getAllCustomers, getPendingCustomers } from '@/lib/supabase/customers';
import { errorResponse, successResponse, Errors } from '@/lib/errors';

// 此路由使用 cookies() 進行身份驗證，必須動態渲染
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof Response) {
      return adminCheck;
    }

    // 取得查詢參數
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;
    const role = searchParams.get('role') as 'user' | 'admin' | null;
    const pendingOnly = searchParams.get('pending_only') === 'true';

    let customers;

    if (pendingOnly) {
      // 只取得待審核用戶
      customers = await getPendingCustomers();
    } else {
      // 取得所有用戶（可篩選）
      customers = await getAllCustomers({
        approval_status: status || undefined,
        role: role || undefined,
      });
    }

    // 移除敏感資訊
    const safeCustomers = customers.map(({ password_hash, ...customer }) => customer);

    return successResponse({
      customers: safeCustomers,
      total: safeCustomers.length,
    });
  } catch (error) {
    console.error('取得用戶列表錯誤:', error);
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
  }
}
