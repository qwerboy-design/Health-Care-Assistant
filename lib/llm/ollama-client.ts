import { LLMRuntimeSettings } from './settings';
import { normalizeOllamaBaseUrl } from './url-security';

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

export interface OllamaChatRequest {
  messages: OllamaMessage[];
  model?: string;
  timeoutMs?: number;
}

export interface OllamaChatResponse {
  content: string;
  model: string;
  usage?: Record<string, number>;
}

function buildOllamaChatUrl(baseUrl: string): string {
  const normalized = normalizeOllamaBaseUrl(baseUrl);
  return `${normalized.replace(/\/api$/, '')}/api/chat`;
}

function safeErrorMessage(status: number): string {
  if (status === 404) {
    return 'Ollama model or endpoint was not found';
  }

  if (status === 408 || status === 504) {
    return 'Ollama request timed out';
  }

  return `Ollama request failed with status ${status}`;
}

export async function sendOllamaChat(
  settings: LLMRuntimeSettings,
  request: OllamaChatRequest
): Promise<OllamaChatResponse> {
  const controller = new AbortController();
  const timeoutMs = request.timeoutMs || settings.timeout_ms;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const model = request.model || settings.ollama_model;

  try {
    const response = await fetch(buildOllamaChatUrl(settings.ollama_base_url), {
      method: 'POST',
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: request.messages,
        stream: false,
        keep_alive: settings.keep_alive,
      }),
    });

    if (!response.ok) {
      throw new Error(safeErrorMessage(response.status));
    }

    const data = await response.json();
    const content = typeof data?.message?.content === 'string' ? data.message.content : '';
    if (!content) {
      throw new Error('Ollama returned an empty response');
    }

    return {
      content,
      model: data.model || model,
      usage: {
        prompt_eval_count: data.prompt_eval_count || 0,
        eval_count: data.eval_count || 0,
        total_duration: data.total_duration || 0,
      },
    };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Ollama request timed out');
    }

    throw new Error(error?.message || 'Ollama request failed');
  } finally {
    clearTimeout(timer);
  }
}
