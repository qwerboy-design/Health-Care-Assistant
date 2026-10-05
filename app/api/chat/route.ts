import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';
import { createConversation, getConversationById } from '@/lib/supabase/conversations';
import { createMessage, getMessagesByConversationId } from '@/lib/supabase/messages';
import { getCustomerCredits, deductCredits, addCredits } from '@/lib/supabase/credits';
import { getModelPricing } from '@/lib/supabase/model-pricing';
import { createMCPClient } from '@/lib/mcp/client';
import {
  errorResponse,
  successResponse,
  Errors,
  getSafeErrorDetails,
  isNamedError,
} from '@/lib/errors';
import {
  redactConversationMessages,
  redactFileName,
  redactFreeText,
} from '@/lib/privacy/redaction';
import { getLLMRuntimeSettings } from '@/lib/llm/settings';
import { LOCAL_ATTACHMENT_MAX_BYTES } from '@/lib/llm/attachments';
import { createDraftAnalysis, REPORT_GUIDANCE_VERSION, REPORT_PROMPT_VERSION } from '@/lib/reports/analysis';
import { validateReportInput, redactReportInput, AnalysisMetadataSchema, ReportInputValidationError, REPORT_INPUT_MAX_BYTES, type ReportInput } from '@/lib/reports/types';
import { REPORT_KNOWLEDGE_VERSION } from '@/lib/reports/knowledge';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return handleChatMessage(request);
}

async function handleChatMessage(request: NextRequest) {
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

    const contentType = request.headers.get('content-type') || '';
    const isMultipart = contentType.includes('multipart/form-data');
    const contentLength = request.headers.get('content-length');
    // Report JSON is capped by validateReportInput at 128 KB; normal chat is
    // capped after parsing. Multipart remains limited to the local attachment.
    // Leave room for JSON envelope/session fields so report validation can
    // return the specific 128 KB report error instead of a generic body cap.
    const maxRequestSize = isMultipart ? LOCAL_ATTACHMENT_MAX_BYTES + 64 * 1024 : REPORT_INPUT_MAX_BYTES + 8 * 1024;
    if (contentLength && parseInt(contentLength, 10) > maxRequestSize) {
      return errorResponse('請求內容過大', 413);
    }

    let body: Record<string, any>;
    let localAttachment:
      | {
          fileName: string;
          fileType: string;
          buffer: Buffer;
        }
      | undefined;

    if (isMultipart) {
      const runtimeSettings = await getLLMRuntimeSettings();
      if (runtimeSettings.active_provider !== 'ollama') {
        return errorResponse('Local attachments are only available when Ollama is active', 400);
      }

      const formData = await request.formData();
      const file = formData.get('file');
      body = {
        message: formData.get('message'),
        workloadLevel: formData.get('workloadLevel'),
        selectedFunction: formData.get('selectedFunction'),
        conversationId: formData.get('conversationId'),
        fileName: formData.get('fileName'),
        fileType: formData.get('fileType'),
        modelName: formData.get('modelName'),
      };

      if (file instanceof File) {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        localAttachment = {
          fileName: typeof body.fileName === 'string' && body.fileName ? body.fileName : file.name,
          fileType: typeof body.fileType === 'string' && body.fileType ? body.fileType : file.type,
          buffer: fileBuffer,
        };
      }
    } else {
      body = await request.json();
    }

    if (body.reportInput) {
      return handleReportMessage(session.customerId, body);
    }

    const {
      message,
      workloadLevel,
      selectedFunction,
      conversationId,
      fileUrl,
      fileName,
      fileType,
      modelName,
    } = body;

    if (!message?.trim() && !fileUrl && !localAttachment) {
      return errorResponse('Message or file is required', 400);
    }

    const redactedMessage = typeof message === 'string' ? redactFreeText(message).content : '';
    if (redactedMessage.length > 10_000) return errorResponse('Message is too large', 413);
    const redactedFileName =
      typeof fileName === 'string'
        ? redactFileName(fileName)
        : localAttachment
          ? redactFileName(localAttachment.fileName)
          : undefined;

    const selectedModel = modelName || 'claude-sonnet-4-5-20250929';
    const modelPricing = await getModelPricing(selectedModel);
    if (!modelPricing) {
      return errorResponse('Model is not available', 400);
    }

    const currentCredits = await getCustomerCredits(session.customerId);
    if (currentCredits < modelPricing.credits_cost) {
      return errorResponse(
        `Insufficient credits. Current: ${currentCredits}, required: ${modelPricing.credits_cost}`,
        400
      );
    }

    let currentConversationId = conversationId;

    if (!currentConversationId) {
      const title = redactedMessage.substring(0, 50) || 'File conversation';
      const conversation = await createConversation(
        session.customerId,
        title,
        workloadLevel as 'instant' | 'basic' | 'standard' | 'professional',
        selectedFunction || undefined,
        selectedModel
      );
      currentConversationId = conversation.id;
    } else {
      const conversation = await getConversationById(currentConversationId);
      if (!conversation || conversation.customer_id !== session.customerId) {
        return errorResponse('Conversation not found or access denied', 403);
      }
    }

    const deductResult = await deductCredits(
      session.customerId,
      modelPricing.credits_cost,
      selectedModel,
      currentConversationId
    );

    if (!deductResult.success) {
      return errorResponse(deductResult.error || 'Failed to deduct credits', 400);
    }

    await createMessage(
      currentConversationId,
      'user',
      redactedMessage || `Uploaded file: ${redactedFileName || 'file'}`,
      fileUrl,
      redactedFileName,
      fileType
    );

    const historyMessages = await getMessagesByConversationId(currentConversationId, 20);
    const conversationHistory = redactConversationMessages(historyMessages).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    let mcpResponse;
    try {
      const mcpClient = createMCPClient();
      mcpResponse = await mcpClient.sendMessage({
        message: redactedMessage || `Please analyze the attached file: ${redactedFileName || 'file'}`,
        workloadLevel: workloadLevel as 'instant' | 'basic' | 'standard' | 'professional',
        selectedFunction: selectedFunction as 'lab' | 'radiology' | 'medical_record' | 'medication' | undefined,
        fileUrl,
        localAttachment,
        conversationHistory,
        modelName: selectedModel,
      });

      await createMessage(currentConversationId, 'assistant', mcpResponse.content);
    } catch (modelError: any) {
      console.error('Model call failed, refunding credits', getSafeErrorDetails(modelError));

      try {
        await addCredits(
          session.customerId,
          modelPricing.credits_cost,
          `Refund for failed model call (${selectedModel})`
        );
      } catch (refundError) {
        console.error('Credit refund failed', getSafeErrorDetails(refundError));
      }

      throw modelError;
    }

    return successResponse({
      conversationId: currentConversationId,
      message: {
        role: 'assistant' as const,
        content: mcpResponse.content,
        provider: mcpResponse.metadata?.provider,
        model: mcpResponse.metadata?.model,
      },
      skillsUsed: mcpResponse.skillsUsed,
      creditsAfter: deductResult.creditsAfter,
    });
  } catch (error: any) {
    console.error('Chat API error', getSafeErrorDetails(error));
    if (isNamedError(error, 'OpenAIProviderError')) {
      const status = typeof error.status === 'number' && error.status >= 400 && error.status < 600 ? error.status : 502;
      return errorResponse(error.message, status);
    }
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
  }
}

/**
 * Safe first release path for confirmed, de-identified report rows. It uses
 * deterministic local rules while knowledge entries remain draft; this keeps
 * unreviewed medical content from becoming model-generated advice.
 */
async function handleReportMessage(customerId: string, body: Record<string, any>) {
  if (process.env.ENABLE_HEALTH_REPORT_ASSISTANT !== 'true') {
    return errorResponse('Health report assistant is not enabled', 404);
  }
  if (body.fileUrl || body.file || body.localAttachment || body.rawFile || body.rawBytes) {
    return errorResponse('Report requests may contain confirmed rows only', 400);
  }

  let reportInput: ReportInput;
  let analysis: ReturnType<typeof createDraftAnalysis>;
  try {
    reportInput = redactReportInput(validateReportInput(body.reportInput));
    analysis = createDraftAnalysis(reportInput);
    // Validate the complete server-owned shape before opening a conversation.
    // inputMessageId is added after the user message is created.
    AnalysisMetadataSchema.parse({
      kind: 'health_report_analysis', schemaVersion: '0.2', reportId: reportInput.reportId,
      guidanceVersion: REPORT_GUIDANCE_VERSION, promptVersion: REPORT_PROMPT_VERSION,
      provider: 'local-rules', model: 'draft-safe-analysis', selectedReferences: analysis.references.map((reference) => reference.id),
      generatedAt: new Date().toISOString(), reviewStatus: 'pending_review', retrievalStatus: 'retrieval_not_performed',
      confirmedItems: reportInput.items, analysis,
    });
  } catch (error) {
    const status = error instanceof ReportInputValidationError && error.code === 'too_large' ? 413 : 400;
    return errorResponse(error instanceof Error ? error.message : '報告資料格式不正確', status);
  }

  const workloadLevel = body.workloadLevel as 'instant' | 'basic' | 'standard' | 'professional' || 'standard';
  const selectedModel = typeof body.modelName === 'string' ? body.modelName : 'claude-sonnet-4-5-20250929';
  const modelPricing = await getModelPricing(selectedModel);
  if (!modelPricing) return errorResponse('Model is not available', 400);
  const currentCredits = await getCustomerCredits(customerId);
  if (currentCredits < modelPricing.credits_cost) return errorResponse('Insufficient credits', 400);

  let conversationId = typeof body.conversationId === 'string' ? body.conversationId : undefined;
  if (conversationId) {
    const existing = await getConversationById(conversationId);
    if (!existing || existing.customer_id !== customerId) return errorResponse('Conversation not found or access denied', 403);
    const existingMessages = await getMessagesByConversationId(conversationId, 1000);
    const mixedContext = existingMessages.some((message) => message.analysis_metadata?.kind !== 'health_report_analysis' && message.content !== 'Confirmed adult health report data submitted for review');
    if (mixedContext) return errorResponse('Start a new conversation for each health report', 409);
  } else {
    const conversation = await createConversation(customerId, 'Adult health report', workloadLevel, 'lab', selectedModel);
    conversationId = conversation.id;
  }

  const deducted = await deductCredits(customerId, modelPricing.credits_cost, selectedModel, conversationId);
  if (!deducted.success) return errorResponse(deducted.error || 'Failed to deduct credits', 400);

  try {
    const userMessage = await createMessage(conversationId, 'user', 'Confirmed adult health report data submitted for review');
    const metadata = AnalysisMetadataSchema.parse({
      kind: 'health_report_analysis', schemaVersion: '0.2', reportId: reportInput.reportId,
      guidanceVersion: REPORT_GUIDANCE_VERSION, promptVersion: REPORT_PROMPT_VERSION,
      provider: 'local-rules', model: 'draft-safe-analysis', inputMessageId: userMessage.id,
      selectedReferences: analysis.references.map((reference) => reference.id), generatedAt: new Date().toISOString(),
      reviewStatus: 'pending_review', retrievalStatus: 'retrieval_not_performed', confirmedItems: reportInput.items, analysis,
    });
    const lines = [
      '## 報告整理（AI 產出／待醫療專業覆核）', '', analysis.summary, '',
      '### 原報告數值', '| 項目 | 數值 | 單位 | 原報告範圍 | 狀態 |', '|---|---:|---|---|---|',
      ...reportInput.items.map((item) => { const fact = analysis.facts.find((entry) => entry.itemId === item.id); return `| ${item.label} | ${item.value} | ${item.unit || '—'} | ${item.referenceRange || '—'} | ${fact?.status || 'unknown'} |`; }),
      '', '### 項目說明', ...analysis.meanings.map((meaning) => `- ${meaning.id}: ${meaning.text}`),
      '', '### 醫師討論問題', ...analysis.doctorQuestions.map((question) => `- ${question}`),
      '', '### 限制', ...analysis.limitations.map((limitation) => `- ${limitation}`),
    ];
    const assistant = await createMessage(conversationId, 'assistant', lines.join('\n'), undefined, undefined, undefined, metadata);
    return successResponse({ conversationId, message: { role: 'assistant' as const, content: assistant.content, analysisMetadata: metadata }, skillsUsed: [], guidanceApplied: { guidanceVersion: REPORT_GUIDANCE_VERSION, knowledgeVersion: REPORT_KNOWLEDGE_VERSION, retrieval: 'not_performed' }, creditsAfter: deducted.creditsAfter });
  } catch (error) {
    await addCredits(customerId, modelPricing.credits_cost, `Refund for failed report analysis (${selectedModel})`);
    console.error('Report analysis failed; credits refunded');
    return errorResponse(error instanceof Error ? error.message : 'Report analysis failed', 500);
  }
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return errorResponse('conversationId is required', 400);
    }

    const conversation = await getConversationById(conversationId);
    if (!conversation || conversation.customer_id !== session.customerId) {
      return errorResponse('Conversation not found or access denied', 403);
    }

    const messages = await getMessagesByConversationId(conversationId);

    return successResponse({
      conversation,
      messages,
    });
  } catch (error) {
    console.error('Failed to load conversation:', error);
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
  }
}
