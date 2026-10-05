import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OPENAI_CHAT_COMPLETIONS_URL, sendOpenAIChat } from '@/lib/llm/openai-client';

describe('OpenAI client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OPENAI_API_KEY = 'sk-openai-test-key';
    delete process.env.OPENAI_MODEL;
  });

  it('sends a server-side bearer key and parses the chat completion', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'gpt-4o-mini',
        choices: [{ message: { content: 'Safe response' } }],
        usage: { prompt_tokens: 3, completion_tokens: 4 },
      }),
    } as Response);

    const response = await sendOpenAIChat({
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'gpt-4o-mini',
    });

    expect(response).toEqual({
      content: 'Safe response',
      model: 'gpt-4o-mini',
      usage: { prompt_tokens: 3, completion_tokens: 4 },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      OPENAI_CHAT_COMPLETIONS_URL,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer sk-openai-test-key' }),
      })
    );
  });

  it('fails closed when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(
      sendOpenAIChat({ messages: [{ role: 'user', content: 'Hello' }] })
    ).rejects.toThrow('尚未設定 OpenAI API Key');
  });

  it('does not expose provider error response bodies', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'secret provider detail' } }),
    } as Response);

    await expect(
      sendOpenAIChat({ messages: [{ role: 'user', content: 'Hello' }] })
    ).rejects.toThrow('OpenAI API 驗證失敗');
    await expect(
      sendOpenAIChat({ messages: [{ role: 'user', content: 'Hello' }] })
    ).rejects.not.toThrow('secret provider detail');
  });

  it('returns a zh-TW rate-limit error without provider response details', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'secret rate detail' } }),
    } as Response);

    await expect(
      sendOpenAIChat({ messages: [{ role: 'user', content: 'Hello' }] })
    ).rejects.toThrow('OpenAI API 請求過於頻繁');
  });

  it('returns a zh-TW timeout error', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(
      Object.assign(new Error('This should not be exposed'), { name: 'AbortError' })
    );

    await expect(
      sendOpenAIChat({ messages: [{ role: 'user', content: 'Hello' }] })
    ).rejects.toThrow('OpenAI API 連線逾時');
  });
});
