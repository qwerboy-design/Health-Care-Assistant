import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/admin', () => ({
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/llm/settings', () => ({
  getLLMRuntimeSettings: vi.fn(),
  getLLMRuntimeSettingsStatus: vi.fn(),
  updateLLMRuntimeSettings: vi.fn(),
  validateLLMRuntimeSettings: vi.fn((input) => input),
}));

import { GET, POST } from '@/app/api/admin/llm-settings/route';
import { requireAdmin } from '@/lib/auth/admin';
import {
  getLLMRuntimeSettings,
  getLLMRuntimeSettingsStatus,
  updateLLMRuntimeSettings,
} from '@/lib/llm/settings';

const settings = {
  id: 'default',
  active_provider: 'anthropic',
  ollama_base_url: 'http://127.0.0.1:11434/api',
  ollama_model: 'llama3.1:8b',
  ollama_vision_model: null,
  timeout_ms: 30000,
  keep_alive: '5m',
  is_enabled: true,
  updated_by: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('/api/admin/llm-settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ customerId: 'admin-1' });
    vi.mocked(getLLMRuntimeSettings).mockResolvedValue(settings as any);
    vi.mocked(getLLMRuntimeSettingsStatus).mockResolvedValue({
      settings,
      settingsTableAvailable: true,
      openaiKeyConfigured: false,
      openaiModel: 'gpt-4o-mini',
    } as any);
    vi.mocked(updateLLMRuntimeSettings).mockResolvedValue({ ...settings, active_provider: 'ollama' } as any);
  });

  it('requires admin access', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(new Response('forbidden', { status: 403 }) as any);

    const response = await GET(new NextRequest('http://localhost/api/admin/llm-settings'));

    expect(response.status).toBe(403);
  });

  it('returns current settings for admins', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/llm-settings'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.settings.active_provider).toBe('anthropic');
    expect(data.data.settingsTableAvailable).toBe(true);
    expect(data.data.openaiKeyConfigured).toBe(false);
    expect(data.data.openaiModel).toBe('gpt-4o-mini');
  });

  it('reports that migrations 007 and 011 are missing instead of hiding the unavailable settings table', async () => {
    vi.mocked(getLLMRuntimeSettingsStatus).mockResolvedValue({
      settings,
      settingsTableAvailable: false,
      openaiKeyConfigured: true,
      openaiModel: 'gpt-4o-mini',
    } as any);

    const response = await GET(new NextRequest('http://localhost/api/admin/llm-settings'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.settingsTableAvailable).toBe(false);
    expect(data.data.warning).toContain('migration 007/011');
    expect(data.data.openaiKeyConfigured).toBe(true);
    expect(data.data).not.toHaveProperty('openaiApiKey');
  });

  it('returns a clear migration error when saving against an unavailable settings table', async () => {
    vi.mocked(updateLLMRuntimeSettings).mockRejectedValue(
      Object.assign(new Error('settings table is missing'), {
        name: 'LLMSettingsTableUnavailableError',
        code: 'LLM_SETTINGS_TABLE_MISSING',
      })
    );

    const request = new NextRequest('http://localhost/api/admin/llm-settings', {
      method: 'POST',
      body: JSON.stringify({
        active_provider: 'openai',
        ollama_base_url: 'http://127.0.0.1:11434/api',
        ollama_model: 'llama3.1:8b',
        timeout_ms: 30000,
        keep_alive: '5m',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toContain('migration 007/011');
    expect(data.error).not.toContain('settings table is missing');
  });

  it('updates settings as admin', async () => {
    const request = new NextRequest('http://localhost/api/admin/llm-settings', {
      method: 'POST',
      body: JSON.stringify({
        active_provider: 'ollama',
        ollama_base_url: 'http://127.0.0.1:11434/api',
        ollama_model: 'llama3.1:8b',
        timeout_ms: 30000,
        keep_alive: '5m',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(updateLLMRuntimeSettings).toHaveBeenCalledWith(
      expect.objectContaining({ active_provider: 'ollama' }),
      'admin-1'
    );
  });
});
