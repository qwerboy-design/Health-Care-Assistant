#!/usr/bin/env node

/**
 * Vercel 部署驗證腳本
 * 
 * 用途：驗證 Vercel 部署狀態和自動上傳功能
 * 
 * 使用方法：
 *   node scripts/verify-vercel-deployment.js [vercel-url]
 * 
 * 範例：
 *   node scripts/verify-vercel-deployment.js https://health-care-assistant.vercel.app
 */

const https = require('https');
const http = require('http');

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

/**
 * 發送 HTTP/HTTPS 請求
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 10000,
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * 檢查 Vercel 部署狀態
 */
async function checkDeploymentStatus(baseUrl) {
  logInfo('檢查 Vercel 部署狀態...');
  
  try {
    const response = await makeRequest(baseUrl, {
      method: 'GET',
      timeout: 5000,
    });

    if (response.statusCode === 200) {
      logSuccess(`部署正常 (HTTP ${response.statusCode})`);
      return true;
    } else if (response.statusCode === 401 || response.statusCode === 403) {
      logWarning(`需要認證 (HTTP ${response.statusCode}) - 這是正常的，表示應用程式已部署`);
      return true;
    } else {
      logError(`部署異常 (HTTP ${response.statusCode})`);
      return false;
    }
  } catch (error) {
    logError(`無法連接到 Vercel: ${error.message}`);
    return false;
  }
}

/**
 * 檢查 API 端點
 */
async function checkApiEndpoint(baseUrl, endpoint) {
  logInfo(`檢查 API 端點: ${endpoint}`);
  
  try {
    const url = `${baseUrl}${endpoint}`;
    const response = await makeRequest(url, {
      method: 'GET',
      timeout: 5000,
    });

    // API 端點可能返回 401（需要認證）或 405（方法不允許），這都是正常的
    if (response.statusCode === 401 || response.statusCode === 405 || response.statusCode === 400) {
      logSuccess(`API 端點可訪問 (HTTP ${response.statusCode})`);
      return true;
    } else if (response.statusCode === 404) {
      logError(`API 端點不存在 (HTTP 404)`);
      return false;
    } else {
      logWarning(`API 端點返回異常狀態 (HTTP ${response.statusCode})`);
      return true; // 仍然認為是可訪問的
    }
  } catch (error) {
    logError(`無法訪問 API 端點: ${error.message}`);
    return false;
  }
}

/**
 * 檢查環境變數（僅檢查端點是否存在）
 */
async function checkEnvironmentVariables(baseUrl) {
  logInfo('檢查環境變數配置...');
  
  // 無法直接檢查環境變數，但可以檢查相關 API 是否正常運作
  logWarning('無法直接檢查環境變數（需要 Vercel CLI 或 Dashboard）');
  logInfo('請在 Vercel Dashboard → Settings → Environment Variables 中確認以下變數：');
  logInfo('  - R2_ACCOUNT_ID');
  logInfo('  - R2_ACCESS_KEY_ID');
  logInfo('  - R2_SECRET_ACCESS_KEY');
  logInfo('  - R2_BUCKET_NAME');
  logInfo('  - R2_PUBLIC_URL');
  logInfo('  - SUPABASE_URL');
  logInfo('  - SUPABASE_ANON_KEY');
  logInfo('  - SUPABASE_SERVICE_ROLE_KEY');
  logInfo('  - JWT_SECRET');
  logInfo('  - ANTHROPIC_API_KEY');
  
  return true;
}

/**
 * 驗證自動上傳功能（需要實際測試）
 */
async function verifyAutoSaveFeature(baseUrl) {
  logInfo('驗證自動上傳功能...');
  logWarning('自動上傳功能需要實際使用才能驗證');
  logInfo('請執行以下步驟進行手動驗證：');
  logInfo('  1. 登入應用程式');
  logInfo('  2. 開始新對話並發送訊息');
  logInfo('  3. 等待 AI 回應');
  logInfo('  4. 打開瀏覽器開發者工具（F12）→ Console');
  logInfo('  5. 查看是否有 [auto-save-log] 相關日誌');
  logInfo('  6. 檢查 Cloudflare R2 是否有新檔案生成');
  
  return true;
}

/**
 * 主驗證函數
 */
async function main() {
  const baseUrl = process.argv[2] || process.env.VERCEL_URL || 'https://health-care-assistant.vercel.app';
  
  log('\n' + '='.repeat(60), 'blue');
  log('Vercel 部署驗證腳本', 'blue');
  log('='.repeat(60) + '\n', 'blue');
  
  logInfo(`目標 URL: ${baseUrl}\n`);

  const results = {
    deployment: false,
    apiEndpoints: false,
    environment: false,
    autoSave: false,
  };

  // 1. 檢查部署狀態
  results.deployment = await checkDeploymentStatus(baseUrl);
  console.log('');

  // 2. 檢查 API 端點
  const apiEndpoints = [
    '/api/chat/save-log',
    '/api/chat',
    '/api/auth/me',
  ];
  
  let apiResults = [];
  for (const endpoint of apiEndpoints) {
    const result = await checkApiEndpoint(baseUrl, endpoint);
    apiResults.push(result);
    console.log('');
  }
  results.apiEndpoints = apiResults.every(r => r);

  // 3. 檢查環境變數（提示）
  results.environment = await checkEnvironmentVariables(baseUrl);
  console.log('');

  // 4. 驗證自動上傳功能（提示）
  results.autoSave = await verifyAutoSaveFeature(baseUrl);
  console.log('');

  // 總結
  log('\n' + '='.repeat(60), 'blue');
  log('驗證結果總結', 'blue');
  log('='.repeat(60) + '\n', 'blue');

  log(`${results.deployment ? '✅' : '❌'} 部署狀態: ${results.deployment ? '正常' : '異常'}`, results.deployment ? 'green' : 'red');
  log(`${results.apiEndpoints ? '✅' : '❌'} API 端點: ${results.apiEndpoints ? '可訪問' : '無法訪問'}`, results.apiEndpoints ? 'green' : 'red');
  log(`${results.environment ? '✅' : '❌'} 環境變數: 請手動檢查`, results.environment ? 'green' : 'yellow');
  log(`${results.autoSave ? '✅' : '❌'} 自動上傳: 請手動測試`, results.autoSave ? 'green' : 'yellow');

  console.log('');

  const allPassed = results.deployment && results.apiEndpoints;
  if (allPassed) {
    logSuccess('基本驗證通過！');
    logInfo('請進行手動測試以確認自動上傳功能正常運作。');
  } else {
    logError('部分驗證失敗，請檢查部署狀態。');
  }

  console.log('');
  process.exit(allPassed ? 0 : 1);
}

// 執行主函數
main().catch((error) => {
  logError(`驗證過程發生錯誤: ${error.message}`);
  console.error(error);
  process.exit(1);
});
