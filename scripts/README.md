# 自動化測試腳本說明

本目錄包含用於驗證 Health Care Assistant 系統功能正確性的自動化測試腳本。

## 📋 可用腳本

### 1. `verify-system.js` - 系統驗證測試

基礎驗證測試，檢查環境設定、API 端點可用性和系統配置。

**執行方式**：
```bash
npm run test
# 或
npm run test:verify
```

**測試項目**：
- ✅ 環境變數檢查（從 `.env.local` 讀取）
- ✅ 必要檔案檢查
- ✅ API 端點可用性
- ✅ 頁面可訪問性
- ✅ MCP Server 配置
- ✅ Session 驗證
- ✅ 註冊功能驗證

**輸出範例**：
```
🚀 開始自動化驗證
✅ 環境變數: JWT_SECRET: 已設定
✅ API: POST /api/auth/register: 狀態碼: 400 (預期範圍內)
✅ 頁面: 登入頁 (/login): 狀態碼: 200
...
📊 測試報告
通過率: 85.7%
```

---

### 2. `test-integration.js` - 整合測試

完整的功能流程測試，從註冊到發送訊息的完整流程。

**執行方式**：
```bash
npm run test:integration
```

**測試流程**：
1. 註冊新用戶（使用時間戳生成唯一 Email）
2. 登入
3. 獲取當前用戶資訊
4. 獲取對話列表
5. 發送訊息（如果 Supabase 和 MCP Server 已配置）
6. 登出

**前置條件**：
- 開發伺服器運行中 (`npm run dev`)
- 環境變數已設定（部分功能需要）

**輸出範例**：
```
🚀 開始整合測試
✅ 註冊成功
✅ 登入成功
✅ 獲取用戶資訊成功
✅ 獲取對話列表成功 (0 個對話)
⚠️  發送訊息失敗（可能是 Supabase 或 MCP Server 未配置）: 500
✅ 登出成功

📊 整合測試報告
成功率: 83.3% (5/6)
```

---

## 🔧 環境變數設定

測試腳本會自動從 `.env.local` 讀取環境變數。如果環境變數未設定，相關測試會被標記為警告或跳過。

**必要環境變數**：
- `JWT_SECRET` - JWT 密鑰（必要）

**可選環境變數**：
- `SUPABASE_URL` - Supabase 資料庫 URL
- `SUPABASE_ANON_KEY` - Supabase 匿名金鑰
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服務角色金鑰
- `MCP_SERVER_URL` - MCP Server URL（預設: `https://mcp.k-dense.ai/claude-scientific-skills/mcp`）
- `MCP_API_KEY` - MCP Server API Key（可選）
- `RESEND_API_KEY` - Resend Email API Key
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret

**測試專用環境變數**：
- `TEST_BASE_URL` - 測試基礎 URL（預設: `http://localhost:3000`）

---

## 📊 測試結果解讀

### 狀態標記

- ✅ **通過** - 測試成功
- ❌ **失敗** - 測試失敗，需要檢查
- ⚠️ **警告** - 測試跳過或部分通過（通常是環境未配置）
- ⏭️ **跳過** - 測試未執行（通常是前置條件未滿足）

### 常見情況

1. **API 端點返回 401** - 這是正常的，表示端點存在且正確驗證請求
2. **發送訊息測試跳過** - 如果 Supabase 或 MCP Server 未配置，這是預期的
3. **環境變數警告** - 可選環境變數未設定時會顯示警告，但不影響核心功能測試

---

## 🚀 快速開始

1. **啟動開發伺服器**：
   ```bash
   npm run dev
   ```

2. **在另一個終端執行測試**：
   ```bash
   # 基礎驗證
   npm run test
   
   # 整合測試
   npm run test:integration
   ```

3. **查看測試結果**：
   - 測試會輸出彩色結果到終端
   - 失敗的測試會顯示詳細錯誤訊息
   - 最後會顯示測試報告和通過率

---

## 🔍 疑難排解

### 問題：無法連接到伺服器

**解決方案**：
- 確認開發伺服器正在運行 (`npm run dev`)
- 檢查 `TEST_BASE_URL` 環境變數設定
- 確認伺服器運行在正確的端口（預設 3000）

### 問題：環境變數未讀取

**解決方案**：
- 確認 `.env.local` 檔案存在於專案根目錄
- 確認環境變數格式正確（`KEY=value`，不含空格）
- 確認環境變數名稱正確（大小寫敏感）

### 問題：整合測試失敗

**解決方案**：
- 檢查 Supabase 環境變數是否設定（如需測試資料庫功能）
- 檢查 MCP Server 配置（如需測試 AI 對話功能）
- 查看詳細錯誤訊息以確定失敗原因

---

## 📝 注意事項

1. **測試資料**：整合測試會創建真實的測試用戶，使用時間戳生成唯一 Email
2. **環境隔離**：建議在開發環境執行測試，避免影響生產資料
3. **依賴服務**：部分測試需要外部服務（Supabase、MCP Server），未配置時會自動跳過
4. **Node.js 版本**：需要 Node.js 18+ 以使用原生 fetch 和 FormData API

---

## 🔄 持續整合

這些測試腳本可以整合到 CI/CD 流程中：

```yaml
# 範例 GitHub Actions
- name: Run tests
  run: |
    npm run test
    npm run test:integration
```

或在 package.json 中添加：

```json
{
  "scripts": {
    "test:all": "npm run test && npm run test:integration"
  }
}
```
