import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { getAllModels, createModel, updateModelPricing, deactivateModel } from '@/lib/supabase/model-pricing';
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
 * GET /api/admin/models
 * 獲取所有模型（包括未啟用的）
 */
export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '未授權或非管理員' }, { status: 403 });
    }

    const models = await getAllModels();

    return successResponse({ models });
  } catch (error: any) {
    console.error('獲取模型列表失敗:', error);
    return errorResponse('獲取模型列表失敗', 500);
  }
}

/**
 * POST /api/admin/models
 * 創建新模型
 */
export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '未授權或非管理員' }, { status: 403 });
    }

    const body = await request.json();
    const { model_name, display_name, credits_cost } = body;

    if (!model_name || !display_name || typeof credits_cost !== 'number') {
      return errorResponse('缺少必要參數', 400);
    }

    const model = await createModel({
      model_name,
      display_name,
      credits_cost,
    });

    return successResponse({ model }, '模型創建成功');
  } catch (error: any) {
    console.error('創建模型失敗:', error);
    return errorResponse(error.message || '創建模型失敗', 500);
  }
}

/**
 * PATCH /api/admin/models
 * 更新模型定價
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await verifyAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '未授權或非管理員' }, { status: 403 });
    }

    const body = await request.json();
    const { model_name, credits_cost } = body;

    if (!model_name || typeof credits_cost !== 'number') {
      return errorResponse('缺少必要參數', 400);
    }

    const model = await updateModelPricing(model_name, credits_cost);

    return successResponse({ model }, '模型定價更新成功');
  } catch (error: any) {
    console.error('更新模型定價失敗:', error);
    return errorResponse(error.message || '更新模型定價失敗', 500);
  }
}

/**
 * DELETE /api/admin/models
 * 停用模型
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await verifyAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: '未授權或非管理員' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const model_name = searchParams.get('model_name');

    if (!model_name) {
      return errorResponse('缺少 model_name 參數', 400);
    }

    await deactivateModel(model_name);

    return successResponse({}, '模型已停用');
  } catch (error: any) {
    console.error('停用模型失敗:', error);
    return errorResponse(error.message || '停用模型失敗', 500);
  }
}
