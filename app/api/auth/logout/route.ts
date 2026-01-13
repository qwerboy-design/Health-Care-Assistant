import { NextRequest } from 'next/server';
import { deleteSession } from '@/lib/auth/session';
import { errorResponse, successResponse } from '@/lib/errors';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (sessionToken) {
      await deleteSession(sessionToken);
    }

    // 刪除 Cookie
    cookieStore.delete('session');

    return successResponse({}, '登出成功');
  } catch (error) {
    console.error('登出錯誤:', error);
    // 即使錯誤也要刪除 Cookie
    const cookieStore = await cookies();
    cookieStore.delete('session');
    return successResponse({}, '登出成功');
  }
}
