import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getLLMRuntimeSettings, writeLLMRuntimeAuditLog } from '@/lib/llm/settings';
import { sendOllamaChat } from '@/lib/llm/ollama-client';
import { sendOpenAIChat } from '@/lib/llm/openai-client';
import { errorResponse, successResponse, getSafeErrorDetails, isNamedError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck instanceof Response) {
    return adminCheck;
  }

  try {
    const settings = await getLLMRuntimeSettings();
    const messages = [{ role: 'user' as const, content: 'Reply with: OK' }];
    let model: string;
    let preview: string;

    if (settings.active_provider === 'ollama') {
      const response = await sendOllamaChat(settings, {
        messages,
        timeoutMs: Math.min(settings.timeout_ms, 10000),
      });
      model = response.model;
      preview = response.content.slice(0, 120);
    } else if (settings.active_provider === 'openai') {
      const response = await sendOpenAIChat({
        messages,
        timeoutMs: Math.min(settings.timeout_ms, 10000),
      });
      model = response.model;
      preview = response.content.slice(0, 120);
    } else {
      return errorResponse('目前未啟用可測試的 LLM provider', 400);
    }

    const provider = settings.active_provider;

    await writeLLMRuntimeAuditLog({
      actorCustomerId: adminCheck.customerId,
      action: `test_${provider}`,
      newProvider: provider,
      success: true,
    });

    return successResponse({
      ok: true,
      model,
      preview,
    });
  } catch (error: any) {
    const provider = await getLLMRuntimeSettings().catch(() => null);
    await writeLLMRuntimeAuditLog({
      actorCustomerId: adminCheck.customerId,
      action: `test_${provider?.active_provider || 'unknown'}`,
      newProvider: provider?.active_provider || null,
      success: false,
      errorCode: 'LLM_PROVIDER_TEST_FAILED',
    });

    if (isNamedError(error, 'OpenAIProviderError')) {
      const code = (error as { code?: unknown }).code;
      const mapped = {
        OPENAI_KEY_MISSING: {
          status: 503,
          message: '尚未設定 OPENAI_API_KEY，請先在 server-side 環境變數設定。',
        },
        OPENAI_AUTH_FAILED: {
          status: 502,
          message: 'OpenAI API 驗證失敗，請確認 API Key 設定。',
        },
        OPENAI_RATE_LIMITED: {
          status: 429,
          message: 'OpenAI API 請求過於頻繁，請稍後再試。',
        },
        OPENAI_TIMEOUT: {
          status: 504,
          message: 'OpenAI API 連線逾時，請稍後再試。',
        },
      }[String(code) as 'OPENAI_KEY_MISSING' | 'OPENAI_AUTH_FAILED' | 'OPENAI_RATE_LIMITED' | 'OPENAI_TIMEOUT'];

      if (mapped) return errorResponse(mapped.message, mapped.status);
    }

    console.error('[Admin LLM Settings] Provider test failed', getSafeErrorDetails(error));
    return errorResponse('LLM provider 連線測試失敗，請稍後再試。', 502);
  }
}
