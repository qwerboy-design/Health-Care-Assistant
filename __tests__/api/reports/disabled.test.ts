import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/session', () => ({ verifySession: vi.fn(async () => ({ customerId: 'customer-1' })) }));
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: () => ({ value: 'session' }) })) }));
vi.mock('@/lib/supabase/conversations', () => ({ createConversation: vi.fn(), getConversationById: vi.fn() }));
vi.mock('@/lib/supabase/messages', () => ({ createMessage: vi.fn(), getMessagesByConversationId: vi.fn() }));
vi.mock('@/lib/supabase/credits', () => ({ getCustomerCredits: vi.fn(), deductCredits: vi.fn(), addCredits: vi.fn() }));
vi.mock('@/lib/supabase/model-pricing', () => ({ getModelPricing: vi.fn() }));
vi.mock('@/lib/mcp/client', () => ({ createMCPClient: vi.fn() }));
vi.mock('@/lib/llm/settings', () => ({ getLLMRuntimeSettings: vi.fn() }));

import { POST } from '@/app/api/chat/route';

describe('health report feature gate', () => {
  it('rejects report input before credits or model access when disabled', async () => {
    vi.stubEnv('ENABLE_HEALTH_REPORT_ASSISTANT', 'false');
    const response = await POST(new NextRequest('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({ reportInput: { reportId: '123e4567-e89b-12d3-a456-426614174000' } }) }));
    expect(response.status).toBe(404);
    expect((await response.json()).error).toContain('not enabled');
    vi.unstubAllEnvs();
  });
});
