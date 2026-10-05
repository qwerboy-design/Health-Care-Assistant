import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendOllamaChat } from '@/lib/llm/ollama-client';
import { DEFAULT_LLM_RUNTIME_SETTINGS } from '@/lib/llm/settings';

global.fetch = vi.fn();

describe('sendOllamaChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls Ollama native chat endpoint with stream disabled', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'llama3.1:8b',
        message: { content: 'OK' },
        prompt_eval_count: 3,
        eval_count: 1,
      }),
    } as any);

    const response = await sendOllamaChat(DEFAULT_LLM_RUNTIME_SETTINGS, {
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(response.content).toBe('OK');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:11434/api/chat',
      expect.objectContaining({
        method: 'POST',
        redirect: 'error',
        body: expect.stringContaining('"stream":false'),
      })
    );
  });

  it('preserves base64 images in message payload', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'llava',
        message: { content: 'image summary' },
      }),
    } as any);

    await sendOllamaChat(DEFAULT_LLM_RUNTIME_SETTINGS, {
      model: 'llava',
      messages: [{ role: 'user', content: 'look', images: ['abc123'] }],
    });

    const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]?.body as string);
    expect(body.messages[0].images).toEqual(['abc123']);
  });

  it('throws safe error for non-2xx responses', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 404,
    } as any);

    await expect(
      sendOllamaChat(DEFAULT_LLM_RUNTIME_SETTINGS, {
        messages: [{ role: 'user', content: 'hello' }],
      })
    ).rejects.toThrow('Ollama model or endpoint was not found');
  });
});
