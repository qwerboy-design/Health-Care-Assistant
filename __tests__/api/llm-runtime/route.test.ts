import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookieGet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: cookieGet })),
}));

vi.mock('@/lib/auth/session', () => ({
  verifySession: vi.fn(),
}));

vi.mock('@/lib/llm/settings', () => ({
  getLLMRuntimeSettings: vi.fn(),
}));

import { GET } from '@/app/api/llm-runtime/route';
import { verifySession } from '@/lib/auth/session';
import { getLLMRuntimeSettings } from '@/lib/llm/settings';

describe('/api/llm-runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires an authenticated session before exposing runtime state', async () => {
    cookieGet.mockReturnValue(undefined);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getLLMRuntimeSettings).not.toHaveBeenCalled();
  });

  it('returns sanitized runtime state for authenticated users', async () => {
    cookieGet.mockReturnValue({ value: 'session-token' });
    vi.mocked(verifySession).mockResolvedValue({ customerId: 'customer-1' } as any);
    vi.mocked(getLLMRuntimeSettings).mockResolvedValue({
      active_provider: 'ollama',
      ollama_vision_model: 'llava',
      is_enabled: true,
    } as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual({
      activeProvider: 'ollama',
      ollamaVisionEnabled: true,
    });
  });

  it('returns OpenAI as a sanitized active provider', async () => {
    cookieGet.mockReturnValue({ value: 'session-token' });
    vi.mocked(verifySession).mockResolvedValue({ customerId: 'customer-1' } as any);
    vi.mocked(getLLMRuntimeSettings).mockResolvedValue({
      active_provider: 'openai',
      ollama_vision_model: null,
      is_enabled: true,
    } as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual({
      activeProvider: 'openai',
      ollamaVisionEnabled: false,
    });
  });
});
