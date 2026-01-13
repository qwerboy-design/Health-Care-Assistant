import { supabaseAdmin } from './client';
import { Customer } from '@/types';

/**
 * 根據 Email 查找客戶
 */
export async function findCustomerByEmail(email: string): Promise<Customer | null> {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/customers.ts:findCustomerByEmail',message:'Before supabase query',data:{email,hasSupabaseUrl:!!process.env.SUPABASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();
    
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/customers.ts:findCustomerByEmail',message:'After supabase query',data:{hasError:!!error,errorMessage:error?.message,hasData:!!data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (error || !data) {
      return null;
    }
    
    return data as Customer;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/customers.ts:findCustomerByEmail',message:'Exception caught',data:{errorMessage:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // 如果 Supabase 未配置，返回 null 而不是拋出異常
    if (!process.env.SUPABASE_URL || (error instanceof Error && (error.message.includes('fetch failed') || error.message.includes('Invalid API key')))) {
      return null;
    }
    throw error;
  }
}

/**
 * 根據 ID 查找客戶
 */
export async function findCustomerById(id: string): Promise<Customer | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data as Customer;
  } catch (error) {
    // 如果 Supabase 未配置，返回 null 而不是拋出異常
    if (!process.env.SUPABASE_URL || (error instanceof Error && (error.message.includes('fetch failed') || error.message.includes('Invalid API key')))) {
      return null;
    }
    throw error;
  }
}

/**
 * 根據 OAuth ID 查找客戶
 */
export async function findCustomerByOAuthId(oauthId: string): Promise<Customer | null> {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('oauth_id', oauthId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data as Customer;
}

/**
 * 建立客戶
 */
export async function createCustomer(customer: {
  email: string;
  name: string;
  phone?: string;
  password_hash?: string;
  auth_provider: 'password' | 'otp' | 'google';
  oauth_id?: string;
}): Promise<Customer> {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/customers.ts:createCustomer',message:'Before supabase insert',data:{email:customer.email,hasSupabaseUrl:!!process.env.SUPABASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  const { data, error } = await supabaseAdmin
    .from('customers')
    .insert(customer)
    .select()
    .single();
  
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/customers.ts:createCustomer',message:'Supabase insert result',data:{hasError:!!error,errorMessage:error?.message,hasData:!!data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  if (error) {
    // 開發階段：如果 Supabase 未設定，返回模擬客戶數據
    if (error.message?.includes('Invalid API key') || error.message?.includes('fetch failed') || !process.env.SUPABASE_URL) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/customers.ts:createCustomer',message:'Using mock customer data',data:{email:customer.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      // 返回模擬數據
      return {
        id: `mock-${Date.now()}`,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        password_hash: customer.password_hash,
        auth_provider: customer.auth_provider,
        oauth_id: customer.oauth_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login_at: undefined,
      } as Customer;
    }
    throw new Error(`建立客戶失敗: ${error.message}`);
  }
  
  return data as Customer;
}

/**
 * 更新最後登入時間
 */
export async function updateLastLogin(customerId: string): Promise<void> {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/customers.ts:updateLastLogin',message:'Before supabase update',data:{customerId,hasSupabaseUrl:!!process.env.SUPABASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  try {
    await supabaseAdmin
      .from('customers')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', customerId);
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/customers.ts:updateLastLogin',message:'After supabase update',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/customers.ts:updateLastLogin',message:'Exception caught',data:{errorMessage:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    // 如果 Supabase 未配置，靜默失敗（開發模式）
    if (!process.env.SUPABASE_URL || (error instanceof Error && (error.message.includes('fetch failed') || error.message.includes('Invalid API key')))) {
      return;
    }
    throw error;
  }
}

/**
 * 綁定 OAuth ID
 */
export async function linkOAuthId(customerId: string, oauthId: string): Promise<void> {
  await supabaseAdmin
    .from('customers')
    .update({ oauth_id: oauthId })
    .eq('id', customerId);
}

/**
 * 解綁 OAuth ID
 */
export async function unlinkOAuthId(customerId: string): Promise<void> {
  await supabaseAdmin
    .from('customers')
    .update({ oauth_id: null })
    .eq('id', customerId);
}

/**
 * 檢查電話號碼是否已存在
 */
export async function checkPhoneExists(phone: string): Promise<boolean> {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/customers.ts:checkPhoneExists',message:'Before supabase query',data:{phone,hasSupabaseUrl:!!process.env.SUPABASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  try {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .single();
    
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/customers.ts:checkPhoneExists',message:'After supabase query',data:{hasError:!!error,errorMessage:error?.message,hasData:!!data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    return !!data;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase/customers.ts:checkPhoneExists',message:'Exception caught',data:{errorMessage:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // 如果 Supabase 未配置，返回 false 而不是拋出異常
    if (!process.env.SUPABASE_URL || (error instanceof Error && (error.message.includes('fetch failed') || error.message.includes('Invalid API key')))) {
      return false;
    }
    throw error;
  }
}
