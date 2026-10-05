import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MCPClient } from '@/lib/mcp/client';
import { getLLMRuntimeSettings } from '@/lib/llm/settings';
import { sendOllamaChat } from '@/lib/llm/ollama-client';
import { sendOpenAIChat, streamOpenAIChat } from '@/lib/llm/openai-client';

// Mock fetch globally
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

vi.mock('@/lib/llm/ollama-client', () => ({
  sendOllamaChat: vi.fn(async () => ({
    content: 'Ollama response',
    model: 'llama3.1:8b',
    usage: { eval_count: 2 },
  })),
}));

vi.mock('@/lib/llm/openai-client', () => ({
  DEFAULT_OPENAI_MODEL: 'gpt-4o-mini',
  sendOpenAIChat: vi.fn(async () => ({
    content: 'OpenAI response',
    model: 'gpt-4o-mini',
    usage: { prompt_tokens: 2, completion_tokens: 3 },
  })),
  streamOpenAIChat: vi.fn(),
}));

describe('MCP Client - Model Selection', () => {
  let client: MCPClient;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock environment variables
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.OPENAI_API_KEY = 'sk-openai-test-key';
    delete process.env.OPENAI_MODEL;

    // Create client instance
    client = new MCPClient({
      serverUrl: 'https://api.anthropic.com/v1/messages',
      apiKey: 'sk-ant-test',
    });
  });

  describe('sendMessage with modelName', () => {
    it('應該使用提供的 modelName 呼叫 Anthropic API', async () => {
      const modelName = 'claude-sonnet-4-20250514';

      // Mock successful API response
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Test response' }],
          model: modelName,
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
      } as any);

      await client.sendMessage({
        message: 'Test message',
        workloadLevel: 'standard',
        modelName,
      });

      // 驗證 fetch 被呼叫
      expect(global.fetch).toHaveBeenCalled();

      // Get the Anthropic API call.
      const fetchCalls = vi.mocked(global.fetch).mock.calls;
      const anthropicCall = fetchCalls.find(call =>
        call[0] === 'https://api.anthropic.com/v1/messages'
      );

      expect(anthropicCall).toBeDefined();
      const requestBody = JSON.parse(anthropicCall![1]?.body as string);

      // 驗證使用了正確的模型
      expect(requestBody.model).toBe(modelName);
    });

    it('應該在未提供 modelName 時使用預設模型', async () => {
      // 修復：更新預設模型為 Claude 4.5 Haiku (與 lib/mcp/client.ts 一致)
      const defaultModel = 'claude-haiku-4-5-20251001';

      // Mock successful API response
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Test response' }],
          model: defaultModel,
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
      } as any);

      await client.sendMessage({
        message: 'Test message',
        workloadLevel: 'standard',
        // 沒有提供 modelName
      });

      // 獲取對 Anthropic API 的呼叫
      const fetchCalls = vi.mocked(global.fetch).mock.calls;
      const anthropicCall = fetchCalls.find(call =>
        call[0] === 'https://api.anthropic.com/v1/messages'
      );

      expect(anthropicCall).toBeDefined();
      const requestBody = JSON.parse(anthropicCall![1]?.body as string);

      // 驗證使用了預設模型
      expect(requestBody.model).toBe(defaultModel);
    });

    it('應該支援不同的模型名稱', async () => {
      const models = [
        'claude-sonnet-4-20250514',
        'claude-3-5-sonnet-20241022',
        'claude-3-haiku-20240307',
      ];

      for (const modelName of models) {
        vi.clearAllMocks();

        // Mock successful API response
        vi.mocked(global.fetch).mockResolvedValue({
          ok: true,
          json: async () => ({
            content: [{ type: 'text', text: 'Test response' }],
            model: modelName,
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
        } as any);

        await client.sendMessage({
          message: 'Test message',
          workloadLevel: 'standard',
          modelName,
        });

        // 獲取對 Anthropic API 的呼叫
        const fetchCalls = vi.mocked(global.fetch).mock.calls;
        const anthropicCall = fetchCalls.find(call =>
          call[0] === 'https://api.anthropic.com/v1/messages'
        );

        expect(anthropicCall).toBeDefined();
        const requestBody = JSON.parse(anthropicCall![1]?.body as string);

        // 驗證使用了正確的模型
        expect(requestBody.model).toBe(modelName);
      }
    });

    it('應該在回應的 metadata 中返回使用的模型', async () => {
      const modelName = 'claude-sonnet-4-20250514';

      // Mock successful API response
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Test response' }],
          model: modelName,
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
      } as any);

      const response = await client.sendMessage({
        message: 'Test message',
        workloadLevel: 'standard',
        modelName,
      });

      // 驗證回應中包含模型資訊
      expect(response.metadata?.model).toBe(modelName);
    });

    it('應該在環境變數設定時優先使用環境變數的模型', async () => {
      const envModel = 'claude-3-opus-20240229';
      process.env.ANTHROPIC_MODEL = envModel;

      // Mock successful API response
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Test response' }],
          model: envModel,
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
      } as any);

      await client.sendMessage({
        message: 'Test message',
        workloadLevel: 'standard',
        // 沒有提供 modelName，應該使用環境變數
      });

      // 獲取對 Anthropic API 的呼叫
      const fetchCalls = vi.mocked(global.fetch).mock.calls;
      const anthropicCall = fetchCalls.find(call =>
        call[0] === 'https://api.anthropic.com/v1/messages'
      );

      expect(anthropicCall).toBeDefined();
      const requestBody = JSON.parse(anthropicCall![1]?.body as string);

      // 驗證使用了環境變數的模型
      expect(requestBody.model).toBe(envModel);

      // 清理環境變數
      delete process.env.ANTHROPIC_MODEL;
    });

    it('應該在提供 modelName 時覆蓋環境變數的模型', async () => {
      const envModel = 'claude-3-opus-20240229';
      const requestModel = 'claude-sonnet-4-20250514';
      process.env.ANTHROPIC_MODEL = envModel;

      // Mock successful API response
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Test response' }],
          model: requestModel,
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
      } as any);

      await client.sendMessage({
        message: 'Test message',
        workloadLevel: 'standard',
        modelName: requestModel,
      });

      // 獲取對 Anthropic API 的呼叫
      const fetchCalls = vi.mocked(global.fetch).mock.calls;
      const anthropicCall = fetchCalls.find(call =>
        call[0] === 'https://api.anthropic.com/v1/messages'
      );

      expect(anthropicCall).toBeDefined();
      const requestBody = JSON.parse(anthropicCall![1]?.body as string);

      // 驗證使用了請求中的模型，而不是環境變數
      expect(requestBody.model).toBe(requestModel);

      // 清理環境變數
      delete process.env.ANTHROPIC_MODEL;
    });

    it('Ollama 模式不應呼叫 Anthropic API', async () => {
      vi.mocked(getLLMRuntimeSettings).mockResolvedValue({
        id: 'default',
        active_provider: 'ollama',
        ollama_base_url: 'http://127.0.0.1:11434/api',
        ollama_model: 'llama3.1:8b',
        ollama_vision_model: null,
        timeout_ms: 30000,
        keep_alive: '5m',
        is_enabled: true,
        updated_by: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      const response = await client.sendMessage({
        message: 'Test message',
        workloadLevel: 'standard',
        modelName: 'claude-sonnet-4-20250514',
      });

      expect(response.content).toBe('Ollama response');
      expect(sendOllamaChat).toHaveBeenCalledWith(
        expect.objectContaining({ active_provider: 'ollama' }),
        expect.objectContaining({ model: 'llama3.1:8b' })
      );
      expect(global.fetch).not.toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.anything()
      );
    });

    it('OpenAI 模式應呼叫 OpenAI provider 且不呼叫 Anthropic API', async () => {
      vi.mocked(getLLMRuntimeSettings).mockResolvedValue({
        id: 'default',
        active_provider: 'openai',
        ollama_base_url: 'http://127.0.0.1:11434/api',
        ollama_model: 'llama3.1:8b',
        ollama_vision_model: null,
        timeout_ms: 30000,
        keep_alive: '5m',
        is_enabled: true,
        updated_by: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      const response = await client.sendMessage({
        message: 'Test message',
        workloadLevel: 'standard',
        modelName: 'gpt-4o-mini',
      });

      expect(response.content).toBe('OpenAI response');
      expect(response.metadata?.provider).toBe('openai');
      expect(sendOpenAIChat).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-4o-mini' })
      );
      expect(global.fetch).not.toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.anything()
      );
    });

    it('OpenAI 模式選到舊 Claude model ID 時應改用 OpenAI 預設模型', async () => {
      vi.mocked(getLLMRuntimeSettings).mockResolvedValue({
        id: 'default',
        active_provider: 'openai',
        ollama_base_url: 'http://127.0.0.1:11434/api',
        ollama_model: 'llama3.1:8b',
        ollama_vision_model: null,
        timeout_ms: 30000,
        keep_alive: '5m',
        is_enabled: true,
        updated_by: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      process.env.OPENAI_MODEL = 'gpt-4.1-mini';
      await client.sendMessage({
        message: 'Test message',
        workloadLevel: 'standard',
        modelName: 'claude-sonnet-4-5-20250929',
      });

      expect(sendOpenAIChat).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-4.1-mini' })
      );
    });

    it('OpenAI provider 失敗時不會靜默切換到 Anthropic 或 Ollama', async () => {
      vi.mocked(getLLMRuntimeSettings).mockResolvedValue({
        id: 'default',
        active_provider: 'openai',
        ollama_base_url: 'http://127.0.0.1:11434/api',
        ollama_model: 'llama3.1:8b',
        ollama_vision_model: null,
        timeout_ms: 30000,
        keep_alive: '5m',
        is_enabled: true,
        updated_by: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });
      vi.mocked(sendOpenAIChat).mockRejectedValue(new Error('OpenAI API 請求失敗'));

      await expect(
        client.sendMessage({ message: 'Test message', workloadLevel: 'standard' })
      ).rejects.toThrow('OpenAI API 請求失敗');
      expect(sendOllamaChat).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.anything()
      );
    });

    it('OpenAI streaming path preserves a remote image attachment', async () => {
      vi.mocked(getLLMRuntimeSettings).mockResolvedValue({
        id: 'default',
        active_provider: 'openai',
        ollama_base_url: 'http://127.0.0.1:11434/api',
        ollama_model: 'llama3.1:8b',
        ollama_vision_model: null,
        timeout_ms: 30000,
        keep_alive: '5m',
        is_enabled: true,
        updated_by: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'image/png' }),
        arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
      } as Response);
      vi.mocked(streamOpenAIChat).mockImplementation(async function* () {
        yield 'streamed';
      });

      const chunks: string[] = [];
      for await (const chunk of client.sendMessageStream({
        message: 'Describe this image',
        workloadLevel: 'standard',
        fileUrl: 'https://storage.example.com/image.png',
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['streamed']);
      expect(streamOpenAIChat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.arrayContaining([
                expect.objectContaining({ type: 'image_url' }),
              ]),
            }),
          ]),
        })
      );
    });
  });
});
