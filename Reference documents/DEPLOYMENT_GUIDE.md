# 🚀 部署指南

本指南將協助您將 Health Care Assistant 部署到 GitHub 和 Vercel。

---

## 📋 前置準備

### 1. 確認環境變數已設定

確保您的 `.env.local` 檔案包含所有必要的環境變數。參考 `.env.example` 或 `ENV_VARIABLES.md`。

### 2. 確認 .gitignore 設定

確認 `.gitignore` 已包含以下規則（應該已經設定）：

```gitignore
# local env files
.env*.local
.env
```

這確保 `.env.local` 不會被上傳到 Git。

---

## 🔐 步驟 1：確保敏感資訊不會上傳

### 檢查 .gitignore

```bash
# 確認 .env.local 在 .gitignore 中
cat .gitignore | grep -E "\.env"
```

應該看到：
```
.env*.local
.env
```

### 檢查 Git 狀態

```bash
# 確認 .env.local 不會被追蹤
git status

# 如果看到 .env.local，執行：
git rm --cached .env.local
```

### 驗證不會上傳

```bash
# 檢查 .env.local 是否在 Git 追蹤中
git ls-files | grep -E "\.env"
```

**應該沒有任何輸出**（表示 .env.local 未被追蹤）

---

## 📦 步驟 2：提交代碼到 GitHub

### 2.1 初始化 Git（如果尚未初始化）

```bash
# 檢查是否已有 Git 倉庫
git status

# 如果沒有，初始化
git init
```

### 2.2 添加遠端倉庫

```bash
# 在 GitHub 建立新倉庫後，添加遠端
git remote add origin https://github.com/your-username/health-care-assistant.git

# 或使用 SSH
git remote add origin git@github.com:your-username/health-care-assistant.git
```

### 2.3 提交並推送

```bash
# 檢查變更
git status

# 添加所有檔案（.env.local 會被自動忽略）
git add .

# 提交
git commit -m "Initial commit: Health Care Assistant with MCP integration"

# 推送到 GitHub
git push -u origin main
```

**⚠️ 重要提醒**：
- 提交前再次確認 `.env.local` 不在 `git status` 中
- 如果看到 `.env.local`，**不要提交**，先執行 `git rm --cached .env.local`

---

## 🌐 步驟 3：部署到 Vercel

### 3.1 連接 GitHub 倉庫

1. 登入 [Vercel Dashboard](https://vercel.com)
2. 點擊「**Add New Project**」
3. 選擇「**Import Git Repository**」
4. 選擇您的 GitHub 倉庫
5. 點擊「**Import**」

### 3.2 設定專案

Vercel 會自動偵測 Next.js 專案，使用以下設定：

- **Framework Preset**: Next.js
- **Root Directory**: `./`（預設）
- **Build Command**: `npm run build`（自動偵測）
- **Output Directory**: `.next`（自動偵測）
- **Install Command**: `npm install`（自動偵測）

### 3.3 設定環境變數

在部署前，必須設定所有環境變數：

1. 在 Vercel 專案設定頁面，點擊「**Environment Variables**」
2. 依序添加以下環境變數：

#### 必要環境變數清單

```env
# Supabase
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# JWT
JWT_SECRET

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

# Resend Email
RESEND_API_KEY
RESEND_FROM_EMAIL

# Cloudflare R2
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
# R2_PUBLIC_URL (可選)

# Anthropic API
ANTHROPIC_API_KEY
# ANTHROPIC_MODEL (可選)

# Next.js
NEXT_PUBLIC_APP_URL

# MCP Server (可選)
MCP_SERVER_URL
MCP_API_KEY
```

3. 對於每個環境變數：
   - 輸入 **Name**（變數名稱）
   - 輸入 **Value**（變數值）
   - 選擇適用環境：
     - ✅ **Production**（生產環境）
     - ✅ **Preview**（預覽環境）
     - ✅ **Development**（開發環境）
   - 點擊「**Save**」

### 3.4 更新 Google OAuth 重新導向 URI

部署後，需要更新 Google OAuth 設定：

1. 前往 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 選擇您的 OAuth 2.0 Client ID
3. 在「**Authorized redirect URIs**」中添加：
   ```
   https://your-app.vercel.app/api/auth/google/callback
   ```
4. 如果使用自訂網域，也添加：
   ```
   https://your-custom-domain.com/api/auth/google/callback
   ```

### 3.5 更新 NEXT_PUBLIC_APP_URL

部署後，更新 `NEXT_PUBLIC_APP_URL` 環境變數：

1. 在 Vercel Dashboard → Settings → Environment Variables
2. 找到 `NEXT_PUBLIC_APP_URL`
3. 更新為 Vercel 提供的網域：
   ```
   https://your-app.vercel.app
   ```
4. 如果使用自訂網域，改為自訂網域
5. 點擊「**Save**」
6. **重新部署**專案

### 3.6 部署

1. 點擊「**Deploy**」
2. 等待部署完成（約 2-5 分鐘）
3. 部署完成後，點擊「**Visit**」查看網站

---

## ✅ 步驟 4：驗證部署

### 4.1 檢查環境變數

在 Vercel Dashboard → Settings → Environment Variables，確認所有變數都已設定。

### 4.2 測試功能

1. **測試註冊/登入**
   - 訪問 `https://your-app.vercel.app/register`
   - 測試註冊流程

2. **測試 Google OAuth**
   - 訪問 `https://your-app.vercel.app/login`
   - 點擊「使用 Google 登入」
   - 確認可以成功登入

3. **測試對話功能**
   - 登入後，訪問 `https://your-app.vercel.app/chat`
   - 測試發送訊息
   - 測試上傳圖片

4. **測試 MCP 整合**
   - 發送訊息並確認 AI 回應
   - 檢查 Vercel 函數日誌中是否有 MCP 相關日誌

### 4.3 檢查日誌

在 Vercel Dashboard → Deployments → 選擇最新部署 → **Functions** → 查看日誌：

- 確認沒有環境變數錯誤
- 確認 MCP Client 成功初始化
- 確認 API 呼叫正常

---

## 🔄 步驟 5：後續更新

### 更新代碼

```bash
# 1. 修改代碼
# ... 進行修改 ...

# 2. 提交變更
git add .
git commit -m "描述您的變更"
git push origin main

# 3. Vercel 會自動觸發部署
```

### 更新環境變數

1. 在 Vercel Dashboard → Settings → Environment Variables
2. 修改或添加環境變數
3. 點擊「**Save**」
4. 前往 Deployments → 點擊「**Redeploy**」重新部署

---

## 🐛 常見問題

### 問題 1：環境變數未生效

**原因**：環境變數更新後未重新部署

**解決**：
1. 在 Vercel Dashboard → Deployments
2. 點擊最新部署右側的「**⋯**」→ **Redeploy**

### 問題 2：Google OAuth 錯誤

**原因**：重新導向 URI 未更新

**解決**：
1. 確認 Google Cloud Console 中的重新導向 URI 包含 Vercel 網域
2. 確認 `NEXT_PUBLIC_APP_URL` 環境變數已更新

### 問題 3：MCP 呼叫失敗

**原因**：`ANTHROPIC_API_KEY` 未設定或格式錯誤

**解決**：
1. 確認 `ANTHROPIC_API_KEY` 已設定
2. 確認 API Key 以 `sk-ant-api03-` 開頭（標準 API Key）
3. 檢查 Vercel 函數日誌中的錯誤訊息

### 問題 4：圖片上傳失敗

**原因**：R2 環境變數未設定或格式錯誤

**解決**：
1. 確認所有 R2 環境變數已設定
2. 確認 `R2_ACCESS_KEY_ID` 為 32 個字元
3. 確認 `R2_SECRET_ACCESS_KEY` 為 64 個字元
4. 確認 R2 Bucket 已啟用公開存取或已設定自訂網域

---

## 📚 參考文件

- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - 完整環境變數說明
- [README.md](./README.md) - 專案說明
- [Vercel 文件](https://vercel.com/docs)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)

---

## 🔒 安全性檢查清單

- [ ] `.env.local` 不在 Git 追蹤中
- [ ] 所有環境變數已在 Vercel 設定
- [ ] Google OAuth 重新導向 URI 已更新
- [ ] `NEXT_PUBLIC_APP_URL` 已更新為生產網域
- [ ] 使用不同的 API Keys 用於生產環境
- [ ] 定期檢查 Vercel 函數日誌是否有錯誤

---

**部署完成後，您的應用程式應該可以正常運作！** 🎉

如有任何問題，請檢查 Vercel 函數日誌或參考上述常見問題。
