/**
 * 管理員初始化腳本
 * 將指定 Email 的用戶設為管理員並自動通過審核
 * 
 * 使用方法:
 *   node scripts/init-admin.js
 * 
 * 前置條件:
 *   1. 環境變數 ADMIN_EMAIL 已設定
 *   2. 環境變數 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 已設定
 *   3. 該 Email 的用戶已存在於資料庫中
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

// 檢查必要的環境變數
const adminEmail = process.env.ADMIN_EMAIL;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!adminEmail) {
  console.error('❌ 錯誤: 環境變數 ADMIN_EMAIL 未設定');
  console.log('\n請在 .env.local 檔案中設定:');
  console.log('ADMIN_EMAIL=your-admin@email.com');
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 錯誤: Supabase 環境變數未設定');
  console.log('\n請在 .env.local 檔案中設定:');
  console.log('SUPABASE_URL=your_supabase_url');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  process.exit(1);
}

// 使用 Supabase REST API
async function initAdmin() {
  try {
    console.log('🔍 正在查找用戶...');
    
    // 查找用戶
    const findUserResponse = await fetch(
      `${supabaseUrl}/rest/v1/customers?email=eq.${encodeURIComponent(adminEmail)}&select=*`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!findUserResponse.ok) {
      throw new Error(`查找用戶失敗: ${findUserResponse.statusText}`);
    }

    const users = await findUserResponse.json();

    if (!users || users.length === 0) {
      console.error(`❌ 錯誤: 找不到 Email 為 ${adminEmail} 的用戶`);
      console.log('\n請先註冊該帳號，然後再執行此腳本。');
      process.exit(1);
    }

    const user = users[0];
    console.log(`✅ 找到用戶: ${user.name} (${user.email})`);

    // 更新用戶為管理員
    console.log('🔧 正在設定管理員權限...');
    
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/customers?id=eq.${user.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          role: 'admin',
          approval_status: 'approved',
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`更新失敗: ${updateResponse.statusText} - ${errorText}`);
    }

    const updatedUsers = await updateResponse.json();
    const updatedUser = Array.isArray(updatedUsers) ? updatedUsers[0] : updatedUsers;

    console.log('\n✅ 管理員初始化成功！');
    console.log('\n用戶資訊:');
    console.log(`  - 姓名: ${updatedUser.name}`);
    console.log(`  - Email: ${updatedUser.email}`);
    console.log(`  - 角色: ${updatedUser.role}`);
    console.log(`  - 審核狀態: ${updatedUser.approval_status}`);
    console.log('\n現在可以使用此帳號登入後台管理系統: /admin');
    
  } catch (error) {
    console.error('\n❌ 初始化失敗:', error.message);
    if (error.stack) {
      console.error('\n詳細錯誤:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 執行初始化
initAdmin();
