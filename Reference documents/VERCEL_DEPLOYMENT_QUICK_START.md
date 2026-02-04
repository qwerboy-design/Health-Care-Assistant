# 🚀 Vercel 部署快速指南

## 📋 當前狀態

✅ **GitHub 倉庫**: `https://github.com/qwerboy-design/Health-Care-Assistant.git`  
✅ **最新提交**: `9beb74e` - "feat: Add image upload support and deployment guides"  
✅ **建置狀態**: 通過（無錯誤）  
✅ **Vercel 配置**: `vercel.json` 已設定

---

## 🌐 步驟 1：連接 GitHub 倉庫到 Vercel

### 方法 A：透過 Vercel Dashboard（推薦）

1. **登入 Vercel**
   - 前往 [https://vercel.com](https://vercel.com)
   - 使用 GitHub 帳號登入

2. **導入專案**
   - 點擊右上角「**Add New Project**」
   - 選擇「**Import Git Repository**」
   - 找到並選擇 `qwerboy-design/Health-Care-Assistant`
   - 點擊「**Import**」

3. **專案設定**
   - Vercel 會自動偵測 Next.js 專案
   - **Framework Preset**: Next.js（自動偵測）
   - **Root Directory**: `./`（預設）
   - **Build Command**: `npm run build`（自動偵測）
   - **Output Directory**: `.next`（自動偵測）
   - **Install Command**: `npm install`（自動偵測）

---

## 🔐 步驟 2：設定環境變數

**⚠️ 重要：在部署前必須設定所有環境變數！**

在 Vercel 專案設定頁面，點擊「**Environment Variables**」，然後依序添加：

### Supabase 資料庫
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### JWT Session
```
JWT_SECRET=your_jwt_secret_at_least_32_characters_long
```

### Google OAuth
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_client_secret
```

### Resend Email
```
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### Cloudflare R2
```
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id_32_chars
R2_SECRET_ACCESS_KEY=your_secret_access_key_64_chars
R2_BUCKET_NAME=chat-files
R2_PUBLIC_URL=https://your-domain.com  # 可選
```

### Anthropic API
```
ANTHROPIC_API_KEY=sk-ant-api03-your_api_key_here
ANTHROPIC_MODEL=claude-3-haiku-20240307  # 可選
```

### Next.js
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app  # 部署後更新
```

### MCP Server（可選）
```
MCP_SERVER_URL=https://mcp.k-dense.ai/claude-scientific-skills/mcp
MCP_API_KEY=
```

**設定每個環境變數時：**
- 輸入 **Name**（變數名稱）
- 輸入 **Value**（變數值）
- 選擇適用環境：
  - ✅ **Production**（生產環境）
  - ✅ **Preview**（預覽環境）
  - ✅ **Development**（開發環境）
- 點擊「**Save**」

---

## 🚀 步驟 3：部署

1. **確認設定**
   - 確認所有環境變數已設定
   - 確認專案設定正確

2. **開始部署**
   - 點擊「**Deploy**」
   - 等待部署完成（約 2-5 分鐘）

3. **查看部署狀態**
   - 在 Deployments 頁面查看部署進度
   - 等待狀態變為「Ready」

---

## ✅ 步驟 4：部署後設定

### 4.1 更新 NEXT_PUBLIC_APP_URL

1. 部署完成後，記下 Vercel 提供的網域（例如：`https://health-care-assistant.vercel.app`）
2. 在 Vercel Dashboard → Settings → Environment Variables
3. 找到 `NEXT_PUBLIC_APP_URL`
4. 更新為您的 Vercel 網域：
   ```
   https://your-app.vercel.app
   ```
5. 點擊「**Save**」
6. 前往 Deployments → 點擊最新部署右側的「**⋯**」→ **Redeploy**

### 4.2 更新 Google OAuth 重新導向 URI

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
5. 點擊「**Save**」

---

## 🧪 步驟 5：驗證部署

### 5.1 基本功能測試

1. **網站訪問**
   - 訪問 `https://your-app.vercel.app`
   - 確認網站可以正常載入

2. **註冊功能**
   - 訪問 `https://your-app.vercel.app/register`
   - 測試註冊流程

3. **登入功能**
   - 訪問 `https://your-app.vercel.app/login`
   - 測試密碼登入
   - 測試 OTP 登入
   - 測試 Google OAuth 登入

4. **對話功能**
   - 登入後，訪問 `https://your-app.vercel.app/chat`
   - 測試發送訊息
   - 測試上傳圖片
   - 確認 AI 回應正常

### 5.2 檢查日誌

在 Vercel Dashboard → Deployments → 選擇最新部署 → **Functions** → 查看日誌：

- ✅ 確認沒有環境變數錯誤
- ✅ 確認 MCP Client 成功初始化
- ✅ 確認 API 呼叫正常
- ✅ 確認圖片上傳功能正常

---

## 🔄 後續更新

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

### 問題 1：部署失敗

**檢查項目：**
- 確認所有環境變數已設定
- 查看 Vercel 部署日誌中的錯誤訊息
- 確認 `npm run build` 在本地可以成功執行

### 問題 2：環境變數未生效

**解決方法：**
1. 確認環境變數已保存
2. 前往 Deployments → 點擊「**Redeploy**」

### 問題 3：Google OAuth 錯誤

**解決方法：**
1. 確認 Google Cloud Console 中的重新導向 URI 包含 Vercel 網域
2. 確認 `NEXT_PUBLIC_APP_URL` 環境變數已更新為生產網域

### 問題 4：MCP/AI 回應失敗

**解決方法：**
1. 確認 `ANTHROPIC_API_KEY` 已設定
2. 確認 API Key 以 `sk-ant-api03-` 開頭（標準 API Key）
3. 檢查 Vercel 函數日誌中的錯誤訊息

### 問題 5：圖片上傳失敗

**解決方法：**
1. 確認所有 R2 環境變數已設定
2. 確認 `R2_ACCESS_KEY_ID` 為 32 個字元
3. 確認 `R2_SECRET_ACCESS_KEY` 為 64 個字元
4. 確認 R2 Bucket 已啟用公開存取或已設定自訂網域

---

## 📚 參考文件

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 詳細部署指南
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - 部署檢查清單
- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - 環境變數說明

---

## ✅ 部署檢查清單

- [ ] 已連接 GitHub 倉庫到 Vercel
- [ ] 所有環境變數已在 Vercel 設定
- [ ] 已觸發部署並等待完成
- [ ] 已更新 `NEXT_PUBLIC_APP_URL` 為生產網域
- [ ] 已更新 Google OAuth 重新導向 URI
- [ ] 已重新部署以應用環境變數變更
- [ ] 已測試所有功能（註冊、登入、對話、圖片上傳）
- [ ] 已檢查 Vercel 函數日誌無錯誤

---

**完成所有步驟後，您的應用程式應該可以正常運作！** 🎉

如有任何問題，請檢查 Vercel 函數日誌或參考上述常見問題。
