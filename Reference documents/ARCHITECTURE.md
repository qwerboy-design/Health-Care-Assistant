# Health Care Assistant 系統架構

最後更新：2026-04-23

## 1. 系統概觀

Health Care Assistant 是一個以 Next.js 14 App Router 為核心的醫療 AI 對話系統，目前整合了以下能力：

- 使用者驗證與審核流程
- 以 credits 控管模型成本
- 對話與訊息持久化
- 檔案上傳與對話紀錄匯出
- FHIR 匯入與摘要整理
- 送往 AI 前的隱私去識別
- 後台模型、客戶與 credits 管理

整體執行型態以伺服器驅動頁面加上 Next.js Route Handlers 為主，後端依賴 Supabase 與多個外部服務。

## 2. 高階架構

```text
瀏覽器
  -> Next.js App Router 頁面與 Client Components
  -> Next.js Route Handlers
      -> auth / session helpers
      -> Supabase data access layer
      -> privacy redaction layer
      -> Anthropic request client
      -> storage helpers for R2 / Blob
  -> 外部服務
      -> Supabase PostgreSQL
      -> Anthropic Messages API
      -> Cloudflare R2
      -> Resend
      -> Google OAuth
```

## 3. 應用分層

### 3.1 呈現層

主要頁面：

- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `app/(main)/chat/page.tsx`
- `app/(main)/conversations/page.tsx`
- `app/(admin)/admin/page.tsx`
- `app/(admin)/admin/models/page.tsx`

主要互動元件：

- `components/chat/ChatWindow.tsx`
- `components/chat/ChatInput.tsx`
- `components/chat/MessageList.tsx`
- `components/chat/ModelSelector.tsx`
- `components/chat/WorkloadSelector.tsx`
- `components/chat/FunctionSelector.tsx`
- `components/chat/CreditsDisplay.tsx`
- `components/chat/FileUploader.tsx`
- `components/fhir/FHIRImportModal.tsx`
- `components/screenshot/ScreenshotCapture.tsx`
- `components/providers/LocaleProvider.tsx`

`app/(main)/chat/page.tsx` 是目前最核心的前端協調者，負責：

- 管理聊天訊息狀態與對話初始化
- 依 query 參數載入既有對話
- 顯示 credits 並在聊天成功後更新
- 觸發截圖、FHIR 匯入與 markdown log 下載
- 每輪對話完成後自動上傳聊天紀錄到 R2
- 依客戶設定與裝置類型控制功能顯示

### 3.2 API 層

驗證與 session：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/google`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/admin-check`
- `POST /api/auth/set-password`

聊天與 AI：

- `POST /api/chat`
- `GET /api/chat`
- `GET /api/conversations`
- `GET /api/models`
- `GET /api/credits`

檔案與匯出：

- `POST /api/chat/upload-token`
- `POST /api/chat/upload`
- `POST /api/chat/save-log`
- `POST /api/upload`

客戶設定：

- `GET /api/customer-settings`
- `POST /api/customer-settings`

後台：

- `GET /api/admin/customers`
- `POST /api/admin/approve`
- `POST /api/admin/reject`
- `GET|POST|PATCH|DELETE /api/admin/models`
- `GET|POST /api/admin/credits`
- `GET|POST /api/admin/customer-settings`
- `POST /api/admin/reset-password`

診斷用途：

- `GET /api/diagnose-api-key`
- `GET /api/test-anthropic-direct`

### 3.3 領域與服務層

`lib/auth/`

- `session.ts`：JWT 建立與驗證
- `password.ts`：bcrypt 雜湊與比對
- `otp-generator.ts`：OTP 產生與到期時間
- `google-oauth.ts`：Google token 驗證流程
- `admin.ts`：後台身分檢查

`lib/supabase/`

- `customers.ts`：客戶資料查詢與 CRUD
- `conversations.ts`：對話資料存取
- `messages.ts`：訊息資料存取
- `credits.ts`：credits 扣款、退款、餘額與歷程
- `model-pricing.ts`：模型清單與價格
- `customer-settings.ts`：客戶 UI 設定
- `otp.ts`：OTP token 儲存

`lib/mcp/`

- `client.ts`：Anthropic 請求編排
- `workload.ts`：workload 對應 skill 數量策略
- `function-mapping.ts`：臨床功能對應 skill 建議
- `types.ts`：請求與回應型別

`lib/fhir/`

- `parser.ts`：FHIR JSON/XML 解析與驗證
- `formatter.ts`：FHIR 摘要格式化
- `mergeFhirImport.ts`：多份 FHIR 合併成單一 LLM 輸入
- `types.ts`：FHIR 型別定義

`lib/privacy/`

- `redaction.ts`：自由文字、檔名、上傳資訊、對話內容與 FHIR 資料遮罩

`lib/storage/`

- `upload-security.ts`：上傳驗證、物件 key 產生、公開網址組裝
- `upload.ts`：直接上傳 helper
- `log-generator.ts`：對話 markdown log 產生
- `model-versions.ts`：前端模型版本快取

### 3.4 資料層

依照程式碼與 migration，目前可見的核心資料表包含：

- `customers`
- `sessions`
- `otp_tokens`
- `chat_conversations`
- `chat_messages`
- `model_pricing`
- `credits_transactions`
- `customer_settings`
- `rate_limits`

重要資料特性：

- credits 透過 `lib/supabase/credits.ts` 中的 RPC 流程變動
- 模型是否可用由 `model_pricing.is_active` 控制
- `customer_settings` 控制 function selector、workload selector 與 screenshot 顯示
- `rate_limits` 以 `consume_rate_limit` SQL function 實作持久化限流

## 4. 核心執行流程

### 4.1 驗證流程

1. 使用者透過密碼、OTP 或 Google OAuth 進行登入。
2. 伺服器驗證憑證後建立 session token。
3. session 主要以 cookie 型式提供給後續受保護路由使用。
4. 後台路由會額外查詢客戶角色並要求 `role === 'admin'`。

### 4.2 聊天流程

1. 前端送出訊息、workload、selected function、可選檔案資訊與 model name。
2. `POST /api/chat` 驗證 session cookie。
3. 對文字與檔名做去識別。
4. 從 Supabase 讀取模型價格並檢查 credits。
5. 第一次發話時建立對話，否則延續既有對話。
6. 先扣除 credits。
7. 寫入使用者訊息。
8. 讀取歷史訊息並再次做安全遮罩。
9. 由 `lib/mcp/client.ts` 組裝 Anthropic 請求。
10. 寫入 assistant 回覆並回傳給前端。
11. 若模型呼叫失敗，則進行 credits 退款。

### 4.3 FHIR 匯入流程

1. 使用者在 `FHIRImportModal` 上傳一份或多份 JSON/XML FHIR。
2. 前端先檢查檔案型別與數量。
3. `lib/fhir/parser.ts` 解析並驗證每份檔案。
4. `lib/privacy/redaction.ts` 遮罩病人識別資訊。
5. `mergeFhirImportsForLLM` 產生合併後的摘要與原始 JSON bundle。
6. 合併後內容回填到聊天輸入流程供 AI 使用。

### 4.4 上傳與紀錄流程

聊天附件：

1. 前端呼叫 `POST /api/chat/upload-token` 取得 R2 presigned URL。
2. 伺服器驗證 metadata 並建立 customer-scope object key。
3. 前端直接上傳至 R2。
4. 聊天訊息保存回傳的公開檔案 URL。

聊天紀錄：

1. 前端呼叫 `POST /api/chat/save-log`。
2. 伺服器從 Supabase 讀取對話與訊息。
3. `lib/storage/log-generator.ts` 產生 markdown。
4. markdown 上傳到 R2，並回傳公開 URL。

## 5. AI 編排

專案內雖然以 MCP 命名，但目前 `lib/mcp/client.ts` 是 AI 請求編排入口，內部會依後台 LLM runtime 設定路由到 Anthropic Messages API 或本地 Ollama。

`lib/mcp/client.ts` 的主要行為：

- 套用醫療導向的 system prompt
- 依 `workloadLevel` 限制可建議的 skill 數量
- 依 `selectedFunction` 附加領域說明
- 偵測匯入 FHIR 標記並補充 FHIR 指示
- 在送出前對文字、歷史訊息、檔名與上傳 metadata 做遮罩
- 可將支援的圖片轉為 base64 inline 傳送
- PDF 或不支援格式則退回檔案參考文字模式
- 使用使用者選擇的模型或系統預設模型
- 讀取 `llm_runtime_settings` 決定 provider；若設定讀取發生一般 Supabase/client 錯誤，必須 fail closed，不可靜默改回 Anthropic
- Ollama 模式呼叫本機 `/api/chat`，附件由後端本機處理，且 timeout 或連線失敗不得自動 fallback 到 Anthropic

## 6. 隱私與安全

目前可確認的控制項目：

- bcrypt 密碼雜湊
- JWT 型 session 驗證
- 後台角色檢查
- 文字、檔名、上傳資訊與 FHIR 資料的遮罩
- `POST /api/chat` 的 request size 保護
- 以 Supabase 實作的持久化 rate limit
- 以上傳 key 驗證 customer scope
- LLM provider URL allowlist 與 SSRF 防護，限制 Ollama URL 僅能使用本機或明確允許的可信 host
- `GET /api/llm-runtime` 需通過 `session` 驗證，且只回傳 sanitized provider 狀態
- LLM runtime audit log 僅記錄設定變更 metadata，不記錄 prompt、FHIR、PDF、圖片 base64 或病患資料

目前的重要架構觀察：

- 多數受保護路由使用 `session` cookie
- `useCustomerSettings` 與 `/api/customer-settings` 則使用 `localStorage` 中的 bearer token
- 代表目前系統仍存在兩種 auth access pattern，尚未完全統一
- Ollama 只代表 LLM 推論本地化；Supabase、R2、auth 與對話紀錄仍依既有部署架構運作，若要達到全資料本地化需另行設計

## 7. 儲存架構

程式碼中同時存在兩條上傳路徑：

- 主要聊天與匯出路徑：Cloudflare R2，使用 S3 相容 API
- 次要通用上傳路徑：Vercel Blob，位於 `app/api/upload/route.ts`

以目前實際功能來看，聊天主路徑依賴的是 R2，因為：

- `POST /api/chat/upload-token` 會發 presigned upload URL
- `POST /api/chat/upload` 會驗證並完成儲存
- `POST /api/chat/save-log` 會將聊天紀錄寫到 R2

## 8. 國際化

國際化實作位於 `lib/i18n/translations.ts` 與 `components/providers/LocaleProvider.tsx`。

目前行為：

- 支援語系：`zh-TW`、`en`
- 前端偏好儲存在 `localStorage` 與 cookie
- Server Components 可從 cookie 讀取 locale
- 翻譯存取方式為 `getT(locale)` 的 dot-path key

## 9. 測試架構

目前自動化測試主要在 `__tests__/` 下：

- `__tests__/api`：Route Handler 行為
- `__tests__/components`：UI 元件行為
- `__tests__/lib`：redaction、storage、credits、FHIR、MCP helpers
- `__tests__/integration`：FHIR 整合測試

測試工具：

- Vitest
- Testing Library
- happy-dom / jsdom

## 10. 目前架構觀察

- 現有路由面比舊文件描述更廣，尤其是 admin credits、模型管理、customer settings 與 upload flow
- 聊天實作雖命名為 MCP，但實際上是直接呼叫 Anthropic API
- customer settings 是目前最明顯偏離 cookie-session 主流程的區塊
- 專案同時存在 R2 與 Vercel Blob 路徑，文件應以 R2 作為聊天主儲存路徑描述


