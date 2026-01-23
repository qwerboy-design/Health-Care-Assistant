import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { getCustomerCredits, addCredits, getCreditsHistory } from '@/lib/supabase/credits';
import { findCustomerById } from '@/lib/supabase/customers';
import { errorResponse, successResponse } from '@/lib/errors';
import { cookies } from 'next/headers';

/**
 * 驗證管理員權限
 */
async function verifyAdmin(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await verifySession(sessionToken);
  if (!session) {
    return null;
  }

  // 檢查是否為管理員
  const customer = await findCustomerById(session.customerId);
  if (!customer || customer.role !== 'admin') {
    return null;
  }

  return session;
}

/**
 * GET /api/admin/credits
 * 獲取指定用戶的 Credits 和歷史記錄
 * Query Parameters:
 * - customer_id: string (必填)
 * - history: 'true' | 'false' (選填，預設 false)
 * - limit: number (選填，預設 50)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '未授權或非管理員' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');
    const includeHistory = searchParams.get('history') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!customerId) {
      return errorResponse('缺少 customer_id 參數', 400);
    }

    // 獲取 Credits
    const credits = await getCustomerCredits(customerId);

    // 如果需要歷史記錄
    if (includeHistory) {
      const history = await getCreditsHistory(customerId, limit);
      return successResponse({ credits, history });
    }

    return successResponse({ credits });
  } catch (error: any) {
    console.error('獲取用戶 Credits 失敗:', error);
    return errorResponse('獲取用戶 Credits 失敗', 500);
  }
}

/**
 * POST /api/admin/credits
 * 為用戶充值 Credits
 * Body:
 * - customer_id: string (必填)
 * - amount: number (必填，正數為充值，負數為扣除)
 * - reason: string (必填，充值原因)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '未授權或非管理員' }, { status: 403 });
    }

    const body = await request.json();
    const { customer_id, amount, reason } = body;

    if (!customer_id || typeof amount !== 'number' || !reason) {
      return errorResponse('缺少必要參數', 400);
    }

    if (amount === 0) {
      return errorResponse('充值金額不能為 0', 400);
    }

    // 獲取充值前的 Credits
    const creditsBefore = await getCustomerCredits(customer_id);

    // 充值
    const result = await addCredits(customer_id, amount, reason);

    if (!result.success) {
      return errorResponse(result.error || '充值失敗', 400);
    }

    return successResponse(
      {
        creditsBefore,
        creditsAfter: result.creditsAfter,
        amount,
        transactionId: result.transactionId,
      },
      amount > 0 ? 'Credits 充值成功' : 'Credits 扣除成功'
    );
  } catch (error: any) {
    console.error('Credits 操作失敗:', error);
    return errorResponse(error.message || 'Credits 操作失敗', 500);
  }
}
