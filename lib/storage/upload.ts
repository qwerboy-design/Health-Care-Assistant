import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB (Vercel limit is 4.5MB)
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export interface UploadResult {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 configuration is incomplete');
  }

  if (accessKeyId.length !== 32) {
    throw new Error('R2_ACCESS_KEY_ID must be 32 characters long');
  }

  if (secretAccessKey.length !== 64) {
    throw new Error('R2_SECRET_ACCESS_KEY must be 64 characters long');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function getR2Bucket(): string {
  return process.env.R2_BUCKET_NAME || 'chat-files';
}

function getR2PublicUrl(fileName: string): string {
  const publicUrl = process.env.R2_PUBLIC_URL;
  const bucket = getR2Bucket();

  if (publicUrl) {
    return `${publicUrl}/${fileName}`;
  }

  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) {
    throw new Error('R2_ACCOUNT_ID is required to build a public URL');
  }

  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${fileName}`;
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File is too large',
    };
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Unsupported file type',
    };
  }

  return { valid: true };
}

export async function uploadFile(file: File, customerId: string): Promise<UploadResult> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const timestamp = Date.now();
  const fileName = `${customerId}/${timestamp}-${file.name}`;
  const s3Client = getR2Client();
  const bucket = getR2Bucket();

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch (error: any) {
    throw new Error(`Failed to process file: ${error.message || 'Unknown error'}`);
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    });

    await s3Client.send(command);

    return {
      url: getR2PublicUrl(fileName),
      fileName: file.name || fileName.split('/').pop() || 'file',
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    const errorCode = error.$metadata?.httpStatusCode || error.code || 'N/A';
    throw new Error(`Upload failed [${errorCode}]: ${errorMessage}`);
  }
}

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
    throw new Error(`Delete failed: ${error.message || 'Unknown error'}`);
  }
}

