# ⚡ Vercel 快速部署參考卡

## 🎯 快速開始（5 分鐘部署）

### 步驟 1: 前往 Vercel
👉 [https://vercel.com/new](https://vercel.com/new)

### 步驟 2: 導入 GitHub 倉庫
```
倉庫: qwerboy-design/Health-Care-Assistant
分支: main
```

### 步驟 3: 設定環境變數（15 個必須）

**✅ 使用檢查清單**: 參考 `VERCEL_ENV_CHECKLIST.md`

#### 快速複製清單（Key 名稱）
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET
NEXT_PUBLIC_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
RESEND_API_KEY
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
ANTHROPIC_API_KEY
ANTHROPIC_MODEL
NEXT_PUBLIC_APP_URL
ADMIN_EMAIL
```

### 步驟 4: 點擊 Deploy 🚀

---

## 📋 部署後必做事項

### ✅ 立即執行（部署完成後 5 分鐘內）

1. **複製 Vercel URL**
   - 範例: `https://health-care-assistant-xxx.vercel.app`

2. **更新 `NEXT_PUBLIC_APP_URL` 環境變數**
   - 在 Vercel Dashboard → Settings → Environment Variables
   - 找到 `NEXT_PUBLIC_APP_URL` 並更新為實際 URL
   - 選擇所有環境並儲存
   - **點擊 "Redeploy" 重新部署**

3. **更新 Google OAuth 重定向 URI**
   - 前往 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - 選擇您的 OAuth Client ID
   - 在 **Authorized redirect URIs** 添加:
     ```
     https://your-actual-vercel-url.vercel.app/api/auth/google/callback
     ```
   - 在 **Authorized JavaScript origins** 添加:
     ```
     https://your-actual-vercel-url.vercel.app
     ```
   - 儲存

### ✅ 測試驗證

訪問您的 Vercel URL 並測試：
- [ ] 首頁正常載入
- [ ] 註冊功能正常
- [ ] Email 登入正常
- [ ] Google OAuth 登入正常
- [ ] 對話功能正常
- [ ] 檔案上傳正常

---

## 🔑 快速取得 API Keys

### Supabase
👉 [https://supabase.com/dashboard](https://supabase.com/dashboard)
→ 您的項目 → Settings → API

### Google OAuth
👉 [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
→ 建立 OAuth Client ID

### Resend
👉 [https://resend.com/api-keys](https://resend.com/api-keys)
→ Create API Key

### Cloudflare R2
👉 [https://dash.cloudflare.com](https://dash.cloudflare.com)
→ R2 → 您的儲存桶 → Settings

### Anthropic
👉 [https://console.anthropic.com/](https://console.anthropic.com/)
→ API Keys

---

## 🆘 遇到問題？

### 建置失敗
```bash
# 本地測試建置
npm run build
```
查看錯誤訊息並修正

### 環境變數錯誤
1. 檢查變數名稱拼寫
2. 確認已選擇正確環境（Production）
3. 重新部署

### Google OAuth 不工作
1. 確認已更新 Redirect URI
2. 檢查 Client ID 和 Secret 是否正確
3. 等待 5-10 分鐘讓 Google 設定生效

### 查看日誌
Vercel Dashboard → 您的項目 → Deployments → 選擇部署 → View Function Logs

---

## 📚 詳細文檔

- 📖 完整部署指南: `GITHUB_VERCEL_DEPLOYMENT_STEPS.md`
- ✅ 環境變數清單: `VERCEL_ENV_CHECKLIST.md`
- 🔧 系統架構: `ARCHITECTURE.md`
- 📋 部署檢查清單: `DEPLOYMENT_CHECKLIST.md`

---

## 🎉 部署成功！

您的應用程式現在已在全球 CDN 上運行！

**接下來可以做什麼**:
- 設定自訂網域
- 監控使用情況
- 邀請用戶測試
- 檢查 Analytics

**Vercel 自動化功能**:
- ✅ 推送到 `main` → 自動部署到 Production
- ✅ 推送到其他分支 → 自動建立 Preview
- ✅ SSL 證書自動管理
- ✅ 全球 CDN 加速

---

**祝您部署順利！** 🚀
