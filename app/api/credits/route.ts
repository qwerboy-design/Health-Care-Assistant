import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { getCustomerCredits, getCreditsHistory } from '@/lib/supabase/credits';
import { cookies } from 'next/headers';

/**
 * GET /api/credits
 * 取得當前用戶的 Credits 分數
 *
 * Query Parameters:
 * - history: 'true' | 'false' - 是否返回消費歷史（預設 false）
 * - limit: number - 限制返回的歷史記錄數量（預設 50）
 */
export async function GET(request: NextRequest) {
  try {
    // 驗證 session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: '未授權' },
        { status: 401 }
      );
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return NextResponse.json(
        { success: false, error: '未授權' },
        { status: 401 }
      );
    }

    // 取得查詢參數
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('history') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // 取得 Credits 分數
    const credits = await getCustomerCredits(session.customerId);

    // 如果需要歷史記錄
    if (includeHistory) {
      const history = await getCreditsHistory(session.customerId, limit);
      return NextResponse.json({
        success: true,
        data: {
          credits,
          history,
        },
      });
    }

    // 只返回 Credits 分數
    return NextResponse.json({
      success: true,
      data: {
        credits,
      },
    });
  } catch (error) {
    console.error('取得 Credits 失敗:', error);
    return NextResponse.json(
      {
        success: false,
        error: '取得 Credits 失敗',
      },
      { status: 500 }
    );
  }
}
