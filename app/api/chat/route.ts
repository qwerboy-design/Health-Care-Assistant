import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';
import { createConversation, getConversationById } from '@/lib/supabase/conversations';
import { createMessage, getMessagesByConversationId } from '@/lib/supabase/messages';
import { getCustomerCredits, deductCredits, addCredits } from '@/lib/supabase/credits';
import { getModelPricing } from '@/lib/supabase/model-pricing';
import { createMCPClient } from '@/lib/mcp/client';
import { errorResponse, successResponse, Errors } from '@/lib/errors';

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

    const contentLength = request.headers.get('content-length');
    const MAX_REQUEST_SIZE = 10 * 1024;
    if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_SIZE) {
      return errorResponse('Request is too large', 413);
    }

    const body = await request.json();
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

    if (!message?.trim() && !fileUrl) {
      return errorResponse('Message or file is required', 400);
    }

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
      const title = message?.substring(0, 50) || 'File conversation';
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
      message || `Uploaded file: ${fileName}`,
      fileUrl,
      fileName,
      fileType
    );

    const historyMessages = await getMessagesByConversationId(currentConversationId, 20);
    const conversationHistory = historyMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    let mcpResponse;
    try {
      const mcpClient = createMCPClient();
      mcpResponse = await mcpClient.sendMessage({
        message: message || `Please analyze this file: ${fileName}`,
        workloadLevel: workloadLevel as 'instant' | 'basic' | 'standard' | 'professional',
        selectedFunction: selectedFunction as 'lab' | 'radiology' | 'medical_record' | 'medication' | undefined,
        fileUrl,
        conversationHistory,
        modelName: selectedModel,
      });

      await createMessage(currentConversationId, 'assistant', mcpResponse.content);
    } catch (modelError: any) {
      console.error('Model call failed, refunding credits:', modelError);

      try {
        await addCredits(
          session.customerId,
          modelPricing.credits_cost,
          `Refund for failed model call (${selectedModel})`
        );
      } catch (refundError) {
        console.error('Credit refund failed:', refundError);
      }

      throw modelError;
    }

    return successResponse({
      conversationId: currentConversationId,
      message: {
        role: 'assistant' as const,
        content: mcpResponse.content,
      },
      skillsUsed: mcpResponse.skillsUsed,
      creditsAfter: deductResult.creditsAfter,
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return errorResponse(error.message || Errors.INTERNAL_ERROR.message, 500);
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
