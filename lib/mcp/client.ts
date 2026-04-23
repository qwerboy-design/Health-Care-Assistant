// AI Client - ?湔雿輻 Anthropic API (銝?鞈?MCP)
// ???舫??撘?? MCP hosted server ?祕雿敦蝭銝?蝣?
import { MCPClientConfig, MCPRequest, MCPResponse } from './types';
import { getSkillsCountForWorkload } from './workload';
import { getSuggestedSkills } from './function-mapping';

/**
 * AI Client 憿
 * 雿輻 Anthropic API ?湔?澆,銝?鞈?MCP
 */
export class MCPClient {
  private config: MCPClientConfig;
  private conversationHistory: Array<{role: string; content: string}> = [];

  constructor(config: MCPClientConfig) {
    this.config = config;
  }

  /**
   * ?蔭撠店甇瑕
   */
  public resetSession(): void {
    this.conversationHistory = [];
  }

  /**
   * ?潮???- 雿輻 Anthropic API
   */
  async sendMessage(request: MCPRequest): Promise<MCPResponse> {

    try {
      // ?脣?撱箄降??Skills (?冽?內閰?
      const suggestedSkills = getSuggestedSkills(request.selectedFunction);
      const maxSkills = getSkillsCountForWorkload(request.workloadLevel);
      const skills = suggestedSkills.slice(0, maxSkills);

      let systemPrompt =
        'You are a healthcare assistant. Provide careful, clinically oriented explanations and avoid presenting information as a definitive diagnosis.';
      
      if (skills.length > 0) {
        systemPrompt += `\n\n雿隞乩蝙?其誑銝極?瑚????:\n${skills.map(s => `- ${s}`).join('\n')}`;
      }

      if (request.selectedFunction) {
        const functionDescriptions: Record<string, string> = {
          lab: 'Focus on interpreting laboratory values, trends, reference ranges, and clinically relevant caveats.',
          diagnosis:
            'Focus on differential considerations, uncertainty, and what information would be needed to clarify the case.',
          treatment:
            'Focus on treatment considerations, safety, contraindications, and when clinician review is required.',
          medication:
            'Focus on medication purpose, dosing considerations, interactions, adverse effects, and monitoring.',
          research:
            'Focus on summarizing evidence, limitations, and how findings may or may not apply to the patient context.',
        };
        
        if (functionDescriptions[request.selectedFunction]) {
          systemPrompt += '\n\n' + functionDescriptions[request.selectedFunction];
        }
      }

      const hasFHIRData = request.message.includes('[FHIR ?典?鞈??臬]') ||
        request.message.includes('[FHIR Clinical Data Import]');
      if (hasFHIRData) {
        systemPrompt +=
          '\n\nThe user may provide FHIR clinical data. Interpret it carefully, preserve clinical context, mention coding systems when relevant, and avoid inventing missing facts.';
      }

      let userContent: string | Array<any> = request.message;
      
      if (request.fileUrl) {
        try {
          const fileUrl = request.fileUrl;
          const urlLower = fileUrl.toLowerCase();
          const isImageFile = urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg') || 
                             urlLower.endsWith('.png') || urlLower.endsWith('.gif') || 
                             urlLower.endsWith('.webp') || urlLower.includes('/image/');

          const fileResponse = await fetch(fileUrl);
          if (fileResponse.ok) {
            const contentType = fileResponse.headers.get('content-type') || '';
            const supportedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            const isSupportedImage = isImageFile && supportedImageTypes.some(type => contentType.includes(type));
            
            if (isSupportedImage) {
              const imageBuffer = await fileResponse.arrayBuffer();
              const imageBase64 = Buffer.from(imageBuffer).toString('base64');

              let mediaType = contentType;
              if (contentType.includes('image/jpg')) {
                mediaType = 'image/jpeg';
              } else if (!supportedImageTypes.includes(mediaType)) {
                if (urlLower.endsWith('.png')) mediaType = 'image/png';
                else if (urlLower.endsWith('.gif')) mediaType = 'image/gif';
                else if (urlLower.endsWith('.webp')) mediaType = 'image/webp';
                else mediaType = 'image/jpeg';
              }

              userContent = [
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
                  text: request.message || 'Please analyze this image.',
                },
              ];
            } else {
              const fileType = contentType || 'file';
              const fileName = request.fileUrl.split('/').pop() || 'file';
              userContent = request.message 
                ? `${request.message}\n\n[Attached ${fileType.includes('pdf') ? 'PDF' : 'file'}: ${fileName}]\nFile URL: ${fileUrl}\n\nPlease consider this file when answering.`
                : `Please analyze the attached ${fileType.includes('pdf') ? 'PDF' : 'file'}: ${fileName}\nFile URL: ${fileUrl}`;
            }
          } else {
            userContent = request.message 
              ? `${request.message}\n\n[Attached file URL: ${fileUrl}]`
              : `Please analyze the attached file: ${fileUrl}`;
          }
        } catch (error: any) {
          userContent = request.message 
            ? `${request.message}\n\n[Attached file URL: ${request.fileUrl}]`
            : `Please analyze the attached file: ${request.fileUrl}`;
        }
      }

      // 皞?撠店甇瑕
      const messages = [
        ...(request.conversationHistory || []),
        { role: 'user', content: userContent }
      ];

      // 瑽遣 Anthropic API 隢?
      // ?芸???嚗equest.modelName > ?啣?霈 ANTHROPIC_MODEL > ?身璅∪?
      const modelToUse = request.modelName || process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
      const apiRequest = {
        model: modelToUse,
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages,
      };

      const rawApiKey = this.config.apiKey || process.env.ANTHROPIC_API_KEY || process.env.MCP_API_KEY || '';
      const apiKeyToUse = rawApiKey.trim();
      
      if (!apiKeyToUse) {
        throw new Error('ANTHROPIC_API_KEY must be configured');
      }
      
      if (!apiKeyToUse.startsWith('sk-ant-')) {
        throw new Error('API Key format is invalid');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': apiKeyToUse,
        'anthropic-version': '2023-06-01',
      };

      // 瘜冽?嚗??閬???函垢瘛餃? 'anthropic-dangerous-direct-browser-access' 隢???      // 閰脰?瘙??潛汗?函憓???Vercel (Node.js) ?啣?銝剜?撠 403 ?航炊
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify(apiRequest),
      });


      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        
        let parsedError: any = null;
        try {
          parsedError = JSON.parse(errorText);
        } catch {
          // ?⊥?閫????JSON
        }
        
        const errorInfo = {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 500),
          parsedErrorType: parsedError?.error?.type,
          parsedErrorMessage: parsedError?.error?.message,
          hasCorrectPrefix: apiKeyToUse.startsWith('sk-ant-'),
          model: apiRequest.model,
        };
        
        console.error('??[MCP Client] Anthropic API ?航炊:', JSON.stringify(errorInfo, null, 2));
        
        if (response.status === 403 && parsedError?.error?.type === 'forbidden') {
          console.error('[MCP Client] Anthropic rejected the configured API key.');
        }
        
        
        throw new Error(`AI ???航炊: ${response.status} ${errorText}`);
      }

      const data = await response.json();


      // ?????批捆
      const content = data.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');

      // ?湔撠店甇瑕
      this.conversationHistory = [
        ...messages,
        { role: 'assistant', content: content }
      ];

      return {
        content: content,
        skillsUsed: skills,
        metadata: {
          model: data.model,
          usage: data.usage,
          conversationLength: this.conversationHistory.length,
        },
      };
      
    } catch (error: any) {
      
      console.error('AI Client ?航炊:', error);
      throw new Error(`?⊥?????AI ??: ${error.message}`);
    }
  }

  /**
   * 銝脫?撘????   */
  async *sendMessageStream(request: MCPRequest): AsyncGenerator<string, void, unknown> {
    try {
      const suggestedSkills = getSuggestedSkills(request.selectedFunction);
      const maxSkills = getSkillsCountForWorkload(request.workloadLevel);
      const skills = suggestedSkills.slice(0, maxSkills);

      let systemPrompt =
        'You are a healthcare assistant. Provide careful, clinically oriented explanations and avoid presenting information as a definitive diagnosis.';
      if (skills.length > 0) {
        systemPrompt += `\n?舐撌亙: ${skills.join(', ')}`;
      }

      const messages = [
        ...(request.conversationHistory || []),
        { role: 'user', content: request.message }
      ];

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey || process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: request.modelName || process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          system: systemPrompt,
          messages: messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI ???航炊: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('?⊥?霈??response stream');
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              try {
                const parsed = JSON.parse(data);
                
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  yield parsed.delta.text;
                }
              } catch {
                // 頝喲??⊥?閫????
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
    } catch (error: any) {
      console.error('Streaming error:', error);
      throw error;
    }
  }
}

/**
 * 撱箇? AI Client 撖虫?
 */
export function createMCPClient(): MCPClient {
  // ?芸?雿輻?啣?霈銝剔? Anthropic API Key
  const rawAnthropicKey = process.env.ANTHROPIC_API_KEY;
  const rawMCPKey = process.env.MCP_API_KEY;
  const apiKeyRaw = rawAnthropicKey || rawMCPKey;
  // 皜? API key嚗宏?文?敺征?澆???蝚佗?
  const apiKey = apiKeyRaw?.trim() || '';
  
  const config: MCPClientConfig = {
    serverUrl: 'https://api.anthropic.com/v1/messages', // ?湔雿輻 Anthropic API
    apiKey,
  };

  return new MCPClient(config);
}

/**
 * 雿輻蝭?
 */
export async function testAIClient() {
  console.log('?妒 皜祈岫 AI Client (雿輻 Anthropic API)...\n');
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('???航炊: ?芾身摰?ANTHROPIC_API_KEY');
    console.log('隢 .env.local 銝剛身摰?');
    console.log('ANTHROPIC_API_KEY=sk-ant-api03-...');
    return;
  }
  
  const client = createMCPClient();
  
  try {
    // 皜祈岫 1: ?箸閮
    console.log('?? 皜祈岫 1: ??瑼ａ??勗?');
    const response = await client.sendMessage({
      message: 'Analyze this lab report: Vancomycin(trough) 15.8 ug/mL',
      selectedFunction: 'lab',
      workloadLevel: 'standard',
      conversationHistory: [],
    });
    
    console.log('?????嗅??:');
    console.log('  ?批捆:', response.content.substring(0, 200) + '...');
    console.log('  雿輻??skills:', response.skillsUsed);
    console.log('  Token 雿輻:', response.metadata?.usage);
    console.log('');
    
    // 皜祈岫 2: 蝜潛?撠店
    console.log('?? 皜祈岫 2: 蝜潛?撠店');
    const followUp = await client.sendMessage({
      message: 'What does this concentration mean for patient safety?',
      selectedFunction: 'lab',
      workloadLevel: 'standard',
      conversationHistory: [
        { role: 'user', content: 'Analyze this lab report: Vancomycin(trough) 15.8 ug/mL' },
        { role: 'assistant', content: response.content }
      ],
    });
    
    console.log('??蝜潛?撠店??');
    console.log('  ?批捆:', followUp.content.substring(0, 200) + '...');
    console.log('');
    
    console.log('?? ??葫閰阡?!');
    
  } catch (error: any) {
    console.error('??皜祈岫憭望?:', error.message);
  }
}
