import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { getConversationsByCustomerId } from '@/lib/supabase/conversations';
import { errorResponse, successResponse, Errors } from '@/lib/errors';
import { cookies } from 'next/headers';

/**
 * GET /api/conversations - 獲取用戶的所有對話
 */
export async function GET(request: NextRequest) {
  try {
    // 驗證 Session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (!sessionToken) {
      return errorResponse(Errors.UNAUTHORIZED.message, 401);
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return errorResponse(Errors.UNAUTHORIZED.message, 401);
    }

    // 獲取查詢參數
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 獲取對話列表
    const conversations = await getConversationsByCustomerId(
      session.customerId,
      limit,
      offset
    );

    return successResponse({
      conversations,
      total: conversations.length,
    });
  } catch (error) {
    console.error('獲取對話列表錯誤:', error);
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
  }
}
