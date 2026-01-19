# ✅ 部署檢查清單

在部署到 GitHub 和 Vercel 之前，請確認以下項目：

---

## 🔐 環境變數安全性

- [ ] 執行 `npm run check:env` 確認環境變數安全性
- [ ] 確認 `.env.local` 不在 Git 追蹤中
- [ ] 確認 `.gitignore` 包含 `.env*.local` 和 `.env`
- [ ] 確認 `.env.example` 存在（不含敏感資訊）

---

## 📝 代碼準備

- [ ] 所有變更已提交到本地 Git
- [ ] 執行 `npm run build` 確認建置成功
- [ ] 執行 `npm run lint` 確認沒有語法錯誤
- [ ] 本地測試通過（註冊、登入、對話功能）

---

## 🌐 GitHub 部署

- [ ] 已在 GitHub 建立新倉庫
- [ ] 已添加遠端倉庫：`git remote add origin <url>`
- [ ] 確認 `.env.local` 不會被提交（執行 `git status` 檢查）
- [ ] 提交並推送：`git push -u origin main`

---

## 🚀 Vercel 部署

### 環境變數設定

- [ ] **Supabase**
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **JWT**
  - [ ] `JWT_SECRET`

- [ ] **Google OAuth**
  - [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`

- [ ] **Resend Email**
  - [ ] `RESEND_API_KEY`
  - [ ] `RESEND_FROM_EMAIL`

- [ ] **Cloudflare R2**
  - [ ] `R2_ACCOUNT_ID`
  - [ ] `R2_ACCESS_KEY_ID` (32 字元)
  - [ ] `R2_SECRET_ACCESS_KEY` (64 字元)
  - [ ] `R2_BUCKET_NAME`
  - [ ] `R2_PUBLIC_URL` (可選)

- [ ] **Anthropic API**
  - [ ] `ANTHROPIC_API_KEY` (標準 API Key，以 `sk-ant-api03-` 開頭)
  - [ ] `ANTHROPIC_MODEL` (可選)

- [ ] **Next.js**
  - [ ] `NEXT_PUBLIC_APP_URL` (部署後更新為 Vercel 網域)

- [ ] **MCP Server** (可選)
  - [ ] `MCP_SERVER_URL`
  - [ ] `MCP_API_KEY`

### 部署設定

- [ ] 已連接 GitHub 倉庫到 Vercel
- [ ] 所有環境變數已在 Vercel 設定
- [ ] 已更新 Google OAuth 重新導向 URI
- [ ] 已更新 `NEXT_PUBLIC_APP_URL` 為生產網域
- [ ] 已觸發部署並等待完成

---

## ✅ 部署後驗證

- [ ] 網站可以正常訪問
- [ ] 註冊功能正常
- [ ] 登入功能正常（密碼/OTP/Google）
- [ ] Google OAuth 登入正常
- [ ] 對話功能正常
- [ ] 圖片上傳功能正常
- [ ] MCP/AI 回應正常
- [ ] 檢查 Vercel 函數日誌無錯誤

---

## 📚 參考文件

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 詳細部署指南
- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - 環境變數說明

---

**完成所有檢查項目後，您的應用程式應該可以正常運作！** 🎉
