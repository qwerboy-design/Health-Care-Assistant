#!/usr/bin/env node

/**
 * 檢查環境變數安全性腳本
 * 確保 .env.local 不會被上傳到 Git
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 檢查環境變數安全性...\n');

// 1. 檢查 .gitignore
console.log('1️⃣ 檢查 .gitignore 設定...');
const gitignorePath = path.join(process.cwd(), '.gitignore');
if (!fs.existsSync(gitignorePath)) {
  console.error('❌ .gitignore 檔案不存在！');
  process.exit(1);
}

const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
const hasEnvLocal = /\.env\*\.local/.test(gitignoreContent) || /\.env/.test(gitignoreContent);

if (hasEnvLocal) {
  console.log('✅ .gitignore 已包含 .env*.local 規則');
} else {
  console.error('❌ .gitignore 未包含 .env*.local 規則！');
  console.error('請在 .gitignore 中添加：');
  console.error('  .env*.local');
  console.error('  .env');
  process.exit(1);
}

// 2. 檢查 .env.local 是否在 Git 追蹤中
console.log('\n2️⃣ 檢查 .env.local 是否在 Git 追蹤中...');
try {
  const trackedFiles = execSync('git ls-files', { encoding: 'utf-8' });
  const envFiles = trackedFiles
    .split('\n')
    .filter(line => line.includes('.env') && !line.includes('.example'));
  
  if (envFiles.length > 0) {
    console.error('❌ 發現以下環境變數檔案在 Git 追蹤中：');
    envFiles.forEach(file => console.error(`   - ${file}`));
    console.error('\n⚠️  請執行以下命令移除：');
    envFiles.forEach(file => {
      console.error(`   git rm --cached ${file}`);
    });
    process.exit(1);
  } else {
    console.log('✅ .env.local 不在 Git 追蹤中');
  }
} catch (error) {
  // 如果沒有 Git 倉庫，跳過此檢查
  if (error.message.includes('not a git repository')) {
    console.log('⚠️  未偵測到 Git 倉庫，跳過此檢查');
  } else {
    throw error;
  }
}

// 3. 檢查 .env.local 是否存在
console.log('\n3️⃣ 檢查 .env.local 檔案...');
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  console.log('✅ .env.local 檔案存在');
  
  // 檢查檔案大小（避免檢查空檔案）
  const stats = fs.statSync(envLocalPath);
  if (stats.size === 0) {
    console.warn('⚠️  .env.local 檔案為空');
  } else {
    console.log(`✅ .env.local 檔案大小: ${stats.size} bytes`);
  }
} else {
  console.warn('⚠️  .env.local 檔案不存在');
  console.warn('   如果尚未設定環境變數，請複製 .env.example 為 .env.local');
}

// 4. 檢查 .env.example 是否存在
console.log('\n4️⃣ 檢查 .env.example 檔案...');
const envExamplePath = path.join(process.cwd(), '.env.example');
if (fs.existsSync(envExamplePath)) {
  console.log('✅ .env.example 檔案存在');
} else {
  console.warn('⚠️  .env.example 檔案不存在');
  console.warn('   建議建立 .env.example 作為環境變數範例');
}

// 5. 檢查暫存區
console.log('\n5️⃣ 檢查 Git 暫存區...');
try {
  const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
  const stagedEnvFiles = stagedFiles
    .split('\n')
    .filter(line => line.includes('.env') && !line.includes('.example'));
  
  if (stagedEnvFiles.length > 0) {
    console.error('❌ 發現以下環境變數檔案在暫存區中：');
    stagedEnvFiles.forEach(file => console.error(`   - ${file}`));
    console.error('\n⚠️  請執行以下命令移除：');
    stagedEnvFiles.forEach(file => {
      console.error(`   git reset HEAD ${file}`);
    });
    process.exit(1);
  } else {
    console.log('✅ 暫存區中沒有環境變數檔案');
  }
} catch (error) {
  // 如果沒有 Git 倉庫或暫存區為空，跳過此檢查
  if (error.message.includes('not a git repository') || 
      error.message.includes('No staged changes')) {
    console.log('✅ 暫存區檢查通過');
  } else {
    throw error;
  }
}

console.log('\n✅ 所有檢查通過！環境變數安全性確認無誤。');
console.log('\n📝 下一步：');
console.log('   1. 確認所有環境變數已在 .env.local 中設定');
console.log('   2. 執行 git add . 添加變更');
console.log('   3. 執行 git commit 提交變更');
console.log('   4. 執行 git push 推送到 GitHub');
console.log('   5. 在 Vercel 中設定環境變數');
