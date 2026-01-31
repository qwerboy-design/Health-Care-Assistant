import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 延遲初始化，避免模組載入時環境變數未設定導致錯誤
function getSupabaseUrl(): string {
  // 客戶端優先使用 NEXT_PUBLIC_ 前綴的環境變數
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!url) {
    // 開發階段：如果未設定環境變數，使用預設值（需要實際設定）
    console.warn('SUPABASE_URL 未設定，使用預設值');
    return 'https://placeholder.supabase.co';
  }
  return url;
}

function getSupabaseAnonKey(): string {
  // 客戶端優先使用 NEXT_PUBLIC_ 前綴的環境變數
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!key) {
    console.warn('SUPABASE_ANON_KEY 未設定，使用預設值');
    return 'placeholder-anon-key';
  }
  return key;
}

function getSupabaseServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY 未設定，使用預設值');
    return 'placeholder-service-key';
  }
  return key;
}

// 客戶端 Supabase client (使用 anon key)
export const supabase: SupabaseClient = createClient(
  getSupabaseUrl(),
  getSupabaseAnonKey()
);

// 服務端 Supabase client (使用 service role key，具有完整權限)
export const supabaseAdmin: SupabaseClient = createClient(
  getSupabaseUrl(),
  getSupabaseServiceKey()
);
