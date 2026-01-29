export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAllModels } from '@/lib/supabase/model-pricing';
import { errorResponse, successResponse } from '@/lib/errors';

/**
 * GET /api/models
 * 獲取所有可用的 AI 模型列表
 */
export async function GET(request: NextRequest) {
  try {
    // 獲取所有啟用的模型
    const models = await getAllModels();

    return successResponse({
      models,
    });
  } catch (error: any) {
    console.error('獲取模型列表失敗:', error);
    return errorResponse('獲取模型列表失敗', 500);
  }
}
