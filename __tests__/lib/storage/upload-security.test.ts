import { describe, expect, it } from 'vitest';
import {
  buildCustomerUploadKey,
  getPublicUploadUrl,
  isUploadKeyForCustomer,
  sanitizeFileName,
  validateUploadMetadata,
} from '@/lib/storage/upload-security';

describe('upload security helpers', () => {
  it('sanitizes file names before using them in object keys', () => {
    expect(sanitizeFileName('../medical report (final).pdf')).toBe('medical_report__final_.pdf');
    expect(sanitizeFileName('王大明-A123456789-report.pdf')).toContain('redacted-tw-id');
    expect(sanitizeFileName('')).toBe('file');
  });

  it('validates upload metadata', () => {
    expect(
      validateUploadMetadata({
        fileName: 'report.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
      }).valid
    ).toBe(true);

    expect(
      validateUploadMetadata({
        fileName: 'payload.json',
        fileType: 'application/json',
        fileSize: 1024,
      }).valid
    ).toBe(false);

    expect(
      validateUploadMetadata({
        fileName: 'empty.txt',
        fileType: 'text/plain',
        fileSize: 0,
      }).valid
    ).toBe(false);
  });

  it('binds upload keys to the authenticated customer', () => {
    const key = buildCustomerUploadKey('customer-1', 'report.txt', 123);

    expect(key).toBe('customer-1/123-report.txt');
    expect(isUploadKeyForCustomer(key, 'customer-1')).toBe(true);
    expect(isUploadKeyForCustomer(key, 'customer-2')).toBe(false);
    expect(isUploadKeyForCustomer('customer-1/../report.txt', 'customer-1')).toBe(false);
  });

  it('normalizes configured public domains', () => {
    process.env.R2_BUCKET_DOMAIN = 'https://files.example.com/path';
    expect(getPublicUploadUrl('customer-1/report.txt')).toBe(
      'https://files.example.com/customer-1/report.txt'
    );
  });
});
