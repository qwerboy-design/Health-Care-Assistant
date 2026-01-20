# Cloudflare Worker R2 代理設定指南

## 概述

此指南將幫助您設定 Cloudflare Worker 作為 R2 自訂網域的代理層，解決 Cloudflare Proxy（橘色）無法直接連接到 R2 的問題。

## 前置條件

- ✅ Cloudflare 帳號
- ✅ R2 Bucket 已建立（`hac-qwerboy`）
- ✅ 網域 `qwerboy.com` 已在 Cloudflare 管理

## 步驟 1：建立 Cloudflare Worker

### 1.1 進入 Workers 頁面

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 選擇您的帳號
3. 在左側選單中，點擊 **Workers & Pages**
4. 點擊 **Create application**
5. 點擊 **Create Worker**

### 1.2 設定 Worker 基本資訊

1. **Worker name**: 輸入 `r2-proxy`（或您喜歡的名稱）
2. **HTTP handler**: 保持預設（已選中）
3. 點擊 **Deploy**

### 1.3 編輯 Worker 程式碼

1. Worker 部署後，點擊 **Edit code**
2. 刪除預設的程式碼
3. 複製 `cloudflare-worker/r2-proxy.js` 的內容並貼上
4. 點擊 **Save and deploy**

## 步驟 2：綁定 R2 Bucket

### 2.1 進入 Variables 設定

1. 在 Worker 編輯頁面，點擊右上角的 **Settings** 圖示（齒輪）
2. 在左側選單中，點擊 **Variables and Secrets**

### 2.2 新增 R2 Bucket Binding

1. 滾動到 **R2 Bucket Bindings** 區段
2. 點擊 **Add binding**
3. 輸入：
   - **Variable name**: `R2_BUCKET`（必須與程式碼中的變數名一致）
   - **R2 Bucket**: 從下拉選單中選擇 `hac-qwerboy`
4. 點擊 **Add binding**

### 2.3 驗證綁定

確認在 **R2 Bucket Bindings** 列表中看到：
- Variable name: `R2_BUCKET`
- R2 Bucket: `hac-qwerboy`

## 步驟 3：設定路由

### 3.1 進入 Triggers 設定

1. 在 Worker 設定頁面，點擊 **Triggers**
2. 點擊 **Routes** 標籤

### 3.2 新增路由

1. 點擊 **Add route**
2. 輸入：
   - **Route**: `hca.qwerboy.com/*`
   - **Zone**: 從下拉選單中選擇 `qwerboy.com`
3. 點擊 **Add route**

### 3.3 驗證路由

確認在 **Routes** 列表中看到：
- Route: `hca.qwerboy.com/*`
- Zone: `qwerboy.com`

## 步驟 4：更新 DNS 設定

### 4.1 進入 DNS 設定

1. 在 Cloudflare Dashboard 中，選擇 `qwerboy.com` 網域
2. 點擊 **DNS** → **Records**

### 4.2 檢查或建立 CNAME 記錄

1. 檢查是否已有 `hca` 的記錄
   - 如果存在：點擊編輯
   - 如果不存在：點擊 **Add record**

2. 設定記錄：
   - **Type**: `CNAME`
   - **Name**: `hca`
   - **Target**: 輸入您的 Worker 網域
     - 格式：`r2-proxy.your-account.workers.dev`
     - 或：`r2-proxy.your-subdomain.workers.dev`
     - 您可以在 Worker 頁面的 **Triggers** → **Custom domains** 中找到正確的網域
   - **Proxy status**: **橘色（Proxied）** ✅（現在可以使用橘色）
   - **TTL**: `Auto`

3. 點擊 **Save**

### 4.3 取得 Worker 網域

如果不知道 Worker 網域：
1. 前往 Worker 頁面
2. 點擊 **Triggers** → **Custom domains**
3. 複製顯示的網域（例如：`r2-proxy.your-account.workers.dev`）

## 步驟 5：驗證設定

### 5.1 等待 DNS 傳播

DNS 變更可能需要 5-15 分鐘才能生效。

### 5.2 測試 Worker

1. 在瀏覽器中訪問：`https://hca.qwerboy.com`
2. 應該看到 JSON 回應：
   ```json
   {
     "message": "R2 Proxy Worker is running",
     "usage": "Access files at: https://hca.qwerboy.com/your-file-path",
     "bucket": "Bound"
   }
   ```

### 5.3 測試檔案存取

1. 確保 R2 Bucket 中有測試檔案（例如：`test.jpg`）
2. 在瀏覽器中訪問：`https://hca.qwerboy.com/test.jpg`
3. 應該能夠看到或下載檔案

### 5.4 執行診斷腳本

```bash
node scripts/diagnose-r2-config.js
```

應該看到：
- ✅ DNS 解析成功
- ✅ HTTP 連線成功（狀態碼 200）

## 步驟 6：更新應用程式環境變數

確保您的應用程式環境變數設定正確：

```env
R2_PUBLIC_URL=https://hca.qwerboy.com
```

在 Vercel 或其他部署平台中：
1. 前往 **Settings** → **Environment Variables**
2. 確認 `R2_PUBLIC_URL` 設定為 `https://hca.qwerboy.com`
3. 如果修改了，重新部署應用程式

## 進階設定（可選）

### 自訂錯誤頁面

修改 Worker 程式碼中的錯誤處理部分，可以自訂 404 或其他錯誤頁面。

### 快取設定

調整 `Cache-Control` 標頭以控制快取行為：
- 圖片：`public, max-age=31536000`（1 年）
- 文件：`public, max-age=3600`（1 小時）

### CORS 設定

如果需要限制 CORS，修改 `Access-Control-Allow-Origin` 標頭：
```javascript
headers.set('Access-Control-Allow-Origin', 'https://yourdomain.com');
```

### 路徑重寫

如果需要路徑重寫（例如：移除前綴），可以在 Worker 中處理：
```javascript
// 移除前綴 /files/
const objectKey = url.pathname.replace(/^\/files\//, '');
```

## 疑難排解

### 問題 1：Worker 返回 "Object not found"

**可能原因**：
- R2 Bucket 未正確綁定
- 物件路徑不正確

**解決方法**：
1. 檢查 R2 Bucket Binding 是否正確設定
2. 確認物件在 R2 Bucket 中存在
3. 檢查物件路徑是否正確（區分大小寫）

### 問題 2：DNS 無法解析

**可能原因**：
- DNS 記錄未正確設定
- DNS 尚未傳播

**解決方法**：
1. 確認 CNAME 記錄指向正確的 Worker 網域
2. 等待 5-15 分鐘讓 DNS 傳播
3. 使用 `nslookup hca.qwerboy.com` 檢查 DNS 解析

### 問題 3：返回 500 錯誤

**可能原因**：
- Worker 程式碼錯誤
- R2 Bucket 權限問題

**解決方法**：
1. 檢查 Worker 的 Logs（在 Worker 頁面的 **Logs** 標籤）
2. 確認 R2 Bucket 權限設定正確
3. 確認 Worker 有權限存取 R2 Bucket

### 問題 4：檔案無法下載

**可能原因**：
- Content-Type 設定不正確
- CORS 設定問題

**解決方法**：
1. 檢查 Worker 程式碼中的 Content-Type 設定
2. 確認 CORS 標頭設定正確
3. 檢查瀏覽器 Console 是否有錯誤訊息

## 費用說明

### Cloudflare Workers 免費額度

- **請求數**: 每天 100,000 次
- **CPU 時間**: 每天 10ms CPU 時間（每 1000 次請求）
- **子請求**: 每天 50,000 次

### 超出免費額度

如果超出免費額度，會按照使用量收費：
- **請求數**: $0.50 / 百萬次請求
- **CPU 時間**: $0.02 / 百萬 GB-秒

對於大多數應用來說，免費額度已經足夠使用。

## 相關資源

- [Cloudflare Workers 文件](https://developers.cloudflare.com/workers/)
- [Cloudflare R2 文件](https://developers.cloudflare.com/r2/)
- [Workers R2 Bindings](https://developers.cloudflare.com/workers/runtime-apis/r2/)

## 下一步

1. ✅ 完成 Worker 設定
2. ✅ 測試檔案存取
3. ✅ 更新應用程式環境變數
4. ✅ 重新部署應用程式
5. ✅ 驗證檔案上傳和下載功能

---

**最後更新**: 2026-01-20
**相關檔案**: `cloudflare-worker/r2-proxy.js`, `scripts/diagnose-r2-config.js`
