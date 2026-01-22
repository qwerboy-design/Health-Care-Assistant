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
  let conversationId: string | undefined;
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
    conversationId = body.conversationId;
    const serialNumber = body.serialNumber || 1;

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
    console.log(`[save-log] 開始上傳對話記錄: conversationId=${conversationId}, path=${storagePath}`);
    const r2Url = await uploadToR2(storagePath, markdownContent);
    console.log(`[save-log] 上傳成功: url=${r2Url}, filename=${filename}`);

    return successResponse({
      filename,
      url: r2Url,
      storagePath,
      messageCount: messages.length,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[save-log] 保存日誌錯誤:', {
      error: error.message,
      stack: error.stack,
      conversationId: conversationId || 'unknown',
    });
    return errorResponse(
      error.message || Errors.INTERNAL_ERROR.message,
      500
    );
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
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`[save-log] R2 上傳失敗:`, {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      path,
      contentLength: content.length,
    });
    throw new Error(`R2 upload failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  console.log(`[save-log] R2 上傳成功:`, {
    path,
    status: response.status,
    contentLength: content.length,
  });

  // Return public URL
  return `${publicUrl}/${path}`;
}
