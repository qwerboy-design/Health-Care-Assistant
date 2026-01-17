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
      // 使用 Claude 3 Haiku 作為預設模型（穩定且廣泛支援）
      // 可以通過環境變數 ANTHROPIC_MODEL 自訂模型
      // 注意：如果您的帳戶支援更高級模型，可設定為 'claude-3-5-sonnet-20241022'
      const modelToUse = process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307';
      const apiRequest = {
        model: modelToUse,
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages,
      };

      // 準備 API Key（清理空格和換行符）
      const rawApiKey = this.config.apiKey || process.env.ANTHROPIC_API_KEY || process.env.MCP_API_KEY || '';
      const apiKeyToUse = rawApiKey.trim();
      
      // 診斷日誌 - 輸出到 Vercel 函數日誌
      const requestInfo = {
        model: apiRequest.model,
        messageCount: messages.length,
        hasSystem: !!systemPrompt,
        hasApiKey: !!apiKeyToUse,
        apiKeyLength: apiKeyToUse.length,
        apiKeyPrefix: apiKeyToUse.substring(0, Math.min(10, apiKeyToUse.length)),
        hasCorrectPrefix: apiKeyToUse.startsWith('sk-ant-'),
        anthropicVersion: '2023-06-01',
        hasConfigApiKey: !!this.config.apiKey,
        hasEnvAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        hasEnvMCPKey: !!process.env.MCP_API_KEY,
        hasWhitespace: rawApiKey !== rawApiKey.trim() || /\n|\r/.test(rawApiKey),
        isEmpty: apiKeyToUse.length === 0,
      };
      console.log('[MCP Client] 準備呼叫 Anthropic API:', JSON.stringify(requestInfo, null, 2));
      
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:sendMessage:before_anthropic_api',message:'Before Anthropic API call',data:requestInfo,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      if (!apiKeyToUse) {
        throw new Error('ANTHROPIC_API_KEY 未設定。請在 Vercel Dashboard → Settings → Environment Variables 中設定（生產環境）或在 .env.local 中設定（本地開發）');
      }
      
      if (!apiKeyToUse.startsWith('sk-ant-')) {
        throw new Error(`API Key 格式不正確，應以 "sk-ant-" 開頭。當前前綴: ${apiKeyToUse.substring(0, 7)}`);
      }

      // 呼叫 Anthropic API
      // #region agent log
      const headersInfo = {
        hasContentType: true,
        hasXApiKey: !!apiKeyToUse,
        xApiKeyLength: apiKeyToUse.length,
        xApiKeyPrefix: apiKeyToUse.substring(0, Math.min(10, apiKeyToUse.length)),
        hasAnthropicVersion: true,
        anthropicVersion: '2023-06-01',
      };
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:sendMessage:before_fetch',message:'Before fetch request',data:headersInfo,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      // 準備請求標頭 - 使用 Anthropic SDK 推薦的配置
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': apiKeyToUse,
        'anthropic-version': '2023-06-01',
      };
      
      // 在 Vercel 環境中添加額外的標頭以避免網絡限制
      if (process.env.VERCEL) {
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
      }
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify(apiRequest),
      });

      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:sendMessage:after_anthropic_api',message:'After Anthropic API call',data:{status:response.status,ok:response.ok,statusText:response.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      if (!response.ok) {
        const errorText = await response.text().catch(() => '無法讀取錯誤訊息');
        
        // 診斷日誌 - 輸出到 Vercel 函數日誌
        let parsedError: any = null;
        try {
          parsedError = JSON.parse(errorText);
        } catch {
          // 無法解析為 JSON
        }
        
        const errorInfo = {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 500),
          parsedErrorType: parsedError?.error?.type,
          parsedErrorMessage: parsedError?.error?.message,
          hasApiKey: !!apiKeyToUse,
          apiKeyLength: apiKeyToUse.length,
          apiKeyPrefix: apiKeyToUse.substring(0, Math.min(10, apiKeyToUse.length)),
          hasCorrectPrefix: apiKeyToUse.startsWith('sk-ant-'),
          isVercel: !!process.env.VERCEL,
          nodeEnv: process.env.NODE_ENV,
          model: apiRequest.model,
        };
        
        console.error('❌ [MCP Client] Anthropic API 錯誤:', JSON.stringify(errorInfo, null, 2));
        
        // 檢查是否為 Claude Code subscription API Key 限制
        if (response.status === 403 && parsedError?.error?.type === 'forbidden') {
          console.error('');
          console.error('❌❌❌ 重要：API Key 類型錯誤 ❌❌❌');
          console.error('');
          console.error('您使用的 API Key 無法用於此應用程式。');
          console.error('');
          console.error('📌 問題原因:');
          console.error('  • 您的 API Key 可能是 "Claude Code subscription" 類型');
          console.error('  • Anthropic 在 2026年1月9日後限制了此類型的 API Key');
          console.error('  • 此類型的 Key 只能用於 Claude for Code/IDE，無法用於直接 API 調用');
          console.error('');
          console.error('✅ 解決方法:');
          console.error('  1. 前往 Anthropic Console: https://console.anthropic.com/settings/keys');
          console.error('  2. 創建一個新的「標準 API Key」（不是 Claude Code subscription）');
          console.error('  3. 在 Vercel Dashboard → Settings → Environment Variables 中');
          console.error('     更新 ANTHROPIC_API_KEY 為新的標準 API Key');
          console.error('  4. 重新部署您的應用程式');
          console.error('');
          console.error('🔍 如何確認您的 API Key 類型:');
          console.error('  • 標準 API Key: 以 "sk-ant-api03-" 開頭，可用於所有 API 調用');
          console.error('  • Claude Code Key: 只能用於 IDE 和代碼編輯器整合');
          console.error('');
          console.error('💡 提示: 標準 API Key 需要設定付費方式或有免費額度');
          console.error('');
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:sendMessage:api_error',message:'Anthropic API error',data:errorInfo,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        
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
          model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
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
  const rawAnthropicKey = process.env.ANTHROPIC_API_KEY;
  const rawMCPKey = process.env.MCP_API_KEY;
  const apiKeyRaw = rawAnthropicKey || rawMCPKey;
  // 清理 API key（移除前後空格和換行符）
  const apiKey = apiKeyRaw?.trim() || '';
  
  // 診斷日誌 - 輸出到 Vercel 函數日誌
  const apiKeyInfo = {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey.length,
    apiKeyPrefix: apiKey.substring(0, Math.min(10, apiKey.length)),
    hasCorrectPrefix: apiKey.startsWith('sk-ant-'),
    envSource: rawAnthropicKey ? 'ANTHROPIC_API_KEY' : (rawMCPKey ? 'MCP_API_KEY' : 'none'),
    hasRawAnthropicKey: !!rawAnthropicKey,
    hasRawMCPKey: !!rawMCPKey,
    rawAnthropicKeyLength: rawAnthropicKey?.length || 0,
    rawMCPKeyLength: rawMCPKey?.length || 0,
    isVercel: !!process.env.VERCEL,
    nodeEnv: process.env.NODE_ENV,
    hasWhitespace: apiKeyRaw ? (apiKeyRaw !== apiKeyRaw.trim() || /\n|\r/.test(apiKeyRaw)) : false,
  };
  
  // 輸出到 Vercel 函數日誌（可在 Vercel Dashboard 中查看）
  console.log('[MCP Client] API Key 診斷:', JSON.stringify(apiKeyInfo, null, 2));
  
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:createMCPClient',message:'createMCPClient config',data:apiKeyInfo,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  if (!apiKey) {
    console.error('❌ [MCP Client] ANTHROPIC_API_KEY 未設定');
    console.error('環境變數檢查:', {
      ANTHROPIC_API_KEY: rawAnthropicKey ? `已設定 (長度: ${rawAnthropicKey.length})` : '未設定',
      MCP_API_KEY: rawMCPKey ? `已設定 (長度: ${rawMCPKey.length})` : '未設定',
      VERCEL: process.env.VERCEL ? '是' : '否',
      NODE_ENV: process.env.NODE_ENV,
    });
    if (process.env.VERCEL) {
      console.error('⚠️  檢測到 Vercel 環境，請在 Vercel Dashboard → Settings → Environment Variables 中設定 ANTHROPIC_API_KEY');
    } else {
      console.error('請在 .env.local 中設定: ANTHROPIC_API_KEY=your-key-here');
    }
  } else if (!apiKey.startsWith('sk-ant-')) {
    console.error('❌ [MCP Client] API Key 格式不正確');
    console.error('API Key 前綴:', apiKey.substring(0, Math.min(10, apiKey.length)));
    console.error('預期前綴: sk-ant-');
  } else {
    console.log('✅ [MCP Client] API Key 已正確設定');
  }

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
    console.log('  Token 使用:', response.metadata?.usage);
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