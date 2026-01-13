// MCP Client SDK 整合 - 最終正確版本
// 根據實際測試結果:Session ID 應該在 HTTP Header,而非 params

import { MCPClientConfig, MCPRequest, MCPResponse } from './types';
import { getSkillsCountForWorkload } from './workload';
import { getSuggestedSkills } from './function-mapping';

/**
 * MCP Client 類別
 * 
 * 最終確認:
 * 1. Session ID 透過 X-MCP-Session-ID header 傳遞
 * 2. Accept 必須同時包含兩種類型
 * 3. Method 是 tools/call
 */
export class MCPClient {
  private config: MCPClientConfig;
  private sessionId: string | null = null;

  constructor(config: MCPClientConfig) {
    this.config = config;
  }
  
  /**
   * 生成或獲取 Session ID
   */
  private getOrCreateSessionId(): string {
    if (!this.sessionId) {
      // 生成 UUID v4 格式的 session ID
      this.sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${Math.random().toString(36).substring(2, 11)}`;
    }
    return this.sessionId;
  }

  /**
   * 重置 session (用於新對話)
   */
  public resetSession(): void {
    this.sessionId = null;
  }

  /**
   * 發送訊息到 MCP server
   */
  async sendMessage(request: MCPRequest): Promise<MCPResponse> {
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:sendMessage:entry',message:'MCP sendMessage entry',data:{hasServerUrl:!!this.config.serverUrl,serverUrl:this.config.serverUrl},timestamp:Date.now()})}).catch(()=>{});

    try {
      // 獲取建議的 Skills
      const suggestedSkills = getSuggestedSkills(request.selectedFunction);
      
      // 獲取 Skills 數量限制
      const maxSkills = getSkillsCountForWorkload(request.workloadLevel);
      
      // 生成或獲取 session ID
      const sessionId = this.getOrCreateSessionId();
      
      // ✅ 正確的 JSON-RPC 2.0 請求格式
      const jsonRpcRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'claude-scientific-skills',
          arguments: {
            query: request.message,
            skills: suggestedSkills.slice(0, maxSkills),
            context: {
              workloadLevel: request.workloadLevel,
              functionType: request.selectedFunction,
              fileUrl: request.fileUrl,
            },
            conversationHistory: request.conversationHistory || [],
          },
        },
      };

      // ✅ 關鍵修正: Session ID 透過 header 傳遞
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        // ✅ 嘗試多種可能的 header 名稱
        'X-MCP-Session-ID': sessionId,
        'X-Session-ID': sessionId,
        'Session-ID': sessionId,
      };

      // 如果有 API Key,加入 Authorization header
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:sendMessage:before_fetch',message:'Before fetch request',data:{method:jsonRpcRequest.method,hasParams:!!jsonRpcRequest.params,sessionId:sessionId,skillsCount:suggestedSkills.slice(0, maxSkills).length,requestBody:JSON.stringify(jsonRpcRequest).substring(0,200)},timestamp:Date.now()})}).catch(()=>{});

      // 發送請求到 MCP server
      const response = await fetch(this.config.serverUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(jsonRpcRequest),
      });

      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:sendMessage:after_fetch',message:'After fetch request',data:{status:response.status,ok:response.ok,contentType:response.headers.get('content-type')},timestamp:Date.now()})}).catch(()=>{});

      if (!response.ok) {
        const errorText = await response.text().catch(() => '無法讀取錯誤訊息');
        
        fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:sendMessage:error',message:'MCP Server HTTP error',data:{status:response.status,errorText:errorText.substring(0,500)},timestamp:Date.now()})}).catch(()=>{});
        
        throw new Error(`MCP Server 錯誤: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const responseText = await response.text();
      
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:sendMessage:response_received',message:'Response text received',data:{textLength:responseText.length,textPreview:responseText.substring(0,100)},timestamp:Date.now()})}).catch(()=>{});

      let jsonRpcResponse: any;
      try {
        jsonRpcResponse = JSON.parse(responseText);
      } catch (parseError: any) {
        fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:sendMessage:parse_error',message:'JSON parse error',data:{parseError:parseError?.message,responsePreview:responseText.substring(0,200)},timestamp:Date.now()})}).catch(()=>{});
        
        throw new Error(`MCP Server 響應格式錯誤: ${parseError?.message}`);
      }
      
      // 處理 JSON-RPC 2.0 錯誤響應
      if (jsonRpcResponse.error) {
        const errorMsg = jsonRpcResponse.error.message || JSON.stringify(jsonRpcResponse.error);
        throw new Error(`MCP Server 錯誤: ${errorMsg}`);
      }
      
      // 處理成功響應
      const result = jsonRpcResponse.result;
      if (!result) {
        throw new Error('MCP Server 未返回結果');
      }

      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:sendMessage:success',message:'Response parsed successfully',data:{hasResult:!!result,resultKeys:Object.keys(result)},timestamp:Date.now()})}).catch(()=>{});

      return {
        content: result.content || result.output || result.text || '',
        skillsUsed: result.skillsUsed || result.tools || [],
        metadata: {
          ...result.metadata,
          sessionId: sessionId,
        },
      };
      
    } catch (error: any) {
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:sendMessage:catch',message:'MCP Client error caught',data:{errorName:error?.name,errorMessage:error?.message,errorStack:error?.stack?.substring(0,300)},timestamp:Date.now()})}).catch(()=>{});
      
      console.error('MCP Client 錯誤:', error);
      throw new Error(`無法連接到 AI 服務: ${error.message}`);
    }
  }

  /**
   * 串流式發送訊息 (Server-Sent Events)
   */
  async *sendMessageStream(request: MCPRequest): AsyncGenerator<string, void, unknown> {
    const sessionId = this.getOrCreateSessionId();
    
    const suggestedSkills = getSuggestedSkills(request.selectedFunction);
    const maxSkills = getSkillsCountForWorkload(request.workloadLevel);
    
    const jsonRpcRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'claude-scientific-skills',
        arguments: {
          query: request.message,
          stream: true,
          skills: suggestedSkills.slice(0, maxSkills),
          context: {
            workloadLevel: request.workloadLevel,
            functionType: request.selectedFunction,
            fileUrl: request.fileUrl,
          },
          conversationHistory: request.conversationHistory || [],
        },
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'X-MCP-Session-ID': sessionId,
      'X-Session-ID': sessionId,
      'Session-ID': sessionId,
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(this.config.serverUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(jsonRpcRequest),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`MCP Server 錯誤: ${response.status} ${errorText}`);
    }

    // 解析 SSE stream
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
            if (data === '[DONE]') return;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                yield parsed.content;
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
  }

  /**
   * 列出可用的 tools (MCP 標準方法)
   */
  async listTools(): Promise<any[]> {
    const sessionId = this.getOrCreateSessionId();
    
    const jsonRpcRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/list',
      params: {},
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-MCP-Session-ID': sessionId,
      'X-Session-ID': sessionId,
      'Session-ID': sessionId,
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(this.config.serverUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(jsonRpcRequest),
    });

    if (!response.ok) {
      throw new Error(`MCP Server 錯誤: ${response.status}`);
    }

    const data = await response.json();
    return data.result?.tools || [];
  }
}

/**
 * 建立 MCP Client 實例
 */
export function createMCPClient(): MCPClient {
  const serverUrl = process.env.MCP_SERVER_URL || 
    'https://mcp.k-dense.ai/claude-scientific-skills/mcp';
  
  const apiKey = process.env.MCP_API_KEY;
  
  fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/mcp/client.ts:createMCPClient',message:'createMCPClient config',data:{serverUrl,hasApiKey:!!apiKey},timestamp:Date.now()})}).catch(()=>{});

  const config: MCPClientConfig = {
    serverUrl,
    apiKey,
  };

  return new MCPClient(config);
}

/**
 * Debug: 直接測試 MCP Server
 */
export async function debugMCPServer() {
  console.log('🔍 開始 Debug MCP Server...\n');
  
  const serverUrl = 'https://mcp.k-dense.ai/claude-scientific-skills/mcp';
  const sessionId = `debug-${Date.now()}`;
  
  // 測試 1: 最簡單的請求
  console.log('📝 測試 1: 最簡單的 JSON-RPC 請求');
  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-MCP-Session-ID': sessionId,
        'X-Session-ID': sessionId,
        'Session-ID': sessionId,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      }),
    });
    
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    const text = await response.text();
    console.log('Response:', text.substring(0, 500));
    console.log('');
    
  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
  }
  
  // 測試 2: Tools/call 請求
  console.log('📝 測試 2: Tools/call 請求');
  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-MCP-Session-ID': sessionId,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'claude-scientific-skills',
          arguments: {
            query: 'Hello',
            skills: [],
          }
        }
      }),
    });
    
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text.substring(0, 500));
    
  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
  }
}