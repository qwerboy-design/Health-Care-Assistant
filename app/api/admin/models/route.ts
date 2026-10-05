import { NextRequest, NextResponse } from 'next/server';
import { getAllModels, createModel, updateModelPricing, deactivateModel, activateModel } from '@/lib/supabase/model-pricing';
import { errorResponse, successResponse } from '@/lib/errors';
import { requireAdmin } from '@/lib/auth/admin';

// 此路由使用 cookies() 進行身份驗證，必須動態渲染
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/models
 * 獲取所有模型（包括未啟用的）
 */
export async function GET(request: NextRequest) {
  try {
    const authorization = await requireAdmin(request);
    if (authorization instanceof NextResponse) return authorization;

    const models = await getAllModels(false);

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
    const authorization = await requireAdmin(request);
    if (authorization instanceof NextResponse) return authorization;

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
 * 更新模型資料（定價或狀態）
 */
export async function PATCH(request: NextRequest) {
  try {
    const authorization = await requireAdmin(request);
    if (authorization instanceof NextResponse) return authorization;

    const body = await request.json();
    const { model_name, credits_cost, is_active } = body;

    if (!model_name) {
      return errorResponse('缺少 model_name 參數', 400);
    }

    let model = null;

    // 更新定價
    if (typeof credits_cost === 'number') {
      model = await updateModelPricing(model_name, credits_cost);
    }

    // 更新啟用狀態
    if (is_active === true) {
      model = await activateModel(model_name);
    } else if (is_active === false) {
      model = await deactivateModel(model_name);
    }

    if (!model) {
      return errorResponse('找不到該模型或更新失敗', 404);
    }

    return successResponse({ model }, '模型更新成功');
  } catch (error: any) {
    console.error('更新模型失敗:', error);
    return errorResponse(error.message || '更新模型失敗', 500);
  }
}

/**
 * DELETE /api/admin/models
 * 停用模型
 */
export async function DELETE(request: NextRequest) {
  try {
    const authorization = await requireAdmin(request);
    if (authorization instanceof NextResponse) return authorization;

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
