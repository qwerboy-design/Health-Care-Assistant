import { redactFileName } from '@/lib/privacy/redaction';

export const MAX_UPLOAD_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const ALLOWED_UPLOAD_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

const SAFE_PATH_SEGMENT = /^[a-zA-Z0-9._-]+$/;

export interface UploadMetadata {
  fileName: unknown;
  fileType: unknown;
  fileSize: unknown;
}

export interface ValidUploadMetadata {
  fileName: string;
  fileType: (typeof ALLOWED_UPLOAD_CONTENT_TYPES)[number];
  fileSize: number;
}

export function sanitizeFileName(fileName: string): string {
  const baseName = fileName.split(/[\\/]/).pop() || 'file';
  const redacted = redactFileName(baseName);
  const sanitized = redacted
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '');

  if (!sanitized) {
    return 'file';
  }

  if (sanitized.length <= 120) {
    return sanitized;
  }

  const extensionIndex = sanitized.lastIndexOf('.');
  const extension = extensionIndex > 0 ? sanitized.slice(extensionIndex) : '';
  const baseLimit = Math.max(1, 120 - extension.length);
  return `${sanitized.slice(0, baseLimit)}${extension}`;
}

export function sanitizePathSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'unknown';
}

export function validateUploadMetadata(metadata: UploadMetadata): {
  valid: boolean;
  data?: ValidUploadMetadata;
  error?: string;
} {
  const { fileName, fileType, fileSize } = metadata;

  if (typeof fileName !== 'string' || fileName.trim().length === 0) {
    return { valid: false, error: '缺少檔案名稱' };
  }

  if (typeof fileType !== 'string' || !ALLOWED_UPLOAD_CONTENT_TYPES.includes(fileType as any)) {
    return { valid: false, error: '不支援的檔案格式' };
  }

  if (typeof fileSize !== 'number' || !Number.isFinite(fileSize) || fileSize <= 0) {
    return { valid: false, error: '檔案大小無效' };
  }

  if (fileSize > MAX_UPLOAD_FILE_SIZE) {
    return { valid: false, error: '檔案太大' };
  }

  return {
    valid: true,
    data: {
      fileName: sanitizeFileName(fileName),
      fileType: fileType as ValidUploadMetadata['fileType'],
      fileSize,
    },
  };
}

export function buildCustomerUploadKey(customerId: string, fileName: string, now = Date.now()): string {
  return `${sanitizePathSegment(customerId)}/${now}-${sanitizeFileName(fileName)}`;
}

export function isUploadKeyForCustomer(uploadKey: string, customerId: string): boolean {
  const safeCustomerId = sanitizePathSegment(customerId);
  const prefix = `${safeCustomerId}/`;

  if (!uploadKey.startsWith(prefix)) {
    return false;
  }

  const rest = uploadKey.slice(prefix.length);
  if (!rest || rest.includes('..') || rest.includes('//') || rest.includes('\\')) {
    return false;
  }

  return rest.split('/').every((part) => SAFE_PATH_SEGMENT.test(part));
}

export function getPublicUploadUrl(uploadKey: string): string {
  const configuredDomain = process.env.R2_BUCKET_DOMAIN || 'hca.qwerboy.com';
  const domain = configuredDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) {
    throw new Error('Invalid R2_BUCKET_DOMAIN');
  }

  return `https://${domain}/${uploadKey}`;
}
