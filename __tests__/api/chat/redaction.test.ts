import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({}),
} as any);

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

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { POST } from '@/app/api/chat/route';
import { verifySession } from '@/lib/auth/session';
import { createConversation } from '@/lib/supabase/conversations';
import { createMessage, getMessagesByConversationId } from '@/lib/supabase/messages';
import { getCustomerCredits, deductCredits } from '@/lib/supabase/credits';
import { getModelPricing } from '@/lib/supabase/model-pricing';
import { createMCPClient } from '@/lib/mcp/client';
import { cookies } from 'next/headers';

describe('POST /api/chat redaction', () => {
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
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
    mockCookieStore.get.mockReturnValue({ value: 'test-session-token' });
    vi.mocked(verifySession).mockResolvedValue(mockSession as any);
    vi.mocked(createMCPClient).mockReturnValue(mockMCPClient as any);
    vi.mocked(getModelPricing).mockResolvedValue({
      id: 'model-1',
      model_name: 'claude-sonnet-4-5-20250929',
      display_name: 'Claude Sonnet 4.5',
      credits_cost: 10,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } as any);
    vi.mocked(getCustomerCredits).mockResolvedValue(100);
    vi.mocked(deductCredits).mockResolvedValue({
      success: true,
      creditsAfter: 90,
      creditsBefore: 100,
      transactionId: 'tx-1',
    });
    vi.mocked(createConversation).mockResolvedValue({
      id: 'conv-1',
      customer_id: 'test-customer-id',
      title: 'placeholder',
      workload_level: 'standard',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } as any);
    vi.mocked(getMessagesByConversationId).mockResolvedValue([
      {
        id: 'msg-h1',
        conversation_id: 'conv-1',
        role: 'user',
        content: 'Patient 王大明 0912-345-678',
        created_at: '2026-01-01T00:00:00Z',
      },
    ] as any);
    vi.mocked(createMessage).mockResolvedValue({} as any);
    mockMCPClient.sendMessage.mockResolvedValue({
      content: 'assistant response',
      skillsUsed: [],
    });
  });

  it('stores and forwards redacted content instead of raw identifiers', async () => {
    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: '姓名: 王大明\n身分證字號: A123456789',
        workloadLevel: 'standard',
        fileName: '王大明-A123456789-report.pdf',
        fileUrl: 'https://files.example.com/test-customer-id/170-redacted.pdf',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    expect(createConversation).toHaveBeenCalledWith(
      'test-customer-id',
      expect.stringContaining('[REDACTED_NAME]'),
      'standard',
      undefined,
      'claude-sonnet-4-5-20250929'
    );

    expect(createMessage).toHaveBeenNthCalledWith(
      1,
      'conv-1',
      'user',
      expect.stringContaining('[REDACTED_NAME]'),
      'https://files.example.com/test-customer-id/170-redacted.pdf',
      expect.stringContaining('redacted-tw-id'),
      undefined
    );

    expect(mockMCPClient.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('[REDACTED_NAME]'),
        conversationHistory: [
          {
            role: 'user',
            content: expect.stringContaining('[REDACTED_NAME]'),
          },
        ],
      })
    );

    const outbound = mockMCPClient.sendMessage.mock.calls[0][0];
    expect(JSON.stringify(outbound)).not.toContain('A123456789');
    expect(JSON.stringify(outbound)).not.toContain('王大明');
  });
});
