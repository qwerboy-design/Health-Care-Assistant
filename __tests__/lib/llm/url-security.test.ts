import { describe, expect, it } from 'vitest';
import { normalizeOllamaBaseUrl, validateOllamaBaseUrl } from '@/lib/llm/url-security';

describe('Ollama URL security', () => {
  it('allows localhost and 127.0.0.1', () => {
    expect(validateOllamaBaseUrl('http://localhost:11434/api').valid).toBe(true);
    expect(validateOllamaBaseUrl('http://127.0.0.1:11434/api').valid).toBe(true);
  });

  it('rejects public hosts and metadata IPs', () => {
    expect(validateOllamaBaseUrl('https://example.com/api').valid).toBe(false);
    expect(validateOllamaBaseUrl('http://169.254.169.254/latest').valid).toBe(false);
  });

  it('rejects credentials and unsupported protocols', () => {
    expect(validateOllamaBaseUrl('http://user:pass@localhost:11434/api').valid).toBe(false);
    expect(validateOllamaBaseUrl('file:///tmp/ollama').valid).toBe(false);
  });

  it('rejects hostname lookalikes and does not enable IPv6 loopback by default', () => {
    expect(validateOllamaBaseUrl('http://127.0.0.1.evil.com:11434/api').valid).toBe(false);
    expect(validateOllamaBaseUrl('http://user@127.0.0.1.evil.com:11434/api').valid).toBe(false);
    expect(validateOllamaBaseUrl('http://[::1]:11434/api').valid).toBe(false);
  });

  it('normalizes trailing slash', () => {
    expect(normalizeOllamaBaseUrl('http://127.0.0.1:11434/api/')).toBe('http://127.0.0.1:11434/api');
  });
});
