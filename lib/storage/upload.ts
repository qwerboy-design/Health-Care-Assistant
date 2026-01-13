import { supabaseAdmin } from '@/lib/supabase/client';

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
 * 上傳檔案到 Supabase Storage
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

  // 上傳到 Supabase Storage
  const { data, error } = await supabaseAdmin.storage
    .from('chat-files')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`上傳失敗: ${error.message}`);
  }

  // 獲取公開 URL
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('chat-files')
    .getPublicUrl(fileName);

  return {
    url: publicUrl,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  };
}

/**
 * 刪除檔案
 */
export async function deleteFile(filePath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from('chat-files')
    .remove([filePath]);

  if (error) {
    throw new Error(`刪除失敗: ${error.message}`);
  }
}
