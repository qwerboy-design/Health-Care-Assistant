import { describe, expect, it } from 'vitest';
import { generateMarkdownLog } from '@/lib/storage/log-generator';

describe('log generator redaction', () => {
  it('redacts sensitive content in titles and message bodies', () => {
    const markdown = generateMarkdownLog(
      {
        id: 'conv-1',
        customer_id: 'customer-1',
        title: '王大明 A123456789 門診紀錄',
        workload_level: 'standard',
        created_at: '2026-04-23T12:00:00Z',
        updated_at: '2026-04-23T12:00:00Z',
      },
      [
        {
          id: 'msg-1',
          conversation_id: 'conv-1',
          role: 'user',
          content: '姓名: 王大明\nEmail: patient@example.com\nVancomycin trough 15.8 ug/mL',
          created_at: '2026-04-23T12:00:10Z',
        },
      ]
    );

    expect(markdown).toContain('[REDACTED_TW_ID]');
    expect(markdown).toContain('[REDACTED_NAME]');
    expect(markdown).toContain('[REDACTED_EMAIL]');
    expect(markdown).toContain('Vancomycin trough 15.8 ug/mL');
    expect(markdown).not.toContain('patient@example.com');
    expect(markdown).not.toContain('A123456789');
  });
});
