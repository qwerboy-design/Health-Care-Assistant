# 🚀 Vercel 部署指南

本指南將協助您將 Health Care Assistant 部署到 Vercel 平台。

## 📋 前置需求

1. **GitHub 帳號** - 專案需推送到 GitHub
2. **Vercel 帳號** - 註冊 https://vercel.com
3. **環境變數準備** - 所有必要的 API 金鑰和設定值

## 🔧 部署步驟

### 步驟 1: 連接 GitHub 倉庫

1. 登入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 點擊 **"Add New..."** → **"Project"**
3. 選擇 **"Import Git Repository"**
4. 在搜尋框中輸入 `qwerboy-design/Health-Care-Assistant`
5. 選擇該倉庫並點擊 **"Import"**

### 步驟 2: 設定專案配置

Vercel 會自動偵測到 Next.js 專案，配置如下：

- **Framework Preset**: Next.js
- **Root Directory**: `./` (預設)
- **Build Command**: `npm run build` (自動偵測)
- **Output Directory**: `.next` (自動偵測)
- **Install Command**: `npm install` (自動偵測)

> ✅ 這些設定已在 `vercel.json` 中配置，無需手動修改

### 步驟 3: 設定環境變數

在專案設定頁面中，展開 **"Environment Variables"** 區塊，新增以下環境變數：

#### 🔐 必須設定的環境變數

```env
# Supabase 資料庫
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT 加密金鑰 (至少 32 字元)
JWT_SECRET=your_jwt_secret_at_least_32_characters_long

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_client_secret

# Email 服務 (Resend)
RESEND_API_KEY=re_your_resend_api_key

# MCP Server
MCP_SERVER_URL=https://mcp.k-dense.ai/claude-scientific-skills/mcp
# MCP_API_KEY= (可選，如需認證)

# 應用程式 URL (部署後更新)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

#### 📝 設定說明

1. **環境變數範圍**: 
   - 對於所有環境變數，選擇 **Production**, **Preview**, **Development** 三種環境
   - 或依需求選擇特定環境

2. **敏感資訊保護**:
   - ✅ Vercel 會自動加密所有環境變數
   - ✅ 不要將 `.env.local` 提交到 Git
   - ✅ 生產環境使用不同的 API 金鑰

3. **變數命名注意**:
   - `NEXT_PUBLIC_*` 開頭的變數會暴露給瀏覽器
   - 其他變數僅在 Server 端可用

### 步驟 4: 部署專案

1. 確認所有環境變數已設定
2. 點擊 **"Deploy"** 按鈕
3. 等待建置完成（約 2-5 分鐘）

### 步驟 5: 驗證部署

部署完成後：

1. **檢查部署狀態**:
   - 綠色 ✅ 表示部署成功
   - 紅色 ❌ 表示建置失敗，查看日誌

2. **測試應用程式**:
   - 訪問 Vercel 提供的 URL (例如: `https://health-care-assistant.vercel.app`)
   - 測試登入功能
   - 測試對話功能

3. **更新環境變數** (如需要):
   - 如果 `NEXT_PUBLIC_APP_URL` 需要更新為實際網域
   - 在 Vercel Dashboard → Settings → Environment Variables 中更新

## 🔄 Google OAuth 重定向 URI 設定

部署到 Vercel 後，需要更新 Google OAuth 設定：

1. 前往 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 選擇您的 OAuth 2.0 Client ID
3. 在 **"Authorized redirect URIs"** 中新增:
   ```
   https://your-app.vercel.app/api/auth/google/callback
   ```
   (將 `your-app.vercel.app` 替換為實際的 Vercel 網域)

4. 儲存變更

## 🌐 自訂網域設定 (可選)

1. 在 Vercel Dashboard → Settings → Domains
2. 輸入您的網域 (例如: `healthcare.example.com`)
3. 按照指示設定 DNS 記錄
4. 等待 DNS 傳播完成

## 📊 監控與日誌

### 查看部署日誌

1. 在 Vercel Dashboard → Deployments
2. 選擇特定的部署
3. 查看 **"Build Logs"** 和 **"Function Logs"**

### 常見問題排查

#### 建置失敗: "Module not found"

**原因**: 依賴套件未正確安裝

**解決**:
```bash
# 本地測試建置
npm run build
```

#### 運行時錯誤: "Environment variable not found"

**原因**: 環境變數未設定或名稱錯誤

**解決**:
1. 檢查 Vercel Dashboard 中的環境變數
2. 確認變數名稱與程式碼中使用的完全一致
3. 重新部署

#### 功能異常: API 請求失敗

**原因**: API 端點設定錯誤或環境變數未正確載入

**解決**:
1. 檢查 Vercel Function Logs
2. 確認 `NEXT_PUBLIC_APP_URL` 設定正確
3. 檢查 CORS 設定（已在 `vercel.json` 中配置）

## 🔐 安全性建議

1. **環境變數**:
   - ✅ 使用不同的 API 金鑰用於生產和開發環境
   - ✅ 定期輪換敏感金鑰
   - ✅ 不要在前端暴露敏感資訊

2. **API 端點**:
   - ✅ 所有 API 路由已設定適當的 CORS 政策
   - ✅ JWT Token 使用 HttpOnly Cookie 保護

3. **資料庫**:
   - ✅ 使用 Row Level Security (RLS) 保護 Supabase 資料
   - ✅ 限制 Service Role Key 的使用範圍

## 📝 後續更新部署

當您推送新的代碼到 GitHub 時：

1. Vercel 會自動觸發新的部署
2. 部署前會自動執行 `npm run build`
3. 部署成功後會自動更新生產環境

## 🆘 需要協助？

如果遇到問題：

1. 查看 [Vercel 文件](https://vercel.com/docs)
2. 查看專案的 `README.md` 和 `DEVELOPMENT_STATUS.md`
3. 檢查 Vercel 的部署日誌

---

**部署成功後，您的應用程式將可在全球 CDN 上訪問！** 🎉
