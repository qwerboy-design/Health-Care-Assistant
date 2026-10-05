# Health Care Assistant

以醫療場景為核心的 AI 助理專案，使用 Next.js 14、Supabase、Anthropic 與 Cloudflare R2 建置。

## 目前狀態

- 已有 App Router 前端頁面，包含登入、註冊、聊天、對話紀錄與管理後台
- 支援密碼登入、OTP 驗證與 Google OAuth
- 以 credits 控制模型使用成本
- 支援 FHIR 匯入，並在送往 LLM 前做隱私去識別
- 支援檔案上傳與對話紀錄匯出到 Cloudflare R2
- 已有模型管理、客戶審核、credits 調整與客戶設定管理功能

## 技術堆疊

- 前端：Next.js 14、React 18、TypeScript、Tailwind CSS
- 後端：Next.js Route Handlers
- 資料庫：Supabase PostgreSQL
- AI：Anthropic Messages API、OpenAI Chat Completions API 或本地 Ollama，入口在 `lib/mcp/client.ts`
- 儲存：Cloudflare R2，另保留一組 Vercel Blob 上傳端點
- 郵件：Resend
- 測試：Vitest、Testing Library

## 主要流程

### 驗證與登入

- 密碼登入與註冊使用 `app/api/auth/login`、`app/api/auth/register`
- OTP 流程使用 `app/api/auth/send-otp`、`app/api/auth/verify-otp`
- Google OAuth 使用 `app/api/auth/google`
- 大部分受保護路由以 `session` cookie 驗證
- 客戶 UI 設定則透過 `app/api/customer-settings` 使用 `localStorage` 中的 bearer token

### 聊天

- `app/(main)/chat/page.tsx` 負責聊天頁狀態、credits 顯示、截圖、FHIR 匯入與紀錄下載
- `app/api/chat/route.ts` 會驗證 session、做敏感資料遮罩、檢查 credits、寫入訊息、透過 provider router 呼叫 Anthropic、OpenAI 或 Ollama，並在模型失敗時退款
- 對話資料儲存在 Supabase，由 `app/api/conversations/route.ts` 提供列表
- 後台 `/admin/llm-settings` 可將全站 LLM provider 切換為 OpenAI 或本地 Ollama；OpenAI 使用 server-side `OPENAI_API_KEY` / `OPENAI_MODEL`，Ollama 模式下文字與附件會在後端本機處理後送往 `http://127.0.0.1:11434/api/chat`
- Ollama 失敗不會自動 fallback 到 Anthropic，避免醫療資料在錯誤時外流；此功能只保證 LLM 推論本地化，不代表 Supabase 或 R2 儲存本地化
- 2026-05-07 Codex Security 驗證後，LLM runtime 設定讀取只在「設定表尚未建立」時使用預設值；一般 Supabase/client 錯誤會 fail closed，避免 Ollama 模式因設定讀取失敗而靜默切回 Anthropic
- `GET /api/llm-runtime` 只提供 Chat UI 所需的 sanitized provider 狀態，且必須通過 `session` 驗證；不回傳 Ollama host、模型名稱、prompt、附件內容或任何 secret

### FHIR 與隱私

- `components/fhir/FHIRImportModal.tsx` 會解析 JSON/XML FHIR、預覽摘要並先做敏感資料去識別
- `lib/fhir/*` 負責 FHIR 解析、驗證、格式化與匯整成 LLM 可用內容
- `lib/privacy/redaction.ts` 會處理姓名、台灣身分證、電話、Email、生日、地址、病歷號與檔名遮罩

### 檔案與紀錄

- 聊天附件走 `app/api/chat/upload-token/route.ts` 與 `app/api/chat/upload/route.ts` 的 R2 上傳流程
- 對話紀錄由 `app/api/chat/save-log/route.ts` 產生 markdown 並上傳到 R2
- `app/api/upload/route.ts` 仍保留為通用的 Vercel Blob 上傳入口

## 專案結構

```text
app/
  (auth)/                 登入與註冊頁
  (main)/                 聊天與對話紀錄頁
  (admin)/                後台頁面
  api/                    Route Handlers
components/
  auth/                   驗證 UI
  chat/                   聊天 UI、credits、模型與 workload 選擇器
  fhir/                   FHIR 匯入視窗
  onboarding/             新手導覽視窗
  providers/              Locale Provider
  screenshot/             截圖功能
hooks/
  useCustomerSettings.ts  客戶 UI 設定
  useDeviceType.ts        裝置判斷
lib/
  auth/                   session、密碼、otp、google auth、admin helpers
  fhir/                   FHIR 解析與格式化
  i18n/                   zh-TW / en 翻譯
  mcp/                    LLM provider router 與請求編排
  llm/                    LLM runtime 設定、Ollama client、URL 防護與本機附件處理
  privacy/                去識別與遮罩
  storage/                上傳驗證、儲存路徑、log 產生
  supabase/               資料存取
  validation/             schemas
supabase/
  migrations/             schema 與功能 migration
__tests__/                API、元件、整合與函式庫測試
```

## 重要路由

- `POST /api/chat`
- `GET /api/chat?conversationId=...`
- `GET /api/conversations`
- `GET /api/credits`
- `GET /api/models`
- `POST /api/chat/upload-token`
- `POST /api/chat/upload`
- `POST /api/chat/save-log`
- `GET|POST /api/customer-settings`
- `GET /api/llm-runtime`
- `GET|POST|PATCH|DELETE /api/admin/models`
- `GET|POST /api/admin/credits`
- `GET|POST /api/admin/llm-settings`
- `POST /api/admin/llm-settings/test`

## 環境變數

請參考 `.env.example`。主要整合如下：

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `LOCAL_LLM_ALLOWED_HOSTS`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`
- `RESEND_API_KEY`
- Google OAuth client credentials

## 常用指令

```bash
npm install
npm run dev
npm run test
npm run build
```

## 文件

- [Reference documents/ARCHITECTURE.md](./Reference%20documents/ARCHITECTURE.md)
- [docs/FHIR-ARCHITECTURE.md](./docs/FHIR-ARCHITECTURE.md)
- [docs/FHIR-IMPLEMENTATION-SUMMARY.md](./docs/FHIR-IMPLEMENTATION-SUMMARY.md)
- [docs/FHIR-TEST-REPORT.md](./docs/FHIR-TEST-REPORT.md)


