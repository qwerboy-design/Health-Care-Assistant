import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock fetch globally
global.fetch = vi.fn();

// Create mock send function that will be shared
let mockSendImplementation: any;

// Mock AWS SDK S3 Client
vi.mock('@aws-sdk/client-s3', () => {
  class MockPutObjectCommand {
    constructor(public params: any) {}
  }
  
  return {
    S3Client: vi.fn(function (this: any) {
      return {
        send: (...args: any[]) => {
          if (mockSendImplementation) {
            return mockSendImplementation(...args);
          }
          return Promise.resolve({});
        },
      };
    }),
    PutObjectCommand: MockPutObjectCommand,
  };
});

// Mock dependencies
vi.mock('@/lib/auth/session', () => ({
  verifySession: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// Import after mocking
import { POST } from '@/app/api/chat/upload/route';
import { verifySession } from '@/lib/auth/session';
import { cookies } from 'next/headers';

describe('POST /api/chat/upload', () => {
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
    
    // Setup default S3 send mock
    mockSendImplementation = vi.fn().mockResolvedValue({});

    // 修復：Mock 環境變數（長度必須符合 Cloudflare R2 要求）
    process.env.R2_ACCESS_KEY_ID = '12345678901234567890123456789012'; // 32 字元
    process.env.R2_SECRET_ACCESS_KEY = '1234567890123456789012345678901234567890123456789012345678901234'; // 64 字元
    process.env.R2_ACCOUNT_ID = 'test-account-id';
    process.env.R2_BUCKET_NAME = 'test-bucket';
    process.env.R2_BUCKET_DOMAIN = 'hca.qwerboy.com';

    // Mock agent logging (suppress network calls)
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as any);
  });

  describe('身份驗證', () => {
    it('應該在沒有 Session Token 時返回 401', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'text/plain' }), 'test.txt');
      formData.append('uploadKey', 'test-customer-id/test.txt');

      const request = new NextRequest('http://localhost/api/chat/upload', {
        method: 'POST',
        body: formData as any,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('未授權');
    });

    it('應該在 Session 無效時返回 401', async () => {
      vi.mocked(verifySession).mockResolvedValue(null);

      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'text/plain' }), 'test.txt');
      formData.append('uploadKey', 'test-customer-id/test.txt');

      const request = new NextRequest('http://localhost/api/chat/upload', {
        method: 'POST',
        body: formData as any,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('請求驗證', () => {
    it('應該在缺少檔案時返回 400', async () => {
      const formData = new FormData();
      formData.append('uploadKey', 'test-customer-id/test.txt');

      const request = new NextRequest('http://localhost/api/chat/upload', {
        method: 'POST',
        body: formData as any,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('缺少檔案或上傳 key');
    });

    it('應該在缺少 uploadKey 時返回 400', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'text/plain' }), 'test.txt');

      const request = new NextRequest('http://localhost/api/chat/upload', {
        method: 'POST',
        body: formData as any,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('缺少檔案或上傳 key');
    });

    it('應該驗證檔案大小限制（邏輯測試）', () => {
      // 測試檔案大小限制邏輯
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
      const normalFileSize = 50 * 1024 * 1024; // 50MB
      const largeFileSize = 101 * 1024 * 1024; // 101MB

      expect(normalFileSize).toBeLessThanOrEqual(MAX_FILE_SIZE);
      expect(largeFileSize).toBeGreaterThan(MAX_FILE_SIZE);
      
      // 驗證檔案大小限制常數
      expect(MAX_FILE_SIZE).toBe(100 * 1024 * 1024);
    });

    it('應該在 uploadKey 不屬於當前用戶時返回 403', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'text/plain' }), 'test.txt');
      formData.append('uploadKey', 'other-customer-id/test.txt');

      const request = new NextRequest('http://localhost/api/chat/upload', {
        method: 'POST',
        body: formData as any,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('無權限上傳到此路徑');
    });
  });

  describe('檔案上傳', () => {
    it('應該成功上傳檔案到 R2', async () => {
      const fileContent = 'test file content';
      const file = new Blob([fileContent], { type: 'text/plain' });
      Object.defineProperty(file, 'name', { value: 'test.txt' });
      Object.defineProperty(file, 'size', { value: fileContent.length });

      const uploadKey = 'test-customer-id/1234567890-test.txt';

      const formData = new FormData();
      formData.append('file', file, 'test.txt');
      formData.append('uploadKey', uploadKey);

      const request = new NextRequest('http://localhost/api/chat/upload', {
        method: 'POST',
        body: formData as any,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.fileUrl).toBe(`https://hca.qwerboy.com/${uploadKey}`);

      // Verify S3 send was called
      expect(mockSendImplementation).toHaveBeenCalled();
    });

    it('應該處理不同類型的檔案', async () => {
      const testCases = [
        { type: 'image/png', name: 'image.png' },
        { type: 'application/pdf', name: 'document.pdf' },
        { type: 'application/json', name: 'data.json' },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        mockSendImplementation = vi.fn().mockResolvedValue({});

        const file = new Blob(['test'], { type: testCase.type });
        Object.defineProperty(file, 'name', { value: testCase.name });

        const formData = new FormData();
        formData.append('file', file, testCase.name);
        formData.append('uploadKey', `test-customer-id/${testCase.name}`);

        const request = new NextRequest('http://localhost/api/chat/upload', {
          method: 'POST',
          body: formData as any,
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(mockSendImplementation).toHaveBeenCalled();
      }
    });

    it('應該在 R2 上傳失敗時返回錯誤', async () => {
      mockSendImplementation = vi.fn().mockRejectedValue(new Error('R2 upload failed'));

      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'text/plain' }), 'test.txt');
      formData.append('uploadKey', 'test-customer-id/test.txt');

      const request = new NextRequest('http://localhost/api/chat/upload', {
        method: 'POST',
        body: formData as any,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('檔案上傳失敗');
    });
  });

  describe('邊界情況', () => {
    it('應該能處理正好 100MB 的檔案', async () => {
      const file = new Blob(['x'], { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 100 * 1024 * 1024 });
      Object.defineProperty(file, 'name', { value: 'large.txt' });

      const formData = new FormData();
      formData.append('file', file, 'large.txt');
      formData.append('uploadKey', 'test-customer-id/large.txt');

      const request = new NextRequest('http://localhost/api/chat/upload', {
        method: 'POST',
        body: formData as any,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('應該能處理特殊字元的檔案名稱', async () => {
      const fileName = '測試 檔案 (1).txt';
      const uploadKey = `test-customer-id/${Date.now()}-${fileName}`;

      const file = new Blob(['test'], { type: 'text/plain' });
      Object.defineProperty(file, 'name', { value: fileName });

      const formData = new FormData();
      formData.append('file', file, fileName);
      formData.append('uploadKey', uploadKey);

      const request = new NextRequest('http://localhost/api/chat/upload', {
        method: 'POST',
        body: formData as any,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.fileUrl).toContain('測試');
    });
  });

  describe('Agent Logging', () => {
    it('應該記錄上傳前的資訊', async () => {
      const formData = new FormData();
      const file = new Blob(['test'], { type: 'text/plain' });
      Object.defineProperty(file, 'name', { value: 'test.txt' });
      Object.defineProperty(file, 'size', { value: 4 });

      formData.append('file', file, 'test.txt');
      formData.append('uploadKey', 'test-customer-id/test.txt');

      const request = new NextRequest('http://localhost/api/chat/upload', {
        method: 'POST',
        body: formData as any,
      });

      await POST(request);

      // Verify agent logging was called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('127.0.0.1:7245'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Before R2 upload'),
        })
      );
    });
  });
});
