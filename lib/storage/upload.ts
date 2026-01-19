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
  const publicUrl = process.env.R2_PUBLIC_URL;
  const bucket = getR2Bucket();

  if (publicUrl) {
    // 使用自訂網域或公開網域
    return `${publicUrl}/${fileName}`;
  }

  // 回退到標準 R2 網域格式（需要先設定公開存取）
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) {
    throw new Error('R2_ACCOUNT_ID 未設定，無法生成公開 URL');
  }
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${fileName}`;
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
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch (error: any) {
    throw new Error(`檔案轉換失敗: ${error.message || '無法讀取檔案'}`);
  }

  // 上傳到 R2
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    });

    await s3Client.send(command);

    // 生成公開 URL
    const publicUrl = getR2PublicUrl(fileName);

    return {
      url: publicUrl,
      fileName: file.name || fileName.split('/').pop() || 'file',
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
    };
  } catch (error: any) {
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
