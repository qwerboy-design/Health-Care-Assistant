# ✅ Vercel 環境變數設定檢查清單

## 📋 使用說明

在 Vercel 部署時，請按照此清單逐一設定環境變數。

**設定位置**: Vercel Dashboard → 您的項目 → Settings → Environment Variables

**環境選擇**: 建議為每個變數選擇 **Production**, **Preview**, **Development** 三個環境

---

## 🔐 必須設定的環境變數

### 1. Supabase 資料庫 (3 個變數)

| 變數名稱 | 範例值 | 取得位置 |
|---------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase Dashboard → Settings → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Supabase Dashboard → Settings → API → service_role key ⚠️ |

- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY

⚠️ **注意**: `service_role` key 具有完整權限，請妥善保管！

---

### 2. JWT 加密金鑰 (1 個變數)

| 變數名稱 | 範例值 | 生成方式 |
|---------|--------|---------|
| `JWT_SECRET` | `至少 32 字元的隨機字串` | 使用下方指令生成 |

- [ ] JWT_SECRET

**生成指令** (PowerShell):
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**生成指令** (Node.js):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

### 3. Google OAuth 2.0 (2 個變數)

| 變數名稱 | 範例值 | 取得位置 |
|---------|--------|---------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `xxxxx.apps.googleusercontent.com` | Google Cloud Console → APIs → Credentials |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxx` | Google Cloud Console → APIs → Credentials |

- [ ] NEXT_PUBLIC_GOOGLE_CLIENT_ID
- [ ] GOOGLE_CLIENT_SECRET

**設定位置**: [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)

📖 **詳細指南**: 參考 `Reference documents/GOOGLE_OAUTH_SETUP_GUIDE.md`

---

### 4. Email 服務 - Resend (1 個變數)

| 變數名稱 | 範例值 | 取得位置 |
|---------|--------|---------|
| `RESEND_API_KEY` | `re_xxxxx` | Resend Dashboard → API Keys |

- [ ] RESEND_API_KEY

**設定位置**: [Resend API Keys](https://resend.com/api-keys)

📖 **詳細指南**: 參考 `Reference documents/RESEND_EMAIL_SETUP.md`

---

### 5. Cloudflare R2 物件儲存 (5 個變數)

| 變數名稱 | 範例值 | 取得位置 |
|---------|--------|---------|
| `R2_ACCOUNT_ID` | `xxxxx` | Cloudflare Dashboard → R2 |
| `R2_ACCESS_KEY_ID` | `xxxxx` | Cloudflare Dashboard → R2 → Manage R2 API Tokens |
| `R2_SECRET_ACCESS_KEY` | `xxxxx` | Cloudflare Dashboard → R2 → Manage R2 API Tokens |
| `R2_BUCKET_NAME` | `chat-files` | 您建立的 R2 儲存桶名稱 |
| `R2_PUBLIC_URL` | `https://files.yourdomain.com` | 您的 R2 自訂網域或 Worker URL |

- [ ] R2_ACCOUNT_ID
- [ ] R2_ACCESS_KEY_ID
- [ ] R2_SECRET_ACCESS_KEY
- [ ] R2_BUCKET_NAME
- [ ] R2_PUBLIC_URL

📖 **詳細指南**: 參考 `Reference documents/CLOUDFLARE_WORKER_SETUP_GUIDE.md`

---

### 6. Anthropic API (2 個變數)

| 變數名稱 | 範例值 | 取得位置 |
|---------|--------|---------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-xxxxx` | Anthropic Console → API Keys |
| `ANTHROPIC_MODEL` | `claude-3-haiku-20240307` | 模型選擇 |

- [ ] ANTHROPIC_API_KEY
- [ ] ANTHROPIC_MODEL

**設定位置**: [Anthropic Console](https://console.anthropic.com/)

**可用模型**:
- `claude-3-haiku-20240307` (快速、經濟)
- `claude-3-sonnet-20240229` (平衡)
- `claude-3-opus-20240229` (最強大)

---

### 7. 應用程式 URL (1 個變數)

| 變數名稱 | 範例值 | 說明 |
|---------|--------|------|
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | 部署後由 Vercel 提供 |

- [ ] NEXT_PUBLIC_APP_URL

⚠️ **重要**: 
1. **首次部署時可以先留空或設為佔位符**
2. **部署完成後，需要回來更新為實際的 Vercel URL**
3. **更新後需要重新部署**

---

### 8. 管理員 Email (1 個變數)

| 變數名稱 | 範例值 | 說明 |
|---------|--------|------|
| `ADMIN_EMAIL` | `admin@example.com` | 用於初始化管理員帳號 |

- [ ] ADMIN_EMAIL

---

## 🎯 可選的環境變數

### MCP Server (進階功能)

| 變數名稱 | 範例值 | 說明 |
|---------|--------|------|
| `MCP_SERVER_URL` | `https://mcp.k-dense.ai/...` | MCP 伺服器 URL |
| `MCP_API_KEY` | `xxxxx` | MCP API Key (如需要) |

- [ ] MCP_SERVER_URL
- [ ] MCP_API_KEY

⚠️ **注意**: 如果不使用 MCP 功能，可以不設定

---

## 📝 設定步驟

### 在 Vercel 中設定環境變數

1. 登入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇您的項目
3. 前往 **Settings** → **Environment Variables**
4. 對於每個變數：
   - 點擊 **"Add New"**
   - 輸入 **Key**（變數名稱）
   - 輸入 **Value**（變數值）
   - 選擇環境：**Production**, **Preview**, **Development**（建議全選）
   - 點擊 **"Save"**

### 批量設定（使用 Vercel CLI）

如果您已安裝 Vercel CLI，可以使用以下方式批量設定：

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入
vercel login

# 設定環境變數（從本地 .env.local 拉取）
vercel env pull
```

---

## ✅ 設定完成檢查

設定完所有環境變數後，請確認：

- [ ] 所有必須的環境變數都已設定（共 15 個）
- [ ] 每個變數都選擇了正確的環境（Production/Preview/Development）
- [ ] 沒有包含空格或特殊字元（除非是變數值本身需要）
- [ ] `NEXT_PUBLIC_` 開頭的變數會暴露給瀏覽器（確認無敏感資訊）
- [ ] Service keys 和 secrets 都已妥善保管

---

## 🔐 安全性提醒

### ✅ 安全的變數（可以暴露給瀏覽器）
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_APP_URL`

### ⚠️ 敏感的變數（只能在伺服器端使用）
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `GOOGLE_CLIENT_SECRET`
- `RESEND_API_KEY`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `ANTHROPIC_API_KEY`

**重要**: 確保敏感變數**不要**以 `NEXT_PUBLIC_` 開頭！

---

## 🆘 常見問題

### Q: 環境變數設定後沒有生效？
**A**: 修改環境變數後需要重新部署。Vercel 會自動提示您重新部署。

### Q: 如何查看已設定的環境變數？
**A**: 在 Vercel Dashboard → Settings → Environment Variables 中可以查看所有變數（值會被隱藏）。

### Q: 可以在不同環境使用不同的值嗎？
**A**: 可以！設定時可以為 Production、Preview、Development 分別設定不同的值。

### Q: 如何刪除或修改環境變數？
**A**: 在環境變數列表中，點擊變數右側的 **"⋯"** → **"Edit"** 或 **"Remove"**。

---

## 📚 相關資源

- [Vercel 環境變數文件](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js 環境變數文件](https://nextjs.org/docs/basic-features/environment-variables)
- 項目文件: `ENV_VARIABLES.md`
- 部署指南: `GITHUB_VERCEL_DEPLOYMENT_STEPS.md`

---

**設定完成後，您就可以開始部署了！** 🚀
