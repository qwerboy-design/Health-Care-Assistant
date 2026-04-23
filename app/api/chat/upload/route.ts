// app/api/chat/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { verifySession } from '@/lib/auth/session';
import { errorResponse, successResponse, Errors } from '@/lib/errors';
import {
  getPublicUploadUrl,
  isUploadKeyForCustomer,
  validateUploadMetadata,
} from '@/lib/storage/upload-security';

export const dynamic = 'force-dynamic';

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
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return errorResponse(Errors.UNAUTHORIZED.message, 401);
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return errorResponse(Errors.UNAUTHORIZED.message, 401);
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const uploadKey = formData.get('uploadKey');

    if (!(file instanceof File) || typeof uploadKey !== 'string') {
      return errorResponse('缺少檔案或上傳 key', 400);
    }

    const validation = validateUploadMetadata({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    if (!validation.valid) {
      return errorResponse(validation.error || Errors.INVALID_INPUT.message, 400);
    }

    if (!isUploadKeyForCustomer(uploadKey, session.customerId)) {
      return errorResponse('無權限上傳到此路徑', 403);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: uploadKey,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    return successResponse({
      fileUrl: getPublicUploadUrl(uploadKey),
    });
  } catch (error) {
    console.error('File upload failed:', error);
    return errorResponse('檔案上傳失敗', 500);
  }
}
