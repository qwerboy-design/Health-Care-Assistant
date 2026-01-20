/**
 * Cloudflare R2 配置診斷腳本
 * 用於診斷 hca.qwerboy.com 404 錯誤
 * 
 * 使用方法:
 *   node scripts/diagnose-r2-config.js
 */

// 讀取 .env.local 檔案（如果存在）
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

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

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(60), colors.cyan);
  log(`📋 ${title}`, colors.cyan);
  log('='.repeat(60), colors.cyan);
}

function logCheck(name, passed, message = '') {
  if (passed) {
    log(`✅ ${name}: ${message}`, colors.green);
  } else {
    log(`❌ ${name}: ${message}`, colors.red);
  }
}

function logWarning(name, message) {
  log(`⚠️  ${name}: ${message}`, colors.yellow);
}

function logInfo(name, message) {
  log(`ℹ️  ${name}: ${message}`, colors.blue);
}

/**
 * 檢查環境變數
 */
function checkEnvironmentVariables() {
  logSection('檢查環境變數');

  const r2Vars = {
    'R2_ACCOUNT_ID': process.env.R2_ACCOUNT_ID,
    'R2_ACCESS_KEY_ID': process.env.R2_ACCESS_KEY_ID,
    'R2_SECRET_ACCESS_KEY': process.env.R2_SECRET_ACCESS_KEY,
    'R2_BUCKET_NAME': process.env.R2_BUCKET_NAME || 'chat-files',
    'R2_PUBLIC_URL': process.env.R2_PUBLIC_URL,
  };

  let allSet = true;

  // 檢查必要變數
  ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'].forEach(varName => {
    const value = r2Vars[varName];
    if (value) {
      // 隱藏敏感資訊
      if (varName === 'R2_SECRET_ACCESS_KEY') {
        logCheck(varName, true, `已設定 (長度: ${value.length} 字元)`);
        if (value.length !== 64) {
          logWarning(varName, `長度不正確！應為 64 字元，目前為 ${value.length} 字元`);
          allSet = false;
        }
      } else if (varName === 'R2_ACCESS_KEY_ID') {
        logCheck(varName, true, `已設定 (長度: ${value.length} 字元)`);
        if (value.length !== 32) {
          logWarning(varName, `長度不正確！應為 32 字元，目前為 ${value.length} 字元`);
          allSet = false;
        }
      } else {
        logCheck(varName, true, `已設定: ${value}`);
      }
    } else {
      logCheck(varName, false, '未設定（必要）');
      allSet = false;
    }
  });

  // 檢查可選變數
  logCheck('R2_BUCKET_NAME', true, r2Vars['R2_BUCKET_NAME']);
  
  if (r2Vars['R2_PUBLIC_URL']) {
    logCheck('R2_PUBLIC_URL', true, r2Vars['R2_PUBLIC_URL']);
    
    // 檢查 URL 格式
    try {
      const url = new URL(r2Vars['R2_PUBLIC_URL']);
      if (url.hostname === 'hca.qwerboy.com') {
        logInfo('R2_PUBLIC_URL', '已設定為 hca.qwerboy.com');
      } else {
        logWarning('R2_PUBLIC_URL', `目前設定為 ${url.hostname}，不是 hca.qwerboy.com`);
      }
    } catch (error) {
      logCheck('R2_PUBLIC_URL', false, `URL 格式錯誤: ${error.message}`);
    }
  } else {
    logWarning('R2_PUBLIC_URL', '未設定，將使用預設 R2 網域格式');
  }

  return { allSet, r2Vars };
}

/**
 * 測試 DNS 解析
 */
async function testDNSResolution() {
  logSection('測試 DNS 解析');

  return new Promise((resolve) => {
    const dns = require('dns');
    
    dns.resolveCname('hca.qwerboy.com', (err, addresses) => {
      if (err) {
        if (err.code === 'ENOTFOUND') {
          logCheck('DNS CNAME 解析', false, '找不到 CNAME 記錄');
        } else if (err.code === 'ENODATA') {
          logCheck('DNS CNAME 解析', false, '沒有 CNAME 記錄（可能使用 A 記錄）');
        } else {
          logCheck('DNS CNAME 解析', false, `錯誤: ${err.message}`);
        }
        resolve(false);
        return;
      }

      if (addresses && addresses.length > 0) {
        logCheck('DNS CNAME 解析', true, `找到 CNAME: ${addresses.join(', ')}`);
        
        // 檢查是否指向 R2
        addresses.forEach(addr => {
          if (addr.includes('r2.dev') || addr.includes('r2.cloudflarestorage.com') || addr.includes('cf-r2')) {
            logInfo('CNAME 目標', `✅ 指向 Cloudflare R2: ${addr}`);
          } else {
            logWarning('CNAME 目標', `⚠️  指向: ${addr}（可能不是 R2）`);
          }
        });
        resolve(true);
      } else {
        logCheck('DNS CNAME 解析', false, '沒有找到 CNAME 記錄');
        resolve(false);
      }
    });
  });
}

/**
 * 測試 HTTP 連線
 */
async function testHTTPConnection(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data.substring(0, 200), // 只取前 200 字元
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        error: error.message,
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        error: '連線超時',
      });
    });
  });
}

/**
 * 測試網域連線
 */
async function testDomainConnection() {
  logSection('測試網域連線');

  const testUrl = 'https://hca.qwerboy.com';
  
  logInfo('測試 URL', testUrl);
  log('正在測試連線...', colors.yellow);

  const result = await testHTTPConnection(testUrl);

  if (result.error) {
    logCheck('網域連線', false, result.error);
    return false;
  }

  logCheck('網域連線', true, `狀態碼: ${result.statusCode}`);
  
  if (result.statusCode === 404) {
    logWarning('HTTP 狀態', '收到 404 錯誤（Object not found）');
    
    // 檢查回應內容
    if (result.body && result.body.includes('Object not found')) {
      logInfo('錯誤類型', '確認是 Cloudflare R2 的 404 錯誤頁面');
    }
  } else if (result.statusCode === 200) {
    logInfo('HTTP 狀態', '✅ 連線成功！');
  } else {
    logWarning('HTTP 狀態', `收到狀態碼: ${result.statusCode}`);
  }

  // 檢查回應標頭
  if (result.headers) {
    if (result.headers['server']) {
      logInfo('伺服器', result.headers['server']);
    }
    if (result.headers['cf-ray']) {
      logInfo('Cloudflare', `CF-Ray: ${result.headers['cf-ray']}`);
    }
  }

  return result.statusCode === 200;
}

/**
 * 生成診斷報告
 */
function generateDiagnosisReport(envCheck, dnsCheck, httpCheck) {
  logSection('診斷報告與建議');

  log('\n📊 檢查結果摘要:', colors.magenta);
  log(`  環境變數: ${envCheck.allSet ? '✅' : '❌'}`, envCheck.allSet ? colors.green : colors.red);
  log(`  DNS 解析: ${dnsCheck ? '✅' : '❌'}`, dnsCheck ? colors.green : colors.red);
  log(`  HTTP 連線: ${httpCheck ? '✅' : '❌'}`, httpCheck ? colors.green : colors.red);

  log('\n🔍 可能原因分析:', colors.magenta);

  const issues = [];

  if (!envCheck.allSet) {
    issues.push('環境變數未完整設定');
  }

  if (!envCheck.r2Vars['R2_PUBLIC_URL']) {
    issues.push('R2_PUBLIC_URL 未設定，無法使用自訂網域');
  } else if (!envCheck.r2Vars['R2_PUBLIC_URL'].includes('hca.qwerboy.com')) {
    issues.push('R2_PUBLIC_URL 未設定為 hca.qwerboy.com');
  }

  if (!dnsCheck) {
    issues.push('DNS CNAME 記錄未正確設定或尚未生效');
  }

  if (!httpCheck) {
    issues.push('網域無法正常連線（404 錯誤）');
  }

  if (issues.length === 0) {
    log('  ✅ 所有檢查都通過，但仍有 404 錯誤，可能原因：', colors.green);
    log('     1. Cloudflare R2 自訂網域未正確綁定到 Bucket', colors.yellow);
    log('     2. R2 Bucket 的公共存取權限未啟用', colors.yellow);
    log('     3. 嘗試存取的物件不存在', colors.yellow);
    log('     4. 自訂網域設定尚未完全生效（需等待 5-15 分鐘）', colors.yellow);
  } else {
    issues.forEach((issue, index) => {
      log(`  ${index + 1}. ${issue}`, colors.yellow);
    });
  }

  log('\n💡 解決步驟建議:', colors.magenta);
  log('  1. 確認 Cloudflare R2 Bucket 設定:', colors.blue);
  log('     - 登入 Cloudflare Dashboard → R2', colors.blue);
  log('     - 選擇您的 Bucket（chat-files）', colors.blue);
  log('     - 前往 "Settings" → "Public Access"', colors.blue);
  log('     - 確認已啟用公共存取或設定自訂網域', colors.blue);
  
  log('\n  2. 確認自訂網域綁定:', colors.blue);
  log('     - 在 R2 Bucket Settings 中，找到 "Custom Domains"', colors.blue);
  log('     - 確認 hca.qwerboy.com 已正確綁定', colors.blue);
  log('     - 如果未綁定，點擊 "Add Custom Domain" 並輸入 hca.qwerboy.com', colors.blue);
  
  log('\n  3. 確認 DNS 設定:', colors.blue);
  log('     - 在 Cloudflare DNS 設定中，確認 hca.qwerboy.com 的 CNAME 記錄', colors.blue);
  log('     - CNAME 應指向 R2 提供的目標（通常在 R2 自訂網域設定中會顯示）', colors.blue);
  log('     - 確認 Proxy 狀態為 "DNS only"（灰色雲朵）', colors.blue);
  
  log('\n  4. 確認環境變數:', colors.blue);
  log('     - 在 Vercel 或部署平台中，確認 R2_PUBLIC_URL=https://hca.qwerboy.com', colors.blue);
  log('     - 重新部署應用程式以套用新的環境變數', colors.blue);
  
  log('\n  5. 等待 DNS 傳播:', colors.blue);
  log('     - DNS 變更可能需要 5-15 分鐘才能生效', colors.blue);
  log('     - 使用 nslookup 或 dig 命令檢查 DNS 是否已更新', colors.blue);

  log('\n' + '='.repeat(60), colors.cyan);
}

/**
 * 主函數
 */
async function main() {
  log('🚀 Cloudflare R2 配置診斷工具', colors.blue);
  log('   診斷目標: hca.qwerboy.com 404 錯誤', colors.blue);
  log('   時間: ' + new Date().toLocaleString('zh-TW'), colors.blue);

  try {
    // 1. 檢查環境變數
    const envCheck = checkEnvironmentVariables();

    // 2. 測試 DNS
    const dnsCheck = await testDNSResolution();

    // 3. 測試 HTTP 連線
    const httpCheck = await testDomainConnection();

    // 4. 生成報告
    generateDiagnosisReport(envCheck, dnsCheck, httpCheck);

  } catch (error) {
    log(`\n❌ 診斷過程發生錯誤: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
}

// 執行主函數
if (require.main === module) {
  main();
}

module.exports = { main, checkEnvironmentVariables, testDNSResolution, testDomainConnection };
