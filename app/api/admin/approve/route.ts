import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { findCustomerById, setInitialPassword } from '@/lib/supabase/customers';
import { errorResponse, successResponse, Errors } from '@/lib/errors';
import { hashPassword } from '@/lib/auth/password';
import { sendDefaultPasswordEmail } from '@/lib/email/resend';

// 生成隨機密碼
function generateRandomPassword(length = 10) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
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
    const { id: targetCustomerId } = body;

    if (!targetCustomerId) {
      return errorResponse('缺少必要參數: id', 400);
    }

    // 取得用戶資訊
    const customer = await findCustomerById(targetCustomerId);
    if (!customer) {
      return errorResponse('找不到該用戶', 404);
    }

    // 生成預設密碼
    const defaultPassword = generateRandomPassword();
    const hashedPassword = await hashPassword(defaultPassword);

    // 更新審核狀態並設定初始密碼
    await setInitialPassword(targetCustomerId, hashedPassword);

    // 發送通知郵件
    try {
      console.log('正在發送審核通過郵件至:', customer.email);
      await sendDefaultPasswordEmail({
        to: customer.email,
        name: customer.name,
        password: defaultPassword,
      });
    } catch (emailError) {
      console.error('發送審核通過郵件失敗:', emailError);
      // 即使郵件發送失敗，審核狀態也已經更新了，所以我們仍然返回成功，但註記一下
      return successResponse(
        { customerId: targetCustomerId, emailSent: false },
        '帳號已通過審核，但郵件發送失敗，請手動告知用戶預設密碼'
      );
    }

    return successResponse(
      { customerId: targetCustomerId, emailSent: true },
      '帳號已通過審核，預設密碼已發送至用戶 Email'
    );
  } catch (error) {
    console.error('審核通過錯誤:', error);
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
  }
}
