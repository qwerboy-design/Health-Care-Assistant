import { getSafeErrorDetails } from '@/lib/errors';

export const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

export type OpenAIProviderErrorCode =
  | 'OPENAI_KEY_MISSING'
  | 'OPENAI_AUTH_FAILED'
  | 'OPENAI_RATE_LIMITED'
  | 'OPENAI_UNAVAILABLE'
  | 'OPENAI_TIMEOUT'
  | 'OPENAI_NETWORK_ERROR'
  | 'OPENAI_INVALID_RESPONSE'
  | 'OPENAI_REQUEST_FAILED';

export class OpenAIProviderError extends Error {
  constructor(
    public readonly code: OpenAIProviderErrorCode,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'OpenAIProviderError';
  }
}

export type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenAIContentPart[];
}

export interface OpenAIChatRequest {
  messages: OpenAIMessage[];
  model?: string;
  timeoutMs?: number;
}

export interface OpenAIChatResponse {
  content: string;
  model: string;
  usage?: Record<string, number>;
}

function getOpenAIModel(model?: string): string {
  return model?.trim() || process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

function getOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new OpenAIProviderError(
      'OPENAI_KEY_MISSING',
      503,
      '尚未設定 OpenAI API Key，請聯絡管理員'
    );
  }

  return apiKey;
}

function createAbortController(timeoutMs: number): { controller: AbortController; timeout: ReturnType<typeof setTimeout> } {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeout };
}

function getProviderError(status: number): OpenAIProviderError {
  if (status === 401) {
    return new OpenAIProviderError('OPENAI_AUTH_FAILED', 502, 'OpenAI API 驗證失敗，請確認 API Key 設定');
  }
  if (status === 429) {
    return new OpenAIProviderError('OPENAI_RATE_LIMITED', 429, 'OpenAI API 請求過於頻繁，請稍後再試');
  }
  if (status >= 500) {
    return new OpenAIProviderError('OPENAI_UNAVAILABLE', 503, 'OpenAI API 暫時無法使用，請稍後再試');
  }
  return new OpenAIProviderError('OPENAI_REQUEST_FAILED', 502, `OpenAI API 請求失敗（HTTP ${status}）`);
}

function getTextFromChoice(data: any): string {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new OpenAIProviderError('OPENAI_INVALID_RESPONSE', 502, 'OpenAI API 回應格式無效');
  }

  return content;
}

export async function sendOpenAIChat(request: OpenAIChatRequest): Promise<OpenAIChatResponse> {
  const apiKey = getOpenAIApiKey();
  const model = getOpenAIModel(request.model);
  const timeoutMs = Number.isInteger(request.timeoutMs) ? Math.max(request.timeoutMs!, 1000) : 30000;
  const { controller, timeout } = createAbortController(timeoutMs);

  try {
    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        max_completion_tokens: 4096,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error('[OpenAI Client] API request failed', { status: response.status, model });
      throw getProviderError(response.status);
    }

    const data = await response.json();
    return {
      content: getTextFromChoice(data),
      model: typeof data.model === 'string' ? data.model : model,
      usage: data.usage,
    };
  } catch (error: any) {
    if (error instanceof OpenAIProviderError) throw error;
    if (error?.name === 'AbortError') {
      throw new OpenAIProviderError('OPENAI_TIMEOUT', 504, 'OpenAI API 連線逾時，請稍後再試');
    }

    console.error('[OpenAI Client] API request failed', getSafeErrorDetails(error));
    throw new OpenAIProviderError('OPENAI_NETWORK_ERROR', 502, 'OpenAI API 連線失敗，請稍後再試');
  } finally {
    clearTimeout(timeout);
  }
}

export async function* streamOpenAIChat(request: OpenAIChatRequest): AsyncGenerator<string, void, unknown> {
  const apiKey = getOpenAIApiKey();
  const model = getOpenAIModel(request.model);
  const timeoutMs = Number.isInteger(request.timeoutMs) ? Math.max(request.timeoutMs!, 1000) : 30000;
  const { controller, timeout } = createAbortController(timeoutMs);

  try {
    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        max_completion_tokens: 4096,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error('[OpenAI Client] Streaming request failed', { status: response.status, model });
      throw getProviderError(response.status);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Unable to read OpenAI response stream');
    }

    const decoder = new TextDecoder();
    let buffered = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffered += decoder.decode(value, { stream: true });
        const lines = buffered.split('\n');
        buffered = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') continue;

          try {
            const parsed = JSON.parse(payload);
            const content = parsed?.choices?.[0]?.delta?.content;
            if (typeof content === 'string') yield content;
          } catch {
            // Ignore malformed stream chunks and continue reading the response.
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error: any) {
    if (error instanceof OpenAIProviderError) throw error;
    if (error?.name === 'AbortError') {
      throw new OpenAIProviderError('OPENAI_TIMEOUT', 504, 'OpenAI API 連線逾時，請稍後再試');
    }

    console.error('[OpenAI Client] Streaming request failed', getSafeErrorDetails(error));
    throw new OpenAIProviderError('OPENAI_NETWORK_ERROR', 502, 'OpenAI API 連線失敗，請稍後再試');
  } finally {
    clearTimeout(timeout);
  }
}
