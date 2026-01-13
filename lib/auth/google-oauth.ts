import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface GoogleUserInfo {
  sub: string;          // Google User ID
  email: string;
  name: string;
  email_verified: boolean;
  picture?: string;
}

/**
 * 驗證 Google ID Token
 */
export async function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo | null> {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    
    if (!payload || !payload.email) {
      return null;
    }
    
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      email_verified: payload.email_verified || false,
      picture: payload.picture,
    };
  } catch (error) {
    console.error('驗證 Google Token 失敗:', error);
    return null;
  }
}
