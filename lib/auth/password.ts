import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * 雜湊密碼
 */
export async function hashPassword(password: string): Promise<string> {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  return hash;
}

/**
 * 驗證密碼
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const isValid = await bcrypt.compare(password, hash);
  return isValid;
}
