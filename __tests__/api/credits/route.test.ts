import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing
vi.mock('@/lib/supabase/credits', () => ({
  getCustomerCredits: vi.fn(),
  getCreditsHistory: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  verifySession: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// Import after mocking
import { GET } from '@/app/api/credits/route';
import { getCustomerCredits, getCreditsHistory } from '@/lib/supabase/credits';
import { verifySession } from '@/lib/auth/session';
import { cookies } from 'next/headers';

describe('GET /api/credits', () => {
  const mockCookieStore = {
    get: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
  });

  it('應該返回當前用戶的 Credits 分數', async () => {
    const mockSession = {
      customerId: 'test-customer-id',
      email: 'test@example.com',
    };
    const mockCredits = 100;

    mockCookieStore.get.mockReturnValue({ value: 'test-session-token' });
    vi.mocked(verifySession).mockResolvedValue(mockSession as any);
    vi.mocked(getCustomerCredits).mockResolvedValue(mockCredits);

    const request = new NextRequest('http://localhost/api/credits');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.credits).toBe(mockCredits);
    expect(verifySession).toHaveBeenCalledWith('test-session-token');
    expect(getCustomerCredits).toHaveBeenCalledWith(mockSession.customerId);
  });

  it('應該在未授權時返回 401 錯誤', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'test-session-token' });
    vi.mocked(verifySession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/credits');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain('未授權');
  });

  it('應該在查詢 Credits 失敗時返回 500 錯誤', async () => {
    const mockSession = {
      customerId: 'test-customer-id',
      email: 'test@example.com',
    };

    vi.mocked(verifySession).mockResolvedValue(mockSession as any);
    vi.mocked(getCustomerCredits).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/credits');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('取得 Credits 失敗');
  });

  it('應該支援查詢參數 history=true 返回消費歷史', async () => {
    const mockSession = {
      customerId: 'test-customer-id',
      email: 'test@example.com',
    };
    const mockCredits = 100;
    const mockHistory = [
      {
        id: 'trans-1',
        customer_id: mockSession.customerId,
        conversation_id: 'conv-1',
        model_name: 'claude-sonnet-4-20250514',
        credits_cost: 10,
        credits_before: 110,
        credits_after: 100,
        created_at: '2024-01-01T00:00:00Z',
      },
    ];

    mockCookieStore.get.mockReturnValue({ value: 'test-session-token' });
    vi.mocked(verifySession).mockResolvedValue(mockSession as any);
    vi.mocked(getCustomerCredits).mockResolvedValue(mockCredits);
    vi.mocked(getCreditsHistory).mockResolvedValue(mockHistory);

    const request = new NextRequest('http://localhost/api/credits?history=true');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.credits).toBe(mockCredits);
    expect(data.data.history).toEqual(mockHistory);
    expect(getCreditsHistory).toHaveBeenCalledWith(mockSession.customerId, 50);
  });

  it('應該支援自訂 limit 參數', async () => {
    const mockSession = {
      customerId: 'test-customer-id',
      email: 'test@example.com',
    };
    const mockCredits = 100;
    const mockHistory: any[] = [];

    mockCookieStore.get.mockReturnValue({ value: 'test-session-token' });
    vi.mocked(verifySession).mockResolvedValue(mockSession as any);
    vi.mocked(getCustomerCredits).mockResolvedValue(mockCredits);
    vi.mocked(getCreditsHistory).mockResolvedValue(mockHistory);

    const request = new NextRequest('http://localhost/api/credits?history=true&limit=10');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(getCreditsHistory).toHaveBeenCalledWith(mockSession.customerId, 10);
  });

  it('應該在查詢歷史失敗時返回 500 錯誤', async () => {
    const mockSession = {
      customerId: 'test-customer-id',
      email: 'test@example.com',
    };
    const mockCredits = 100;

    vi.mocked(verifySession).mockResolvedValue(mockSession as any);
    vi.mocked(getCustomerCredits).mockResolvedValue(mockCredits);
    vi.mocked(getCreditsHistory).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/credits?history=true');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('取得 Credits 失敗');
  });
});
