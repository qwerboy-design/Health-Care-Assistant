import { NextRequest } from 'next/server';
import { hashPassword } from '@/lib/auth/password';
import { updatePassword, findCustomerByEmail, updateAuthProvider } from '@/lib/supabase/customers';
import { errorResponse, successResponse, Errors } from '@/lib/errors';
import { verifySession } from '@/lib/auth/session';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password, confirmPassword } = body;

        if (!email || !password || !confirmPassword) {
            return errorResponse('請填寫所有欄位', 400);
        }

        if (password !== confirmPassword) {
            return errorResponse('兩次輸入的密碼不一致', 400);
        }

        if (password.length < 8) {
            return errorResponse('密碼長度至少需要 8 個字元', 400);
        }

        // 驗證 Session 以確保用戶有權限更改密碼
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('session')?.value;

        if (!sessionToken) {
            return errorResponse('未經授權的操作，請先驗證 OTP', 401);
        }

        const payload = await verifySession(sessionToken);
        if (!payload || payload.email !== email) {
            return errorResponse('認證無效，請重新驗證 OTP', 401);
        }

        const customer = await findCustomerByEmail(email);
        if (!customer) {
            return errorResponse(Errors.USER_NOT_FOUND.message, 404);
        }

        const passwordHash = await hashPassword(password);
        await updatePassword(customer.id, passwordHash);

        // 設定密碼後，將認證方式改為 'password'，這樣使用者就可以用密碼登入了
        await updateAuthProvider(customer.id, 'password');

        return successResponse(null, '密碼設定成功');
    } catch (error) {
        console.error('設定密碼錯誤:', error);
        return errorResponse(Errors.INTERNAL_ERROR.message, 500);
    }
}
