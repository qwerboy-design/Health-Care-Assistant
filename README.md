# 臨床助手 AI 網頁應用程式

智能臨床分析助手，提供檢驗、放射、病歷、藥物分析功能。

> 版本：v1.3.0（與 `package.json` 同步）  
> 最後更新：2026-03-27

## 技術架構

- **框架**: Next.js 14+ (App Router)
- **語言**: TypeScript
- **樣式**: Tailwind CSS
- **認證**: JWT Session、Google OAuth 2.0、OTP驗證
- **資料庫**: Supabase (PostgreSQL)
- **AI整合**: Anthropic Claude API（直接整合）
- **FHIR**: HL7 FHIR R5 檔案匯入、結構化臨床敘事（Markdown）送交模型分析（見 `docs/FHIR-ARCHITECTURE.md`）
- **儲存**: Cloudflare R2（物件儲存）
- **Email**: Resend（OTP 發送）
- **語系**: 繁體中文 (ZW) / 英文 (EN)，登錄頁切換、全站介面同步，持久化於 localStorage 與 cookie

詳細架構說明請參考 [ARCHITECTURE.md](./ARCHITECTURE.md)

## 專案狀態

### ✅ 已完成（100%）

#### Phase 1: 專案初始化 ✅
- ✅ Next.js 14 + TypeScript + Tailwind CSS 專案設置
- ✅ 所有依賴套件安裝完成
- ✅ 資料庫遷移腳本（2 個遷移檔案）
- ✅ 完整的類型定義系統
- ✅ 環境變數模板與安全性檢查

#### Phase 2: 認證系統 ✅
**後端：**
- ✅ 7 個完整的 API Routes
  - POST /api/auth/register - 註冊（支援密碼/OTP）
  - POST /api/auth/login - 登入（支援密碼/OTP）
  - POST /api/auth/send-otp - 發送 OTP
  - POST /api/auth/verify-otp - 驗證 OTP
  - POST /api/auth/google - Google OAuth
  - POST /api/auth/logout - 登出
  - GET /api/auth/me - 獲取當前用戶資料
  - GET /api/auth/admin-check - 檢查管理員權限

**前端：**
- ✅ 登入頁面（三種登入方式）
- ✅ 註冊頁面（三種註冊方式）
- ✅ OTP 輸入元件（6位數，自動跳轉，支援貼上）
- ✅ Google 登入按鈕
- ✅ 倒數計時器

#### Phase 3: 說明Pop-UP ✅
- ✅ OnboardingModal 元件（4個步驟卡片）
- ✅ 首次登入檢測（localStorage）
- ✅ 進度指示器
- ✅ 美觀的 UI 設計

#### Phase 4: 對話介面 ✅
**元件：**
- ✅ ChatWindow - 對話視窗主元件（支援動態佈局）
- ✅ MessageList - 訊息列表（自動滾動）
- ✅ MessageBubble - 訊息氣泡（支援檔案顯示）
- ✅ ChatInput - 輸入區域（文字/檔案/選項，自適應高度）
- ✅ FunctionSelector - 功能選擇器（檢驗/放射/病歷/藥物）
- ✅ WorkloadSelector - 工作量級別選擇器（即時/初級/標準/專業）
- ✅ FileUploader - 檔案上傳（拖放支援，10MB限制）

**佈局優化（v1.2.3）：**
- ✅ 動態佈局系統：根據對話輪次自動調整比例
  - 空白狀態（≤2 輪）：輸入框 60%、訊息區 40%
  - 活躍狀態（>2 輪）：平衡佈局，訊息區獲得更多空間
- ✅ 自適應輸入框高度：
  - 空白狀態：3 行初始高度，最大 300px
  - 活躍狀態：1 行初始高度，最大 150px
- ✅ 300ms 平滑過渡動畫
- ✅ 完整測試覆蓋（42 個測試用例，100% 通過率）

**頁面：**
- ✅ /chat - 對話頁面
- ✅ /conversations - 對話記錄頁面

#### Phase 4.5: 語系 (i18n) ✅
- ✅ 登錄頁 ZW/EN 語系切換按鈕
- ✅ 全站介面依語系切換（首頁、登錄、註冊、主導航、聊天、後台）
- ✅ LocaleProvider（Context：locale、setLocale、t）
- ✅ 翻譯檔 `lib/i18n/translations.ts`（zh-TW / en，dot path key）
- ✅ 語系持久化：localStorage + cookie（供 Server Component 讀取）

#### Phase 5: MCP 整合 ✅
- ✅ MCP Client 實作（直接使用 Anthropic API）
- ✅ 工作量級別邏輯（0/1/2-3/4+ Skills）
- ✅ 功能映射表（檢驗/放射/病歷/藥物 → Skills）
- ✅ 檔案上傳工具（Cloudflare R2）
- ✅ 圖片上傳支援（轉換為 base64 格式傳遞給 AI）
- ✅ POST /api/chat - 對話 API
- ✅ GET /api/chat - 獲取對話訊息
- ✅ GET /api/conversations - 對話列表

#### Phase 6: 管理員系統 ✅
- ✅ 帳號審核系統（pending/approved/rejected）
- ✅ 管理員角色管理
- ✅ GET /api/admin/customers - 客戶列表
- ✅ POST /api/admin/approve - 審核通過
- ✅ POST /api/admin/reject - 審核拒絕
- ✅ 管理員頁面與元件

#### 核心工具函數 ✅
- ✅ 錯誤處理系統
- ✅ Rate limiting
- ✅ Zod 驗證
- ✅ 密碼加密（bcrypt）
- ✅ JWT Session 管理
- ✅ Google OAuth 驗證
- ✅ Email 服務（Resend，精美模板）
- ✅ 資料庫操作（所有 CRUD 操作）

### 🚧 未來優化項目（可選）

1. ⚠️ SSE 串流回應實作（當前是完整回應）
2. ⚠️ 更完善的錯誤處理和日誌
3. ⚠️ 單元測試和整合測試
4. ⚠️ 效能優化（緩存、分頁等）
5. ⚠️ 無障礙功能（ARIA labels）
6. ✅ 國際化支援（ZW/EN，已實作）

## 安裝與設置

### 1. 環境需求

- Node.js 18+
- npm 或 yarn
- Supabase 帳號
- Google Cloud Console 帳號（用於 OAuth）
- Resend 帳號（用於 Email）

### 2. 安裝依賴

```bash
npm install
```

### 3. 環境變數設定

複製 `.env.example` 為 `.env.local`，並填入相應的值：

```env
# 資料庫
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT
JWT_SECRET=your_jwt_secret_at_least_32_characters_long

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_google_client_secret

# Email (Resend)
RESEND_API_KEY=re_your_resend_api_key

# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=chat-files
R2_PUBLIC_URL=https://your-domain.com  # 可選：自訂網域

# Anthropic API (AI 整合)
ANTHROPIC_API_KEY=sk-ant-api03-your_api_key_here
ANTHROPIC_MODEL=claude-3-haiku-20240307  # 可選

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. 資料庫設置

在 Supabase SQL Editor 中依序執行：
1. `supabase/migrations/001_initial_schema.sql` - 初始資料表結構
2. `supabase/migrations/002_add_approval_system.sql` - 審核系統欄位

### 5. 啟動開發伺服器

```bash
npm run dev
```

專案將在 http://localhost:3000 啟動

### 6. 執行自動化測試

專案包含自動化測試腳本，可用於驗證系統功能：

#### 系統驗證測試

執行基礎驗證測試（環境變數、API 端點、檔案檢查等）：

```bash
npm run test
# 或
npm run test:verify
```

測試項目包括：
- ✅ 環境變數檢查
- ✅ 必要檔案檢查
- ✅ API 端點可用性
- ✅ 頁面可訪問性
- ✅ MCP Server 配置
- ✅ Session 驗證

#### 整合測試

執行完整的功能流程測試（註冊 → 登入 → 發送訊息）：

```bash
npm run test:integration
```

**前置條件**：
- 開發伺服器運行中 (`npm run dev`)
- 環境變數已設定（部分功能需要）

**測試流程**：
1. 註冊新用戶
2. 登入
3. 獲取當前用戶資訊
4. 獲取對話列表
5. 發送訊息（如果 Supabase 和 MCP Server 已配置）
6. 登出

**注意**：如果 Supabase 或 MCP Server 未配置，相關測試會自動跳過。

#### 測試環境變數

可選：設定測試基礎 URL（預設為 `http://localhost:3000`）：

```bash
TEST_BASE_URL=http://localhost:3000 npm run test
```

## 檔案結構

```
├── app/
│   ├── (auth)/           # 認證頁面
│   │   ├── login/
│   │   └── register/
│   ├── (main)/           # 主頁面（需認證）
│   │   ├── chat/         # 對話頁面
│   │   ├── conversations/ # 對話記錄
│   │   └── layout.tsx     # 認證保護佈局
│   ├── (admin)/          # 管理頁面（需管理員權限）
│   │   └── admin/
│   ├── api/              # API Routes
│   │   ├── auth/         # 認證 API (8 routes)
│   │   ├── chat/         # 對話 API
│   │   ├── conversations/ # 對話列表 API
│   │   └── admin/        # 管理 API (3 routes)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── auth/             # 認證元件
│   ├── chat/             # 對話元件
│   ├── onboarding/       # 引導元件
│   ├── admin/            # 管理元件
│   └── providers/        # 全域 Provider（LocaleProvider）
├── lib/
│   ├── auth/             # 認證工具
│   ├── i18n/             # 語系翻譯（translations.ts、getT）
│   ├── email/            # Email 服務
│   ├── mcp/              # MCP 整合
│   ├── storage/          # 檔案上傳 (Cloudflare R2)
│   ├── supabase/         # 資料庫操作
│   ├── validation/       # 驗證 schemas
│   ├── errors.ts
│   └── rate-limit.ts
├── supabase/
│   └── migrations/       # 資料庫遷移 (2個)
├── types/
│   └── index.ts          # TypeScript 類型定義
├── scripts/              # 工具腳本
├── .env.example
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## 功能說明

### 認證系統

1. **密碼登入/註冊**
   - Email + 密碼
   - bcrypt 密碼加密
   - JWT Session 管理

2. **OTP 登入/註冊**
   - Email 發送 6 位數驗證碼
   - 10 分鐘有效期
   - Rate limiting 保護

3. **Google OAuth 登入**
   - Google Identity Services 整合
   - 自動帳號建立或綁定

### 語系 (i18n)

- **切換位置**：登錄頁右上角 ZW（繁體中文）/ EN（英文）按鈕
- **範圍**：全站介面（首頁、登錄、註冊、主導航、聊天、對話記錄、後台管理）
- **持久化**：選擇語系後寫入 `localStorage` 與 cookie `locale`，Server Component 從 cookie 讀取以輸出對應文案
- **擴展**：新增語系時於 `lib/i18n/translations.ts` 擴充 `Locale` 型別與翻譯物件即可

### 工作量級別

- **即時**：0 Skills（不調用任何 Skills）
- **初級**：1 Skill
- **標準**：2-3 Skills
- **專業**：4+ Skills

### 功能選擇

- **檢驗**：檢驗報告分析
- **放射**：放射影像分析
- **病歷**：病歷資料分析
- **藥物**：藥物相關分析

## 開發注意事項

### 安全性

- 所有 API 都有 Rate Limiting
- 密碼使用 bcrypt 加密
- JWT Token 有過期時間
- 檔案上傳有大小和類型限制

### MCP 整合

MCP Server 連線規則參考：
https://github.com/K-Dense-AI/claude-scientific-skills

### 檔案上傳

- 限制：10MB
- 支援格式：JPEG、PDF、DOCX、TXT
- 儲存：Cloudflare R2（物件儲存）
- 圖片處理：自動轉換為 base64 格式傳遞給 AI

## 部署（GitHub + Vercel）

1. **GitHub**：將 `main` 推送到已連線之遠端（本專案：`origin` → `qwerboy-design/Health-Care-Assistant`）。
2. **Vercel**：於 [Vercel Dashboard](https://vercel.com) 匯入同一 GitHub 儲存庫並綁定專案；對 `main` 的 push 會觸發 Production／Preview 建置（依專案設定而定）。
3. **環境變數**：在 Vercel 專案設定中填入與本地 `.env.local` 對應之變數（詳見 `Reference documents/ENV_VARIABLES.md`）。
4. **建置設定**：已含根目錄 `vercel.json`（Next.js、`/api/chat` 逾時與記憶體等）。

CLI 選用：`npx vercel`（連結專案）、`npx vercel --prod`（需已登入且具權限）。部署後可用 `npm run test:vercel <production-url>` 依環境驗證。

## 技術文件

- **[ARCHITECTURE.md](Reference documents/ARCHITECTURE.md)** - 系統架構文件（技術棧、資料流、模組設計、語系架構等）
- **[SPECIFICATIONS.md](Reference documents/SPECIFICATIONS.md)** - 系統規格文件（功能規格、API 規格、資料庫規格等）
- **[DEPLOYMENT_GUIDE.md](Reference documents/DEPLOYMENT_GUIDE.md)** - 部署指南（GitHub + Vercel）
- **[FHIR-ARCHITECTURE.md](docs/FHIR-ARCHITECTURE.md)** - FHIR R5 整合與 FHIR → LLM 臨床敘事架構
- **[FHIR-IMPLEMENTATION-SUMMARY.md](docs/FHIR-IMPLEMENTATION-SUMMARY.md)** - FHIR 實作摘要與版本對照
- **[FHIR-TEST-REPORT.md](docs/FHIR-TEST-REPORT.md)** - FHIR 相關測試報告
- **[ENV_VARIABLES.md](Reference documents/ENV_VARIABLES.md)** - 環境變數說明
- **[I18N_IMPLEMENTATION.md](Reference documents/I18N_IMPLEMENTATION.md)** - 語系 (i18n) 實作說明（ZW/EN 切換、使用方式、擴展）
- **[IMPLEMENTATION_COMPLETE.md](Reference documents/IMPLEMENTATION_COMPLETE.md)** - 實作完成報告

## 參考文件

專案參考了 `Reference documents/` 目錄中的實作文件：
- Google OAuth 實作
- OTP 驗證實作
- 帳號綁定功能

## 授權

Private - 僅供內部使用
