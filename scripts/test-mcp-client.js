/**
 * MCP Client 測試腳本
 * 測試 MCP Client 是否正常工作
 * 
 * 使用方法:
 *   node scripts/test-mcp-client.js
 * 
 * 前置條件:
 *   1. 環境變數已設定（MCP_SERVER_URL, MCP_API_KEY）
 */

// 讀取 .env.local 檔案（如果存在）
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = value.trim();
          }
        }
      }
    });
  }
}

// 載入環境變數
loadEnvFile();

// 由於這是 TypeScript 模組，我們需要通過 Next.js 的編譯系統執行
// 或者直接使用 fetch 測試 MCP Server

async function testMCPDirectly() {
  console.log('🧪 開始測試 MCP Client...\n');
  
  const serverUrl = process.env.MCP_SERVER_URL || 'https://mcp.k-dense.ai/claude-scientific-skills/mcp';
  const sessionId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  
  console.log('📋 測試配置:');
  console.log('  - Server URL:', serverUrl);
  console.log('  - Session ID:', sessionId);
  console.log('');
  
  try {
    // 測試 1: 基本訊息發送
    console.log('📝 測試 1: 發送基本訊息');
    
    // 嘗試不同的 session ID 位置
    const jsonRpcRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'claude-scientific-skills',
        arguments: {
          sessionId: sessionId, // 嘗試放在 arguments 中
          query: 'Analyze this lab report: Vancomycin(trough) 15.8 ug/mL',
          skills: [],
          context: {
            workloadLevel: 'standard',
            functionType: 'lab',
          },
          conversationHistory: [],
        },
      },
    };
    
    console.log('  - 請求方法:', jsonRpcRequest.method);
    console.log('  - Session ID:', sessionId);
    console.log('  - 請求體:', JSON.stringify(jsonRpcRequest, null, 2).substring(0, 500));
    console.log('  - 發送請求...');
    
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-Session-ID': sessionId, // 同時在 header 中傳遞
      },
      body: JSON.stringify(jsonRpcRequest),
    });
    
    console.log('  - 響應狀態:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('  - 錯誤響應:', errorText.substring(0, 300));
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const responseText = await response.text();
    console.log('  - 響應長度:', responseText.length);
    
    let jsonRpcResponse;
    try {
      jsonRpcResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.log('  - 響應預覽:', responseText.substring(0, 200));
      throw new Error(`JSON 解析錯誤: ${parseError.message}`);
    }
    
    if (jsonRpcResponse.error) {
      console.log('  - JSON-RPC 錯誤:', JSON.stringify(jsonRpcResponse.error));
      throw new Error(`JSON-RPC 錯誤: ${jsonRpcResponse.error.message}`);
    }
    
    const result = jsonRpcResponse.result;
    if (!result) {
      throw new Error('未返回結果');
    }
    
    console.log('✅ 測試 1 成功!');
    console.log('  - 結果鍵:', Object.keys(result));
    console.log('  - 內容預覽:', (result.content || result.output || result.text || '').substring(0, 100));
    console.log('');
    
    // 測試 2: 列出可用 tools
    console.log('📝 測試 2: 列出可用 tools');
    
    const listRequest = {
      jsonrpc: '2.0',
      id: Date.now() + 1,
      method: 'tools/list',
      params: {
        sessionId: sessionId,
      },
    };
    
    const listResponse = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(listRequest),
    });
    
    if (listResponse.ok) {
      const listData = await listResponse.json();
      if (listData.result && listData.result.tools) {
        console.log('✅ 測試 2 成功!');
        console.log('  - 可用 tools:', listData.result.tools.length, '個');
      } else {
        console.log('⚠️  測試 2: 未返回 tools 列表');
      }
    } else {
      console.log('⚠️  測試 2: HTTP', listResponse.status);
    }
    
    console.log('');
    console.log('🎉 所有測試完成!');
    
  } catch (error) {
    console.error('\n❌ 測試失敗:', error.message);
    console.error('詳細錯誤:', error);
    process.exit(1);
  }
}

testMCPDirectly();
