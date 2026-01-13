# 臨床助手 AI 網頁應用程式

智能臨床分析助手，提供檢驗、放射、病歷、藥物分析功能。

## 技術架構

- **框架**: Next.js 14+ (App Router)
- **語言**: TypeScript
- **樣式**: Tailwind CSS
- **認證**: JWT Session、Google OAuth 2.0、OTP驗證
- **資料庫**: Supabase (PostgreSQL)
- **AI整合**: MCP Client SDK

## 專案狀態

### ✅ 已完成

#### Phase 1: 專案初始化
- ✅ Next.js 專案設置（TypeScript、Tailwind CSS）
- ✅ 套件安裝（Supabase、jose、bcryptjs、zod、resend、google-auth-library、MCP SDK）
- ✅ 資料庫遷移腳本（SQL）
- ✅ 類型定義（types/index.ts）
- ✅ 環境變數模板（.env.example）

#### Phase 2: 認證系統（部分完成）
- ✅ 錯誤處理系統（lib/errors.ts）
- ✅ Rate limiting（lib/rate-limit.ts）
- ✅ 驗證 schemas（lib/validation/schemas.ts）
- ✅ 認證工具函數
  - ✅ 密碼加密與驗證（lib/auth/password.ts）
  - ✅ OTP 生成器（lib/auth/otp-generator.ts）
  - ✅ JWT Session 管理（lib/auth/session.ts）
  - ✅ Google OAuth 驗證（lib/auth/google-oauth.ts）
- ✅ 資料庫操作函數
  - ✅ 客戶管理（lib/supabase/customers.ts）
  - ✅ OTP 管理（lib/supabase/otp.ts）
  - ✅ 對話管理（lib/supabase/conversations.ts）
  - ✅ 訊息管理（lib/supabase/messages.ts）
- ✅ Email 服務（lib/email/resend.ts）
- ✅ 認證 API Routes
  - ✅ POST /api/auth/register
  - ✅ POST /api/auth/login
  - ✅ POST /api/auth/send-otp
  - ✅ POST /api/auth/verify-otp
  - ✅ POST /api/auth/google
- ✅ 認證相關元件
  - ✅ OTPInput（6位數分離輸入）
  - ✅ CountdownTimer（重發倒數）
  - ✅ GoogleLoginButton（Google 登入）
- ✅ 登入頁面（app/(auth)/login/page.tsx）
- ✅ 註冊頁面（app/(auth)/register/page.tsx）

#### MCP 整合（基礎完成）
- ✅ MCP 類型定義（lib/mcp/types.ts）
- ✅ 工作量級別邏輯（lib/mcp/workload.ts）
- ✅ 功能映射表（lib/mcp/function-mapping.ts）
- ✅ MCP Client（lib/mcp/client.ts）
- ✅ 檔案上傳工具（lib/storage/upload.ts）

### 🚧 待完成

#### Phase 3: 說明Pop-UP
- ⏳ OnboardingModal 元件
- ⏳ 首次登入檢測邏輯

#### Phase 4: 對話介面
- ⏳ 對話頁面（app/(main)/chat/page.tsx）
- ⏳ 對話相關元件
  - ⏳ ChatWindow
  - ⏳ MessageList
  - ⏳ MessageBubble
  - ⏳ ChatInput
  - ⏳ FunctionSelector（檢驗、放射、病歷、藥物）
  - ⏳ WorkloadSelector（即時、初級、標準、專業）
  - ⏳ FileUploader
  - ⏳ ConversationHistory

#### Phase 5: 對話 API
- ⏳ POST /api/chat（建立/發送訊息）
- ⏳ GET /api/conversations（獲取對話列表）
- ⏳ SSE 串流回應實作

#### Phase 6: 測試與優化
- ⏳ 端對端測試
- ⏳ 錯誤處理完善
- ⏳ UI/UX 優化
- ⏳ 效能優化

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

# MCP Server
# 預設使用官方 MCP Server，無需 API Key 即可使用
# URL 必須包含協議前綴 (https://)
MCP_SERVER_URL=https://mcp.k-dense.ai/claude-scientific-skills/mcp
# API Key 為可選，如果 MCP Server 需要認證才設定
# 如果不設定，將不使用認證（預設行為）
MCP_API_KEY=
```

### 4. 資料庫設置

在 Supabase SQL Editor 中執行 `supabase/migrations/001_initial_schema.sql`

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
│   ├── api/              # API Routes
│   │   └── auth/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── auth/             # 認證元件
├── lib/
│   ├── auth/             # 認證工具
│   ├── email/            # Email 服務
│   ├── mcp/              # MCP 整合
│   ├── storage/          # 檔案上傳
│   ├── supabase/         # 資料庫操作
│   ├── validation/       # 驗證 schemas
│   ├── errors.ts
│   └── rate-limit.ts
├── supabase/
│   └── migrations/       # 資料庫遷移
├── types/
│   └── index.ts          # TypeScript 類型定義
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
- 儲存：Supabase Storage

## 下一步開發

1. 完成對話介面 UI
2. 實作對話 API 與 MCP 整合
3. 實作 SSE 串流回應
4. 添加對話歷史功能
5. 完善錯誤處理
6. 添加測試
7. 優化效能

## 參考文件

專案參考了 `Reference documents/` 目錄中的實作文件：
- Google OAuth 實作
- OTP 驗證實作
- 帳號綁定功能

## 授權

Private - 僅供內部使用
