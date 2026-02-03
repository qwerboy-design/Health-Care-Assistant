# 🚀 GitHub & Vercel 部署步驟指南

## 📋 部署概覽

本指南將協助您將 Health Care Assistant 部署到 GitHub 和 Vercel 平台。

---

## 第一部分：準備 GitHub 倉庫

### 步驟 1: 檢查當前 Git 狀態

```bash
# 查看當前分支
git branch

# 查看遠端倉庫
git remote -v

# 查看未提交的更改
git status
```

### 步驟 2: 提交當前更改

```bash
# 添加所有更改（排除 .env.local.backup）
git add .env.example
git add lib/supabase/client.ts
git add lib/supabase/model-pricing.ts
git add next.config.js

# 提交更改
git commit -m "chore: 更新配置以準備部署"

# 推送到 GitHub
git push origin main
```

⚠️ **重要提醒**：
- `.env.local.backup` 檔案包含敏感資訊，已被 `.gitignore` 排除
- 確保 `.env.local` 和 `.env` 檔案**不會**被提交到 Git

---

## 第二部分：部署到 Vercel

### 步驟 1: 登入 Vercel

1. 前往 [Vercel](https://vercel.com)
2. 使用 GitHub 帳號登入（推薦）或註冊新帳號

### 步驟 2: 導入 GitHub 項目

1. 點擊 **"Add New..."** → **"Project"**
2. 選擇 **"Import Git Repository"**
3. 找到您的 GitHub 倉庫（例如：`qwerboy-design/Health-Care-Assistant`）
4. 點擊 **"Import"**

### 步驟 3: 配置項目設定

Vercel 會自動檢測到 Next.js 項目，使用以下配置：

- **Framework Preset**: Next.js
- **Root Directory**: `./`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node Version**: 18.x 或更高

✅ 這些設定已在 `vercel.json` 中配置好

### 步驟 4: 設定環境變數 ⚠️ **最重要的步驟**

在 Vercel 項目設定頁面，展開 **"Environment Variables"** 區塊，逐一添加以下環境變數：

#### 🔐 必須設定的環境變數

```env
# Supabase 資料庫（從您的 Supabase Dashboard 取得）
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT 加密金鑰（生成一個至少 32 字元的隨機字串）
JWT_SECRET=your_jwt_secret_at_least_32_characters_long

# Google OAuth 2.0
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_client_secret

# Email 服務 (Resend)
RESEND_API_KEY=re_your_resend_api_key

# Cloudflare R2 物件儲存
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=chat-files
R2_PUBLIC_URL=https://your-domain.com

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-your_api_key_here
ANTHROPIC_MODEL=claude-3-haiku-20240307

# MCP Server（可選）
MCP_SERVER_URL=https://mcp.k-dense.ai/claude-scientific-skills/mcp
MCP_API_KEY=

# 應用程式 URL（先留空，部署後更新）
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# 管理員 Email
ADMIN_EMAIL=admin@example.com
```

#### 📝 環境變數設定技巧

1. **環境選擇**：
   - 為每個變數選擇 **Production**, **Preview**, **Development** 三個環境
   - 或僅選擇 **Production** 用於正式環境

2. **如何取得各項 API Key**：
   - **Supabase**: 前往 [Supabase Dashboard](https://supabase.com/dashboard) → 您的項目 → Settings → API
   - **Google OAuth**: 參考 `Reference documents/GOOGLE_OAUTH_SETUP_GUIDE.md`
   - **Resend**: 前往 [Resend Dashboard](https://resend.com/api-keys)
   - **Cloudflare R2**: 前往 Cloudflare Dashboard → R2 → 您的儲存桶
   - **Anthropic**: 前往 [Anthropic Console](https://console.anthropic.com/)

3. **生成 JWT_SECRET**：
   ```bash
   # 使用 Node.js 生成
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   
   # 或使用 PowerShell
   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
   ```

### 步驟 5: 開始部署

1. 確認所有環境變數已正確設定
2. 點擊 **"Deploy"** 按鈕
3. 等待建置完成（通常需要 2-5 分鐘）

### 步驟 6: 驗證部署

部署完成後，Vercel 會提供一個 URL（例如：`https://health-care-assistant.vercel.app`）

**測試檢查清單**：
- ✅ 訪問主頁是否正常載入
- ✅ 註冊/登入功能是否正常
- ✅ Google OAuth 登入是否正常（可能需要先更新 Google OAuth 設定）
- ✅ 對話功能是否正常
- ✅ 檔案上傳功能是否正常

---

## 第三部分：部署後設定

### 1. 更新 Google OAuth 重定向 URI

部署完成後，需要在 Google Cloud Console 更新 OAuth 設定：

1. 前往 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 選擇您的 OAuth 2.0 Client ID
3. 在 **"Authorized redirect URIs"** 中添加：
   ```
   https://your-app.vercel.app/api/auth/google/callback
   ```
4. 在 **"Authorized JavaScript origins"** 中添加：
   ```
   https://your-app.vercel.app
   ```
5. 點擊 **"Save"**

### 2. 更新 NEXT_PUBLIC_APP_URL 環境變數

1. 在 Vercel Dashboard → 您的項目 → Settings → Environment Variables
2. 找到 `NEXT_PUBLIC_APP_URL` 變數
3. 更新為實際的 Vercel URL：`https://your-app.vercel.app`
4. 選擇所有環境（Production, Preview, Development）
5. 點擊 **"Save"**
6. 重新部署項目（Vercel 會自動提示）

### 3. 初始化管理員帳號

部署完成後，需要初始化管理員帳號：

**選項 A: 使用 Vercel CLI**
```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入 Vercel
vercel login

# 執行初始化腳本
vercel env pull
node scripts/init-admin.js
```

**選項 B: 手動在 Supabase 中設定**
1. 前往 Supabase Dashboard → Table Editor → customers 表
2. 找到管理員用戶
3. 將 `is_admin` 欄位設為 `true`
4. 將 `approval_status` 設為 `approved`

---

## 第四部分：設定自動部署

Vercel 已自動設定 CI/CD，當您推送代碼到 GitHub 時會自動部署：

- **推送到 `main` 分支** → 自動部署到 **Production**
- **推送到其他分支或 PR** → 自動部署到 **Preview** 環境

---

## 🔍 故障排除

### 建置失敗

**檢查步驟**：
1. 查看 Vercel 建置日誌
2. 確認所有依賴套件都在 `package.json` 中
3. 本地執行 `npm run build` 測試

### 運行時錯誤

**常見問題**：
- ❌ Environment variable not found
  - **解決**：檢查 Vercel 環境變數設定
- ❌ Database connection failed
  - **解決**：檢查 Supabase URL 和 API Key
- ❌ Google OAuth not working
  - **解決**：確認已更新 Google OAuth 重定向 URI

### API 請求失敗

1. 檢查 Vercel Function Logs
2. 確認環境變數正確載入
3. 檢查 API 端點是否正確

---

## 📊 監控與維護

### 查看部署狀態

在 Vercel Dashboard 中：
- **Deployments**: 查看所有部署歷史
- **Logs**: 查看運行時日誌
- **Analytics**: 查看流量和性能數據

### 回滾部署

如果新部署出現問題：
1. 前往 Vercel Dashboard → Deployments
2. 找到上一個穩定的部署
3. 點擊 **"⋯"** → **"Promote to Production"**

---

## 🎉 部署完成！

恭喜！您的 Health Care Assistant 已成功部署到 Vercel。

**接下來可以做什麼**：
- 🌐 設定自訂網域（Vercel Dashboard → Settings → Domains）
- 📧 測試 Email 功能
- 👥 邀請用戶測試
- 📊 監控使用情況和性能

---

## 📚 相關文檔

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 完整部署指南
- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Vercel 詳細指南
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - 部署檢查清單
- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - 環境變數說明

---

**需要協助？** 查看項目的 `README.md` 或聯繫開發團隊。
