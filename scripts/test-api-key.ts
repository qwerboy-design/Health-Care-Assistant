/**
 * 測試 Anthropic API Key
 * 使用方式: npx tsx scripts/test-api-key.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// 讀取 .env.local 檔案（如果存在）
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

async function testAnthropicAPIKey() {
  console.log('🧪 測試 Anthropic API Key...\n');

  // 讀取環境變數
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('❌ 錯誤: 未設定 ANTHROPIC_API_KEY 環境變數');
    console.log('');
    console.log('請在 .env.local 中設定:');
    console.log('  ANTHROPIC_API_KEY=sk-ant-api03-...');
    console.log('');
    console.log('或設定環境變數:');
    console.log('  $env:ANTHROPIC_API_KEY = "sk-ant-api03-..."');
    process.exit(1);
  }

  // 檢查格式
  if (!apiKey.startsWith('sk-ant-')) {
    console.error('❌ 錯誤: API Key 格式不正確');
    console.error('  預期前綴: sk-ant-');
    console.error(`  當前前綴: ${apiKey.substring(0, Math.min(7, apiKey.length))}`);
    process.exit(1);
  }

  console.log('✅ API Key 格式正確');
  console.log(`  Key 長度: ${apiKey.length}`);
  console.log(`  Key 前綴: ${apiKey.substring(0, Math.min(10, apiKey.length))}...`);
  console.log('');

  // 測試 API 調用
  console.log('📡 測試 API 調用...');

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'User-Agent': 'Health-Care-Assistant/1.0',
  };

  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    system: '你是一個專業的醫療助理。',
    messages: [
      {
        role: 'user' as const,
        content: '請簡單介紹你自己',
      },
    ],
  };

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson: any = null;
      
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        // 無法解析為 JSON
      }

      console.error('❌ API 調用失敗');
      console.error(`  狀態碼: ${response.status}`);
      
      if (errorJson?.error) {
        console.error(`  錯誤類型: ${errorJson.error.type}`);
        console.error(`  錯誤訊息: ${errorJson.error.message}`);
      } else {
        console.error(`  錯誤訊息: ${errorText.substring(0, 200)}`);
      }

      if (response.status === 403) {
        console.log('');
        console.log('⚠️  可能的問題:');
        console.log('  1. API Key 可能是 Claude Code subscription 類型（2026年1月9日後被限制）');
        console.log('  2. 請確認您的 API Key 是標準的 Anthropic API Key');
        console.log('  3. 創建位置: https://console.anthropic.com/settings/keys');
      }

      process.exit(1);
    }

    const data = await response.json();

    console.log('✅ API 調用成功!');
    console.log('');
    console.log('回應內容:');
    const content = data.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');
    console.log(content);
    console.log('');
    console.log(`使用的模型: ${data.model}`);
    console.log(
      `Token 使用: ${data.usage.input_tokens} input + ${data.usage.output_tokens} output = ${
        data.usage.input_tokens + data.usage.output_tokens
      } total`
    );
    console.log('');
    console.log('🎉 API Key 測試通過!');
  } catch (error: any) {
    console.error('❌ 測試失敗:', error.message);
    if (error.stack) {
      console.error('詳細錯誤:', error.stack);
    }
    process.exit(1);
  }
}

testAnthropicAPIKey();
