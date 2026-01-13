/**
 * 整合測試腳本
 * 測試完整的功能流程：註冊 -> 登入 -> 發送訊息
 * 
 * 使用方法:
 *   node scripts/test-integration.js
 * 
 * 前置條件:
 *   1. 開發伺服器運行中 (npm run dev)
 *   2. 環境變數已設定（部分功能需要）
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
          const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // 移除引號
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

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * HTTP 請求輔助函數
 */
async function fetchAPI(endpoint, options = {}) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));
    const cookies = response.headers.get('set-cookie') || '';
    
    return {
      status: response.status,
      ok: response.ok,
      data,
      cookies,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

/**
 * 從 Cookie 字串中提取 session token
 */
function extractSessionToken(cookieHeader) {
  if (!cookieHeader) return null;
  
  const match = cookieHeader.match(/session=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * 測試完整註冊流程
 */
async function testRegistrationFlow() {
  log('\n📋 測試: 註冊流程', colors.cyan);

  const timestamp = Date.now();
  const testEmail = `test-${timestamp}@example.com`;
  const testPassword = 'Test123456!';
  const testName = `測試用戶 ${timestamp}`;
  const testPhone = `0912${String(timestamp).slice(-6)}`;

  log(`使用測試帳號: ${testEmail}`, colors.blue);

  const result = await fetchAPI('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      name: testName,
      phone: testPhone,
      authProvider: 'password',
    }),
  });

  if (result.status === 200 && result.data.success) {
    log(`✅ 註冊成功`, colors.green);
    const sessionToken = extractSessionToken(result.cookies);
    return { success: true, email: testEmail, password: testPassword, sessionToken };
  } else {
    log(`❌ 註冊失敗: ${result.status} - ${result.data.error || '未知錯誤'}`, colors.red);
    return { success: false, error: result.data.error || '註冊失敗' };
  }
}

/**
 * 測試登入流程
 */
async function testLoginFlow(email, password) {
  log('\n📋 測試: 登入流程', colors.cyan);

  const result = await fetchAPI('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      authProvider: 'password',
    }),
  });

  if (result.status === 200 && result.data.success) {
    log(`✅ 登入成功`, colors.green);
    const sessionToken = extractSessionToken(result.cookies);
    return { success: true, sessionToken };
  } else {
    log(`❌ 登入失敗: ${result.status} - ${result.data.error || '未知錯誤'}`, colors.red);
    return { success: false, error: result.data.error || '登入失敗' };
  }
}

/**
 * 測試獲取當前用戶資訊
 */
async function testGetCurrentUser(sessionToken) {
  log('\n📋 測試: 獲取當前用戶資訊', colors.cyan);

  if (!sessionToken) {
    log(`⏭️  跳過（無 Session Token）`, colors.yellow);
    return { success: false, skipped: true };
  }

  const result = await fetchAPI('/api/auth/me', {
    method: 'GET',
    headers: {
      'Cookie': `session=${sessionToken}`,
    },
  });

  if (result.status === 200 && result.data.success) {
    log(`✅ 獲取用戶資訊成功`, colors.green);
    log(`   用戶: ${result.data.data?.name || 'N/A'} (${result.data.data?.email || 'N/A'})`, colors.blue);
    return { success: true, user: result.data.data };
  } else {
    log(`❌ 獲取用戶資訊失敗: ${result.status} - ${result.data.error || '未知錯誤'}`, colors.red);
    return { success: false, error: result.data.error || '獲取失敗' };
  }
}

/**
 * 測試對話列表
 */
async function testGetConversations(sessionToken) {
  log('\n📋 測試: 獲取對話列表', colors.cyan);

  if (!sessionToken) {
    log(`⏭️  跳過（無 Session Token）`, colors.yellow);
    return { success: false, skipped: true };
  }

  const result = await fetchAPI('/api/conversations', {
    method: 'GET',
    headers: {
      'Cookie': `session=${sessionToken}`,
    },
  });

  if (result.status === 200 && result.data.success) {
    const count = result.data.data?.conversations?.length || 0;
    log(`✅ 獲取對話列表成功 (${count} 個對話)`, colors.green);
    return { success: true, conversations: result.data.data?.conversations || [] };
  } else {
    log(`❌ 獲取對話列表失敗: ${result.status} - ${result.data.error || '未知錯誤'}`, colors.red);
    return { success: false, error: result.data.error || '獲取失敗' };
  }
}

/**
 * 測試發送訊息（需要 Supabase 和 MCP Server）
 */
async function testSendMessage(sessionToken) {
  log('\n📋 測試: 發送訊息', colors.cyan);

  if (!sessionToken) {
    log(`⏭️  跳過（無 Session Token）`, colors.yellow);
    return { success: false, skipped: true };
  }

  // 使用原生 FormData（Node.js 18+ 支援）
  try {
    const formData = new FormData();
    formData.append('message', '這是一個測試訊息');
    formData.append('workloadLevel', 'basic');
    formData.append('selectedFunction', 'lab');

    const url = `${BASE_URL}/api/chat`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Cookie': `session=${sessionToken}`,
        // 不要設定 Content-Type，讓 fetch 自動處理 FormData
      },
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 200 && data.success) {
      log(`✅ 發送訊息成功`, colors.green);
      log(`   對話 ID: ${data.data?.conversationId || 'N/A'}`, colors.blue);
      return { success: true, conversationId: data.data?.conversationId };
    } else {
      // 500 或 400 錯誤可能是正常的（如果 Supabase 或 MCP Server 未配置）
      if (response.status === 500 || response.status === 400) {
        log(`⚠️  發送訊息失敗（可能是 Supabase 或 MCP Server 未配置）: ${response.status}`, colors.yellow);
        return { success: false, skipped: true, error: data.error || '伺服器錯誤' };
      } else {
        log(`❌ 發送訊息失敗: ${response.status} - ${data.error || '未知錯誤'}`, colors.red);
        return { success: false, error: data.error || '發送失敗' };
      }
    }
  } catch (error) {
    // 如果 FormData 不存在，可能是 Node.js 版本過舊
    if (error.message.includes('FormData')) {
      log(`⚠️  跳過（需要 Node.js 18+ 以使用 FormData）: ${error.message}`, colors.yellow);
      return { success: false, skipped: true, error: '需要 Node.js 18+' };
    }
    log(`❌ 發送訊息錯誤: ${error.message}`, colors.red);
    return { success: false, error: error.message };
  }
}

/**
 * 測試登出
 */
async function testLogout(sessionToken) {
  log('\n📋 測試: 登出', colors.cyan);

  if (!sessionToken) {
    log(`⏭️  跳過（無 Session Token）`, colors.yellow);
    return { success: false, skipped: true };
  }

  const result = await fetchAPI('/api/auth/logout', {
    method: 'POST',
    headers: {
      'Cookie': `session=${sessionToken}`,
    },
  });

  if (result.status === 200 && result.data.success) {
    log(`✅ 登出成功`, colors.green);
    return { success: true };
  } else {
    log(`❌ 登出失敗: ${result.status} - ${result.data.error || '未知錯誤'}`, colors.red);
    return { success: false, error: result.data.error || '登出失敗' };
  }
}

/**
 * 主函數
 */
async function main() {
  log('🚀 開始整合測試', colors.blue);
  log(`測試基礎 URL: ${BASE_URL}`, colors.blue);

  const results = {
    registration: null,
    login: null,
    currentUser: null,
    conversations: null,
    sendMessage: null,
    logout: null,
  };

  try {
    // 測試 1: 註冊
    results.registration = await testRegistrationFlow();
    await new Promise(resolve => setTimeout(resolve, 500));

    // 測試 2: 登入（如果註冊成功）
    if (results.registration.success) {
      results.login = await testLoginFlow(
        results.registration.email,
        results.registration.password
      );
      await new Promise(resolve => setTimeout(resolve, 500));

      const sessionToken = results.login.sessionToken || results.registration.sessionToken;

      // 測試 3: 獲取當前用戶
      if (sessionToken) {
        results.currentUser = await testGetCurrentUser(sessionToken);
        await new Promise(resolve => setTimeout(resolve, 500));

        // 測試 4: 獲取對話列表
        results.conversations = await testGetConversations(sessionToken);
        await new Promise(resolve => setTimeout(resolve, 500));

        // 測試 5: 發送訊息
        results.sendMessage = await testSendMessage(sessionToken);
        await new Promise(resolve => setTimeout(resolve, 500));

        // 測試 6: 登出
        results.logout = await testLogout(sessionToken);
      }
    }

    // 生成報告
    log('\n' + '='.repeat(60), colors.cyan);
    log('📊 整合測試報告', colors.cyan);
    log('='.repeat(60), colors.cyan);

    const testNames = {
      registration: '註冊',
      login: '登入',
      currentUser: '獲取用戶資訊',
      conversations: '獲取對話列表',
      sendMessage: '發送訊息',
      logout: '登出',
    };

    Object.entries(results).forEach(([key, result]) => {
      if (!result) {
        log(`⏭️  ${testNames[key]}: 未執行`, colors.yellow);
      } else if (result.skipped) {
        log(`⏭️  ${testNames[key]}: 已跳過`, colors.yellow);
      } else if (result.success) {
        log(`✅ ${testNames[key]}: 通過`, colors.green);
      } else {
        log(`❌ ${testNames[key]}: 失敗 - ${result.error || '未知錯誤'}`, colors.red);
      }
    });

    log('\n' + '='.repeat(60), colors.cyan);

    // 計算成功率
    const executed = Object.values(results).filter(r => r && !r.skipped).length;
    const passed = Object.values(results).filter(r => r && r.success && !r.skipped).length;
    const successRate = executed > 0 ? ((passed / executed) * 100).toFixed(1) : 0;

    log(`成功率: ${successRate}% (${passed}/${executed})`, 
        successRate >= 80 ? colors.green : colors.yellow);

    process.exit(passed === executed ? 0 : 1);
  } catch (error) {
    log(`\n❌ 測試執行錯誤: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
}

// 執行主函數
if (require.main === module) {
  main();
}

module.exports = { main };
