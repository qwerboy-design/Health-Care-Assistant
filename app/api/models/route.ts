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
    const models = await getAllModels();
    const response = successResponse({ models });
    // 禁止快取，確保切換分頁回來時取得最新定價
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, max-age=0'
    );
    return response;
  } catch (error: any) {
    console.error('獲取模型列表失敗:', error);
    return errorResponse('獲取模型列表失敗', 500);
  }
}
