// app/api/chat/upload-token/route.ts
import { NextRequest } from 'next/server';
import { errorResponse, successResponse, Errors } from '@/lib/errors';
import { verifySession } from '@/lib/auth/session';
import { cookies } from 'next/headers';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// 此路由使用 cookies() 進行身份驗證，必須動態渲染
export const dynamic = 'force-dynamic';

// S3 Client for R2
const s3Client = new S3Client({
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
});

export async function POST(request: NextRequest) {
  try {
    // 驗證 Session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (!sessionToken) {
      return errorResponse(Errors.UNAUTHORIZED.message, 401);
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return errorResponse(Errors.UNAUTHORIZED.message, 401);
    }

    const { fileName, fileType, fileSize } = await request.json();
    
    // 驗證檔案
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (fileSize > MAX_FILE_SIZE) {
      return errorResponse('檔案太大（上限 100MB）', 400);
    }

    // 驗證檔案類型
    const ALLOWED_TYPES = [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (fileType && !ALLOWED_TYPES.includes(fileType)) {
      return errorResponse('不支援的檔案格式', 400);
    }

    // 生成安全的檔案名稱（移除特殊字符）
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${session.customerId}/${Date.now()}-${sanitizedFileName}`;
    const fileUrl = `https://${process.env.R2_BUCKET_DOMAIN || 'hca.qwerboy.com'}/${key}`;

    // 生成 Presigned PUT URL（有效期 15 分鐘）
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      ContentType: fileType,
    });
    
    const presignedUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: 900, // 15 分鐘
    });

    // #region agent log
    try {
      await fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'app/api/chat/upload-token/route.ts:POST',
          message: 'Presigned URL generated',
          data: {
            key,
            fileUrl,
            bucket: process.env.R2_BUCKET_NAME,
            fileType,
            presignedUrlPreview: presignedUrl.substring(0, 100) + '...',
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'A'
        })
      }).catch(() => {});
    } catch (e) {}
    // #endregion

    // 返回 Presigned URL，前端直接上傳到 R2（繞過 Vercel 4.5MB 限制）
    return successResponse({
      uploadUrl: presignedUrl, // Presigned PUT URL
      uploadKey: key,
      fileUrl,
      method: 'PUT', // 告知前端使用 PUT 方法
    });
  } catch (error) {
    console.error('生成上傳授權失敗:', error);
    return errorResponse('生成上傳授權失敗', 500);
  }
}