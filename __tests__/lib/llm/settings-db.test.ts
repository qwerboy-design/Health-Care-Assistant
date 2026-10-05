import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const single = vi.fn();
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { single, eq, select, from };
});

vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: { from: mocks.from },
}));

import {
  DEFAULT_LLM_RUNTIME_SETTINGS,
  getLLMRuntimeSettings,
  getLLMRuntimeSettingsStatus,
} from '@/lib/llm/settings';

describe('getLLMRuntimeSettings database behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to Anthropic only when the settings table is missing', async () => {
    mocks.single.mockResolvedValue({
      data: null,
      error: {
        code: 'PGRST205',
        message: "Could not find the table 'public.llm_runtime_settings' in the schema cache",
      },
    });

    await expect(getLLMRuntimeSettings()).resolves.toEqual(DEFAULT_LLM_RUNTIME_SETTINGS);
  });

  it('fails closed for ordinary settings load failures', async () => {
    mocks.single.mockResolvedValue({
      data: null,
      error: {
        code: 'DB_DOWN',
        message: 'Database unavailable',
      },
    });

    await expect(getLLMRuntimeSettings()).rejects.toThrow('Database unavailable');
  });

  it('reports a missing settings table separately from the safe Anthropic runtime fallback', async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.OPENAI_MODEL = 'gpt-4o-mini';
    mocks.single.mockResolvedValue({
      data: null,
      error: {
        code: 'PGRST205',
        message: "Could not find the table 'public.llm_runtime_settings' in the schema cache",
      },
    });

    await expect(getLLMRuntimeSettingsStatus()).resolves.toEqual({
      settings: DEFAULT_LLM_RUNTIME_SETTINGS,
      settingsTableAvailable: false,
      openaiKeyConfigured: false,
      openaiModel: 'gpt-4o-mini',
    });
  });
});
