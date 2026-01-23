import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MCPClient } from '@/lib/mcp/client';

// Mock fetch globally
global.fetch = vi.fn();

describe('MCP Client - Model Selection', () => {
  let client: MCPClient;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock environment variables
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';

    // Create client instance
    client = new MCPClient({
      serverUrl: 'https://api.anthropic.com/v1/messages',
      apiKey: 'sk-ant-test-key',
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

      // 獲取對 Anthropic API 的呼叫（過濾掉 agent log 的呼叫）
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
      const defaultModel = 'claude-3-haiku-20240307';

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
  });
});
