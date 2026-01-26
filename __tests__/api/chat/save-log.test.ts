import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock fetch globally
global.fetch = vi.fn();

// Mock all dependencies
vi.mock('@/lib/auth/session', () => ({
  verifySession: vi.fn(),
}));

vi.mock('@/lib/supabase/conversations', () => ({
  getConversationById: vi.fn(),
}));

vi.mock('@/lib/supabase/messages', () => ({
  getMessagesByConversationId: vi.fn(),
}));

vi.mock('@/lib/storage/log-generator', () => ({
  generateMarkdownLog: vi.fn(),
  generateLogFilename: vi.fn(),
  generateLogStoragePath: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// Import after mocking
import { POST } from '@/app/api/chat/save-log/route';
import { verifySession } from '@/lib/auth/session';
import { getConversationById } from '@/lib/supabase/conversations';
import { getMessagesByConversationId } from '@/lib/supabase/messages';
import {
  generateMarkdownLog,
  generateLogFilename,
  generateLogStoragePath,
} from '@/lib/storage/log-generator';
import { cookies } from 'next/headers';

describe('POST /api/chat/save-log', () => {
  const mockSession = {
    customerId: 'test-customer-id',
    email: 'test@example.com',
  };

  const mockCookieStore = {
    get: vi.fn(),
  };

  const mockConversation = {
    id: 'conv-123',
    customer_id: 'test-customer-id',
    title: '測試對話',
    workload_level: 'standard' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockMessages = [
    {
      id: 'msg-1',
      conversation_id: 'conv-123',
      role: 'user' as const,
      content: '使用者訊息',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'msg-2',
      conversation_id: 'conv-123',
      role: 'assistant' as const,
      content: 'AI 回應',
      created_at: '2024-01-01T00:01:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
    mockCookieStore.get.mockReturnValue({ value: 'test-session-token' });
    vi.mocked(verifySession).mockResolvedValue(mockSession as any);

    // Mock R2 環境變數
    process.env.R2_ACCOUNT_ID = 'test-account-id';
    process.env.R2_ACCESS_KEY_ID = 'test-access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.R2_BUCKET_NAME = 'test-bucket';
    process.env.R2_PUBLIC_URL = 'https://test.r2.dev';
  });

  describe('身份驗證', () => {
    it('應該在沒有 Session Token 時返回 401', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const request = new NextRequest('http://localhost/api/chat/save-log', {
        method: 'POST',
        body: JSON.stringify({ conversationId: 'conv-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('未授權');
    });

    it('應該在 Session 無效時返回 401', async () => {
      vi.mocked(verifySession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/chat/save-log', {
        method: 'POST',
        body: JSON.stringify({ conversationId: 'conv-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('請求驗證', () => {
    it('應該在缺少 conversationId 時返回 400', async () => {
      const request = new NextRequest('http://localhost/api/chat/save-log', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('conversationId');
    });

    it('應該在對話不存在時返回 403', async () => {
      vi.mocked(getConversationById).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/chat/save-log', {
        method: 'POST',
        body: JSON.stringify({ conversationId: 'conv-999' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('對話不存在或無權限');
    });

    it('應該在對話不屬於當前用戶時返回 403', async () => {
      vi.mocked(getConversationById).mockResolvedValue({
        ...mockConversation,
        customer_id: 'other-customer-id',
      } as any);

      const request = new NextRequest('http://localhost/api/chat/save-log', {
        method: 'POST',
        body: JSON.stringify({ conversationId: 'conv-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });

  describe('日誌生成與上傳', () => {
    it('應該成功生成並上傳對話日誌', async () => {
      const filename = '20240101_001.md';
      const storagePath = 'logs/test-customer-id/20240101_001.md';
      const markdownContent = '# 對話記錄\n\n測試內容';

      vi.mocked(getConversationById).mockResolvedValue(mockConversation as any);
      vi.mocked(getMessagesByConversationId).mockResolvedValue(mockMessages as any);
      vi.mocked(generateMarkdownLog).mockReturnValue(markdownContent);
      vi.mocked(generateLogFilename).mockReturnValue(filename);
      vi.mocked(generateLogStoragePath).mockReturnValue(storagePath);

      // Mock R2 upload success
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      } as any);

      const request = new NextRequest('http://localhost/api/chat/save-log', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: 'conv-123',
          serialNumber: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.filename).toBe(filename);
      expect(data.data.url).toBe(`https://test.r2.dev/${storagePath}`);
      expect(data.data.storagePath).toBe(storagePath);
      expect(data.data.messageCount).toBe(2);
      expect(data.data.uploadedAt).toBeDefined();

      // Verify R2 upload was called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('r2.cloudflarestorage.com'),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic'),
            'Content-Type': 'text/markdown; charset=utf-8',
          }),
          body: markdownContent,
        })
      );
    });

    it('應該使用預設 serialNumber 為 1', async () => {
      const filename = '20240101_001.md';
      const storagePath = 'logs/test-customer-id/20240101_001.md';

      vi.mocked(getConversationById).mockResolvedValue(mockConversation as any);
      vi.mocked(getMessagesByConversationId).mockResolvedValue(mockMessages as any);
      vi.mocked(generateMarkdownLog).mockReturnValue('# Test');
      vi.mocked(generateLogFilename).mockReturnValue(filename);
      vi.mocked(generateLogStoragePath).mockReturnValue(storagePath);

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as any);

      const request = new NextRequest('http://localhost/api/chat/save-log', {
        method: 'POST',
        body: JSON.stringify({ conversationId: 'conv-123' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(generateLogFilename).toHaveBeenCalledWith(1);
    });

    it('應該在 R2 上傳失敗時返回錯誤', async () => {
      vi.mocked(getConversationById).mockResolvedValue(mockConversation as any);
      vi.mocked(getMessagesByConversationId).mockResolvedValue(mockMessages as any);
      vi.mocked(generateMarkdownLog).mockReturnValue('# Test');
      vi.mocked(generateLogFilename).mockReturnValue('test.md');
      vi.mocked(generateLogStoragePath).mockReturnValue('logs/test/test.md');

      // Mock R2 upload failure
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'R2 error details',
      } as any);

      const request = new NextRequest('http://localhost/api/chat/save-log', {
        method: 'POST',
        body: JSON.stringify({ conversationId: 'conv-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('R2 upload failed');
    });

    it('應該在缺少 R2 配置時返回錯誤', async () => {
      delete process.env.R2_ACCOUNT_ID;

      vi.mocked(getConversationById).mockResolvedValue(mockConversation as any);
      vi.mocked(getMessagesByConversationId).mockResolvedValue(mockMessages as any);
      vi.mocked(generateMarkdownLog).mockReturnValue('# Test');
      vi.mocked(generateLogFilename).mockReturnValue('test.md');
      vi.mocked(generateLogStoragePath).mockReturnValue('logs/test/test.md');

      const request = new NextRequest('http://localhost/api/chat/save-log', {
        method: 'POST',
        body: JSON.stringify({ conversationId: 'conv-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('R2 configuration missing');
    });
  });

  describe('邊界情況', () => {
    it('應該能處理空的對話（無訊息）', async () => {
      vi.mocked(getConversationById).mockResolvedValue(mockConversation as any);
      vi.mocked(getMessagesByConversationId).mockResolvedValue([]);
      vi.mocked(generateMarkdownLog).mockReturnValue('# Empty');
      vi.mocked(generateLogFilename).mockReturnValue('test.md');
      vi.mocked(generateLogStoragePath).mockReturnValue('logs/test/test.md');

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as any);

      const request = new NextRequest('http://localhost/api/chat/save-log', {
        method: 'POST',
        body: JSON.stringify({ conversationId: 'conv-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.messageCount).toBe(0);
    });

    it('應該能處理大量訊息的對話', async () => {
      const largeMessages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        conversation_id: 'conv-123',
        role: (i % 2 === 0 ? 'user' : 'assistant') as const,
        content: `訊息 ${i}`,
        created_at: '2024-01-01T00:00:00Z',
      }));

      vi.mocked(getConversationById).mockResolvedValue(mockConversation as any);
      vi.mocked(getMessagesByConversationId).mockResolvedValue(largeMessages as any);
      vi.mocked(generateMarkdownLog).mockReturnValue('# Large log');
      vi.mocked(generateLogFilename).mockReturnValue('test.md');
      vi.mocked(generateLogStoragePath).mockReturnValue('logs/test/test.md');

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as any);

      const request = new NextRequest('http://localhost/api/chat/save-log', {
        method: 'POST',
        body: JSON.stringify({ conversationId: 'conv-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.messageCount).toBe(100);
      expect(getMessagesByConversationId).toHaveBeenCalledWith('conv-123', 1000);
    });
  });
});
