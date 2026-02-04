import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { createConversation, getConversationById } from '@/lib/supabase/conversations';
import { createMessage, getMessagesByConversationId } from '@/lib/supabase/messages';
import { getCustomerCredits, deductCredits, addCredits } from '@/lib/supabase/credits';
import { getModelPricing } from '@/lib/supabase/model-pricing';
import { createMCPClient } from '@/lib/mcp/client';
import { chatMessageSchema } from '@/lib/validation/schemas';
import { errorResponse, successResponse, Errors } from '@/lib/errors';
import { cookies } from 'next/headers';

/**
 * POST /api/chat - 處理聊天訊息
 * 檔案上傳已改為直傳方式，使用 /api/upload 端點
 */
export async function POST(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/api/chat/route.ts:POST', message: 'Chat API POST endpoint called', data: { method: request.method, url: request.url, hasCookie: !!request.headers.get('cookie') }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'D' }) }).catch(() => { });
  // #endregion

  return handleChatMessage(request);
}

async function handleChatMessage(request: NextRequest) {
  try {
    // 驗證 Session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/api/chat/route.ts:handleChatMessage', message: 'Session check', data: { hasSessionToken: !!sessionToken }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'D' }) }).catch(() => { });
    // #endregion

    if (!sessionToken) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/api/chat/route.ts:handleChatMessage', message: 'No session token', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'D' }) }).catch(() => { });
      // #endregion
      return errorResponse(Errors.UNAUTHORIZED.message, 401);
    }

    const session = await verifySession(sessionToken);
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/api/chat/route.ts:handleChatMessage', message: 'Session verification result', data: { sessionValid: !!session, customerId: session?.customerId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'D' }) }).catch(() => { });
    // #endregion

    if (!session) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/api/chat/route.ts:handleChatMessage', message: 'Session invalid', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'D' }) }).catch(() => { });
      // #endregion
      return errorResponse(Errors.UNAUTHORIZED.message, 401);
    }

    // 檢查 Content-Length
    const contentLength = request.headers.get('content-length');
    const MAX_REQUEST_SIZE = 10 * 1024; // 10KB (只傳メタデータ)
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return errorResponse('請求大小過大', 413);
    }

    // 解析請求
    const body = await request.json();
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/api/chat/route.ts:handleChatMessage', message: 'Request body parsed', data: { hasMessage: !!body.message, hasFileUrl: !!body.fileUrl, fileName: body.fileName, hasConversationId: !!body.conversationId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'D' }) }).catch(() => { });
    // #endregion

    const {
      message,
      workloadLevel,
      selectedFunction,
      conversationId,
      fileUrl,      // 已上傳到 Vercel Blob 的 URL
      fileName,
      fileType,
      modelName,    // 新增：模型名稱
    } = body;

    // 驗證基本欄位
    if (!message?.trim() && !fileUrl) {
      return errorResponse('訊息內容或檔案至少需要一個', 400);
    }

    // 設定預設模型（如果未提供）
    const selectedModel = modelName || 'claude-sonnet-4-5-20250929';

    // 檢查模型是否存在
    const modelPricing = await getModelPricing(selectedModel);
    if (!modelPricing) {
      return errorResponse('模型不存在或未啟用', 400);
    }

    // 檢查用戶 Credits 是否足夠
    const currentCredits = await getCustomerCredits(session.customerId);
    if (currentCredits < modelPricing.credits_cost) {
      return errorResponse(
        `Credits 不足。當前 Credits: ${currentCredits}，需要: ${modelPricing.credits_cost}`,
        400
      );
    }

    // 獲取或建立對話
    let currentConversationId = conversationId;

    if (!currentConversationId) {
      const title = message?.substring(0, 50) || '新對話';
      const conversation = await createConversation(
        session.customerId,
        title,
        workloadLevel as 'instant' | 'basic' | 'standard' | 'professional',
        selectedFunction || undefined,
        selectedModel
      );
      currentConversationId = conversation.id;
    } else {
      // 驗證對話屬於當前使用者
      const conversation = await getConversationById(currentConversationId);
      if (!conversation || conversation.customer_id !== session.customerId) {
        return errorResponse('對話不存在或無權限', 403);
      }
    }

    // 扣除 Credits
    const deductResult = await deductCredits(
      session.customerId,
      modelPricing.credits_cost,
      selectedModel,
      currentConversationId
    );

    if (!deductResult.success) {
      return errorResponse(deductResult.error || 'Credits 扣除失敗', 400);
    }

    // 儲存使用者訊息（包含檔案 URL）
    await createMessage(
      currentConversationId,
      'user',
      message || `已上傳檔案: ${fileName}`,
      fileUrl,      // Vercel Blob URL
      fileName,
      fileType
    );

    // 獲取對話歷史
    const historyMessages = await getMessagesByConversationId(currentConversationId, 20);
    const conversationHistory = historyMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // 呼叫 MCP Client 取得 AI 回應並儲存
    let mcpResponse;
    try {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/api/chat/route.ts:handleChatMessage', message: 'Before MCP client call', data: { hasFileUrl: !!fileUrl, fileName }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'D' }) }).catch(() => { });
      // #endregion

      const mcpClient = createMCPClient();
      mcpResponse = await mcpClient.sendMessage({
        message: message || `請分析這個檔案: ${fileName}`,
        workloadLevel: workloadLevel as 'instant' | 'basic' | 'standard' | 'professional',
        selectedFunction: selectedFunction as 'lab' | 'radiology' | 'medical_record' | 'medication' | undefined,
        fileUrl,      // 傳給 MCP 用的 Blob URL
        conversationHistory,
        modelName: selectedModel,  // 新增：傳入模型名稱
      });

      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/api/chat/route.ts:handleChatMessage', message: 'MCP response received', data: { hasContent: !!mcpResponse.content, contentLength: mcpResponse.content?.length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'D' }) }).catch(() => { });
      // #endregion

      // 儲存 AI 回應
      await createMessage(
        currentConversationId,
        'assistant',
        mcpResponse.content,
        undefined,
        undefined,
        undefined
      );
    } catch (modelError: any) {
      // 如果模型呼叫失敗，退回 Credits
      console.error('模型呼叫失敗，正在退回 Credits:', modelError);

      try {
        await addCredits(
          session.customerId,
          modelPricing.credits_cost,
          `退款：模型呼叫失敗 (${selectedModel})`
        );
      } catch (refundError) {
        console.error('退回 Credits 失敗:', refundError);
      }

      throw modelError; // 重新拋出錯誤，由外層 catch 處理
    }

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/api/chat/route.ts:handleChatMessage', message: 'Returning success response', data: { conversationId: currentConversationId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'D' }) }).catch(() => { });
    // #endregion

    return successResponse({
      conversationId: currentConversationId,
      message: {
        role: 'assistant' as const,
        content: mcpResponse.content,
      },
      skillsUsed: mcpResponse.skillsUsed,
      creditsAfter: deductResult.creditsAfter,  // 注意：這裡返回的是扣除後的，退款後的更新會由前台重新獲取
    });

  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'app/api/chat/route.ts:handleChatMessage', message: 'Error caught in handleChatMessage', data: { errorMessage: error?.message, errorName: error?.name, errorStack: error?.stack?.substring(0, 300) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'D' }) }).catch(() => { });
    // #endregion
    console.error('對話 API 錯誤:', error);
    return errorResponse(error.message || Errors.INTERNAL_ERROR.message, 500);
  }
}

/**
 * GET /api/chat - 獲取對話訊息
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return errorResponse('缺少 conversationId 參數', 400);
    }

    // 驗證對話屬於當前使用者
    const conversation = await getConversationById(conversationId);
    if (!conversation || conversation.customer_id !== session.customerId) {
      return errorResponse('對話不存在或無權限', 403);
    }

    // 獲取訊息
    const messages = await getMessagesByConversationId(conversationId);

    return successResponse({
      conversation,
      messages,
    });

  } catch (error) {
    console.error('獲取對話錯誤:', error);
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
  }
}