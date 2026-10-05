import { MCPClientConfig, MCPRequest, MCPResponse } from './types';
import { getSkillsCountForWorkload } from './workload';
import { getSuggestedSkills } from './function-mapping';
import {
  redactConversationMessages,
  redactFileName,
  redactFreeText,
  redactUploadMetadata,
} from '@/lib/privacy/redaction';
import { getSafeErrorDetails, isNamedError } from '@/lib/errors';
import { getLLMRuntimeSettings } from '@/lib/llm/settings';
import { sendOllamaChat } from '@/lib/llm/ollama-client';
import { prepareAttachmentForOllama } from '@/lib/llm/attachments';
import {
  DEFAULT_OPENAI_MODEL,
  sendOpenAIChat,
  streamOpenAIChat,
  type OpenAIContentPart,
  type OpenAIMessage,
} from '@/lib/llm/openai-client';

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

function toOpenAIContent(content: string | Array<any>): string | OpenAIContentPart[] {
  if (typeof content === 'string') {
    return content;
  }

  const parts = content.flatMap((part): OpenAIContentPart[] => {
    if (part?.type === 'text' && typeof part.text === 'string') {
      return [{ type: 'text', text: part.text }];
    }

    if (part?.type === 'image' && part.source?.type === 'base64' && typeof part.source.data === 'string') {
      const mediaType = typeof part.source.media_type === 'string' ? part.source.media_type : 'image/jpeg';
      return [
        {
          type: 'image_url',
          image_url: { url: `data:${mediaType};base64,${part.source.data}` },
        },
      ];
    }

    return [];
  });

  return parts.length > 0 ? parts : '';
}

function resolveOpenAIModel(requestedModel?: string): string {
  const normalized = requestedModel?.trim();
  if (normalized && /^(gpt-|o[1-9]|chatgpt-)/i.test(normalized)) {
    return normalized;
  }

  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

async function prepareRemoteAttachment(
  fileUrl: string,
  redactedMessage: string
): Promise<string | Array<any>> {
  const promptFile = redactUploadMetadata({
    fileName: fileUrl.split('/').pop() || 'file',
    fileUrl,
  });
  const promptFileName = promptFile.fileName || redactFileName('file');
  const promptFileUrl = promptFile.fileUrl || '[REDACTED_URL]';

  try {
    const fileResponse = await fetch(fileUrl);
    const contentType = fileResponse.headers.get('content-type') || '';
    const lowerUrl = fileUrl.toLowerCase();
    const supportedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const isImageFile =
      lowerUrl.endsWith('.jpg') ||
      lowerUrl.endsWith('.jpeg') ||
      lowerUrl.endsWith('.png') ||
      lowerUrl.endsWith('.gif') ||
      lowerUrl.endsWith('.webp') ||
      lowerUrl.includes('/image/');
    const isSupportedImage =
      fileResponse.ok && isImageFile && supportedImageTypes.some((type) => contentType.includes(type));

    if (isSupportedImage) {
      const imageBuffer = await fileResponse.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      let mediaType = contentType;
      if (contentType.includes('image/jpg')) {
        mediaType = 'image/jpeg';
      } else if (!supportedImageTypes.includes(mediaType)) {
        if (lowerUrl.endsWith('.png')) mediaType = 'image/png';
        else if (lowerUrl.endsWith('.gif')) mediaType = 'image/gif';
        else if (lowerUrl.endsWith('.webp')) mediaType = 'image/webp';
        else mediaType = 'image/jpeg';
      }

      return [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: imageBase64,
          },
        },
        {
          type: 'text',
          text: redactedMessage || 'Please analyze this image.',
        },
      ];
    }

    const attachmentLabel = contentType.includes('pdf') ? 'PDF' : 'file';
    return redactedMessage
      ? `${redactedMessage}\n\n[Attached ${attachmentLabel}: ${promptFileName}]\nFile reference: ${promptFileUrl}\n\nPlease consider this file when answering.`
      : `Please analyze the attached ${attachmentLabel}: ${promptFileName}\nFile reference: ${promptFileUrl}`;
  } catch {
    return redactedMessage
      ? `${redactedMessage}\n\n[Attached file: ${promptFileName}]\nFile reference: ${promptFileUrl}`
      : `Please analyze the attached file: ${promptFileName}\nFile reference: ${promptFileUrl}`;
  }
}

export class MCPClient {
  private config: MCPClientConfig;
  private conversationHistory: Array<{ role: string; content: string }> = [];

  constructor(config: MCPClientConfig) {
    this.config = config;
  }

  public resetSession(): void {
    this.conversationHistory = [];
  }

  async sendMessage(request: MCPRequest): Promise<MCPResponse> {
    try {
      const suggestedSkills = getSuggestedSkills(request.selectedFunction);
      const maxSkills = getSkillsCountForWorkload(request.workloadLevel);
      const skills = suggestedSkills.slice(0, maxSkills);

      let systemPrompt =
        'You are a healthcare assistant. Provide careful, clinically oriented explanations and avoid presenting information as a definitive diagnosis.';

      if (skills.length > 0) {
        systemPrompt += `\n\nApply these skills when relevant:\n${skills.map((skill) => `- ${skill}`).join('\n')}`;
      }

      if (request.selectedFunction) {
        const functionDescriptions: Record<string, string> = {
          lab: 'Focus on interpreting laboratory values, trends, reference ranges, and clinically relevant caveats.',
          radiology: 'Focus on imaging findings, anatomical context, uncertainty, and follow-up suggestions.',
          medical_record:
            'Focus on synthesizing chart context, timeline, major problems, and missing clinical information.',
          medication:
            'Focus on medication purpose, dosing considerations, interactions, adverse effects, and monitoring.',
        };

        if (functionDescriptions[request.selectedFunction]) {
          systemPrompt += `\n\n${functionDescriptions[request.selectedFunction]}`;
        }
      }

      const redactedMessage = redactFreeText(request.message).content;
      const safeConversationHistory = redactConversationMessages(
        (request.conversationHistory || []).map((item) => ({
          role: item.role,
          content: item.content,
        }))
      );

      const hasFHIRData =
        redactedMessage.includes('[FHIR 臨床資料匯入]') ||
        redactedMessage.includes('[FHIR Clinical Data Import]');

      if (hasFHIRData) {
        systemPrompt +=
          '\n\nThe user may provide FHIR clinical data. Interpret it carefully, preserve clinical context, mention coding systems when relevant, and avoid inventing missing facts.';
      }

      const runtimeSettings = await getLLMRuntimeSettings();
      let userContent: string | Array<any> = redactedMessage;

      if (runtimeSettings.is_enabled && runtimeSettings.active_provider === 'ollama') {
        if (request.fileUrl && !request.localAttachment) {
          throw new Error('Ollama mode requires local attachment content and will not fetch external file URLs');
        }

        let ollamaUserText = redactedMessage;
        let ollamaImages: string[] = [];
        let ollamaModelOverride: string | undefined;

        if (request.localAttachment) {
          const preparedAttachment = await prepareAttachmentForOllama(request.localAttachment, runtimeSettings);
          ollamaUserText = redactedMessage
            ? `${redactedMessage}\n\n${preparedAttachment.text}`
            : preparedAttachment.text;
          ollamaImages = preparedAttachment.images;
          ollamaModelOverride = preparedAttachment.modelOverride;
        }

        const ollamaMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...safeConversationHistory.map((message) => ({
            role: message.role as 'user' | 'assistant',
            content: message.content,
          })),
          {
            role: 'user' as const,
            content: ollamaUserText || 'Please analyze the provided clinical context.',
            ...(ollamaImages.length > 0 ? { images: ollamaImages } : {}),
          },
        ];

        const ollamaResponse = await sendOllamaChat(runtimeSettings, {
          messages: ollamaMessages,
          model: ollamaModelOverride || runtimeSettings.ollama_model,
        });

        this.conversationHistory = [
          ...ollamaMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          { role: 'assistant', content: ollamaResponse.content },
        ];

        return {
          content: ollamaResponse.content,
          skillsUsed: skills,
          metadata: {
            provider: 'ollama',
            model: ollamaResponse.model,
            usage: ollamaResponse.usage,
            conversationLength: this.conversationHistory.length,
          },
        };
      }

      if (request.fileUrl) userContent = await prepareRemoteAttachment(request.fileUrl, redactedMessage);

      const messages = [
        ...safeConversationHistory,
        { role: 'user', content: userContent },
      ];

      if (runtimeSettings.is_enabled && runtimeSettings.active_provider === 'openai') {
        const openAIMessages: OpenAIMessage[] = [
          { role: 'system', content: systemPrompt },
          ...safeConversationHistory.map((message) => ({
            role: message.role as 'user' | 'assistant',
            content: message.content,
          })),
          { role: 'user', content: toOpenAIContent(userContent) },
        ];
        const openAIResponse = await sendOpenAIChat({
          model: resolveOpenAIModel(request.modelName),
          messages: openAIMessages,
        });

        this.conversationHistory = [
          ...openAIMessages.map((message) => ({
            role: message.role,
            content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
          })),
          { role: 'assistant', content: openAIResponse.content },
        ];

        return {
          content: openAIResponse.content,
          skillsUsed: skills,
          metadata: {
            provider: 'openai',
            model: openAIResponse.model,
            usage: openAIResponse.usage,
            conversationLength: this.conversationHistory.length,
          },
        };
      }

      const modelToUse = request.modelName || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
      const apiKey = (this.config.apiKey || process.env.ANTHROPIC_API_KEY || process.env.MCP_API_KEY || '').trim();

      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY must be configured');
      }

      if (!apiKey.startsWith('sk-ant-')) {
        throw new Error('API key format is invalid');
      }

      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: modelToUse,
          max_tokens: 4096,
          system: systemPrompt,
          messages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error('[MCP Client] Anthropic API request failed', {
          status: response.status,
          statusText: response.statusText,
          model: modelToUse,
        });
        throw new Error(`AI request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const content = data.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');

      this.conversationHistory = [
        ...messages.map((message) => ({
          role: message.role,
          content:
            typeof message.content === 'string'
              ? message.content
              : JSON.stringify(message.content),
        })),
        { role: 'assistant', content },
      ];

      return {
        content,
        skillsUsed: skills,
        metadata: {
          model: data.model,
          usage: data.usage,
          conversationLength: this.conversationHistory.length,
        },
      };
    } catch (error: any) {
      console.error('AI client error', getSafeErrorDetails(error));
      if (isNamedError(error, 'OpenAIProviderError')) throw error;
      throw new Error(`Failed to call AI service: ${error.message}`);
    }
  }

  async *sendMessageStream(request: MCPRequest): AsyncGenerator<string, void, unknown> {
    try {
      const suggestedSkills = getSuggestedSkills(request.selectedFunction);
      const maxSkills = getSkillsCountForWorkload(request.workloadLevel);
      const skills = suggestedSkills.slice(0, maxSkills);
      const redactedMessage = redactFreeText(request.message).content;
      const safeConversationHistory = redactConversationMessages(
        (request.conversationHistory || []).map((item) => ({
          role: item.role,
          content: item.content,
        }))
      );

      let systemPrompt =
        'You are a healthcare assistant. Provide careful, clinically oriented explanations and avoid presenting information as a definitive diagnosis.';

      if (skills.length > 0) {
        systemPrompt += `\nApply these skills when relevant: ${skills.join(', ')}`;
      }

      const runtimeSettings = await getLLMRuntimeSettings();
      if (runtimeSettings.is_enabled && runtimeSettings.active_provider === 'openai') {
        const openAIUserContent = request.fileUrl
          ? await prepareRemoteAttachment(request.fileUrl, redactedMessage)
          : redactedMessage;
        const messages: OpenAIMessage[] = [
          { role: 'system', content: systemPrompt },
          ...safeConversationHistory.map((message) => ({
            role: message.role as 'user' | 'assistant',
            content: message.content,
          })),
          { role: 'user', content: toOpenAIContent(openAIUserContent) },
        ];

        yield* streamOpenAIChat({
          model: resolveOpenAIModel(request.modelName),
          messages,
        });
        return;
      }

      const apiKey = (this.config.apiKey || process.env.ANTHROPIC_API_KEY || process.env.MCP_API_KEY || '').trim();
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY must be configured');
      }

      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: request.modelName || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
            ...safeConversationHistory,
            { role: 'user', content: redactedMessage },
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Unable to read response stream');
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) {
              continue;
            }

            const payload = line.slice(6);
            if (!payload || payload === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(payload);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                yield parsed.delta.text;
              }
            } catch {
              // Ignore malformed stream chunks.
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error: any) {
      console.error('Streaming error', getSafeErrorDetails(error));
      throw error;
    }
  }
}

export function createMCPClient(): MCPClient {
  const apiKey = (process.env.ANTHROPIC_API_KEY || process.env.MCP_API_KEY || '').trim();

  return new MCPClient({
    serverUrl: ANTHROPIC_API_URL,
    apiKey,
  });
}

export async function testAIClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not configured');
    return;
  }

  const client = createMCPClient();

  try {
    const response = await client.sendMessage({
      message: 'Analyze this lab report: Vancomycin(trough) 15.8 ug/mL',
      selectedFunction: 'lab',
      workloadLevel: 'standard',
      conversationHistory: [],
    });

    console.log('AI response preview:', response.content.substring(0, 200));
    console.log('Skills used:', response.skillsUsed);
    console.log('Usage:', response.metadata?.usage);
  } catch (error: any) {
    console.error('AI client test failed:', error.message);
  }
}
