import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { getConversationById } from '@/lib/supabase/conversations';
import { getMessagesByConversationId } from '@/lib/supabase/messages';
import { generateMarkdownLog, generateLogFilename, generateLogStoragePath } from '@/lib/storage/log-generator';
import { errorResponse, successResponse, Errors } from '@/lib/errors';
import { cookies } from 'next/headers';

/**
 * POST /api/chat/save-log - Save conversation log to R2
 */
export async function POST(request: NextRequest) {
  try {
    // Verify session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return errorResponse(Errors.UNAUTHORIZED.message, 401);
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return errorResponse(Errors.UNAUTHORIZED.message, 401);
    }

    // Parse request body
    const body = await request.json();
    const { conversationId, serialNumber = 1 } = body;

    if (!conversationId) {
      return errorResponse('缺少 conversationId 參數', 400);
    }

    // Verify conversation belongs to current user
    const conversation = await getConversationById(conversationId);
    if (!conversation || conversation.customer_id !== session.customerId) {
      return errorResponse('對話不存在或無權限', 403);
    }

    // Get all messages for the conversation
    const messages = await getMessagesByConversationId(conversationId, 1000);

    // Generate markdown log
    const markdownContent = generateMarkdownLog(conversation, messages);
    const filename = generateLogFilename(serialNumber);
    const storagePath = generateLogStoragePath(session.customerId, filename);

    // Upload to R2
    const r2Url = await uploadToR2(storagePath, markdownContent);

    return successResponse({
      filename,
      url: r2Url,
      storagePath,
    });
  } catch (error: any) {
    console.error('保存日誌錯誤:', error);
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
  }
}

/**
 * Upload content to Cloudflare R2
 */
async function uploadToR2(path: string, content: string): Promise<string> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('R2 configuration missing');
  }

  // Create authorization header
  const auth = Buffer.from(`${accessKeyId}:${secretAccessKey}`).toString('base64');

  // Upload to R2
  const r2ApiUrl = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${path}`;

  const response = await fetch(r2ApiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'text/markdown; charset=utf-8',
    },
    body: content,
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed: ${response.statusText}`);
  }

  // Return public URL
  return `${publicUrl}/${path}`;
}
