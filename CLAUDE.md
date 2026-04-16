\# CLAUDE.md — Claude Code 專案配置文件



> 本文件由 Claude Code 在每次 Session 開始時自動讀取。

> 請保持簡潔、人類可讀，並隨專案演進持續更新。



\---



\## 📌 專案概覽



```

專案名稱：\[YOUR\_PROJECT\_NAME]

專案描述：\[簡述專案目的與解決的問題]

版本：0.1.0

負責人：\[Team / Owner]

```



\---



\## 🏗️ 技術架構



\### Tech Stack



| 層級 | 技術 |

|------|------|

| 前端 | \[e.g. Next.js 15 / React 19 / Vue 3] |

| 後端 | \[e.g. Node.js / FastAPI / Go] |

| 資料庫 | \[e.g. PostgreSQL 16 / MongoDB / Redis] |

| ORM | \[e.g. Prisma / SQLAlchemy / GORM] |

| 測試 | \[e.g. Jest / Vitest / pytest] |

| CI/CD | \[e.g. GitHub Actions / GitLab CI] |

| 容器 | \[e.g. Docker / Kubernetes] |



\### 主要目錄結構



```

project-root/

├── src/

│   ├── app/              # 應用進入點 \& 路由

│   ├── components/       # 可重用 UI 元件

│   ├── features/         # 功能模組（按業務域劃分）

│   ├── services/         # 外部 API 呼叫 \& 業務邏輯

│   ├── repositories/     # 資料存取層

│   ├── models/           # 資料模型 \& 型別定義

│   ├── hooks/            # Custom React Hooks（前端）

│   ├── utils/            # 純工具函式

│   └── types/            # 全域 TypeScript 型別

├── tests/

│   ├── unit/             # 單元測試

│   ├── integration/      # 整合測試

│   └── acceptance/       # 驗收測試（SDD）

├── docs/

│   ├── specs/            # SDD 規格文件

│   └── adr/              # Architecture Decision Records

├── .github/workflows/    # CI/CD 設定

├── CLAUDE.md             # 本文件（Claude Code 配置）

└── claude.md             # 開發方法論規範（SDD / TDD）

```



\---



\## 🚀 常用指令



\### 開發



```bash

\# 安裝依賴

npm install



\# 啟動開發伺服器

npm run dev



\# 建置

npm run build



\# 型別檢查

npm run typecheck



\# Lint

npm run lint

npm run lint:fix

```



\### 測試



```bash

\# 執行所有測試

npm run test:all



\# 單元測試

npm run test:unit



\# 整合測試

npm run test:integration



\# 驗收測試（SDD）

npm run test:acceptance



\# 覆蓋率報告

npm run test:coverage



\# 監聽模式（TDD 開發時使用）

npm run test:watch

```



\### 資料庫



```bash

\# 執行 Migration

npm run db:migrate



\# 建立新 Migration

npm run db:migrate:create -- --name \[migration-name]



\# 重設資料庫（開發環境）

npm run db:reset



\# Seed 測試資料

npm run db:seed

```



\### Git Flow



```bash

\# 新功能分支（SDD）

git checkout -b feat/\[feature-name]



\# 優化分支（TDD）

git checkout -b refactor/\[scope]



\# Bug 修復

git checkout -b fix/\[issue-number]-\[short-description]

```



\---



\## 🧭 開發方法論



> 詳細規範請參閱 `claude.md`



\### 全新功能 → SDD（規格驅動開發）



```

規格文件 → 介面定義 → 驗收測試 → 實作 → 單元/整合測試

```



1\. 先在 `docs/specs/` 建立規格文件

2\. 定義介面與型別（`src/types/`）

3\. 撰寫驗收測試（`tests/acceptance/`）

4\. 實作功能

5\. 補齊單元測試與整合測試



\### 優化既有功能 → TDD（測試驅動開發）



```

🔴 Red（寫失敗測試） → 🟢 Green（最小實作） → 🔵 Refactor（重構）

```



\- 不得撰寫 production code，除非是為了讓失敗測試通過

\- 每次只撰寫一個失敗測試

\- 重構時不新增功能



\---



\## 📐 程式碼規範



\### 通用原則



\- \*\*語言\*\*：嚴格使用 TypeScript（禁止 `any`）

\- \*\*函式\*\*：優先使用純函式（Pure Function）

\- \*\*元件\*\*：優先使用函式元件（Functional Component）

\- \*\*命名\*\*：

&#x20; - 變數 / 函式：`camelCase`

&#x20; - 元件 / 型別：`PascalCase`

&#x20; - 常數：`UPPER\_SNAKE\_CASE`

&#x20; - 檔案：`kebab-case.ts`



\### DO ✅



\- 所有業務邏輯需有對應單元測試

\- 複雜函式加上 JSDoc 說明

\- 優先使用 `src/components/` 現有元件，不要重複建立

\- 遵循 `src/services/` 既有的錯誤處理模式

\- 使用 Tailwind CSS utility class（禁止 inline style）



\### DON'T ❌



\- 禁止 TypeScript `any` 型別

\- 禁止在 React 元件中放置業務邏輯

\- 禁止 inline style（使用 Tailwind）

\- 禁止在未確認 `src/utils/` 的情況下建立重複工具函式

\- 禁止將 API Key / 機密資訊寫入此文件或程式碼中

\- 禁止跳過測試直接 push（確保 CI 通過）



\### 錯誤處理模式



```typescript

// ✅ 標準錯誤回傳模式

type Result<T, E = AppError> =

&#x20; | { success: true; data: T }

&#x20; | { success: false; error: E };



// ✅ 服務層統一拋出 AppError

throw new AppError('USER\_NOT\_FOUND', '使用者不存在', 404);

```



\---



\## 🧪 測試規範摘要



| 類型 | 位置 | 外部相依 | 覆蓋率目標 |

|------|------|---------|-----------|

| 單元測試 | `tests/unit/` | 全部 Mock | 80%+ |

| 整合測試 | `tests/integration/` | 真實 DB / API | 70%+ |

| 驗收測試 | `tests/acceptance/` | 完整環境 | 100% AC |



\*\*測試命名規則：\*\* `\[單元].\[情境].\[預期結果].test.ts`



\*\*AAA 結構：\*\*

```typescript

it('描述', () => {

&#x20; // Arrange — 準備資料與 Mock

&#x20; // Act — 執行被測試的操作

&#x20; // Assert — 驗證結果

});

```



\---



\## 🔀 Git 規範



\### Commit Message 格式（Conventional Commits）



```

<type>(<scope>): <短描述>



\[可選 body：詳細說明]

\[可選 footer：BREAKING CHANGE 或 issue 參照]

```



| Type | 使用時機 |

|------|---------|

| `feat` | 全新功能（SDD） |

| `fix` | Bug 修復 |

| `refactor` | 重構優化（TDD） |

| `test` | 新增 / 修改測試 |

| `docs` | 文件更新 |

| `chore` | 建置 / 工具調整 |

| `perf` | 效能優化 |



\*\*範例：\*\*

```

feat(auth): 新增 JWT refresh token 機制



\- 實作 /auth/refresh endpoint

\- 加入 token rotation 安全機制

\- 驗收測試全數通過（AC-001 \~ AC-004）



Closes #42

```



\### Branch 命名



```

feat/\[feature-name]         # 新功能（SDD）

refactor/\[scope]            # 優化（TDD）

fix/\[issue-id]-\[desc]       # Bug 修復

docs/\[topic]                # 文件

chore/\[task]                # 維護任務

```



\---



\## 🔌 MCP Servers（若已設定）



```markdown

\### \[服務名稱] MCP

\- 用途：\[說明此 MCP 的使用情境]

\- 限制：\[速率限制、使用規則]

\- 使用時機：\[何時應呼叫此 MCP]

```



> 若需新增 MCP 設定，請編輯 `.mcp.json`



\---



\## ⚠️ 重要注意事項



1\. \*\*機密資訊\*\*：API Key、DB 連線字串一律放在 `.env`，絕不寫入本文件

2\. \*\*上下文管理\*\*：

&#x20;  - Context 達 70% → 注意精簡

&#x20;  - Context 達 85% → 執行 `/compact`

&#x20;  - Context 達 90%+ → 執行 `/clear`

3\. \*\*PR 前必須\*\*：所有測試通過 + 覆蓋率達標 + Lint 無錯誤

4\. \*\*規格優先\*\*：全新功能務必先建立 `docs/specs/` 規格文件，再開始實作



\---



\## 📚 相關文件



| 文件 | 說明 |

|------|------|

| `claude.md` | 開發方法論（SDD / TDD / 測試規範） |

| `docs/specs/` | SDD 功能規格文件 |

| `docs/adr/` | 架構決策記錄 |

| `README.md` | 專案說明 \& 快速開始 |

| `.env.example` | 環境變數範本 |



\---



\*最後更新：請在每次架構決策或流程變更後更新本文件\*

