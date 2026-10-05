import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MCPClient } from '@/lib/mcp/client';

global.fetch = vi.fn();

vi.mock('@/lib/llm/settings', () => ({
  getLLMRuntimeSettings: vi.fn(async () => ({
    id: 'default',
    active_provider: 'anthropic',
    ollama_base_url: 'http://127.0.0.1:11434/api',
    ollama_model: 'llama3.1:8b',
    ollama_vision_model: null,
    timeout_ms: 30000,
    keep_alive: '5m',
    is_enabled: true,
    updated_by: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  })),
}));

describe('MCP client redaction', () => {
  let client: MCPClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new MCPClient({
      serverUrl: 'https://api.anthropic.com/v1/messages',
      apiKey: 'sk-ant-test-key',
    });
  });

  it('redacts outbound prompt content before calling Anthropic', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'ok' }],
        model: 'claude-haiku-4-5-20251001',
        usage: { input_tokens: 10, output_tokens: 20 },
      }),
    } as any);

    await client.sendMessage({
      message: '姓名: 王大明\n身分證字號: A123456789\nEmail: patient@example.com',
      workloadLevel: 'standard',
      conversationHistory: [
        {
          role: 'user',
          content: 'Patient 王大明 0912-345-678',
        },
      ],
    });

    const [, options] = vi.mocked(global.fetch).mock.calls[0];
    const requestBody = JSON.parse(options?.body as string);
    const serialized = JSON.stringify(requestBody);

    expect(serialized).toContain('[REDACTED_NAME]');
    expect(serialized).toContain('[REDACTED_TW_ID]');
    expect(serialized).toContain('[REDACTED_EMAIL]');
    expect(serialized).toContain('[REDACTED_PHONE]');
    expect(serialized).not.toContain('A123456789');
    expect(serialized).not.toContain('patient@example.com');
  });
});
