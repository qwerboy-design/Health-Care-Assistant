import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import {
  getLLMRuntimeSettingsStatus,
  updateLLMRuntimeSettings,
  validateLLMRuntimeSettings,
} from '@/lib/llm/settings';
import {
  errorResponse,
  successResponse,
  getSafeErrorDetails,
  isNamedError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof Response) {
      return adminCheck;
    }

    const status = await getLLMRuntimeSettingsStatus();
    return successResponse({
      ...status,
      warning: status.settingsTableAvailable
        ? undefined
        : 'LLM 設定資料表尚未套用 migration 007/011，請先完成資料庫 migration。',
    });
  } catch (error) {
    console.error('[Admin LLM Settings] Failed to load settings', getSafeErrorDetails(error));
    return errorResponse('取得 LLM 設定失敗', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof Response) {
      return adminCheck;
    }

    const body = await request.json();
    const validated = validateLLMRuntimeSettings({
      active_provider: body.active_provider,
      ollama_base_url: body.ollama_base_url,
      ollama_model: body.ollama_model,
      ollama_vision_model: body.ollama_vision_model,
      timeout_ms: body.timeout_ms,
      keep_alive: body.keep_alive,
      is_enabled: body.is_enabled,
    });

    const settings = await updateLLMRuntimeSettings(validated, adminCheck.customerId);
    const status = await getLLMRuntimeSettingsStatus();
    return successResponse({ ...status, settings }, 'LLM 設定已更新');
  } catch (error: any) {
    if (isNamedError(error, 'LLMSettingsTableUnavailableError')) {
      return errorResponse('LLM 設定資料表尚未套用 migration 007/011，請先完成資料庫 migration。', 503);
    }
    console.error('[Admin LLM Settings] Failed to update settings', getSafeErrorDetails(error));
    return errorResponse('更新 LLM 設定失敗', 400);
  }
}
