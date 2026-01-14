import { NextRequest } from 'next/server';
import { registerSchema } from '@/lib/validation/schemas';
import { findCustomerByEmail, createCustomer, checkPhoneExists } from '@/lib/supabase/customers';
import { generateOTP, getOTPExpiryTime } from '@/lib/auth/otp-generator';
import { createOTPToken } from '@/lib/supabase/otp';
import { sendOTPEmail } from '@/lib/email/resend';
import { hashPassword } from '@/lib/auth/password';
import { getRateLimitByIP, getRateLimitByEmail, getClientIP } from '@/lib/rate-limit';
import { errorResponse, successResponse, Errors } from '@/lib/errors';
import { createSession } from '@/lib/auth/session';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  // #region agent log
  const logData = {
    location: 'app/api/auth/register/route.ts:14',
    message: 'POST /api/auth/register entry',
    data: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.SUPABASE_URL || 'NOT SET',
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'A'
  };
  fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData) }).catch(() => {});
  // #endregion
  try {
    // Rate limiting - IP
    const ipLimit = getRateLimitByIP(request, 10);
    if (!ipLimit.allowed) {
      return errorResponse(Errors.TOO_MANY_REQUESTS.message, 429);
    }

    // 解析請求
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/register/route.ts:21',message:'Before parsing request body',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const body = await request.json();
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/register/route.ts:23',message:'Request body parsed',data:{hasEmail:!!body.email,hasName:!!body.name,hasPhone:!!body.phone,hasPassword:!!body.password},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // 驗證輸入
    const validation = registerSchema.safeParse(body);
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/register/route.ts:26',message:'Validation result',data:{success:validation.success,errors:validation.success?[]:validation.error.issues.map((e:any)=>e.message)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const { email, name, phone, password } = validation.data;

    // Rate limiting - Email
    const emailLimit = getRateLimitByEmail(email, 5);
    if (!emailLimit.allowed) {
      return errorResponse(Errors.TOO_MANY_REQUESTS.message, 429);
    }

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/register/route.ts:65',message:'Before findCustomerByEmail',data:{email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // 檢查 Email 是否已被註冊
    const existingCustomer = await findCustomerByEmail(email);
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/register/route.ts:68',message:'After findCustomerByEmail',data:{found:!!existingCustomer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (existingCustomer) {
      return errorResponse(Errors.EMAIL_EXISTS.message, 409);
    }

    // 檢查電話號碼是否已被註冊
    if (phone) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/register/route.ts:74',message:'Before checkPhoneExists',data:{phone},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const phoneExists = await checkPhoneExists(phone);
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/register/route.ts:77',message:'After checkPhoneExists',data:{phoneExists},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (phoneExists) {
        return errorResponse(Errors.PHONE_EXISTS.message, 409);
      }
    }

    // 決定認證方式
    const authProvider = password ? 'password' : 'otp';
    const passwordHash = password ? await hashPassword(password) : undefined;

    // 建立客戶
    const customer = await createCustomer({
      email,
      name,
      phone,
      password_hash: passwordHash,
      auth_provider: authProvider,
    });

    // 根據認證方式處理
    if (authProvider === 'password') {
      // 密碼註冊：不自動登入，等待審核
      return successResponse(
        { 
          customerId: customer.id,
          email: customer.email,
          authProvider,
        },
        '註冊成功，請等待管理員審核'
      );
    } else {
      // OTP 註冊：發送 OTP，不建立 Session
      const otp = generateOTP();
      const expiresAt = getOTPExpiryTime();
      
      await createOTPToken(email, otp, expiresAt);
      await sendOTPEmail({ to: email, name: customer.name, otp });

      return successResponse(
        { 
          customerId: customer.id,
          email: customer.email,
          authProvider,
        },
        '註冊成功，請檢查您的 Email 以驗證帳號，並等待管理員審核'
      );
    }
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/auth/register/route.ts:140',message:'Error caught',data:{errorMessage:error instanceof Error?error.message:String(error),errorName:error instanceof Error?error.name:undefined,errorStack:error instanceof Error?error.stack?.substring(0,200):undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
    // #endregion
    console.error('註冊錯誤:', error);
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
  }
}
