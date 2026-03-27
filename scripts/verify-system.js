/**
 * 系統自動化驗證腳本
 * 用於驗證 Health Care Assistant 系統功能正確性
 * 
 * 使用方法:
 *   node scripts/verify-system.js
 * 
 * 前置條件:
 *   1. 開發伺服器運行中 (npm run dev)
 *   2. 環境變數已設定 (可選，部分測試會在未設定時跳過)
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

// 測試結果
const results = {
  passed: [],
  failed: [],
  skipped: [],
  warnings: [],
};

/**
 * 輸出帶顏色的訊息
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * 測試結果記錄
 */
function recordResult(testName, passed, message = '', isWarning = false) {
  if (isWarning) {
    results.warnings.push({ test: testName, message });
    log(`⚠️  ${testName}: ${message}`, colors.yellow);
  } else if (passed) {
    results.passed.push({ test: testName, message });
    log(`✅ ${testName}: ${message}`, colors.green);
  } else {
    results.failed.push({ test: testName, message });
    log(`❌ ${testName}: ${message}`, colors.red);
  }
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
    return {
      status: response.status,
      ok: response.ok,
      data,
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
 * 測試 1: 檢查環境變數
 */
function testEnvironmentVariables() {
  log('\n📋 測試 1: 環境變數檢查', colors.cyan);
  
  const requiredVars = [
    'JWT_SECRET',
  ];

  const optionalVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'RESEND_API_KEY',
    'MCP_SERVER_URL',
    'MCP_API_KEY',
  ];

  let allRequired = true;
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      recordResult(`環境變數: ${varName}`, true, '已設定');
    } else {
      recordResult(`環境變數: ${varName}`, false, '未設定（必要）');
      allRequired = false;
    }
  });

  optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      recordResult(`環境變數: ${varName}`, true, '已設定', false);
    } else {
      recordResult(`環境變數: ${varName}`, true, '未設定（可選）', true);
    }
  });

  return allRequired;
}

/**
 * 測試 2: API 端點可用性
 */
async function testAPIAvailability() {
  log('\n📋 測試 2: API 端點可用性', colors.cyan);

  const endpoints = [
    { path: '/api/auth/register', method: 'POST', expectedStatus: [400, 401, 200] },
    { path: '/api/auth/login', method: 'POST', expectedStatus: [400, 401, 200] },
    { path: '/api/auth/send-otp', method: 'POST', expectedStatus: [400, 401, 404, 200] },
    { path: '/api/auth/verify-otp', method: 'POST', expectedStatus: [400, 401, 404, 200] },
    { path: '/api/auth/logout', method: 'POST', expectedStatus: [401, 200] },
    { path: '/api/auth/me', method: 'GET', expectedStatus: [401, 200] },
    { path: '/api/conversations', method: 'GET', expectedStatus: [401, 200] },
    { path: '/api/chat', method: 'POST', expectedStatus: [400, 401, 200] },
  ];

  for (const endpoint of endpoints) {
    const result = await fetchAPI(endpoint.path, {
      method: endpoint.method,
      body: endpoint.method === 'POST' ? JSON.stringify({}) : undefined,
    });

    if (result.status === 0) {
      recordResult(
        `API: ${endpoint.method} ${endpoint.path}`,
        false,
        `連接失敗: ${result.error || '無法連接伺服器'}`
      );
    } else if (endpoint.expectedStatus.includes(result.status)) {
      recordResult(
        `API: ${endpoint.method} ${endpoint.path}`,
        true,
        `狀態碼: ${result.status} (預期範圍內)`
      );
    } else {
      recordResult(
        `API: ${endpoint.method} ${endpoint.path}`,
        false,
        `狀態碼: ${result.status} (預期: ${endpoint.expectedStatus.join(', ')})`
      );
    }

    // 避免請求過快
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * 測試 3: 頁面可訪問性
 */
async function testPageAccessibility() {
  log('\n📋 測試 3: 頁面可訪問性', colors.cyan);

  const pages = [
    { path: '/', name: '首頁' },
    { path: '/login', name: '登入頁' },
    { path: '/register', name: '註冊頁' },
  ];

  for (const page of pages) {
    try {
      const response = await fetch(`${BASE_URL}${page.path}`);
      if (response.ok || response.status === 200) {
        recordResult(`頁面: ${page.name} (${page.path})`, true, `狀態碼: ${response.status}`);
      } else {
        recordResult(`頁面: ${page.name} (${page.path})`, false, `狀態碼: ${response.status}`);
      }
    } catch (error) {
      recordResult(`頁面: ${page.name} (${page.path})`, false, `錯誤: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * 測試 4: 註冊功能（基本驗證）
 */
async function testRegistrationValidation() {
  log('\n📋 測試 4: 註冊功能驗證', colors.cyan);

  // 測試 4.1: 缺少必要欄位
  const emptyBody = await fetchAPI('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  if (emptyBody.status === 400) {
    recordResult('註冊驗證: 缺少必要欄位', true, '正確返回 400 錯誤');
  } else {
    recordResult('註冊驗證: 缺少必要欄位', false, `狀態碼: ${emptyBody.status}`);
  }

  // 測試 4.2: 完整註冊請求（非隨機 email，避免每次煙測都建立新帳號）
  // registerSchema 目前僅要求 email 非空，故 'invalid-email' 可能通過 schema；
  // 若該信箱已在 DB 則回 409（EMAIL_EXISTS）。煙測只要求端點有明確業務回應，非 5xx 未知錯誤。
  const registrationProbe = await fetchAPI('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: 'invalid-email',
      password: 'test123',
      name: 'Test User',
      phone: '0912345678',
      authProvider: 'password',
    }),
  });

  const okRegistrationStatuses = [400, 200, 409, 429];
  if (okRegistrationStatuses.includes(registrationProbe.status)) {
    const hints = {
      409: '信箱已存在（409），端點正常',
      429: '觸發速率限制（429），端點正常',
    };
    const hint = hints[registrationProbe.status] || `狀態碼: ${registrationProbe.status}`;
    recordResult('註冊驗證: 完整欄位請求', true, hint);
  } else {
    recordResult(
      '註冊驗證: 完整欄位請求',
      false,
      `狀態碼: ${registrationProbe.status} (預期: ${okRegistrationStatuses.join(', ')})`
    );
  }
}

/**
 * 測試 5: Session 驗證
 */
async function testSessionValidation() {
  log('\n📋 測試 5: Session 驗證', colors.cyan);

  // 測試 5.1: 未登入時訪問受保護的端點
  const protectedEndpoint = await fetchAPI('/api/auth/me', {
    method: 'GET',
  });

  if (protectedEndpoint.status === 401) {
    recordResult('Session 驗證: 未登入保護', true, '正確返回 401 未授權');
  } else {
    recordResult('Session 驗證: 未登入保護', false, `狀態碼: ${protectedEndpoint.status}`);
  }

  // 測試 5.2: 無效的 Session Token
  const invalidSession = await fetchAPI('/api/auth/me', {
    method: 'GET',
    headers: {
      'Cookie': 'session=invalid-token-12345',
    },
  });

  if (invalidSession.status === 401) {
    recordResult('Session 驗證: 無效 Token', true, '正確返回 401 未授權');
  } else {
    recordResult('Session 驗證: 無效 Token', false, `狀態碼: ${invalidSession.status}`);
  }
}

/**
 * 測試 6: MCP Server 配置
 */
function testMCPConfiguration() {
  log('\n📋 測試 6: MCP Server 配置', colors.cyan);

  const mcpUrl = process.env.MCP_SERVER_URL || 'https://mcp.k-dense.ai/claude-scientific-skills/mcp';
  const mcpApiKey = process.env.MCP_API_KEY;

  // 檢查 URL 格式
  if (mcpUrl.startsWith('https://') || mcpUrl.startsWith('http://')) {
    recordResult('MCP Server: URL 格式', true, `URL: ${mcpUrl}`);
  } else {
    recordResult('MCP Server: URL 格式', false, 'URL 缺少協議前綴 (https://)');
  }

  // API Key 是可選的
  if (mcpApiKey) {
    recordResult('MCP Server: API Key', true, '已設定（可選）');
  } else {
    recordResult('MCP Server: API Key', true, '未設定（使用預設，無需 API Key）', true);
  }
}

/**
 * 測試 7: 必要檔案檢查
 */
function testRequiredFiles() {
  log('\n📋 測試 7: 必要檔案檢查', colors.cyan);

  const fs = require('fs');
  const path = require('path');

  const requiredFiles = [
    'package.json',
    'next.config.js',
    'tsconfig.json',
    'tailwind.config.ts',
    'app/layout.tsx',
    'lib/mcp/client.ts',
    'lib/auth/session.ts',
    'lib/supabase/client.ts',
  ];

  requiredFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      recordResult(`檔案: ${file}`, true, '存在');
    } else {
      recordResult(`檔案: ${file}`, false, '不存在');
    }
  });
}

/**
 * 生成測試報告
 */
function generateReport() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('📊 測試報告', colors.cyan);
  log('='.repeat(60), colors.cyan);

  const total = results.passed.length + results.failed.length + results.skipped.length;
  const passRate = total > 0 ? ((results.passed.length / total) * 100).toFixed(1) : 0;

  log(`\n總測試數: ${total}`, colors.blue);
  log(`✅ 通過: ${results.passed.length}`, colors.green);
  log(`❌ 失敗: ${results.failed.length}`, colors.red);
  log(`⏭️  跳過: ${results.skipped.length}`, colors.yellow);
  log(`⚠️  警告: ${results.warnings.length}`, colors.yellow);
  log(`\n通過率: ${passRate}%`, passRate >= 80 ? colors.green : colors.red);

  if (results.failed.length > 0) {
    log('\n❌ 失敗的測試:', colors.red);
    results.failed.forEach(({ test, message }) => {
      log(`  - ${test}: ${message}`, colors.red);
    });
  }

  if (results.warnings.length > 0) {
    log('\n⚠️  警告:', colors.yellow);
    results.warnings.forEach(({ test, message }) => {
      log(`  - ${test}: ${message}`, colors.yellow);
    });
  }

  log('\n' + '='.repeat(60), colors.cyan);

  // 返回退出碼
  process.exit(results.failed.length > 0 ? 1 : 0);
}

/**
 * 主函數
 */
async function main() {
  log('🚀 開始自動化驗證', colors.blue);
  log(`測試基礎 URL: ${BASE_URL}`, colors.blue);
  log(`當前目錄: ${process.cwd()}`, colors.blue);

  try {
    // 執行所有測試
    testEnvironmentVariables();
    testRequiredFiles();
    testMCPConfiguration();
    
    // 需要伺服器運行的測試
    try {
      await testAPIAvailability();
      await testPageAccessibility();
      await testRegistrationValidation();
      await testSessionValidation();
    } catch (error) {
      log(`\n⚠️  伺服器連接測試失敗: ${error.message}`, colors.yellow);
      log('請確認開發伺服器正在運行 (npm run dev)', colors.yellow);
    }

    // 生成報告
    generateReport();
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

module.exports = { main, testEnvironmentVariables, testAPIAvailability };
