import { getLLMRuntimeSettings } from '@/lib/llm/settings';
import { successResponse, errorResponse } from '@/lib/errors';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken || !(await verifySession(sessionToken))) {
      return errorResponse('未授權，請先登入', 401);
    }

    const settings = await getLLMRuntimeSettings();
    return successResponse({
      activeProvider: settings.is_enabled ? settings.active_provider : 'anthropic',
      ollamaVisionEnabled: Boolean(settings.ollama_vision_model),
    });
  } catch {
    return errorResponse('無法載入 LLM runtime 設定', 500);
  }
}
