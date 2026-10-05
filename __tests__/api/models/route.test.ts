import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  verifySession: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { GET } from '@/app/api/models/route';
import { verifySession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/client';
import { cookies } from 'next/headers';

describe('GET /api/models', () => {
  const cookieStore = { get: vi.fn() };
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue(cookieStore as any);
    vi.mocked(supabaseAdmin.from).mockReturnValue(query as any);
    query.select.mockReturnThis();
    query.eq.mockReturnThis();
    query.order.mockResolvedValue({
      data: [
        {
          id: 'model-1',
          model_name: 'claude-sonnet-4-5-20250929',
          display_name: 'Claude Sonnet 4.5',
          supports_vision: true,
          credits_cost: 5,
          // 即使 DB 回傳額外欄位，也不得外洩給客戶端
          is_active: true,
          input_price_per_million: 3,
          output_price_per_million: 15,
          margin: 0.4,
        },
      ],
      error: null,
    });
    cookieStore.get.mockReturnValue(undefined);
    vi.mocked(verifySession).mockResolvedValue(null);
  });

  it('returns 401 without a valid application session', async () => {
    const response = await GET(new NextRequest('http://localhost/api/models'));

    expect(response.status).toBe(401);
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it('returns only allowed model picker fields plus credits_per_use for an authenticated user', async () => {
    cookieStore.get.mockReturnValue({ value: 'session-token' });
    vi.mocked(verifySession).mockResolvedValue({
      customerId: 'customer-1',
      email: 'customer@example.com',
    });

    const response = await GET(new NextRequest('http://localhost/api/models'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(supabaseAdmin.from).toHaveBeenCalledWith('model_pricing');
    expect(query.select).toHaveBeenCalledWith(
      'id, model_name, display_name, supports_vision, credits_cost',
    );
    expect(query.eq).toHaveBeenCalledWith('is_active', true);
    expect(body).toEqual({
      success: true,
      data: {
        models: [
          {
            id: 'model-1',
            model_name: 'claude-sonnet-4-5-20250929',
            display_name: 'Claude Sonnet 4.5',
            supports_vision: true,
            // 與 chat route 扣點相同：getModelPricing(model).credits_cost
            credits_per_use: 5,
          },
        ],
      },
    });
    for (const model of body.data.models) {
      expect(Object.keys(model).sort()).toEqual(
        ['credits_per_use', 'display_name', 'id', 'model_name', 'supports_vision'],
      );
    }
    expect(JSON.stringify(body)).not.toMatch(/price|cost|margin|is_active/i);
  });
});
