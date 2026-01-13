// 客戶類型
export interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  password_hash?: string;
  auth_provider: 'password' | 'otp' | 'google';
  oauth_id?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

// OTP Token 類型
export interface OTPToken {
  id: string;
  email: string;
  token: string;
  used: boolean;
  expires_at: string;
  created_at: string;
}

// Session 類型
export interface Session {
  id: string;
  customer_id: string;
  token: string;
  expires_at: string;
  ip_address: string;
  created_at: string;
}

// 對話類型
export interface Conversation {
  id: string;
  customer_id: string;
  title: string;
  workload_level: 'instant' | 'basic' | 'standard' | 'professional';
  selected_function?: string;
  created_at: string;
  updated_at: string;
}

// 訊息類型
export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  created_at: string;
}

// 工作量級別類型
export type WorkloadLevel = 'instant' | 'basic' | 'standard' | 'professional';

// 功能類型
export type FunctionType = 'lab' | 'radiology' | 'medical_record' | 'medication';

// API 回應類型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
