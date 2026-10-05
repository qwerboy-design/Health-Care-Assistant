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
import { sendOllamaChat } from '@/lib/llm/ollama-client';
import { sendOpenAIChat } from '@/lib/llm/openai-client';

describe('/api/admin/llm-settings/test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ customerId: 'admin-1' });
    vi.mocked(getLLMRuntimeSettings).mockResolvedValue({
      active_provider: 'ollama',
      ollama_base_url: 'http://127.0.0.1:11434/api',
      ollama_model: 'llama3.1:8b',
      timeout_ms: 30000,
      keep_alive: '5m',
    } as any);
    vi.mocked(sendOllamaChat).mockResolvedValue({
      content: 'OK',
      model: 'llama3.1:8b',
    });
  });

  it('sends only fixed non-medical prompt', async () => {
    const response = await POST(new NextRequest('http://localhost/api/admin/llm-settings/test', { method: 'POST' }));

    expect(response.status).toBe(200);
    expect(sendOllamaChat).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        messages: [{ role: 'user', content: 'Reply with: OK' }],
      })
    );
    expect(writeLLMRuntimeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'test_ollama' }));
  });

  it('rejects test when Ollama is not active', async () => {
    vi.mocked(getLLMRuntimeSettings).mockResolvedValue({ active_provider: 'anthropic' } as any);

    const response = await POST(new NextRequest('http://localhost/api/admin/llm-settings/test', { method: 'POST' }));

    expect(response.status).toBe(400);
    expect(sendOllamaChat).not.toHaveBeenCalled();
  });

  it('tests the active OpenAI provider', async () => {
    vi.mocked(getLLMRuntimeSettings).mockResolvedValue({
      active_provider: 'openai',
      timeout_ms: 30000,
    } as any);
    vi.mocked(sendOpenAIChat).mockResolvedValue({
      content: 'OK',
      model: 'gpt-4o-mini',
    });

    const response = await POST(new NextRequest('http://localhost/api/admin/llm-settings/test', { method: 'POST' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.model).toBe('gpt-4o-mini');
    expect(sendOpenAIChat).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [{ role: 'user', content: 'Reply with: OK' }] })
    );
  });

  it.each([
    ['OPENAI_KEY_MISSING', 503, 'OPENAI_API_KEY'],
    ['OPENAI_AUTH_FAILED', 502, 'OpenAI API 驗證失敗'],
    ['OPENAI_RATE_LIMITED', 429, 'OpenAI API 請求過於頻繁'],
    ['OPENAI_TIMEOUT', 504, 'OpenAI API 連線逾時'],
  ])('maps OpenAI error %s to a safe zh-TW admin response', async (code, status, message) => {
    vi.mocked(getLLMRuntimeSettings).mockResolvedValue({
      active_provider: 'openai',
      timeout_ms: 30000,
    } as any);
    vi.mocked(sendOpenAIChat).mockRejectedValue(
      Object.assign(new Error('secret provider response'), {
        name: 'OpenAIProviderError',
        code,
      })
    );

    const response = await POST(new NextRequest('http://localhost/api/admin/llm-settings/test', { method: 'POST' }));
    const data = await response.json();

    expect(response.status).toBe(status);
    expect(data.error).toContain(message);
    expect(data.error).not.toContain('secret provider response');
  });
});
