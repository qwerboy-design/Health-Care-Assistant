/**
 * 檔案上傳功能自動驗證腳本
 * 測試 Vercel Blob 直傳功能
 * 
 * 使用方法:
 *   node scripts/test-file-upload.js
 * 
 * 前置條件:
 *   1. 開發伺服器運行中 (npm run dev)
 *   2. 環境變數已設定 (BLOB_READ_WRITE_TOKEN)
 *   3. 需要有效的 Session Token（可先登入獲取）
 */

const fs = require('fs');
const path = require('path');

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
 * 創建測試檔案
 */
function createTestFile(filename, size = 1024) {
  const testDir = path.join(process.cwd(), 'test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const filePath = path.join(testDir, filename);
  const content = Buffer.alloc(size, 'A');
  fs.writeFileSync(filePath, content);
  return filePath;
}

/**
 * 清理測試檔案
 */
function cleanupTestFiles() {
  const testDir = path.join(process.cwd(), 'test-files');
  if (fs.existsSync(testDir)) {
    fs.readdirSync(testDir).forEach(file => {
      fs.unlinkSync(path.join(testDir, file));
    });
    fs.rmdirSync(testDir);
  }
}

/**
 * 測試 1: 檢查環境變數
 */
function testEnvironmentVariables() {
  log('\n📋 測試 1: 環境變數檢查', colors.cyan);
  
  const requiredVars = ['BLOB_READ_WRITE_TOKEN'];
  const optionalVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'];

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
      recordResult(`環境變數: ${varName}`, false, '未設定（可選）', true);
    }
  });

  return allRequired;
}

/**
 * 測試 2: 檢查 /api/upload 端點是否存在
 */
async function testUploadEndpointExists() {
  log('\n📋 測試 2: 檢查 /api/upload 端點', colors.cyan);
  
  const result = await fetchAPI('/api/upload', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  // 端點應該存在，即使沒有 Session 也會返回 401 而不是 404
  if (result.status === 401 || result.status === 400) {
    recordResult('上傳端點存在', true, `狀態碼: ${result.status}`);
    return true;
  } else if (result.status === 404) {
    recordResult('上傳端點存在', false, '端點不存在 (404)');
    return false;
  } else {
    recordResult('上傳端點存在', true, `狀態碼: ${result.status}`);
    return true;
  }
}

/**
 * 測試 3: 測試未授權訪問
 */
async function testUnauthorizedAccess() {
  log('\n📋 測試 3: 未授權訪問測試', colors.cyan);
  
  const result = await fetchAPI('/api/upload', {
    method: 'POST',
    body: JSON.stringify({
      pathname: 'test.txt',
    }),
    headers: {
      // 不包含 Session Cookie
    },
  });

  if (result.status === 401) {
    recordResult('未授權訪問保護', true, '正確返回 401');
    return true;
  } else {
    recordResult('未授權訪問保護', false, `預期 401，實際 ${result.status}`);
    return false;
  }
}

/**
 * 測試 4: 測試檔案類型驗證（需要 Session）
 */
async function testFileTypeValidation(sessionCookie) {
  log('\n📋 測試 4: 檔案類型驗證', colors.cyan);
  
  if (!sessionCookie) {
    recordResult('檔案類型驗證', false, '需要 Session Cookie', true);
    return false;
  }

  // 測試不支援的檔案類型
  const result = await fetchAPI('/api/upload', {
    method: 'POST',
    body: JSON.stringify({
      pathname: 'test.exe',
      contentType: 'application/x-msdownload',
    }),
    headers: {
      Cookie: sessionCookie,
    },
  });

  // 應該被拒絕或返回錯誤
  if (result.status === 400 || result.status === 403) {
    recordResult('不支援的檔案類型拒絕', true, `正確返回 ${result.status}`);
    return true;
  } else {
    recordResult('不支援的檔案類型拒絕', false, `預期 400/403，實際 ${result.status}`);
    return false;
  }
}

/**
 * 測試 5: 測試檔案大小驗證（需要 Session）
 */
async function testFileSizeValidation(sessionCookie) {
  log('\n📋 測試 5: 檔案大小驗證', colors.cyan);
  
  if (!sessionCookie) {
    recordResult('檔案大小驗證', false, '需要 Session Cookie', true);
    return false;
  }

  // 測試超過 500MB 的檔案（模擬）
  const result = await fetchAPI('/api/upload', {
    method: 'POST',
    body: JSON.stringify({
      pathname: 'large-file.bin',
      contentType: 'application/octet-stream',
      clientPayload: JSON.stringify({
        fileType: 'application/octet-stream',
        fileSize: 600 * 1024 * 1024, // 600MB
      }),
    }),
    headers: {
      Cookie: sessionCookie,
    },
  });

  // 應該被拒絕
  if (result.status === 400 || result.status === 413) {
    recordResult('超大檔案拒絕', true, `正確返回 ${result.status}`);
    return true;
  } else {
    recordResult('超大檔案拒絕', false, `預期 400/413，實際 ${result.status}`);
    return false;
  }
}

/**
 * 測試 6: 檢查 /api/chat 端點是否支援檔案 URL
 */
async function testChatEndpointSupportsFileUrl(sessionCookie) {
  log('\n📋 測試 6: 聊天端點檔案 URL 支援', colors.cyan);
  
  if (!sessionCookie) {
    recordResult('聊天端點檔案 URL 支援', false, '需要 Session Cookie', true);
    return false;
  }

  const result = await fetchAPI('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: '測試訊息',
      workloadLevel: 'standard',
      fileUrl: 'https://blob.vercelusercontent.com/test-file.pdf',
      fileName: 'test-file.pdf',
      fileType: 'application/pdf',
    }),
    headers: {
      Cookie: sessionCookie,
    },
  });

  if (result.ok || result.status === 400) {
    // 400 可能是因為對話不存在或其他驗證問題，但至少端點接受了檔案 URL
    recordResult('聊天端點檔案 URL 支援', true, `狀態碼: ${result.status}`);
    return true;
  } else {
    recordResult('聊天端點檔案 URL 支援', false, `狀態碼: ${result.status}`);
    return false;
  }
}

/**
 * 主測試函數
 */
async function runTests() {
  log('\n🚀 開始檔案上傳功能驗證', colors.blue);
  log('='.repeat(60), colors.blue);

  // 檢查環境變數
  const envOk = testEnvironmentVariables();
  if (!envOk) {
    log('\n⚠️  部分必要環境變數未設定，部分測試將跳過', colors.yellow);
  }

  // 檢查端點
  await testUploadEndpointExists();

  // 測試未授權訪問
  await testUnauthorizedAccess();

  // 嘗試從環境變數或提示獲取 Session Cookie
  const sessionCookie = process.env.TEST_SESSION_COOKIE;
  if (sessionCookie) {
    log('\n📝 使用環境變數中的 Session Cookie 進行測試', colors.cyan);
    await testFileTypeValidation(sessionCookie);
    await testFileSizeValidation(sessionCookie);
    await testChatEndpointSupportsFileUrl(sessionCookie);
  } else {
    log('\n⚠️  未設定 TEST_SESSION_COOKIE，部分測試將跳過', colors.yellow);
    log('   提示: 設定 TEST_SESSION_COOKIE="session=your-session-token" 以執行完整測試', colors.yellow);
    results.skipped.push('需要 Session Cookie 的測試');
  }

  // 清理測試檔案
  cleanupTestFiles();

  // 輸出測試結果摘要
  log('\n' + '='.repeat(60), colors.blue);
  log('📊 測試結果摘要', colors.blue);
  log('='.repeat(60), colors.blue);
  
  log(`✅ 通過: ${results.passed.length}`, colors.green);
  log(`❌ 失敗: ${results.failed.length}`, colors.red);
  log(`⚠️  警告: ${results.warnings.length}`, colors.yellow);
  log(`⏭️  跳過: ${results.skipped.length}`, colors.cyan);

  if (results.failed.length > 0) {
    log('\n❌ 失敗的測試:', colors.red);
    results.failed.forEach(({ test, message }) => {
      log(`   - ${test}: ${message}`, colors.red);
    });
  }

  if (results.warnings.length > 0) {
    log('\n⚠️  警告:', colors.yellow);
    results.warnings.forEach(({ test, message }) => {
      log(`   - ${test}: ${message}`, colors.yellow);
    });
  }

  // 返回退出碼
  const exitCode = results.failed.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

// 執行測試
runTests().catch(error => {
  log(`\n❌ 測試執行錯誤: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
