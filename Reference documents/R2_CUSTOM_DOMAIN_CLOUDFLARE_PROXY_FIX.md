# Cloudflare R2 自訂網域 404 錯誤修復指南

## 問題描述

`hca.qwerboy.com` 出現 404 錯誤，診斷發現：
- ✅ 環境變數設定正確
- ❌ DNS 沒有 CNAME 記錄
- ❌ HTTP 返回 404（Object not found）
- ⚠️ **Cloudflare Proxy 狀態為橘色（Proxied），無法更改為灰色（DNS only）**

## 根本原因

當 Cloudflare DNS 的 Proxy 狀態為**橘色（Proxied）**時，所有請求會先經過 Cloudflare 的代理伺服器。但是 **Cloudflare R2 的自訂網域需要直接連接到 R2 服務**，不能通過 Cloudflare 的代理。

這導致：
1. 請求被 Cloudflare 代理攔截
2. Cloudflare 無法正確路由到 R2 服務
3. 返回 404 錯誤

## 解決方案

### 方案 1：使用 Cloudflare Workers（推薦）

使用 Cloudflare Workers 作為代理層，將請求轉發到 R2。

#### 步驟 1：建立 Cloudflare Worker

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 選擇您的帳號
3. 前往 **Workers & Pages** → **Create application** → **Create Worker**
4. 輸入 Worker 名稱（例如：`r2-proxy`）
5. 點擊 **Deploy**

#### 步驟 2：編寫 Worker 程式碼

在 Worker 編輯器中，貼上以下程式碼：

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 從 R2 Bucket 讀取物件
    const objectKey = url.pathname.slice(1); // 移除開頭的 /
    
    try {
      // 從環境變數取得 R2 Bucket binding
      const object = await env.R2_BUCKET.get(objectKey);
      
      if (object === null) {
        return new Response('Object not found', { status: 404 });
      }
      
      // 設定適當的 Content-Type
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      
      return new Response(object.body, {
        headers,
      });
    } catch (error) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  },
};
```

#### 步驟 3：綁定 R2 Bucket

1. 在 Worker 設定頁面，點擊 **Variables and Secrets**
2. 在 **R2 Bucket Bindings** 區段，點擊 **Add binding**
3. 輸入：
   - **Variable name**: `R2_BUCKET`
   - **R2 Bucket**: 選擇您的 Bucket（`hac-qwerboy`）
4. 點擊 **Save**

#### 步驟 4：設定路由

1. 在 Worker 設定頁面，點擊 **Triggers** → **Routes**
2. 點擊 **Add route**
3. 輸入：
   - **Route**: `hca.qwerboy.com/*`
   - **Zone**: 選擇 `qwerboy.com`
4. 點擊 **Save**

#### 步驟 5：更新 DNS 設定

1. 前往 **DNS** → **Records**
2. 找到或建立 `hca.qwerboy.com` 的記錄
3. 設定：
   - **Type**: `CNAME`
   - **Name**: `hca`
   - **Target**: `r2-proxy.your-account.workers.dev`（或您的 Worker 網域）
   - **Proxy status**: **橘色（Proxied）** ✅（現在可以使用橘色）
4. 點擊 **Save**

### 方案 2：使用 Cloudflare Transform Rules（較簡單）

如果您的 R2 Bucket 已經啟用公開存取，可以使用 Transform Rules 來重寫請求。

#### 步驟 1：取得 R2 公開網域

1. 登入 Cloudflare Dashboard → **R2**
2. 選擇您的 Bucket（`hac-qwerboy`）
3. 前往 **Settings** → **Public Access**
4. 複製 **Public R2.dev subdomain**（例如：`hac-qwerboy.r2.dev`）

#### 步驟 2：建立 Transform Rule

1. 前往 **Rules** → **Transform Rules** → **Rewrite URL**
2. 點擊 **Create rule**
3. 輸入：
   - **Rule name**: `R2 Proxy Rewrite`
   - **When incoming requests match**: 
     - **Field**: `Hostname`
     - **Operator**: `equals`
     - **Value**: `hca.qwerboy.com`
   - **Then rewrite to**:
     - **Type**: `Dynamic`
     - **Expression**: `concat("https://hac-qwerboy.r2.dev", http.request.uri.path)`
4. 點擊 **Deploy**

#### 步驟 3：更新 DNS 設定

1. 前往 **DNS** → **Records**
2. 找到或建立 `hca.qwerboy.com` 的記錄
3. 設定：
   - **Type**: `CNAME`
   - **Name**: `hca`
   - **Target**: `hac-qwerboy.r2.dev`
   - **Proxy status**: **橘色（Proxied）** ✅
4. 點擊 **Save**

**注意**：此方案需要 R2 Bucket 啟用公開存取，且使用 `r2.dev` 子網域。

### 方案 3：使用其他 DNS 提供商（如果可能）

如果您的網域可以在其他 DNS 提供商管理：

1. 將 `hca.qwerboy.com` 的 DNS 記錄移到其他提供商（如 Route 53、Namecheap 等）
2. 在該提供商中建立 CNAME 記錄，指向 R2 提供的目標
3. 確保不使用代理（DNS only）

### 方案 4：使用 R2 的預設公開網域（臨時方案）

如果自訂網域無法正常工作，可以暫時使用 R2 的預設公開網域：

1. 在 R2 Bucket Settings 中，啟用 **Public Access**
2. 取得 **Public R2.dev subdomain**（例如：`hac-qwerboy.r2.dev`）
3. 更新環境變數 `R2_PUBLIC_URL` 為 `https://hac-qwerboy.r2.dev`
4. 重新部署應用程式

## 推薦方案比較

| 方案 | 優點 | 缺點 | 適用場景 |
|------|------|------|----------|
| **Workers** | 完全控制、可自訂邏輯、支援快取 | 需要編寫程式碼、可能有額外費用 | 需要自訂邏輯或快取 |
| **Transform Rules** | 簡單、無需程式碼 | 需要 R2 公開存取、使用 r2.dev 網域 | 簡單的重寫需求 |
| **其他 DNS** | 最簡單、直接連線 | 需要管理多個 DNS 提供商 | 可以切換 DNS 提供商 |
| **預設網域** | 立即可用 | 不是自訂網域 | 臨時解決方案 |

## 驗證步驟

完成設定後，執行以下步驟驗證：

1. **執行診斷腳本**：
   ```bash
   node scripts/diagnose-r2-config.js
   ```

2. **測試網域連線**：
   ```bash
   curl -I https://hca.qwerboy.com/test-file.jpg
   ```
   應該返回 200 或 404（如果檔案不存在），但不應該是 "Object not found" 錯誤頁面。

3. **檢查回應標頭**：
   - 確認 `Server` 標頭不是 `cloudflare`（如果使用方案 3）
   - 確認 `CF-Ray` 標頭存在（如果使用方案 1 或 2）

## 常見問題

### Q: 為什麼 Cloudflare Proxy 狀態無法更改？

A: 某些 Cloudflare 方案或設定可能限制 DNS 記錄必須使用 Proxy。這是 Cloudflare 的安全和效能功能。

### Q: 使用 Workers 會有額外費用嗎？

A: Cloudflare Workers 有免費額度（每天 100,000 次請求），對於大多數應用來說足夠使用。

### Q: 方案 2 中的 Transform Rules 在哪裡？

A: Transform Rules 在 Cloudflare Dashboard 的 **Rules** → **Transform Rules** 中。如果看不到，可能需要升級到 Pro 方案或更高。

### Q: 哪個方案最適合我？

A: 
- 如果只需要簡單的代理：使用 **方案 2（Transform Rules）**
- 如果需要更多控制或快取：使用 **方案 1（Workers）**
- 如果可以切換 DNS：使用 **方案 3（其他 DNS）**
- 如果只是臨時需要：使用 **方案 4（預設網域）**

## 下一步

1. 選擇一個方案並執行
2. 等待 DNS 傳播（5-15 分鐘）
3. 執行診斷腳本驗證
4. 測試檔案上傳和下載功能

---

**最後更新**: 2026-01-20
**相關文件**: `scripts/diagnose-r2-config.js`, `lib/storage/upload.ts`
