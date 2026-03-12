import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { findCustomerById } from '@/lib/supabase/customers';
import { errorResponse, successResponse, Errors } from '@/lib/errors';
import { hashPassword } from '@/lib/auth/password';
import { supabaseAdmin } from '@/lib/supabase/client';

// 生成隨機密碼
function generateRandomPassword(length = 10): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let retVal = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
}

export async function POST(request: NextRequest) {
  try {
    // 驗證管理員權限
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof Response) {
      return adminCheck;
    }

    // 解析請求
    const body = await request.json();
    const { customerId } = body;

    if (!customerId) {
      return errorResponse('缺少必要參數: customerId', 400);
    }

    // 取得用戶資訊
    const customer = await findCustomerById(customerId);
    if (!customer) {
      return errorResponse('找不到該用戶', 404);
    }

    // 生成臨時密碼（10位，包含大小寫字母和數字）
    const temporaryPassword = generateRandomPassword(10);
    const hashedPassword = await hashPassword(temporaryPassword);

    // 更新密碼並設定 requires_password_reset 為 true
    const { error } = await supabaseAdmin
      .from('customers')
      .update({
        password_hash: hashedPassword,
        requires_password_reset: true,
        auth_provider: 'password',
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId);

    if (error) {
      console.error('更新密碼失敗:', error);
      return errorResponse(`更新密碼失敗: ${error.message}`, 500);
    }

    console.log(`管理員重設密碼成功 - 使用者 ID: ${customerId}`);

    // 回傳臨時密碼（僅此一次）
    return successResponse(
      { 
        customerId, 
        temporaryPassword,
        customerName: customer.name,
        customerEmail: customer.email
      },
      '密碼重設成功'
    );
  } catch (error) {
    console.error('重設密碼錯誤:', error);
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
  }
}
