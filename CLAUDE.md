# CLAUDE.md — Claude Code 專案配置文件

> 本文件由 Claude Code 在每次 Session 開始時自動讀取。
> 請保持簡潔、人類可讀，並隨專案演進持續更新。

---

## 📌 專案概覽

```
專案名稱：Health Care Assistant（臨床助手 AI）
專案描述：智能臨床分析助手，提供檢驗、放射、病歷、藥物分析功能，支援 FHIR R5 資料匯入與多語系介面
版本：1.3.1
負責人：qwerboy-design
Repository：https://github.com/qwerboy-design/Health-Care-Assistant
```

---

## 🏗️ 技術架構

### Tech Stack

| 層級 | 技術 |
|------|------|
| 前端 | Next.js 14+ (App Router) / React 18 / TypeScript |
| 後端 | Next.js API Routes / Node.js |
| 資料庫 | Supabase (PostgreSQL) |
| AI 整合 | Anthropic Claude API (直接整合) |
| 測試 | Vitest / @testing-library/react |
| CI/CD | Vercel (自動部署) |
| 儲存 | Cloudflare R2 (物件儲存) |
| Email | Resend (OTP 發送) |
| 認證 | JWT Session / Google OAuth 2.0 / OTP |
| 樣式 | Tailwind CSS + Notion-inspired Design System |
| FHIR | HL7 FHIR R5 (JSON/XML 匯入與解析) |
| 語系 | i18n (繁體中文 / 英文) |

### 主要目錄結構

```
project-root/
├── app/                 # Next.js App Router
│   ├── (auth)/         # 認證頁面（login, register）
│   ├── (main)/         # 主頁面（chat, conversations）
│   ├── (admin)/        # 管理頁面（admin）
│   ├── api/            # API Routes（auth, chat, admin, models 等）
│   ├── globals.css     # 全域樣式（Tailwind + Design System）
│   ├── layout.tsx      # 根佈局
│   └── page.tsx        # 首頁
├── components/
│   ├── auth/           # 認證元件（GoogleLoginButton, OTPInput 等）
│   ├── chat/           # 聊天元件（ChatWindow, MessageBubble 等）
│   ├── fhir/           # FHIR 元件（FHIRImportModal）
│   ├── onboarding/     # 引導元件（OnboardingModal）
│   ├── admin/          # 管理元件（AdminButton）
│   ├── screenshot/     # 截圖元件（ScreenshotCapture）
│   └── providers/      # Context Providers（LocaleProvider）
├── lib/
│   ├── auth/           # 認證工具（session, admin）
│   ├── fhir/           # FHIR 解析與格式化（多檔合併）
│   ├── i18n/           # 語系翻譯（translations.ts）
│   ├── email/          # Email 服務（Resend 模板）
│   ├── mcp/            # MCP Client（Anthropic 整合）
│   ├── storage/        # 檔案上傳（Cloudflare R2）
│   ├── supabase/       # 資料庫操作（CRUD）
│   ├── validation/     # Zod 驗證 schemas
│   ├── errors.ts       # 錯誤處理系統
│   └── rate-limit.ts   # Rate limiting
├── supabase/
│   └── migrations/     # 資料庫遷移檔案（2個）
├── __tests__/          # Vitest 測試
│   ├── api/            # API 測試
│   └── components/     # 元件測試
├── types/
│   └── index.ts        # TypeScript 型別定義
├── hooks/              # Custom React Hooks
├── docs/               # 技術文件（FHIR, 部署筆記等）
├── Reference documents/ # 參考文件（架構、規格、部署指南等）
├── scripts/            # 工具腳本（測試、驗證）
├── DESIGN.md           # 設計系統規範（Notion-inspired）
├── CLAUDE.md           # 本文件（Claude Code 配置）
└── README.md           # 專案說明
```

---

## 🚀 常用指令

### 開發

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 建置
npm run build

# 型別檢查
npx tsc --noEmit

# Lint
npm run lint
```

### 測試

```bash
# 執行 Vitest 測試（單元測試、元件測試）
npm run test

# 使用 UI 介面執行測試
npm run test:ui

# 覆蓋率報告
npm run test:coverage

# 系統驗證測試（環境變數、API 端點、檔案檢查）
npm run test:verify

# 整合測試（註冊 → 登入 → 發送訊息流程）
npm run test:integration

# Vercel 部署驗證
npm run test:vercel <production-url>
```

### Git Flow

```bash
# 新功能分支
git checkout -b feat/[feature-name]

# Bug 修復
git checkout -b fix/[issue-number]-[short-description]

# 重構優化
git checkout -b refactor/[scope]

# 文件更新
git checkout -b docs/[topic]

# 設計系統更新
git checkout -b design/[component-or-system]
```

---

## 🧭 開發方法論

### 核心原則

- **型別安全優先**：嚴格使用 TypeScript，禁止 `any`
- **元件化開發**：優先使用現有元件，避免重複建立
- **測試驅動**：重要功能需有對應測試（Vitest）
- **設計系統一致性**：遵循 DESIGN.md 規範（Notion-inspired + Terracotta）
- **語系支援**：所有使用者介面文字使用 `t()` 函式

### 全新功能開發流程

1. 檢查現有元件和工具函式（避免重複造輪子）
2. 定義型別與介面（`types/index.ts`）
3. 實作功能（遵循設計系統）
4. 撰寫測試（`__tests__/`）
5. 確保 Lint 通過（`npm run lint`）
6. 建置測試（`npm run build`）

---

## 📐 程式碼規範

### 通用原則

- **語言**：嚴格使用 TypeScript（禁止 `any`）
- **函式**：優先使用純函式（Pure Function）
- **元件**：優先使用函式元件（Functional Component）
- **命名**：
  - 變數 / 函式：`camelCase`
  - 元件 / 型別：`PascalCase`
  - 常數：`UPPER_SNAKE_CASE`
  - 檔案：`kebab-case.ts` 或 `PascalCase.tsx`（元件）

### DO ✅

- 所有業務邏輯需有對應單元測試
- 複雜函式加上 JSDoc 說明
- 優先使用 `components/` 現有元件，不要重複建立
- 遵循 `lib/` 既有的錯誤處理模式
- 使用 Tailwind CSS utility class（禁止 inline style）
- 遵循 DESIGN.md 設計系統規範
- UI 文字使用 `t()` 函式（支援多語系）

### DON'T ❌

- 禁止 TypeScript `any` 型別
- 禁止在 React 元件中放置業務邏輯
- 禁止 inline style（使用 Tailwind + Design System）
- 禁止在未確認 `lib/` 的情況下建立重複工具函式
- 禁止將 API Key / 機密資訊寫入此文件或程式碼中
- 禁止跳過測試直接 push（確保建置通過）
- 禁止硬編碼 UI 文字（使用 `t()` 函式）

### 錯誤處理模式

```typescript
// ✅ 標準錯誤回傳模式
type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

// ✅ 服務層統一拋出 AppError
throw new AppError('USER_NOT_FOUND', '使用者不存在', 404);
```

---

## 🧪 測試規範摘要

| 類型 | 位置 | 外部相依 | 覆蓋率目標 |
|------|------|---------|-----------|
| 單元測試 | `__tests__/` | 全部 Mock | 70%+ |
| 元件測試 | `__tests__/components/` | JSDOM | 60%+ |
| 整合測試 | `scripts/test-integration.js` | 真實 API | 關鍵流程 |

**測試命名規則：** `[單元].[情境].[預期結果].test.ts`

**AAA 結構：**
```typescript
it('描述', () => {
  // Arrange — 準備資料與 Mock
  // Act — 執行被測試的操作
  // Assert — 驗證結果
});
```

---

## 🔀 Git 規範

### Commit Message 格式（Conventional Commits）

```
<type>(<scope>): <短描述>

[可選 body：詳細說明]
[可選 footer：BREAKING CHANGE 或 issue 參照]
```

| Type | 使用時機 |
|------|---------|
| `feat` | 全新功能 |
| `fix` | Bug 修復 |
| `refactor` | 重構優化 |
| `test` | 新增 / 修改測試 |
| `docs` | 文件更新 |
| `chore` | 建置 / 工具調整 |
| `perf` | 效能優化 |
| `design` | 設計系統更新 |

**範例：**
```
feat(auth): add JWT refresh token mechanism

- Implement /auth/refresh endpoint
- Add token rotation security mechanism
- All acceptance tests passed

Closes #42
```

### Branch 命名

```
feat/[feature-name]         # 新功能
refactor/[scope]            # 優化
fix/[issue-id]-[desc]       # Bug 修復
docs/[topic]                # 文件
design/[component]          # 設計更新
chore/[task]                # 維護任務
```

---

## ⚠️ 重要注意事項

1. **機密資訊**：API Key、DB 連線字串一律放在 `.env.local`，絕不寫入此文件
2. **PR 前必須**：建置通過 + Lint 無錯誤 + 測試通過
3. **設計一致性**：遵循 DESIGN.md 規範（Terracotta 主色調、Serif 標題）
4. **語系支援**：新增 UI 文字時必須在 `lib/i18n/translations.ts` 加入翻譯

---

## 📚 相關文件

| 文件 | 說明 |
|------|------|
| `DESIGN.md` | 設計系統規範（Notion-inspired + Terracotta） |
| `DESIGN_IMPLEMENTATION.md` | 設計系統實作指南 |
| `README.md` | 專案說明 & 快速開始 |
| `Reference documents/ARCHITECTURE.md` | 系統架構文件 |
| `Reference documents/SPECIFICATIONS.md` | 系統規格文件 |
| `Reference documents/DEPLOYMENT_GUIDE.md` | GitHub + Vercel 部署指南 |
| `docs/FHIR-ARCHITECTURE.md` | FHIR R5 整合架構 |
| `Reference documents/I18N_IMPLEMENTATION.md` | 語系實作說明 |
| `.env.example` | 環境變數範本 |

---

## 🎨 設計系統（重要）

本專案採用 **Notion 風格**的設計系統，搭配 **Terracotta** 主色調：

- **DESIGN.md**：完整設計規範（色彩、字體、組件、原則）
- **主色調**：Warm Terracotta (#D97757) - 溫暖、專業、人性化
- **背景色**：Paper White (#FDFAF7) - 柔和、減少視覺疲勞
- **字體**：Serif 標題（Merriweather）+ Sans-serif 正文（Inter）
- **原則**：溫暖但專業、易讀性優先、減少視覺疲勞

**快速使用**：
- 按鈕：`.btn-primary`、`.btn-secondary`
- 輸入框：`.input-field`
- 卡片：`.card`
- 標題：`.heading-serif`
- 色彩：`bg-terracotta`、`text-error`、`text-success`

---

## 🌍 語系（i18n）

本專案支援多語系（繁體中文 / 英文）：

- **使用**：`const { t } = useLocale()` → `t('key.path')`
- **翻譯檔**：`lib/i18n/translations.ts`
- **切換**：登錄頁右上角 ZW / EN 按鈕
- **持久化**：localStorage + cookie
- **範圍**：全站（登錄、註冊、聊天、管理）

新增翻譯時，在 `translations.ts` 的 `zh-TW` 和 `en` 物件中加入對應 key。

---

## 🔌 MCP Servers

### Anthropic Claude API（已設定）
- **用途**：AI 對話、臨床分析（檢驗、放射、病歷、藥物）
- **限制**：API Rate Limit（依 Anthropic 政策）
- **使用時機**：/api/chat 呼叫，依工作量級別（instant/basic/standard/professional）決定 Skills 數量
- **配置**：環境變數 `ANTHROPIC_API_KEY`、`ANTHROPIC_MODEL`（預設 claude-3-haiku-20240307）

---

*最後更新：2026-04-16（v1.3.1 + 設計系統更新）*
