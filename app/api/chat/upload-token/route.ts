// app/api/chat/upload-token/route.ts
import { NextRequest } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { errorResponse, successResponse, Errors } from '@/lib/errors';
import { verifySession } from '@/lib/auth/session';
import { cookies } from 'next/headers';

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
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (fileSize > MAX_FILE_SIZE) {
      return errorResponse('檔案太大', 400);
    }

    // 生成檔案 key 和 URL（使用代理上傳，避免 CORS 問題）
    const key = `${session.customerId}/${Date.now()}-${fileName}`;
    const fileUrl = `https://${process.env.R2_BUCKET_DOMAIN || 'hca.qwerboy.com'}/${key}`;

    // #region agent log
    try {
      await fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'app/api/chat/upload-token/route.ts:POST',
          message: 'Upload token generated',
          data: {
            key,
            fileUrl,
            bucket: process.env.R2_BUCKET_NAME,
            fileType,
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'A'
        })
      }).catch(() => {});
    } catch (e) {}
    // #endregion

    // 返回代理上傳端點 URL（檔案將通過 /api/chat/upload 上傳）
    return successResponse({
      uploadUrl: '/api/chat/upload',
      uploadKey: key, // 用於後續上傳
      fileUrl,
    });
  } catch (error) {
    return errorResponse('生成上傳授權失敗', 500);
  }
}