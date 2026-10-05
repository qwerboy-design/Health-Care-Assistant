import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/session', () => ({ verifySession: vi.fn(async () => ({ customerId: 'customer-1' })) }));
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: () => ({ value: 'session' }) })) }));
const { createConversation, createMessage } = vi.hoisted(() => ({
  createConversation: vi.fn(async () => ({ id: '223e4567-e89b-12d3-a456-426614174000' })),
  createMessage: vi.fn(async (...args: unknown[]) => args[1] === 'user'
    ? { id: '323e4567-e89b-12d3-a456-426614174000', content: 'confirmed' }
    : { content: 'analysis' }),
}));
vi.mock('@/lib/supabase/conversations', () => ({ createConversation, getConversationById: vi.fn() }));
vi.mock('@/lib/supabase/messages', () => ({ createMessage, getMessagesByConversationId: vi.fn() }));
vi.mock('@/lib/supabase/credits', () => ({ getCustomerCredits: vi.fn(async () => 100), deductCredits: vi.fn(async () => ({ success: true, creditsAfter: 90 })), addCredits: vi.fn() }));
vi.mock('@/lib/supabase/model-pricing', () => ({ getModelPricing: vi.fn(async () => ({ credits_cost: 10 })) }));
vi.mock('@/lib/mcp/client', () => ({ createMCPClient: vi.fn() }));
vi.mock('@/lib/llm/settings', () => ({ getLLMRuntimeSettings: vi.fn() }));

import { POST } from '@/app/api/chat/route';

function reportItem(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `manual_${index + 1}`,
    label: `Test item ${index + 1}`,
    value: '1', unit: 'mg/dL', referenceRange: '0-2', originalFlag: '', confirmed: true,
    ...overrides,
  };
}

function reportInput(items: unknown[], extra: Record<string, unknown> = {}) {
  return {
    reportId: '123e4567-e89b-12d3-a456-426614174000', reportType: 'adult_health_check',
    sourceKind: 'manual', applicability: 'general_adult', items, ...extra,
  };
}

async function postReport(input: unknown) {
  return POST(new NextRequest('http://localhost/api/chat', {
    method: 'POST', body: JSON.stringify({ reportInput: input }),
  }));
}

describe('health report analysis', () => {
  it('persists confirmed rows with server-owned pending metadata and no raw file', async () => {
    vi.stubEnv('ENABLE_HEALTH_REPORT_ASSISTANT', 'true');
    const response = await POST(new NextRequest('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({ fileUrl: 'https://attacker.invalid/raw.pdf', reportInput: { reportId: '123e4567-e89b-12d3-a456-426614174000', reportType: 'adult_health_check', sourceKind: 'manual', applicability: 'general_adult', items: [{ id: 'glucose', label: 'Glucose', value: '105', unit: 'mg/dL', referenceRange: '70-99', originalFlag: 'H', confirmed: true }] } }) }));
    expect(response.status).toBe(400);
    expect(createMessage).not.toHaveBeenCalled();

    const valid = await POST(new NextRequest('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({ reportInput: { reportId: '123e4567-e89b-12d3-a456-426614174000', reportType: 'adult_health_check', sourceKind: 'manual', applicability: 'general_adult', items: [{ id: 'glucose', label: 'Glucose', value: '105', unit: 'mg/dL', referenceRange: '70-99', originalFlag: 'H', confirmed: true }] } }) }));
    expect(valid.status).toBe(200);
    const payload = await valid.json();
    expect(payload.data.message.analysisMetadata).toMatchObject({ reviewStatus: 'pending_review', retrievalStatus: 'retrieval_not_performed' });
    expect(createMessage.mock.calls[1][6]).toMatchObject({ kind: 'health_report_analysis' });
    vi.unstubAllEnvs();
  });

  it('redacts spaced-CJK PHI before any report message is persisted', async () => {
    vi.stubEnv('ENABLE_HEALTH_REPORT_ASSISTANT', 'true');
    createConversation.mockClear();
    createMessage.mockClear();
    const response = await postReport(reportInput([reportItem(0, {
      label: '受 檢 者 ﹕ 測 試 人 員',
      value: '姓 名：王 小 明',
    })]));
    expect(response.status).toBe(200);
    const persisted = JSON.stringify(createMessage.mock.calls);
    expect(persisted).not.toMatch(/受檢者|受\s+檢\s+者|測試人員|測\s+試\s+人\s+員|王小明|王\s+小\s+明|Test Person/iu);
    vi.unstubAllEnvs();
  });

  it('accepts 33 and 200 confirmed rows without the old meanings overflow', async () => {
    vi.stubEnv('ENABLE_HEALTH_REPORT_ASSISTANT', 'true');
    for (const count of [33, 200]) {
      createConversation.mockClear(); createMessage.mockClear();
      const response = await postReport(reportInput(Array.from({ length: count }, (_, index) => reportItem(index))));
      expect(response.status).toBe(200);
      expect(createConversation).toHaveBeenCalledTimes(1);
    }
    createConversation.mockClear();
    const maxLabelResponse = await postReport(reportInput([reportItem(0, { label: 'L'.repeat(120) })]));
    expect(maxLabelResponse.status).toBe(200);
    expect(createConversation).toHaveBeenCalledTimes(1);
    vi.unstubAllEnvs();
  });

  it('returns zh-TW 4xx validation errors without creating a conversation', async () => {
    vi.stubEnv('ENABLE_HEALTH_REPORT_ASSISTANT', 'true');
    const cases = [
      { input: reportInput(Array.from({ length: 201 }, (_, index) => reportItem(index))), message: '報告項目最多 200 列' },
      { input: reportInput([reportItem(0, { label: 'L'.repeat(121) })]), message: '項目名稱最多 120 個字' },
    ];
    for (const testCase of cases) {
      createConversation.mockClear();
      const response = await postReport(testCase.input);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe(testCase.message);
      expect(createConversation).not.toHaveBeenCalled();
    }
    vi.unstubAllEnvs();
  });

  it('returns a zh-TW 413 for an oversized report before conversation creation', async () => {
    vi.stubEnv('ENABLE_HEALTH_REPORT_ASSISTANT', 'true');
    createConversation.mockClear();
    const oversized = reportInput(
      Array.from({ length: 200 }, (_, index) => reportItem(index, {
        label: 'L'.repeat(120), value: 'V'.repeat(80), unit: 'U'.repeat(40), referenceRange: 'R'.repeat(160), originalFlag: 'F'.repeat(40),
      })),
      { conclusions: Array.from({ length: 20 }, () => 'C'.repeat(1000)), padding: 'P'.repeat(4000) },
    );
    const response = await postReport(oversized);
    expect(response.status).toBe(413);
    expect((await response.json()).error).toBe('報告內容超過 128 KB 上限');
    expect(createConversation).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
