# 🔐 環境變數參考

此文件列出所有需要設定的環境變數，供 Vercel 部署時參考。

## 📋 必須設定的環境變數

### Supabase 資料庫

```env
# 客戶端和服務端共用 (必須使用 NEXT_PUBLIC_ 前綴以便客戶端使用)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 服務端專用 (僅後端 API 使用，具有完整權限)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**取得方式**:
1. 登入 Supabase Dashboard
2. 選擇您的專案
3. Settings → API → 複製 URL 和 Keys

**⚠️ 重要**:
- `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` **必須**使用 `NEXT_PUBLIC_` 前綴
- 這樣客戶端 (瀏覽器) 才能讀取,Realtime 和前端 API 調用才能正常工作
- 舊的變數名 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 仍然支援,但建議使用新格式

---

### JWT 加密金鑰

```env
JWT_SECRET=your_jwt_secret_at_least_32_characters_long
```

**生成方式**:
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

---

### Google OAuth 2.0

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_client_secret
```

**取得方式**:
1. 前往 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 建立 OAuth 2.0 Client ID
3. 設定授權重新導向 URI: `https://your-app.vercel.app/api/auth/google/callback`

---

### Email 服務 (Resend)

```env
RESEND_API_KEY=re_your_resend_api_key
```

**取得方式**:
1. 註冊 [Resend](https://resend.com)
2. Dashboard → API Keys → Create API Key

---

### Cloudflare R2 物件儲存

```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=chat-files
R2_PUBLIC_URL=https://your-domain.com  # 可選：自訂網域
```

**取得方式**:
1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. R2 → 選擇或建立 Bucket（例如：`chat-files`）
3. 管理 API Tokens → 建立新 Token
4. 複製 Account ID、Access Key ID、Secret Access Key

**⚠️ 重要：憑證格式要求**:
- `R2_ACCESS_KEY_ID`：**必須為 32 個字元**（小寫字母和數字）
- `R2_SECRET_ACCESS_KEY`：**必須為 64 個字元**（小寫字母和數字）
- Secret Access Key 僅在建立時顯示一次，請妥善保存
- 如果長度不符合，請確認已完整複製，沒有遺漏字元

**注意事項**:
- `R2_BUCKET_NAME` 預設為 `chat-files`，如果未設定會使用預設值
- `R2_PUBLIC_URL` 為可選，若未設定將使用預設 R2 網域格式：`https://{accountId}.r2.cloudflarestorage.com/{bucket}/{fileName}`
- 如需公開存取檔案，需要在 R2 Bucket 設定中啟用公開存取或使用自訂網域
- 使用自訂網域時，需要在 Cloudflare 中綁定網域並設定 DNS 記錄

---

### Anthropic API (AI 整合) ⚠️ 重要

```env
ANTHROPIC_API_KEY=sk-ant-api03-your_api_key_here
```

**⚠️ 重要提醒**:
- **必須使用「標準 API Key」**，不能使用 Claude Code subscription Key
- Claude Code subscription Key 在 2026年1月9日後已被 Anthropic 限制，無法用於直接 API 調用
- 標準 API Key 以 `sk-ant-api03-` 開頭

**取得方式**:
1. 前往 [Anthropic Console](https://console.anthropic.com/settings/keys)
2. 點擊「Create Key」創建新的 API Key
3. 選擇「API Key」類型（不是 Claude Code）
4. 設定付費方式或確認有免費額度
5. 複製生成的 API Key

**驗證方式**:
```bash
# 使用 curl 測試 API Key 是否有效
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-3-haiku-20240307","max_tokens":1024,"messages":[{"role":"user","content":"Hello"}]}'
```

**可選：自訂模型**:
```env
# 如果您的帳戶支援更高級模型，可以設定此環境變數
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
# 或使用其他可用模型：
# claude-3-opus-20240229 (最強大)
# claude-3-sonnet-20240229 (平衡)
# claude-3-haiku-20240307 (最快速、預設)
```

### OpenAI API（可選，server-side）

```env
OPENAI_API_KEY=sk-your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

- `OPENAI_API_KEY` 與 `OPENAI_MODEL` 只由 server-side provider client 讀取，不可使用 `NEXT_PUBLIC_` 前綴，也不會寫入 Supabase 或回傳瀏覽器。
- 後台只顯示 API key 是否已設定的 boolean；OpenAI provider 需先套用 `supabase/migrations/007_add_llm_runtime_settings.sql` 與 `011_add_openai_provider.sql`。
- 正式環境的 OpenAI model pricing 請由後台模型管理新增；不要把價格寫入 migration 或 seed。

### Resend 寄件網域

```env
RESEND_FROM_EMAIL=verified-sender@example.com
```

`RESEND_FROM_EMAIL` 的網域必須先在 Resend 完成驗證；未驗證或 API 回應失敗時，系統會回傳可重試訊息並只在 server log 記錄安全的 status/name/code。

---

### MCP Server (可選，進階功能)

```env
MCP_SERVER_URL=https://mcp.k-dense.ai/claude-scientific-skills/mcp
MCP_API_KEY=  # 可選，如果 Server 需要認證
```

**預設值**: 使用官方 MCP Server，通常無需 API Key
**注意**: 目前系統直接使用 Anthropic API，此設定為未來擴展預留

---

### Next.js 設定

```env
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**設定方式**: 
- 部署到 Vercel 後，使用 Vercel 提供的網域
- 如果使用自訂網域，改為自訂網域

---

### 管理員初始化

```env
ADMIN_EMAIL=admin@example.com
```

**設定方式**:
- 設定初始管理員的 Email 地址
- 該 Email 的用戶必須已存在於資料庫中
- 執行 `node scripts/init-admin.js` 將該用戶設為管理員並自動通過審核

---

## 🔄 環境變數命名規則

- `NEXT_PUBLIC_*`: 這些變數會暴露給瀏覽器，請勿包含敏感資訊
- 其他變數: 僅在 Server 端可用，適合存放 API Keys 等敏感資訊

---

## ✅ Vercel 設定步驟

1. 登入 Vercel Dashboard
2. 選擇專案 → Settings → Environment Variables
3. 依序新增上述所有環境變數
4. 選擇適用環境: Production, Preview, Development
5. 點擊 Save
6. 重新部署專案

---

## 🔒 安全性建議

- ✅ 使用不同的 API Keys 用於開發和生產環境
- ✅ 定期輪換敏感金鑰
- ✅ 不要在程式碼中硬編碼 API Keys
- ✅ 使用 Vercel 的環境變數加密功能
