export const dynamic = 'force-dynamic';
export const revalidate = 0; // 強制禁用 ISR 緩存
export const fetchCache = 'force-no-store'; // 強制禁用 fetch 緩存

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
    
    // 禁止快取，確保始終取得最新定價
    // 注意：Vercel Edge/ISR 需要額外的緩存控制
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, max-age=0'
    );
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store');
    
    return response;
  } catch (error: any) {
    console.error('獲取模型列表失敗:', error);
    return errorResponse('獲取模型列表失敗', 500);
  }
}
