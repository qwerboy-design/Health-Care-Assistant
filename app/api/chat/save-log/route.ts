import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { verifySession } from '@/lib/auth/session';
import { getConversationById } from '@/lib/supabase/conversations';
import { getMessagesByConversationId } from '@/lib/supabase/messages';
import { generateMarkdownLog, generateLogFilename, generateLogStoragePath } from '@/lib/storage/log-generator';
import { errorResponse, successResponse, Errors } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let conversationId: string | undefined;

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
    conversationId = body.conversationId;
    const serialNumber = body.serialNumber || 1;

    if (!conversationId) {
      return errorResponse('conversationId is required', 400);
    }

    const conversation = await getConversationById(conversationId);
    if (!conversation || conversation.customer_id !== session.customerId) {
      return errorResponse('對話不存在或無權限', 403);
    }

    const messages = await getMessagesByConversationId(conversationId, 1000);
    const markdownContent = generateMarkdownLog(conversation, messages);
    const filename = generateLogFilename(serialNumber);
    const storagePath = generateLogStoragePath(session.customerId, conversationId);
    const r2Url = await uploadToR2(storagePath, markdownContent);

    return successResponse({
      filename,
      url: r2Url,
      storagePath,
      messageCount: messages.length,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[save-log] Failed to save conversation log:', {
      error: error.message,
      conversationId: conversationId || 'unknown',
    });
    return errorResponse(error.message || Errors.INTERNAL_ERROR.message, 500);
  }
}

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 configuration missing');
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

async function uploadToR2(path: string, content: string): Promise<string> {
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!bucketName || !publicUrl) {
    throw new Error('R2 bucket configuration is incomplete');
  }

  const s3Client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: path,
    Body: Buffer.from(content, 'utf-8'),
    ContentType: 'text/markdown; charset=utf-8',
  });

  try {
    await s3Client.send(command);
    return `${publicUrl}/${path}`;
  } catch (error: any) {
    throw new Error(`R2 upload failed: ${error.message || 'Unknown error'}`);
  }
}
