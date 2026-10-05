import { describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/reports/capabilities/route';

describe('GET /api/reports/capabilities', () => {
  it('is disabled unless explicitly enabled', async () => {
    vi.stubEnv('ENABLE_HEALTH_REPORT_ASSISTANT', 'false');
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ enabled: false, version: '0.2' });
    vi.unstubAllEnvs();
  });
});
