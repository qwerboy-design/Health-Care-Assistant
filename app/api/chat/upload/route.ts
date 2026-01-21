// app/api/chat/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { verifySession } from '@/lib/auth/session';
import { cookies } from 'next/headers';
import { errorResponse, successResponse, Errors } from '@/lib/errors';

const s3Client = new S3Client({
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
});

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    // 解析 FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadKey = formData.get('uploadKey') as string;

    if (!file || !uploadKey) {
      return errorResponse('缺少檔案或上傳 key', 400);
    }

    // 驗證檔案大小
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse('檔案太大', 400);
    }

    // 驗證 key 屬於當前用戶
    if (!uploadKey.startsWith(`${session.customerId}/`)) {
      return errorResponse('無權限上傳到此路徑', 403);
    }

    // #region agent log
    try {
      await fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'app/api/chat/upload/route.ts:POST',
          message: 'Before R2 upload',
          data: {
            uploadKey,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'A'
        })
      }).catch(() => {});
    } catch (e) {}
    // #endregion

    // 讀取檔案內容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上傳到 R2
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: uploadKey,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    // #region agent log
    try {
      await fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'app/api/chat/upload/route.ts:POST',
          message: 'R2 upload completed',
          data: {
            uploadKey,
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'A'
        })
      }).catch(() => {});
    } catch (e) {}
    // #endregion

    const fileUrl = `https://${process.env.R2_BUCKET_DOMAIN || 'hca.qwerboy.com'}/${uploadKey}`;
    
    return successResponse({
      fileUrl,
    });
  } catch (error: any) {
    // #region agent log
    try {
      await fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'app/api/chat/upload/route.ts:POST',
          message: 'Upload error',
          data: {
            errorMessage: error?.message,
            errorName: error?.name,
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'A'
        })
      }).catch(() => {});
    } catch (e) {}
    // #endregion
    console.error('上傳錯誤:', error);
    return errorResponse('檔案上傳失敗', 500);
  }
}
