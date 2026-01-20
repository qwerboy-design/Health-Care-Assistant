import { NextResponse } from 'next/server';
import { ApiResponse } from '@/types';

// 標準化錯誤回應
export function errorResponse(error: string, status: number = 500): NextResponse {
  const response: ApiResponse = {
    success: false,
    error,
  };
  return NextResponse.json(response, { status });
}

// 標準化成功回應
export function successResponse<T>(data: T, message?: string): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return NextResponse.json(response);
}

// 自定義錯誤類別
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 常見錯誤
export const Errors = {
  // 認證錯誤
  UNAUTHORIZED: new AppError(401, '未授權，請先登入'),
  INVALID_CREDENTIALS: new AppError(401, '帳號或密碼錯誤'),
  INVALID_OTP: new AppError(400, 'OTP 驗證碼錯誤或已過期'),
  INVALID_TOKEN: new AppError(401, 'Token 無效或已過期'),
  ACCOUNT_PENDING: new AppError(403, '帳號待審核中，請等待管理員審核'),
  ACCOUNT_REJECTED: new AppError(403, '帳號已被拒絕，無法登入'),
  ADMIN_REQUIRED: new AppError(403, '需要管理員權限'),
  
  // 資源錯誤
  USER_NOT_FOUND: new AppError(404, '找不到用戶'),
  USER_EXISTS: new AppError(409, '用戶已存在'),
  EMAIL_EXISTS: new AppError(409, 'Email 已被註冊'),
  PHONE_EXISTS: new AppError(409, '電話號碼已被註冊'),
  
  // 請求錯誤
  INVALID_INPUT: new AppError(400, '輸入資料格式錯誤'),
  MISSING_FIELDS: new AppError(400, '缺少必要欄位'),
  FILE_TOO_LARGE: new AppError(413, '檔案大小超過 4MB 限制'),
  INVALID_FILE_TYPE: new AppError(400, '不支援的檔案格式'),
  
  // Rate limiting
  TOO_MANY_REQUESTS: new AppError(429, '請求過於頻繁，請稍後再試'),
  
  // 伺服器錯誤
  INTERNAL_ERROR: new AppError(500, '伺服器內部錯誤'),
  DATABASE_ERROR: new AppError(500, '資料庫錯誤'),
};
