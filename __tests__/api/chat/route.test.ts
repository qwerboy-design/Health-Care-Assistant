import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock fetch globally
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({}),
} as any);

// Mock all dependencies
vi.mock('@/lib/auth/session', () => ({
  verifySession: vi.fn(),
}));

vi.mock('@/lib/supabase/conversations', () => ({
  createConversation: vi.fn(),
  getConversationById: vi.fn(),
}));

vi.mock('@/lib/supabase/messages', () => ({
  createMessage: vi.fn(),
  getMessagesByConversationId: vi.fn(),
}));

vi.mock('@/lib/supabase/credits', () => ({
  getCustomerCredits: vi.fn(),
  deductCredits: vi.fn(),
  addCredits: vi.fn(),
}));

vi.mock('@/lib/supabase/model-pricing', () => ({
  getModelPricing: vi.fn(),
}));

vi.mock('@/lib/mcp/client', () => ({
  createMCPClient: vi.fn(),
}));

vi.mock('@/lib/llm/settings', () => ({
  getLLMRuntimeSettings: vi.fn(async () => ({
    active_provider: 'anthropic',
    ollama_base_url: 'http://127.0.0.1:11434/api',
    ollama_model: 'llama3.1:8b',
    timeout_ms: 30000,
    keep_alive: '5m',
    is_enabled: true,
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// Import after mocking
import { POST } from '@/app/api/chat/route';
import { verifySession } from '@/lib/auth/session';
import { createConversation, getConversationById } from '@/lib/supabase/conversations';
import { createMessage, getMessagesByConversationId } from '@/lib/supabase/messages';
import { getCustomerCredits, deductCredits, addCredits } from '@/lib/supabase/credits';
import { getModelPricing } from '@/lib/supabase/model-pricing';
import { createMCPClient } from '@/lib/mcp/client';
import { getLLMRuntimeSettings } from '@/lib/llm/settings';
import { cookies } from 'next/headers';

describe('POST /api/chat - Credits Integration', () => {
  const mockSession = {
    customerId: 'test-customer-id',
    email: 'test@example.com',
  };

  const mockCookieStore = {
    get: vi.fn(),
  };

  const mockMCPClient = {
    sendMessage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
    mockCookieStore.get.mockReturnValue({ value: 'test-session-token' });
    vi.mocked(verifySession).mockResolvedValue(mockSession as any);
    vi.mocked(createMCPClient).mockReturnValue(mockMCPClient as any);
    vi.mocked(getMessagesByConversationId).mockResolvedValue([]);
  });

  describe('Credits 檢查與扣除', () => {
    it('應該在發送訊息前檢查 Credits 是否足夠', async () => {
      const modelName = 'claude-sonnet-4-20250514';
      const mockModelPricing = {
        id: 'model-1',
        model_name: modelName,
        display_name: 'Claude Sonnet 4',
        credits_cost: 10,
        is_active: true,
        supports_vision: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(getModelPricing).mockResolvedValue(mockModelPricing);
      vi.mocked(getCustomerCredits).mockResolvedValue(5); // 只有 5 點，不足

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '測試訊息',
          workloadLevel: 'standard',
          modelName,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Insufficient credits');
      expect(getModelPricing).toHaveBeenCalledWith(modelName);
      expect(getCustomerCredits).toHaveBeenCalledWith(mockSession.customerId);
    });

    it('應該在 Credits 足夠時成功扣除並處理訊息', async () => {
      const modelName = 'claude-sonnet-4-20250514';
      const conversationId = 'conv-123';

      const mockModelPricing = {
        id: 'model-1',
        model_name: modelName,
        display_name: 'Claude Sonnet 4',
        credits_cost: 10,
        is_active: true,
        supports_vision: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockConversation = {
        id: conversationId,
        customer_id: mockSession.customerId,
        title: '測試對話',
        workload_level: 'standard' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(getModelPricing).mockResolvedValue(mockModelPricing);
      vi.mocked(getCustomerCredits).mockResolvedValue(100); // 足夠的 Credits
      vi.mocked(deductCredits).mockResolvedValue({
        success: true,
        creditsAfter: 90,
        creditsBefore: 100,
        transactionId: 'trans-123',
      });
      vi.mocked(createConversation).mockResolvedValue(mockConversation as any);
      vi.mocked(createMessage).mockResolvedValue({} as any);
      mockMCPClient.sendMessage.mockResolvedValue({
        content: 'AI 回應',
        skillsUsed: [],
      });

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '測試訊息',
          workloadLevel: 'standard',
          modelName,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(deductCredits).toHaveBeenCalledWith(
        mockSession.customerId,
        10,
        modelName,
        conversationId
      );
      expect(mockMCPClient.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          modelName,
        })
      );
    });

    it('應該在模型不存在時返回錯誤', async () => {
      const modelName = 'non-existent-model';

      vi.mocked(getModelPricing).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '測試訊息',
          workloadLevel: 'standard',
          modelName,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Model is not available');
    });

    it('應該在未提供 modelName 時使用預設模型', async () => {
      // 修復：更新預設模型為 Claude Sonnet 4.5 (與 route.ts 一致)
      const defaultModelName = 'claude-sonnet-4-5-20250929';
      const conversationId = 'conv-123';

      const mockModelPricing = {
        id: 'model-1',
        model_name: defaultModelName,
        display_name: 'Claude Sonnet 4',
        credits_cost: 10,
        is_active: true,
        supports_vision: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockConversation = {
        id: conversationId,
        customer_id: mockSession.customerId,
        title: '測試對話',
        workload_level: 'standard' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(getModelPricing).mockResolvedValue(mockModelPricing);
      vi.mocked(getCustomerCredits).mockResolvedValue(100);
      vi.mocked(deductCredits).mockResolvedValue({
        success: true,
        creditsAfter: 90,
        creditsBefore: 100,
        transactionId: 'trans-123',
      });
      vi.mocked(createConversation).mockResolvedValue(mockConversation as any);
      vi.mocked(createMessage).mockResolvedValue({} as any);
      mockMCPClient.sendMessage.mockResolvedValue({
        content: 'AI 回應',
        skillsUsed: [],
      });

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '測試訊息',
          workloadLevel: 'standard',
          // 沒有提供 modelName
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(getModelPricing).toHaveBeenCalledWith(defaultModelName);
    });

    it('應該在扣除 Credits 失敗時返回錯誤', async () => {
      const modelName = 'claude-sonnet-4-20250514';

      const mockModelPricing = {
        id: 'model-1',
        model_name: modelName,
        display_name: 'Claude Sonnet 4',
        credits_cost: 10,
        is_active: true,
        supports_vision: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockConversation = {
        id: 'conv-123',
        customer_id: mockSession.customerId,
        title: '測試對話',
        workload_level: 'standard' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(getModelPricing).mockResolvedValue(mockModelPricing);
      vi.mocked(getCustomerCredits).mockResolvedValue(100);
      vi.mocked(createConversation).mockResolvedValue(mockConversation as any);
      vi.mocked(deductCredits).mockResolvedValue({
        success: false,
        error: 'Insufficient credits',
      });

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '測試訊息',
          workloadLevel: 'standard',
          modelName,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Insufficient credits');
    });

    it('應該在回應中返回更新後的 Credits', async () => {
      const modelName = 'claude-sonnet-4-20250514';
      const conversationId = 'conv-123';

      const mockModelPricing = {
        id: 'model-1',
        model_name: modelName,
        display_name: 'Claude Sonnet 4',
        credits_cost: 10,
        is_active: true,
        supports_vision: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockConversation = {
        id: conversationId,
        customer_id: mockSession.customerId,
        title: '測試對話',
        workload_level: 'standard' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(getModelPricing).mockResolvedValue(mockModelPricing);
      vi.mocked(getCustomerCredits).mockResolvedValue(100);
      vi.mocked(deductCredits).mockResolvedValue({
        success: true,
        creditsAfter: 90,
        creditsBefore: 100,
        transactionId: 'trans-123',
      });
      vi.mocked(createConversation).mockResolvedValue(mockConversation as any);
      vi.mocked(createMessage).mockResolvedValue({} as any);
      mockMCPClient.sendMessage.mockResolvedValue({
        content: 'AI 回應',
        skillsUsed: [],
      });

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '測試訊息',
          workloadLevel: 'standard',
          modelName,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.creditsAfter).toBe(90);
    });

    it('reports the actual OpenAI model while billing the selected pricing model', async () => {
      const selectedPricingModel = 'claude-sonnet-4-5-20250929';
      const conversationId = 'conv-openai';
      vi.mocked(getModelPricing).mockResolvedValue({
        id: 'model-1',
        model_name: selectedPricingModel,
        display_name: 'Claude Sonnet 4.5',
        credits_cost: 10,
        is_active: true,
        supports_vision: true,
      } as any);
      vi.mocked(getCustomerCredits).mockResolvedValue(100);
      vi.mocked(deductCredits).mockResolvedValue({ success: true, creditsAfter: 90 } as any);
      vi.mocked(createConversation).mockResolvedValue({ id: conversationId, customer_id: mockSession.customerId } as any);
      vi.mocked(createMessage).mockResolvedValue({} as any);
      mockMCPClient.sendMessage.mockResolvedValue({
        content: 'OpenAI response',
        skillsUsed: [],
        metadata: { provider: 'openai', model: 'gpt-4o-mini' },
      });

      const response = await POST(
        new NextRequest('http://localhost/api/chat', {
          method: 'POST',
          body: JSON.stringify({
            message: 'Test message',
            workloadLevel: 'standard',
            modelName: selectedPricingModel,
          }),
        })
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.message.provider).toBe('openai');
      expect(data.data.message.model).toBe('gpt-4o-mini');
      expect(deductCredits).toHaveBeenCalledWith(
        mockSession.customerId,
        10,
        selectedPricingModel,
        conversationId
      );
    });

    it('surfaces an OpenAI failure and refunds the selected pricing credits without fallback', async () => {
      const selectedPricingModel = 'claude-sonnet-4-5-20250929';
      const conversationId = 'conv-openai-failure';
      vi.mocked(getModelPricing).mockResolvedValue({
        model_name: selectedPricingModel,
        credits_cost: 10,
      } as any);
      vi.mocked(getCustomerCredits).mockResolvedValue(100);
      vi.mocked(deductCredits).mockResolvedValue({ success: true, creditsAfter: 90 } as any);
      vi.mocked(addCredits).mockResolvedValue({ success: true, creditsAfter: 100 } as any);
      vi.mocked(createConversation).mockResolvedValue({ id: conversationId, customer_id: mockSession.customerId } as any);
      mockMCPClient.sendMessage.mockRejectedValue(
        Object.assign(new Error('OpenAI API 請求失敗，請稍後再試'), { name: 'OpenAIProviderError' })
      );

      const response = await POST(
        new NextRequest('http://localhost/api/chat', {
          method: 'POST',
          body: JSON.stringify({
            message: 'Test message',
            workloadLevel: 'standard',
            modelName: selectedPricingModel,
          }),
        })
      );
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.error).toContain('OpenAI API 請求失敗');
      expect(addCredits).toHaveBeenCalledWith(
        mockSession.customerId,
        10,
        expect.stringContaining('Refund for failed model call'),
      );
    });

    it('Ollama multipart 附件應傳入 localAttachment 而不是 fileUrl', async () => {
      vi.mocked(getLLMRuntimeSettings).mockResolvedValue({
        active_provider: 'ollama',
        ollama_base_url: 'http://127.0.0.1:11434/api',
        ollama_model: 'llama3.1:8b',
        timeout_ms: 30000,
        keep_alive: '5m',
        is_enabled: true,
      } as any);

      const modelName = 'claude-sonnet-4-20250514';
      const conversationId = 'conv-123';
      vi.mocked(getModelPricing).mockResolvedValue({
        id: 'model-1',
        model_name: modelName,
        display_name: 'Claude Sonnet 4',
        credits_cost: 10,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      } as any);
      vi.mocked(getCustomerCredits).mockResolvedValue(100);
      vi.mocked(deductCredits).mockResolvedValue({
        success: true,
        creditsAfter: 90,
        creditsBefore: 100,
        transactionId: 'trans-123',
      });
      vi.mocked(createConversation).mockResolvedValue({
        id: conversationId,
        customer_id: mockSession.customerId,
        title: '測試對話',
        workload_level: 'standard',
      } as any);
      vi.mocked(createMessage).mockResolvedValue({} as any);
      mockMCPClient.sendMessage.mockResolvedValue({
        content: 'AI 回應',
        skillsUsed: [],
      });

      const formData = new FormData();
      formData.append('message', '分析附件');
      formData.append('workloadLevel', 'standard');
      formData.append('modelName', modelName);
      formData.append('fileName', 'note.txt');
      formData.append('fileType', 'text/plain');
      formData.append('file', new Blob(['hello'], { type: 'text/plain' }), 'note.txt');

      const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: formData as any,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockMCPClient.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          fileUrl: undefined,
          localAttachment: expect.objectContaining({
            fileName: 'note.txt',
            fileType: 'text/plain',
          }),
        })
      );
    });
  });
});
