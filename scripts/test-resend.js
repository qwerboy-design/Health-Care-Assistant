const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// 手動載入 .env.local (避免依賴 dotenv)
function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split(/\r?\n/).forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                // 移除引號與分號（如果有的話）
                value = value.trim();
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                process.env[key] = value;
            }
        });
    }
}

loadEnv();

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

async function testResend() {
    console.log('--- Resend 服務診斷 ---');
    console.log(`API Key: ${apiKey ? '已設定 (前 5 碼: ' + apiKey.substring(0, 5) + '...)' : '未設定'}`);
    console.log(`From Email: ${fromEmail}`);

    if (!apiKey) {
        console.error('❌ 錯誤: 找不到 RESEND_API_KEY 環境變數');
        process.exit(1);
    }

    const resend = new Resend(apiKey);

    try {
        console.log('\n正在嘗試驗證 API Key (試探性列出網域)...');
        // 嘗試列出網域作為連線測試 (如果 API key 權限為 Sending Only，這步會報錯但不影響發信)
        const { data: domains, error: domainError } = await resend.domains.list();

        if (domainError) {
            console.warn('⚠️ 無法列出網域 (這通常是因為 API Key 被設定為「僅限發信」權限):', domainError.message);
            console.log('💡 權限不足列出網域不代表不能發信，我們將繼續測試發信功能...');
        } else {
            console.log('✅ API Key 驗證成功！');
            if (domains && domains.data) {
                console.log('已驗證的網域:', domains.data.map(d => d.name).join(', ') || '無');

                if (fromEmail !== 'onboarding@resend.dev') {
                    const domainOfFrom = fromEmail.split('@')[1];
                    const isVerified = domains.data.some(d => d.name === domainOfFrom);
                    if (!isVerified) {
                        console.warn(`⚠️ 警告: 發件網域 ${domainOfFrom} 似乎未在 Resend Dashboard 中驗證。`);
                        console.log('💡 如果是新驗證的網域，可能需要幾分鐘生效。');
                    }
                }
            }
        }

        console.log('\n正在嘗試發送測試郵件...');
        console.log(`發送至: qwerboy@gmail.com`);

        const { data, error } = await resend.emails.send({
            from: `Clinical Assistant <${fromEmail}>`,
            to: 'qwerboy@gmail.com',
            subject: '臨床助手 AI - Resend 服務測試',
            html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>✅ Resend 整合測試成功</h2>
          <p>如果您看到這封郵件，代表您的環境變數配置正確，且 Resend 服務運作正常。</p>
          <hr>
          <p>發件人: ${fromEmail}</p>
          <p>時間: ${new Date().toLocaleString()}</p>
        </div>
      `
        });

        if (error) {
            console.error('❌ 郵件發送失敗:', error.message);
            if (error.message.includes('domain not verified')) {
                console.log('💡 建議: 請將 RESEND_FROM_EMAIL 設定為 onboarding@resend.dev 或在 Resend 官方後台完成網域驗證。');
            }
        } else {
            console.log('✅ 郵件發送請求已送出！');
            console.log('郵件 ID:', data.id);
            console.log('\n請檢查 qwerboy@gmail.com 的收件匣（及垃圾郵件匣）。');
        }

    } catch (err) {
        console.error('❌ 發生非預期錯誤:', err.message);
    }
}

testResend();
