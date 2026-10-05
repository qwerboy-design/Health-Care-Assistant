import { describe, expect, it } from 'vitest';
import { prepareAttachmentForOllama, validateLocalAttachment } from '@/lib/llm/attachments';
import { DEFAULT_LLM_RUNTIME_SETTINGS } from '@/lib/llm/settings';

describe('local Ollama attachments', () => {
  it('extracts and redacts text attachments', async () => {
    const prepared = await prepareAttachmentForOllama(
      {
        fileName: 'note.txt',
        fileType: 'text/plain',
        buffer: Buffer.from('Patient Name: 王大明\nEmail: test@example.com'),
      },
      DEFAULT_LLM_RUNTIME_SETTINGS
    );

    expect(prepared.text).toContain('[REDACTED_NAME]');
    expect(prepared.text).toContain('[REDACTED_EMAIL]');
    expect(prepared.images).toEqual([]);
  });

  it('requires a vision model for images', async () => {
    await expect(
      prepareAttachmentForOllama(
        {
          fileName: 'scan.png',
          fileType: 'image/png',
          buffer: Buffer.from('fake'),
        },
        DEFAULT_LLM_RUNTIME_SETTINGS
      )
    ).rejects.toThrow('Image analysis requires an Ollama vision model');
  });

  it('converts images to base64 when a vision model is configured', async () => {
    const prepared = await prepareAttachmentForOllama(
      {
        fileName: 'scan.png',
        fileType: 'image/png',
        buffer: Buffer.from('fake'),
      },
      { ...DEFAULT_LLM_RUNTIME_SETTINGS, ollama_vision_model: 'llava' }
    );

    expect(prepared.images).toEqual([Buffer.from('fake').toString('base64')]);
    expect(prepared.modelOverride).toBe('llava');
  });

  it('rejects oversized local attachments', () => {
    expect(() =>
      validateLocalAttachment({
        fileName: 'large.txt',
        fileType: 'text/plain',
        buffer: Buffer.alloc(11 * 1024 * 1024),
      })
    ).toThrow('Local attachment is too large');
  });
});
