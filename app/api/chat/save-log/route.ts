import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { getConversationById } from '@/lib/supabase/conversations';
import { getMessagesByConversationId } from '@/lib/supabase/messages';
import { generateMarkdownLog, generateLogFilename, generateLogStoragePath } from '@/lib/storage/log-generator';
import { errorResponse, successResponse, Errors } from '@/lib/errors';
import { cookies } from 'next/headers';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * POST /api/chat/save-log - Save conversation log to R2
 */
export async function POST(request: NextRequest) {
  let conversationId: string | undefined;
  // #region agent log
  const fs = await import('fs').catch(() => null);
  const logPath = 'c:\\Users\\qwerb\\Health Care Assistant\\.cursor\\debug.log';
  const logEntryPost = JSON.stringify({
    location: 'app/api/chat/save-log/route.ts:POST:entry',
    message: 'POST /api/chat/save-log entry',
    data: { method: request.method, url: request.url },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'post-fix',
    hypothesisId: 'ALL'
  }) + '\n';
  if (fs) fs.promises.appendFile(logPath, logEntryPost).catch(() => { });
  // #endregion

  try {
    // Verify session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      // #region agent log
      const logEntryNoToken = JSON.stringify({
        location: 'app/api/chat/save-log/route.ts:POST:no-token',
        message: 'No session token',
        data: {},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'post-fix',
        hypothesisId: 'ALL'
      }) + '\n';
      if (fs) fs.promises.appendFile(logPath, logEntryNoToken).catch(() => { });
      // #endregion
      return errorResponse(Errors.UNAUTHORIZED.message, 401);
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      // #region agent log
      const logEntryInvalidSession = JSON.stringify({
        location: 'app/api/chat/save-log/route.ts:POST:invalid-session',
        message: 'Invalid session',
        data: {},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'post-fix',
        hypothesisId: 'ALL'
      }) + '\n';
      if (fs) fs.promises.appendFile(logPath, logEntryInvalidSession).catch(() => { });
      // #endregion
      return errorResponse(Errors.UNAUTHORIZED.message, 401);
    }

    // Parse request body
    const body = await request.json();
    conversationId = body.conversationId;
    const serialNumber = body.serialNumber || 1;

    // #region agent log
    const logEntryBody = JSON.stringify({
      location: 'app/api/chat/save-log/route.ts:POST:body-parsed',
      message: 'Request body parsed',
      data: { conversationId, serialNumber, hasConversationId: !!conversationId },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'post-fix',
      hypothesisId: 'ALL'
    }) + '\n';
    if (fs) fs.promises.appendFile(logPath, logEntryBody).catch(() => { });
    // #endregion

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
    const storagePath = generateLogStoragePath(session.customerId, conversationId);

    // #region agent log
    const logEntryBeforeUpload = JSON.stringify({
      location: 'app/api/chat/save-log/route.ts:POST:before-upload',
      message: 'Before uploadToR2',
      data: { conversationId, storagePath, filename, messageCount: messages.length, contentLength: markdownContent.length },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'post-fix',
      hypothesisId: 'ALL'
    }) + '\n';
    if (fs) fs.promises.appendFile(logPath, logEntryBeforeUpload).catch(() => { });
    // #endregion

    // Upload to R2
    console.log(`[save-log] 開始上傳對話記錄: conversationId=${conversationId}, path=${storagePath}`);
    const r2Url = await uploadToR2(storagePath, markdownContent);
    console.log(`[save-log] 上傳成功: url=${r2Url}, filename=${filename}`);

    // #region agent log
    const logEntryAfterUpload = JSON.stringify({
      location: 'app/api/chat/save-log/route.ts:POST:after-upload',
      message: 'After uploadToR2 success',
      data: { r2Url, filename, storagePath, messageCount: messages.length },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'post-fix',
      hypothesisId: 'ALL'
    }) + '\n';
    if (fs) fs.promises.appendFile(logPath, logEntryAfterUpload).catch(() => { });
    // #endregion

    const responseData = {
      filename,
      url: r2Url,
      storagePath,
      messageCount: messages.length,
      uploadedAt: new Date().toISOString(),
    };

    // #region agent log
    const logEntryBeforeResponse = JSON.stringify({
      location: 'app/api/chat/save-log/route.ts:POST:before-response',
      message: 'Before successResponse',
      data: { responseData },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'post-fix',
      hypothesisId: 'ALL'
    }) + '\n';
    if (fs) fs.promises.appendFile(logPath, logEntryBeforeResponse).catch(() => { });
    // #endregion

    return successResponse(responseData);
  } catch (error: any) {
    // #region agent log
    const logEntryError = JSON.stringify({
      location: 'app/api/chat/save-log/route.ts:POST:error',
      message: 'Error caught in POST handler',
      data: {
        errorMessage: error?.message,
        errorStack: error?.stack?.substring(0, 200),
        conversationId: conversationId || 'unknown'
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'post-fix',
      hypothesisId: 'ALL'
    }) + '\n';
    if (fs) fs.promises.appendFile(logPath, logEntryError).catch(() => { });
    // #endregion
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
 * Get R2 S3 Client (reusing logic from lib/storage/upload.ts)
 */
function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2 環境變數未設定：需要 R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY'
    );
  }

  // 驗證憑證格式（Cloudflare R2 要求）
  if (accessKeyId.length !== 32) {
    throw new Error(
      `R2_ACCESS_KEY_ID 長度不正確：目前為 ${accessKeyId.length} 個字元，應為 32 個字元。`
    );
  }

  if (secretAccessKey.length !== 64) {
    throw new Error(
      `R2_SECRET_ACCESS_KEY 長度不正確：目前為 ${secretAccessKey.length} 個字元，應為 64 個字元。`
    );
  }

  return new S3Client({
    region: 'auto', // R2 使用 'auto' 作為 region
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Upload content to Cloudflare R2 using AWS SDK (fixes x-amz-content-sha256 issue)
 */
async function uploadToR2(path: string, content: string): Promise<string> {
  // #region agent log
  const fs = await import('fs').catch(() => null);
  const logPath = 'c:\\Users\\qwerb\\Health Care Assistant\\.cursor\\debug.log';
  const logEntry1 = JSON.stringify({
    location: 'app/api/chat/save-log/route.ts:uploadToR2:entry',
    message: 'uploadToR2 function entry (using AWS SDK)',
    data: { path, contentLength: content.length, hasPath: !!path },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'post-fix',
    hypothesisId: 'A'
  }) + '\n';
  if (fs) fs.promises.appendFile(logPath, logEntry1).catch(() => { });
  // #endregion

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  // #region agent log
  const logEntry2 = JSON.stringify({
    location: 'app/api/chat/save-log/route.ts:uploadToR2:env-check',
    message: 'Environment variables check',
    data: {
      hasAccountId: !!accountId,
      hasAccessKeyId: !!accessKeyId,
      hasSecretAccessKey: !!secretAccessKey,
      hasBucketName: !!bucketName,
      hasPublicUrl: !!publicUrl,
      accountIdLength: accountId?.length || 0,
      accessKeyIdLength: accessKeyId?.length || 0,
      secretAccessKeyLength: secretAccessKey?.length || 0
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'post-fix',
    hypothesisId: 'C'
  }) + '\n';
  if (fs) fs.promises.appendFile(logPath, logEntry2).catch(() => { });
  // #endregion

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('R2 configuration missing');
  }

  // Initialize R2 S3 Client
  const s3Client = getR2Client();
  const buffer = Buffer.from(content, 'utf-8');

  // #region agent log
  const logEntry3 = JSON.stringify({
    location: 'app/api/chat/save-log/route.ts:uploadToR2:before-upload',
    message: 'Before PutObjectCommand',
    data: {
      bucket: bucketName,
      key: path,
      contentLength: buffer.length,
      contentType: 'text/markdown; charset=utf-8'
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'post-fix',
    hypothesisId: 'E'
  }) + '\n';
  if (fs) fs.promises.appendFile(logPath, logEntry3).catch(() => { });
  // #endregion

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: path,
      Body: buffer,
      ContentType: 'text/markdown; charset=utf-8',
    });

    // #region agent log
    const logEntry4 = JSON.stringify({
      location: 'app/api/chat/save-log/route.ts:uploadToR2:before-send',
      message: 'Before s3Client.send',
      data: {
        bucket: bucketName,
        key: path,
        commandCreated: true
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'post-fix',
      hypothesisId: 'E'
    }) + '\n';
    if (fs) fs.promises.appendFile(logPath, logEntry4).catch(() => { });
    // #endregion

    await s3Client.send(command);

    // #region agent log
    const logEntry5 = JSON.stringify({
      location: 'app/api/chat/save-log/route.ts:uploadToR2:after-send',
      message: 'After s3Client.send success',
      data: {
        bucket: bucketName,
        key: path,
        uploaded: true
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'post-fix',
      hypothesisId: 'E'
    }) + '\n';
    if (fs) fs.promises.appendFile(logPath, logEntry5).catch(() => { });
    // #endregion

    console.log(`[save-log] R2 上傳成功:`, {
      path,
      contentLength: content.length,
    });

    // Return public URL
    return `${publicUrl}/${path}`;
  } catch (error: any) {
    // #region agent log
    const logEntry6 = JSON.stringify({
      location: 'app/api/chat/save-log/route.ts:uploadToR2:error',
      message: 'R2 upload error (AWS SDK)',
      data: {
        errorMessage: error?.message,
        errorCode: error?.$metadata?.httpStatusCode || error?.code || 'N/A',
        path,
        contentLength: content.length
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'post-fix',
      hypothesisId: 'E'
    }) + '\n';
    if (fs) fs.promises.appendFile(logPath, logEntry6).catch(() => { });
    // #endregion
    console.error(`[save-log] R2 上傳失敗:`, {
      error: error.message,
      code: error.$metadata?.httpStatusCode || error.code,
      path,
      contentLength: content.length,
    });
    throw new Error(`R2 upload failed: ${error.message || '未知錯誤'}`);
  }
}
