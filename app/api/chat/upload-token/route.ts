// app/api/chat/upload-token/route.ts
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { errorResponse, successResponse, Errors } from '@/lib/errors';
import { verifySession } from '@/lib/auth/session';
import {
  buildCustomerUploadKey,
  getPublicUploadUrl,
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

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validation = validateUploadMetadata({
      fileName: body?.fileName,
      fileType: body?.fileType,
      fileSize: body?.fileSize,
    });

    if (!validation.valid || !validation.data) {
      return errorResponse(validation.error || Errors.INVALID_INPUT.message, 400);
    }

    const key = buildCustomerUploadKey(session.customerId, validation.data.fileName);
    const fileUrl = getPublicUploadUrl(key);

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      ContentType: validation.data.fileType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 900,
    });

    return successResponse({
      uploadUrl: presignedUrl,
      uploadKey: key,
      fileUrl,
      method: 'PUT',
    });
  } catch (error) {
    console.error('Failed to generate upload token:', error);
    return errorResponse('生成上傳授權失敗', 500);
  }
}
