import { supabaseAdmin } from './client';
import { OTPToken } from '@/types';

/**
 * 建立 OTP token
 */
export async function createOTPToken(
  email: string,
  token: string,
  expiresAt: Date
): Promise<OTPToken> {
  const { data, error } = await supabaseAdmin
    .from('otp_tokens')
    .insert({
      email,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`建立 OTP token 失敗: ${error.message}`);
  }
  
  return data as OTPToken;
}

/**
 * 驗證 OTP token
 */
export async function verifyOTPToken(
  email: string,
  token: string
): Promise<{ valid: boolean; otpToken?: OTPToken }> {
  const { data, error } = await supabaseAdmin
    .from('otp_tokens')
    .select('*')
    .eq('email', email)
    .eq('token', token)
    .eq('used', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data) {
    return { valid: false };
  }
  
  return { valid: true, otpToken: data as OTPToken };
}

/**
 * 標記 OTP token 為已使用
 */
export async function markOTPTokenAsUsed(tokenId: string): Promise<void> {
  await supabaseAdmin
    .from('otp_tokens')
    .update({ used: true })
    .eq('id', tokenId);
}

/**
 * 刪除過期的 OTP tokens
 */
export async function deleteExpiredOTPTokens(): Promise<void> {
  await supabaseAdmin
    .from('otp_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString());
}
