import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { createConversation, getConversationById } from '@/lib/supabase/conversations';
import { createMessage, getMessagesByConversationId } from '@/lib/supabase/messages';
import { createMCPClient } from '@/lib/mcp/client';
import { uploadFile } from '@/lib/storage/upload';
import { chatMessageSchema } from '@/lib/validation/schemas';
import { errorResponse, successResponse, Errors } from '@/lib/errors';
import { cookies } from 'next/headers';

/**
 * POST /api/chat - 發送訊息並取得 AI 回應
 */
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

    // 解析請求
    const formData = await request.formData();
    const message = formData.get('message') as string;
    const workloadLevel = formData.get('workloadLevel') as string;
    const selectedFunction = formData.get('selectedFunction') as string | null;
    const conversationId = formData.get('conversationId') as string | null;
    const file = formData.get('file') as File | null;

    // 驗證基本欄位
    if (!message?.trim() && !file) {
      return errorResponse('訊息內容或檔案至少需要一個', 400);
    }

    // 上傳檔案（如果有）
    let fileUrl: string | undefined;
    let fileName: string | undefined;
    let fileType: string | undefined;

    if (file && file.size > 0) {
      try {
        const uploadResult = await uploadFile(file, session.customerId);
        fileUrl = uploadResult.url;
        fileName = uploadResult.fileName;
        fileType = uploadResult.fileType;
      } catch (error: any) {
        return errorResponse(error.message || '檔案上傳失敗', 400);
      }
    }

    // 獲取或建立對話
    let currentConversationId = conversationId;
    
    if (!currentConversationId) {
      // 建立新對話
      const title = message?.substring(0, 50) || '新對話';
      const conversation = await createConversation(
        session.customerId,
        title,
        workloadLevel as 'instant' | 'basic' | 'standard' | 'professional',
        selectedFunction || undefined
      );
      currentConversationId = conversation.id;
    } else {
      // 驗證對話屬於當前用戶
      const conversation = await getConversationById(currentConversationId);
      if (!conversation || conversation.customer_id !== session.customerId) {
        return errorResponse('對話不存在或無權限', 403);
      }
    }

    // 儲存使用者訊息
    await createMessage(
      currentConversationId,
      'user',
      message || `已上傳檔案: ${fileName}`,
      fileUrl,
      fileName,
      fileType
    );

    // 獲取對話歷史（用於上下文）
    const historyMessages = await getMessagesByConversationId(currentConversationId, 20);
    const conversationHistory = historyMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // 呼叫 MCP Client 取得 AI 回應
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/chat/route.ts:96',message:'Before createMCPClient',data:{hasMessage:!!message,workloadLevel,selectedFunction},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const mcpClient = createMCPClient();
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/chat/route.ts:98',message:'Before mcpClient.sendMessage',data:{hasMessage:!!message,hasFileUrl:!!fileUrl,historyLength:conversationHistory.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const mcpResponse = await mcpClient.sendMessage({
      message: message || `請分析這個檔案: ${fileName}`,
      workloadLevel: workloadLevel as 'instant' | 'basic' | 'standard' | 'professional',
      selectedFunction: selectedFunction as 'lab' | 'radiology' | 'medical_record' | 'medication' | undefined,
      fileUrl,
      conversationHistory,
    });
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/chat/route.ts:106',message:'After mcpClient.sendMessage',data:{hasContent:!!mcpResponse.content,hasSkillsUsed:!!mcpResponse.skillsUsed},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
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

    return successResponse({
      conversationId: currentConversationId,
      message: {
        role: 'assistant' as const,
        content: mcpResponse.content,
      },
      skillsUsed: mcpResponse.skillsUsed,
    });
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/chat/route.ts:125',message:'Chat API error caught',data:{errorName:error?.name,errorMessage:error?.message,errorStack:error?.stack?.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    console.error('對話 API 錯誤:', error);
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
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

    // 驗證對話屬於當前用戶
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
