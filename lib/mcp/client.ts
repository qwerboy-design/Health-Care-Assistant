// AI Client - 直接使用 Anthropic API (不依賴 MCP)
// 這是最可靠的方式,因為 MCP hosted server 的實作細節不明確

import { MCPClientConfig, MCPRequest, MCPResponse } from './types';
import { getSkillsCountForWorkload } from './workload';
import { getSuggestedSkills } from './function-mapping';

/**
 * AI Client 類別
 * 使用 Anthropic API 直接呼叫,不依賴 MCP
 */
export class MCPClient {
  private config: MCPClientConfig;
  private conversationHistory: Array<{role: string; content: string}> = [];

  constructor(config: MCPClientConfig) {
    this.config = config;
  }

  /**
   * 重置對話歷史
   */
  public resetSession(): void {
    this.conversationHistory = [];
  }

  /**
   * 發送訊息 - 使用 Anthropic API
   */
  async sendMessage(request: MCPRequest): Promise<MCPResponse> {
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:sendMessage:entry',message:'AI Client sendMessage entry',data:{hasApiKey:!!this.config.apiKey,usingAnthropicAPI:true},timestamp:Date.now()})}).catch(()=>{});

    try {
      // 獲取建議的 Skills (用於提示詞)
      const suggestedSkills = getSuggestedSkills(request.selectedFunction);
      const maxSkills = getSkillsCountForWorkload(request.workloadLevel);
      const skills = suggestedSkills.slice(0, maxSkills);

      // 構建系統提示詞
      let systemPrompt = '你是一個專業的醫療助理,專門協助分析檢驗報告和提供醫療建議。';
      
      if (skills.length > 0) {
        systemPrompt += `\n\n你可以使用以下工具來協助分析:\n${skills.map(s => `- ${s}`).join('\n')}`;
      }

      if (request.selectedFunction) {
        const functionDescriptions: Record<string, string> = {
          'lab': '你專注於分析實驗室檢驗報告,解釋數值意義並提供臨床建議',
          'diagnosis': '你專注於協助診斷,根據症狀和檢驗結果提供可能的診斷',
          'treatment': '你專注於治療建議,根據診斷提供適當的治療方案',
          'medication': '你專注於藥物諮詢,提供用藥建議和注意事項',
          'research': '你專注於醫學研究,搜尋相關文獻和研究資料',
        };
        
        if (functionDescriptions[request.selectedFunction]) {
          systemPrompt += '\n\n' + functionDescriptions[request.selectedFunction];
        }
      }

      // 準備對話歷史
      const messages = [
        ...(request.conversationHistory || []),
        { role: 'user', content: request.message }
      ];

      // 構建 Anthropic API 請求
      const apiRequest = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages,
      };

      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:sendMessage:before_anthropic_api',message:'Before Anthropic API call',data:{model:apiRequest.model,messageCount:messages.length,hasSystem:!!systemPrompt},timestamp:Date.now()})}).catch(()=>{});

      // 呼叫 Anthropic API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey || process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(apiRequest),
      });

      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:sendMessage:after_anthropic_api',message:'After Anthropic API call',data:{status:response.status,ok:response.ok},timestamp:Date.now()})}).catch(()=>{});

      if (!response.ok) {
        const errorText = await response.text().catch(() => '無法讀取錯誤訊息');
        fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:sendMessage:api_error',message:'Anthropic API error',data:{status:response.status,errorText:errorText.substring(0,300)},timestamp:Date.now()})}).catch(()=>{});
        
        throw new Error(`AI 服務錯誤: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:sendMessage:success',message:'Response received successfully',data:{hasContent:!!data.content,contentLength:data.content?.[0]?.text?.length || 0},timestamp:Date.now()})}).catch(()=>{});

      // 提取回應內容
      const content = data.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');

      // 更新對話歷史
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
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:sendMessage:catch',message:'AI Client error caught',data:{errorName:error?.name,errorMessage:error?.message,errorStack:error?.stack?.substring(0,300)},timestamp:Date.now()})}).catch(()=>{});
      
      console.error('AI Client 錯誤:', error);
      throw new Error(`無法連接到 AI 服務: ${error.message}`);
    }
  }

  /**
   * 串流式發送訊息
   */
  async *sendMessageStream(request: MCPRequest): AsyncGenerator<string, void, unknown> {
    try {
      const suggestedSkills = getSuggestedSkills(request.selectedFunction);
      const maxSkills = getSkillsCountForWorkload(request.workloadLevel);
      const skills = suggestedSkills.slice(0, maxSkills);

      let systemPrompt = '你是一個專業的醫療助理。';
      if (skills.length > 0) {
        systemPrompt += `\n可用工具: ${skills.join(', ')}`;
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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: systemPrompt,
          messages: messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI 服務錯誤: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('無法讀取 response stream');
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
                // 跳過無法解析的行
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
 * 建立 AI Client 實例
 */
export function createMCPClient(): MCPClient {
  // 優先使用環境變數中的 Anthropic API Key
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.MCP_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️  未設定 ANTHROPIC_API_KEY,AI 功能可能無法使用');
    console.warn('請在 .env.local 中設定: ANTHROPIC_API_KEY=your-key-here');
  }
  
  fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:createMCPClient',message:'createMCPClient config',data:{hasApiKey:!!apiKey,usingAnthropicAPI:true},timestamp:Date.now()})}).catch(()=>{});

  const config: MCPClientConfig = {
    serverUrl: 'https://api.anthropic.com/v1/messages', // 直接使用 Anthropic API
    apiKey,
  };

  return new MCPClient(config);
}

/**
 * 使用範例
 */
export async function testAIClient() {
  console.log('🧪 測試 AI Client (使用 Anthropic API)...\n');
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ 錯誤: 未設定 ANTHROPIC_API_KEY');
    console.log('請在 .env.local 中設定:');
    console.log('ANTHROPIC_API_KEY=sk-ant-api03-...');
    return;
  }
  
  const client = createMCPClient();
  
  try {
    // 測試 1: 基本訊息
    console.log('📝 測試 1: 分析檢驗報告');
    const response = await client.sendMessage({
      message: 'Analyze this lab report: Vancomycin(trough) 15.8 ug/mL',
      selectedFunction: 'lab',
      workloadLevel: 'standard',
      conversationHistory: [],
    });
    
    console.log('✅ 成功收到回應:');
    console.log('  內容:', response.content.substring(0, 200) + '...');
    console.log('  使用的 skills:', response.skillsUsed);
    console.log('  Token 使用:', response.metadata.usage);
    console.log('');
    
    // 測試 2: 繼續對話
    console.log('📝 測試 2: 繼續對話');
    const followUp = await client.sendMessage({
      message: 'What does this concentration mean for patient safety?',
      selectedFunction: 'lab',
      workloadLevel: 'standard',
      conversationHistory: [
        { role: 'user', content: 'Analyze this lab report: Vancomycin(trough) 15.8 ug/mL' },
        { role: 'assistant', content: response.content }
      ],
    });
    
    console.log('✅ 繼續對話成功');
    console.log('  內容:', followUp.content.substring(0, 200) + '...');
    console.log('');
    
    console.log('🎉 所有測試通過!');
    
  } catch (error: any) {
    console.error('❌ 測試失敗:', error.message);
  }
}