import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: { rpc },
}));

import { checkRateLimit } from '@/lib/rate-limit';

describe('rate-limit persistence fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses in-memory limiting and logs one safe warning when the persistent RPC is unavailable', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rpc.mockResolvedValue({
      data: null,
      error: { name: 'PostgrestError', code: 'PGRST202', message: 'consume_rate_limit is missing' },
    });

    const first = await checkRateLimit('email:user@example.com', 2, 60_000);
    const second = await checkRateLimit('email:user@example.com', 2, 60_000);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(consoleWarn).toHaveBeenCalledOnce();
    expect(consoleWarn.mock.calls[0]?.[0]).toContain(
      'Persistent rate-limit store/RPC unavailable; using in-memory limiting'
    );
    expect(consoleWarn.mock.calls[0]?.[1]).toEqual({
      name: 'PostgrestError',
      code: 'PGRST202',
    });
    expect(JSON.stringify(consoleWarn.mock.calls)).not.toContain('user@example.com');
  });
});
