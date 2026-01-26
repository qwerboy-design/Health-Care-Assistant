import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock fetch globally
global.fetch = vi.fn();

// Mock dependencies
vi.mock('@/lib/auth/session', () => ({
  verifySession: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// Import after mocking
import { POST } from '@/app/api/chat/upload-token/route';
import { verifySession } from '@/lib/auth/session';
import { cookies } from 'next/headers';

describe('POST /api/chat/upload-token', () => {
  const mockSession = {
    customerId: 'test-customer-id',
    email: 'test@example.com',
  };

  const mockCookieStore = {
    get: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
    mockCookieStore.get.mockReturnValue({ value: 'test-session-token' });
    vi.mocked(verifySession).mockResolvedValue(mockSession as any);

    // Mock 環境變數
    process.env.R2_BUCKET_DOMAIN = 'hca.qwerboy.com';

    // Mock agent logging
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as any);

    // Mock Date.now() for consistent timestamps
    vi.spyOn(Date, 'now').mockReturnValue(1234567890000);
  });

  describe('身份驗證', () => {
    it('應該在沒有 Session Token 時返回 401', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const request = new NextRequest('http://localhost/api/chat/upload-token', {
        method: 'POST',
        body: JSON.stringify({
          fileName: 'test.txt',
          fileType: 'text/plain',
          fileSize: 1024,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('未授權');
    });

    it('應該在 Session 無效時返回 401', async () => {
      vi.mocked(verifySession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/chat/upload-token', {
        method: 'POST',
        body: JSON.stringify({
          fileName: 'test.txt',
          fileType: 'text/plain',
          fileSize: 1024,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('請求驗證', () => {
    it('應該在檔案太大時返回 400', async () => {
      const request = new NextRequest('http://localhost/api/chat/upload-token', {
        method: 'POST',
        body: JSON.stringify({
          fileName: 'large.txt',
          fileType: 'text/plain',
          fileSize: 101 * 1024 * 1024, // 101MB
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('檔案太大');
    });

    it('應該接受正好 100MB 的檔案', async () => {
      const request = new NextRequest('http://localhost/api/chat/upload-token', {
        method: 'POST',
        body: JSON.stringify({
          fileName: 'large.txt',
          fileType: 'text/plain',
          fileSize: 100 * 1024 * 1024, // 100MB
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('上傳 Token 生成', () => {
    it('應該成功生成上傳授權', async () => {
      const request = new NextRequest('http://localhost/api/chat/upload-token', {
        method: 'POST',
        body: JSON.stringify({
          fileName: 'test.txt',
          fileType: 'text/plain',
          fileSize: 1024,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.uploadUrl).toBe('/api/chat/upload');
      expect(data.data.uploadKey).toBe('test-customer-id/1234567890000-test.txt');
      expect(data.data.fileUrl).toBe('https://hca.qwerboy.com/test-customer-id/1234567890000-test.txt');
    });

    it('應該為不同使用者生成不同的 uploadKey', async () => {
      const differentSession = {
        customerId: 'different-customer-id',
        email: 'different@example.com',
      };

      vi.mocked(verifySession).mockResolvedValue(differentSession as any);

      const request = new NextRequest('http://localhost/api/chat/upload-token', {
        method: 'POST',
        body: JSON.stringify({
          fileName: 'test.txt',
          fileType: 'text/plain',
          fileSize: 1024,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.uploadKey).toBe('different-customer-id/1234567890000-test.txt');
      expect(data.data.fileUrl).toContain('different-customer-id');
    });

    it('應該在 uploadKey 中包含時間戳記', async () => {
      const request = new NextRequest('http://localhost/api/chat/upload-token', {
        method: 'POST',
        body: JSON.stringify({
          fileName: 'test.txt',
          fileType: 'text/plain',
          fileSize: 1024,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.data.uploadKey).toContain('1234567890000');
    });

    it('應該在 uploadKey 中保留原始檔案名稱', async () => {
      const request = new NextRequest('http://localhost/api/chat/upload-token', {
        method: 'POST',
        body: JSON.stringify({
          fileName: 'important-document.pdf',
          fileType: 'application/pdf',
          fileSize: 2048,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.data.uploadKey).toContain('important-document.pdf');
      expect(data.data.uploadKey).toBe('test-customer-id/1234567890000-important-document.pdf');
    });

    it('應該使用預設的 R2_BUCKET_DOMAIN', async () => {
      delete process.env.R2_BUCKET_DOMAIN;

      const request = new NextRequest('http://localhost/api/chat/upload-token', {
        method: 'POST',
        body: JSON.stringify({
          fileName: 'test.txt',
          fileType: 'text/plain',
          fileSize: 1024,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.fileUrl).toContain('hca.qwerboy.com');
    });
  });

  describe('不同檔案類型', () => {
    const testCases = [
      { fileName: 'image.png', fileType: 'image/png', fileSize: 1024 },
      { fileName: 'document.pdf', fileType: 'application/pdf', fileSize: 2048 },
      { fileName: 'data.json', fileType: 'application/json', fileSize: 512 },
      { fileName: 'video.mp4', fileType: 'video/mp4', fileSize: 5 * 1024 * 1024 },
    ];

    it.each(testCases)('應該處理 $fileType 類型的檔案', async (testCase) => {
      const request = new NextRequest('http://localhost/api/chat/upload-token', {
        method: 'POST',
        body: JSON.stringify(testCase),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.uploadKey).toContain(testCase.fileName);
      expect(data.data.fileUrl).toContain(testCase.fileName);
    });
  });

  describe('邊界情況', () => {
    it('應該處理特殊字元的檔案名稱', async () => {
      const request = new NextRequest('http://localhost/api/chat/upload-token', {
        method: 'POST',
        body: JSON.stringify({
          fileName: '測試 檔案 (1).txt',
          fileType: 'text/plain',
          fileSize: 1024,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.uploadKey).toContain('測試 檔案 (1).txt');
    });

    it('應該處理空檔案', async () => {
      const request = new NextRequest('http://localhost/api/chat/upload-token', {
        method: 'POST',
        body: JSON.stringify({
          fileName: 'empty.txt',
          fileType: 'text/plain',
          fileSize: 0,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('應該處理非常長的檔案名稱', async () => {
      const longFileName = 'a'.repeat(200) + '.txt';

      const request = new NextRequest('http://localhost/api/chat/upload-token', {
        method: 'POST',
        body: JSON.stringify({
          fileName: longFileName,
          fileType: 'text/plain',
          fileSize: 1024,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.uploadKey).toContain(longFileName);
    });
  });

  describe('Agent Logging', () => {
    it('應該記錄 Token 生成的資訊', async () => {
      const request = new NextRequest('http://localhost/api/chat/upload-token', {
        method: 'POST',
        body: JSON.stringify({
          fileName: 'test.txt',
          fileType: 'text/plain',
          fileSize: 1024,
        }),
      });

      await POST(request);

      // Verify agent logging was called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('127.0.0.1:7245'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Upload token generated'),
        })
      );
    });
  });

  describe('錯誤處理', () => {
    it('應該在發生未預期錯誤時返回 500', async () => {
      // Force an error by making verifySession throw
      vi.mocked(verifySession).mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost/api/chat/upload-token', {
        method: 'POST',
        body: JSON.stringify({
          fileName: 'test.txt',
          fileType: 'text/plain',
          fileSize: 1024,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('生成上傳授權失敗');
    });
  });
});
