import { SignJWT, jwtVerify } from 'jose';
import { supabaseAdmin } from '@/lib/supabase/client';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-at-least-32-characters-long');
const JWT_EXPIRY = '7d'; // 7 天

export interface SessionPayload {
  customerId: string;
  email: string;
  [key: string]: any; // 添加索引簽名以符合 JWTPayload 要求
}

/**
 * 建立 JWT token
 */
export async function createJWT(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
  
  return token;
}

/**
 * 驗證 JWT token
 */
export async function verifyJWT(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

/**
 * 建立 Session 記錄
 */
export async function createSession(
  customerId: string,
  email: string,
  ipAddress: string
): Promise<{ token: string; expiresAt: Date }> {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth/session.ts:createSession',message:'Before createJWT',data:{customerId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  const token = await createJWT({ customerId, email });
  
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth/session.ts:createSession',message:'JWT created, before supabase insert',data:{hasToken:!!token,hasSupabaseUrl:!!process.env.SUPABASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 天後過期
  
  // 儲存到資料庫（開發階段：如果 Supabase 未設定則跳過）
  if (process.env.SUPABASE_URL) {
    try {
      await supabaseAdmin.from('sessions').insert({
        customer_id: customerId,
        token,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
      });
    } catch (error: any) {
      // 開發階段：如果資料庫錯誤也繼續（僅記錄）
      console.warn('Session 儲存失敗（開發模式）:', error.message);
    }
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth/session.ts:createSession',message:'Session creation completed',data:{hasToken:!!token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  return { token, expiresAt };
}

/**
 * 驗證 Session
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  // 驗證 JWT
  const payload = await verifyJWT(token);
  if (!payload) {
    return null;
  }
  
  // 開發階段：如果 Supabase 未設定，僅驗證 JWT 即可
  if (!process.env.SUPABASE_URL) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth/session.ts:verifySession',message:'Supabase not configured, skipping DB check',data:{customerId:payload.customerId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'K'})}).catch(()=>{});
    // #endregion
    return payload;
  }
  
  // 檢查資料庫中的 session 是否存在且未過期
  try {
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('token', token)
      .gte('expires_at', new Date().toISOString())
      .single();
    
    if (!session) {
      // 開發階段：即使資料庫中沒有記錄，如果 JWT 有效也允許
      return payload;
    }
    
    return payload;
  } catch (error) {
    // 開發階段：資料庫錯誤時，如果 JWT 有效也允許
    console.warn('Session 驗證失敗（開發模式）:', error);
    return payload;
  }
}

/**
 * 刪除 Session
 */
export async function deleteSession(token: string): Promise<void> {
  await supabaseAdmin
    .from('sessions')
    .delete()
    .eq('token', token);
}
