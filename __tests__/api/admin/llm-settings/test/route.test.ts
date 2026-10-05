import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/admin', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/llm/settings', () => ({
  getLLMRuntimeSettings: vi.fn(),
  writeLLMRuntimeAuditLog: vi.fn(),
}));

vi.mock('@/lib/llm/ollama-client', () => ({
  sendOllamaChat: vi.fn(),
}));

vi.mock('@/lib/llm/openai-client', () => ({
  sendOpenAIChat: vi.fn(),
}));

import { POST } from '@/app/api/admin/llm-settings/test/route';
import { requireAdmin } from '@/lib/auth/admin';
import { getLLMRuntimeSettings, writeLLMRuntimeAuditLog } from '@/lib/llm/settings';
import { sendOpenAIChat } from '@/lib/llm/openai-client';

describe('POST /api/admin/llm-settings/test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ customerId: 'admin-1' });
    vi.mocked(getLLMRuntimeSettings).mockResolvedValue({
      active_provider: 'openai',
      timeout_ms: 30000,
    } as any);
    vi.mocked(sendOpenAIChat).mockResolvedValue({
      content: 'OK',
      model: 'gpt-4o-mini',
    });
  });

  it('tests the active OpenAI provider without returning the API key', async () => {
    const response = await POST(new NextRequest('http://localhost/api/admin/llm-settings/test', { method: 'POST' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ ok: true, model: 'gpt-4o-mini', preview: 'OK' });
    expect(sendOpenAIChat).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: 10000 })
    );
    expect(JSON.stringify(body)).not.toContain('API_KEY');
    expect(writeLLMRuntimeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'test_openai', newProvider: 'openai', success: true })
    );
  });
});
