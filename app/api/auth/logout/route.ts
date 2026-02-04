import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth/session';
import { cookies } from 'next/headers';

// 此路由使用 cookies()，必須動態渲染
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (sessionToken) {
      await deleteSession(sessionToken);
    }

    // 刪除 Cookie
    cookieStore.delete('session');

    // 重定向到登入頁面
    return NextResponse.redirect(new URL('/login', request.url));
  } catch (error) {
    console.error('登出錯誤:', error);
    // 即使錯誤也要刪除 Cookie 並重定向
    const cookieStore = await cookies();
    cookieStore.delete('session');
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
