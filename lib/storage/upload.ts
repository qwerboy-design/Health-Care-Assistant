import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'text/plain',
];

export interface UploadResult {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

/**
 * 取得 R2 S3 Client
 */
function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2 環境變數未設定：需要 R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY'
    );
  }

  // 驗證憑證格式（Cloudflare R2 要求）
  // Access Key ID 應該是 32 個字元
  if (accessKeyId.length !== 32) {
    throw new Error(
      `R2_ACCESS_KEY_ID 長度不正確：目前為 ${accessKeyId.length} 個字元，應為 32 個字元。請確認已從 Cloudflare R2 API Tokens 正確複製完整的 Access Key ID。`
    );
  }

  // Secret Access Key 應該是 64 個字元
  if (secretAccessKey.length !== 64) {
    throw new Error(
      `R2_SECRET_ACCESS_KEY 長度不正確：目前為 ${secretAccessKey.length} 個字元，應為 64 個字元。請確認已從 Cloudflare R2 API Tokens 正確複製完整的 Secret Access Key。`
    );
  }

  return new S3Client({
    region: 'auto', // R2 使用 'auto' 作為 region
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * 取得 R2 Bucket 名稱
 */
function getR2Bucket(): string {
  return process.env.R2_BUCKET_NAME || 'chat-files';
}

/**
 * 生成公開存取 URL
 */
function getR2PublicUrl(fileName: string): string {
  // #region agent log
  const logData = {
    location: 'lib/storage/upload.ts:getR2PublicUrl',
    message: 'Generating R2 public URL',
    data: { fileName, hasPublicUrl: !!process.env.R2_PUBLIC_URL, publicUrl: process.env.R2_PUBLIC_URL || null },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'A'
  };
  fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData) }).catch(() => {});
  // #endregion

  const publicUrl = process.env.R2_PUBLIC_URL;
  const bucket = getR2Bucket();

  if (publicUrl) {
    // 使用自訂網域或公開網域
    const finalUrl = `${publicUrl}/${fileName}`;
    // #region agent log
    const logData2 = {
      location: 'lib/storage/upload.ts:getR2PublicUrl',
      message: 'Using custom public URL',
      data: { finalUrl, publicUrl, fileName },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A'
    };
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData2) }).catch(() => {});
    // #endregion
    return finalUrl;
  }

  // 回退到標準 R2 網域格式（需要先設定公開存取）
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) {
    throw new Error('R2_ACCOUNT_ID 未設定，無法生成公開 URL');
  }
  const fallbackUrl = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${fileName}`;
  // #region agent log
  const logData3 = {
    location: 'lib/storage/upload.ts:getR2PublicUrl',
    message: 'Using fallback R2 URL',
    data: { fallbackUrl, accountId, bucket, fileName },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'B'
  };
  fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData3) }).catch(() => {});
  // #endregion
  return fallbackUrl;
}

/**
 * 驗證檔案
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // 檢查檔案大小
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: '檔案大小超過 10MB 限制',
    };
  }

  // 檢查檔案類型
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: '不支援的檔案格式，僅支援 JPEG、PDF、WORD、TXT',
    };
  }

  return { valid: true };
}

/**
 * 上傳檔案到 Cloudflare R2
 */
export async function uploadFile(
  file: File,
  customerId: string
): Promise<UploadResult> {
  // 驗證檔案
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 生成唯一檔案名
  const timestamp = Date.now();
  const fileName = `${customerId}/${timestamp}-${file.name}`;

  // 初始化 R2 Client
  const s3Client = getR2Client();
  const bucket = getR2Bucket();

  // 轉換 File 為 Buffer（Next.js 環境）
  let buffer: Buffer;
  try {
    // #region agent log
    const logDataBeforeConvert = {
      location: 'lib/storage/upload.ts:uploadFile',
      message: 'Before file to buffer conversion',
      data: { fileName: file.name, fileSize: file.size, fileType: file.type, hasArrayBuffer: typeof file.arrayBuffer === 'function' },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'E'
    };
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataBeforeConvert) }).catch(() => {});
    // #endregion
    const arrayBuffer = await file.arrayBuffer();
    // #region agent log
    const logDataAfterArrayBuffer = {
      location: 'lib/storage/upload.ts:uploadFile',
      message: 'After arrayBuffer conversion',
      data: { arrayBufferSize: arrayBuffer.byteLength, fileName: file.name },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'E'
    };
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataAfterArrayBuffer) }).catch(() => {});
    // #endregion
    buffer = Buffer.from(arrayBuffer);
    // #region agent log
    const logDataAfterBuffer = {
      location: 'lib/storage/upload.ts:uploadFile',
      message: 'After Buffer.from conversion',
      data: { bufferLength: buffer.length, fileName: file.name },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'E'
    };
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataAfterBuffer) }).catch(() => {});
    // #endregion
  } catch (error: any) {
    // #region agent log
    const logDataConvertError = {
      location: 'lib/storage/upload.ts:uploadFile',
      message: 'File to buffer conversion error',
      data: { errorMessage: error?.message, errorName: error?.name, fileName: file.name, fileType: file.type },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'E'
    };
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataConvertError) }).catch(() => {});
    // #endregion
    throw new Error(`檔案轉換失敗: ${error.message || '無法讀取檔案'}`);
  }

  // 上傳到 R2
  try {
    // #region agent log
    const logDataBefore = {
      location: 'lib/storage/upload.ts:uploadFile',
      message: 'Before R2 upload',
      data: { bucket, fileName, fileSize: file.size, fileType: file.type, customerId },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'C'
    };
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataBefore) }).catch(() => {});
    // #endregion

    // #region agent log
    const logDataCommand = {
      location: 'lib/storage/upload.ts:uploadFile',
      message: 'Creating PutObjectCommand',
      data: { bucket, fileName, bufferLength: buffer.length, contentType: file.type || 'application/octet-stream', originalFileType: file.type },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'D'
    };
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataCommand) }).catch(() => {});
    // #endregion

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    });

    await s3Client.send(command);

    // #region agent log
    const logDataAfter = {
      location: 'lib/storage/upload.ts:uploadFile',
      message: 'After R2 upload success',
      data: { bucket, fileName, uploaded: true },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'C'
    };
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataAfter) }).catch(() => {});
    // #endregion

    // 生成公開 URL
    const publicUrl = getR2PublicUrl(fileName);

    // #region agent log
    const logDataUrl = {
      location: 'lib/storage/upload.ts:uploadFile',
      message: 'Generated public URL',
      data: { publicUrl, fileName, bucket },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'D'
    };
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataUrl) }).catch(() => {});
    // #endregion

    return {
      url: publicUrl,
      fileName: file.name || fileName.split('/').pop() || 'file',
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
    };
  } catch (error: any) {
    // #region agent log
    const logDataError = {
      location: 'lib/storage/upload.ts:uploadFile',
      message: 'R2 upload error',
      data: { 
        error: error.message, 
        errorCode: error.$metadata?.httpStatusCode || error.code || 'N/A',
        bucket,
        fileName
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'E'
    };
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataError) }).catch(() => {});
    // #endregion
    // 提供更詳細的錯誤訊息
    const errorMessage = error.message || '未知錯誤';
    const errorCode = error.$metadata?.httpStatusCode || error.code || 'N/A';
    throw new Error(`上傳失敗 [${errorCode}]: ${errorMessage}`);
  }
}

/**
 * 刪除檔案
 */
export async function deleteFile(filePath: string): Promise<void> {
  const s3Client = getR2Client();
  const bucket = getR2Bucket();

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: filePath,
    });

    await s3Client.send(command);
  } catch (error: any) {
    throw new Error(`刪除失敗: ${error.message || '未知錯誤'}`);
  }
}
