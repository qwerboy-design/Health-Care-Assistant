import { SignJWT, jwtVerify } from 'jose';
import { supabaseAdmin } from '@/lib/supabase/client';

const JWT_EXPIRY = '7d';

function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET must be set and at least 16 characters long');
  }

  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  customerId: string;
  email: string;
  [key: string]: any;
}

export async function createJWT(payload: SessionPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getJWTSecret());
}

export async function verifyJWT(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(
  customerId: string,
  email: string,
  ipAddress: string
): Promise<{ token: string; expiresAt: Date }> {
  const token = await createJWT({ customerId, email });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  if (process.env.SUPABASE_URL) {
    try {
      await supabaseAdmin.from('sessions').insert({
        customer_id: customerId,
        token,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
      });
    } catch (error: any) {
      console.warn('Session create failed:', error.message);
    }
  }

  return { token, expiresAt };
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  const payload = await verifyJWT(token);
  if (!payload) {
    return null;
  }

  if (!process.env.SUPABASE_URL) {
    return payload;
  }

  try {
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('token', token)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (!session) {
      return null;
    }

    return payload;
  } catch (error) {
    console.warn('Session verification failed:', error);
    return null;
  }
}

export async function deleteSession(token: string): Promise<void> {
  await supabaseAdmin
    .from('sessions')
    .delete()
    .eq('token', token);
}
