import { describe, expect, it } from 'vitest';
import { DEFAULT_LLM_RUNTIME_SETTINGS, validateLLMRuntimeSettings } from '@/lib/llm/settings';

describe('LLM runtime settings validation', () => {
  it('defaults to Anthropic for backward compatibility', () => {
    expect(DEFAULT_LLM_RUNTIME_SETTINGS.active_provider).toBe('anthropic');
  });

  it('accepts valid Ollama settings', () => {
    const settings = validateLLMRuntimeSettings({
      active_provider: 'ollama',
      ollama_base_url: 'http://127.0.0.1:11434/api',
      ollama_model: 'llama3.1:8b',
      ollama_vision_model: 'llava',
      timeout_ms: 30000,
      keep_alive: '5m',
    });

    expect(settings.active_provider).toBe('ollama');
    expect(settings.ollama_vision_model).toBe('llava');
  });

  it('accepts OpenAI as a runtime provider', () => {
    const settings = validateLLMRuntimeSettings({
      active_provider: 'openai',
      ollama_base_url: 'http://127.0.0.1:11434/api',
      ollama_model: 'llama3.1:8b',
      timeout_ms: 30000,
      keep_alive: '5m',
    });

    expect(settings.active_provider).toBe('openai');
  });

  it('rejects unsupported provider and unsafe timeout', () => {
    expect(() =>
      validateLLMRuntimeSettings({
        active_provider: 'gemini' as any,
        ollama_base_url: 'http://127.0.0.1:11434/api',
        ollama_model: 'llama3.1:8b',
        timeout_ms: 30000,
        keep_alive: '5m',
      })
    ).toThrow('Unsupported LLM provider');

    expect(() =>
      validateLLMRuntimeSettings({
        active_provider: 'ollama',
        ollama_base_url: 'http://127.0.0.1:11434/api',
        ollama_model: 'llama3.1:8b',
        timeout_ms: 999,
        keep_alive: '5m',
      })
    ).toThrow('Timeout must be between');
  });
});
