import { randomInt } from 'crypto';

/**
 * 生成 6 位數 OTP
 */
export function generateOTP(): string {
  const otp = randomInt(100000, 999999).toString();
  return otp;
}

/**
 * 計算 OTP 過期時間（預設 10 分鐘）
 */
export function getOTPExpiryTime(minutes: number = 10): Date {
  const expiryTime = new Date();
  expiryTime.setMinutes(expiryTime.getMinutes() + minutes);
  return expiryTime;
}
