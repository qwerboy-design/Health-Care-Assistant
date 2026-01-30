// 客戶類型
export interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  password_hash?: string;
  auth_provider: 'password' | 'otp' | 'google';
  oauth_id?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  role: 'user' | 'admin';
  credits: number;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  requires_password_reset?: boolean;
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
  model_name?: string;
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

// 模型定價類型
export interface ModelPricing {
  id: string;
  model_name: string;
  display_name: string;
  credits_cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Credits 交易記錄類型
export interface CreditsTransaction {
  id: string;
  customer_id: string;
  conversation_id: string | null;
  model_name: string;
  credits_cost: number;
  credits_before: number;
  credits_after: number;
  created_at: string;
}

// Credits 扣除結果類型
export interface DeductCreditsResult {
  success: boolean;
  creditsAfter?: number;
  creditsBefore?: number;
  transactionId?: string;
  error?: string;
}

// Credits 增加結果類型
export interface AddCreditsResult {
  success: boolean;
  creditsAfter?: number;
  creditsBefore?: number;
  error?: string;
}

