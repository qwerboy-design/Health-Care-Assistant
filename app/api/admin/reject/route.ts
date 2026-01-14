import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { updateApprovalStatus } from '@/lib/supabase/customers';
import { errorResponse, successResponse, Errors } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof Response) {
      return adminCheck;
    }

    const { customerId } = adminCheck;

    // 解析請求
    const body = await request.json();
    const { id: targetCustomerId } = body;

    if (!targetCustomerId) {
      return errorResponse('缺少必要參數: id', 400);
    }

    // 更新審核狀態
    await updateApprovalStatus(targetCustomerId, 'rejected');

    return successResponse(
      { customerId: targetCustomerId },
      '帳號已拒絕'
    );
  } catch (error) {
    console.error('拒絕帳號錯誤:', error);
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
  }
}
