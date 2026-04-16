import { z } from 'zod';

// 註冊 Schema
// - `otp` 註冊：必填 `email`
// - `password` 註冊：`email` 非必填（可缺漏或送空字串視為未填）
export const registerSchema = z
  .object({
    email: z.preprocess(
      (v) => {
        if (typeof v !== 'string') return v;
        const trimmed = v.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      },
      z.string().min(1, 'Email 不能為空').optional()
    ), // 暫時移除 email 格式驗證
    name: z.string().min(1, '姓名不能為空'),
    phone: z.string().optional(), // 暫時移除電話格式驗證
    password: z.string().min(1, '請輸入密碼').optional(), // 只有密碼註冊會帶入
  })
  .superRefine((data, ctx) => {
    // password 未提供 -> 走 OTP 註冊，email 必填
    if (!data.password && !data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Email 不能為空',
      });
    }
  });

// 登入 Schema（暫時放寬驗證，開發階段）
export const loginSchema = z.object({
  email: z.string().min(1, 'Email 不能為空'), // 暫時移除 email 格式驗證
  password: z.string().min(1, '請輸入密碼'),
});

// OTP Schema（暫時放寬驗證，開發階段）
export const otpSchema = z.object({
  email: z.string().min(1, 'Email 不能為空'), // 暫時移除 email 格式驗證
  token: z.string().min(1, '請輸入驗證碼'), // 暫時移除長度限制
});

// 發送 OTP Schema（暫時放寬驗證，開發階段）
export const sendOTPSchema = z.object({
  email: z.string().min(1, 'Email 不能為空'), // 暫時移除 email 格式驗證
});

// Google OAuth Schema
export const googleOAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID Token 不能為空'),
});

// 對話訊息 Schema
export const chatMessageSchema = z.object({
  content: z.string().min(1, '訊息內容不能為空'),
  conversation_id: z.string().uuid('無效的對話 ID').optional(),
  workload_level: z.enum(['instant', 'basic', 'standard', 'professional']),
  selected_function: z.enum(['lab', 'radiology', 'medical_record', 'medication']).optional(),
  file_url: z.string().url('無效的檔案 URL').optional(),
  file_name: z.string().optional(),
  file_type: z.string().optional(),
  modelName: z.string().optional(), // 新增：模型名稱（可選，有預設值）
});

// 建立對話 Schema
export const createConversationSchema = z.object({
  title: z.string().min(1, '標題不能為空').max(255, '標題最多 255 個字元'),
  workload_level: z.enum(['instant', 'basic', 'standard', 'professional']),
  selected_function: z.enum(['lab', 'radiology', 'medical_record', 'medication']).optional(),
});
