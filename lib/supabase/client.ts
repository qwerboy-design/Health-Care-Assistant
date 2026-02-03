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
    // 僅在服務端使用，客戶端不需要此警告
    if (typeof window === 'undefined') {
      console.warn('SUPABASE_SERVICE_ROLE_KEY 未設定，使用預設值');
    }
    return 'placeholder-service-key';
  }
  return key;
}

// 客戶端 Supabase client (使用 anon key)
// 使用單例模式避免多實例警告
let _supabase: SupabaseClient | null = null;
export const supabase: SupabaseClient = (() => {
  if (!_supabase) {
    _supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        // 使用專屬的 storage key 避免衝突
        storageKey: 'sb-hac-auth-token',
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  }
  return _supabase;
})();

// 服務端 Supabase client (使用 service role key，具有完整權限)
// 僅在服務端初始化
let _supabaseAdmin: SupabaseClient | null = null;
export const supabaseAdmin: SupabaseClient = (() => {
  if (typeof window !== 'undefined') {
    // 客戶端不應該使用 admin client
    return supabase;
  }
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(getSupabaseUrl(), getSupabaseServiceKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdmin;
})();
