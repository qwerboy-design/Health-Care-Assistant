import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const query = {
    select: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };
  return { query, from: vi.fn(() => query) };
});

vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: { from: mocks.from },
}));

import {
  checkPhoneExists,
  findCustomerByEmail,
  findCustomerById,
  findCustomerByOAuthId,
  updateLastLogin,
} from '@/lib/supabase/customers';

describe('customer lookup database failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.select.mockReturnValue(mocks.query);
    mocks.query.eq.mockReturnValue(mocks.query);
  });

  it('treats only PGRST116 as an absent email customer', async () => {
    mocks.query.single.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'No rows' } });

    await expect(findCustomerByEmail('missing@example.com')).resolves.toBeNull();
  });

  it('throws a typed error when the email lookup cannot reach Supabase', async () => {
    mocks.query.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST205', message: 'Could not find the table llm_runtime_settings' },
    });

    await expect(findCustomerByEmail('user@example.com')).rejects.toMatchObject({
      name: 'SupabaseQueryError',
      code: 'PGRST205',
    });
  });

  it('does not swallow thrown network errors for id and OAuth lookups', async () => {
    mocks.query.single.mockRejectedValue(new TypeError('fetch failed'));

    await expect(findCustomerById('customer-1')).rejects.toMatchObject({
      name: 'SupabaseQueryError',
    });
    await expect(findCustomerByOAuthId('oauth-1')).rejects.toMatchObject({
      name: 'SupabaseQueryError',
    });
  });

  it('treats only PGRST116 as an absent phone number', async () => {
    mocks.query.single.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'No rows' } });

    await expect(checkPhoneExists('0912345678')).resolves.toBe(false);

    mocks.query.single.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'RPC unavailable' } });
    await expect(checkPhoneExists('0912345678')).rejects.toMatchObject({
      name: 'SupabaseQueryError',
      code: 'PGRST202',
    });
  });

  it('treats last_login_at updates as best-effort and logs only safe operation metadata', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.query.update.mockReturnValue(mocks.query);
    mocks.query.eq.mockReturnValueOnce({
      error: { code: 'PGRST204', message: 'column unavailable for customer-123' },
    });

    await expect(updateLastLogin('customer-123')).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith(
      'Supabase last_login_at update unavailable',
      { operation: 'updateLastLogin', code: 'PGRST204' },
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain('customer-123');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('column unavailable');
  });
});
