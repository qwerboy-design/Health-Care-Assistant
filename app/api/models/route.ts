export const dynamic = 'force-dynamic';
export const revalidate = 0; // 強制禁用 ISR 緩存
export const fetchCache = 'force-no-store'; // 強制禁用 fetch 緩存

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/client';
import { errorResponse, Errors, successResponse } from '@/lib/errors';

interface ModelPricingRow {
  id: string;
  model_name: string;
  display_name: string;
  supports_vision: boolean;
  credits_cost: number;
}

interface PublicModelOption {
  id: string;
  model_name: string;
  display_name: string;
  supports_vision: boolean;
  /** 每次使用此模型實際扣除的 Credits（等同 server 扣點的 credits_cost）。 */
  credits_per_use: number;
}

/**
 * GET /api/models
 * 獲取所有可用的 AI 模型列表
 */
export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const session = sessionToken ? await verifySession(sessionToken) : null;

    if (!session) {
      return errorResponse(Errors.UNAUTHORIZED.message, 401);
    }

    const { data, error } = await supabaseAdmin
      .from('model_pricing')
      .select('id, model_name, display_name, supports_vision, credits_cost')
      .eq('is_active', true)
      .order('display_name', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    // 僅回傳客戶端允許的欄位。credits_per_use 與 app/api/chat/route.ts 實際扣點相同：
    // 聊天／報告分析每次呼叫皆扣除 getModelPricing(model).credits_cost（固定整數，與 token 數無關）。
    // 原始 credits_cost 欄位名稱與其他定價細節不直接外洩。
    const models: PublicModelOption[] = (data ?? []).map((row: ModelPricingRow) => ({
      id: row.id,
      model_name: row.model_name,
      display_name: row.display_name,
      supports_vision: row.supports_vision,
      credits_per_use: row.credits_cost,
    }));
    const response = successResponse({ models });

    // 禁止快取，確保始終取得最新模型清單
    // 注意：Vercel Edge/ISR 需要額外的緩存控制
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, max-age=0',
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
