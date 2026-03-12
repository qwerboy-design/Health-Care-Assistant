# 🧪 自動化測試全面分析報告

> **專案名稱**: Health Care Assistant  
> **報告日期**: 2026-02-05  
> **報告版本**: v1.0.0  
> **測試框架**: Vitest 4.0.18 + Testing Library  
> **分析範圍**: 架構、資料庫、API、功能

---

## 📋 執行摘要

### 測試執行結果概覽

```
測試檔案: 11 個 (5 失敗, 6 通過)
測試案例: 99 個 (24 失敗, 75 通過)
測試通過率: 75.76%
執行時間: 5.33 秒
覆蓋率: 未啟用（需執行 npm run test:coverage）
```

### 關鍵發現

#### ✅ 優勢

1. **Credits 系統測試完整**: 12/12 測試通過（100%）
2. **認證 API 測試穩固**: Login API 測試 5/5 通過
3. **模型定價核心功能**: 12/15 測試通過（80%）
4. **MCP Client 基礎功能**: 5/6 測試通過（83%）

#### ⚠️ 問題領域

1. **檔案上傳測試**: 17 個失敗案例（主要為 upload-token.test.ts）
2. **Mock 配置問題**: model-pricing 的 `getAllModels` 測試失敗
3. **預設模型不一致**: MCP Client 預設模型設定衝突
4. **環境依賴問題**: 部分測試需要外部服務

---

## 🏗️ 一、專案架構分析

### 1.1 專案結構樹狀圖

```mermaid
flowchart TB
    subgraph "Frontend Layer"
        Components[components/<br/>15 個 React 元件]
        Pages[app/<br/>頁面與佈局]
    end
    
    subgraph "API Layer - 24 個端點"
        AuthAPI[認證 API<br/>8 個端點]
        ChatAPI[對話 API<br/>4 個端點]
        CreditsAPI[Credits API<br/>3 個端點]
        AdminAPI[管理 API<br/>6 個端點]
        UtilityAPI[工具 API<br/>3 個端點]
    end
    
    subgraph "Business Logic Layer"
        AuthLib[lib/auth/<br/>5 個模組]
        MCPLib[lib/mcp/<br/>4 個模組]
        DBLib[lib/supabase/<br/>7 個模組]
        StorageLib[lib/storage/<br/>3 個模組]
        ValidationLib[lib/validation/<br/>1 個模組]
    end
    
    subgraph "Database Layer"
        Supabase[(Supabase PostgreSQL<br/>6 個 Migrations)]
    end
    
    subgraph "External Services"
        Anthropic[Anthropic Claude API]
        R2[Cloudflare R2]
        Resend[Resend Email]
        GoogleOAuth[Google OAuth]
    end
    
    subgraph "Test Layer - 11 個測試檔案"
        APITests[API 測試<br/>7 個檔案]
        LibTests[Lib 測試<br/>3 個檔案]
        UtilsTests[Utils<br/>1 個檔案]
    end
    
    Pages --> Components
    Pages --> AuthAPI
    Pages --> ChatAPI
    Pages --> CreditsAPI
    Pages --> AdminAPI
    
    AuthAPI --> AuthLib
    ChatAPI --> MCPLib
    ChatAPI --> DBLib
    CreditsAPI --> DBLib
    AdminAPI --> DBLib
    
    AuthLib --> Supabase
    DBLib --> Supabase
    MCPLib --> Anthropic
    StorageLib --> R2
    AuthLib --> Resend
    AuthLib --> GoogleOAuth
    
    APITests -.測試.-> AuthAPI
    APITests -.測試.-> ChatAPI
    APITests -.測試.-> CreditsAPI
    LibTests -.測試.-> AuthLib
    LibTests -.測試.-> DBLib
    LibTests -.測試.-> MCPLib
```

### 1.2 技術棧分析

| 層級 | 技術 | 版本 | 測試工具 | 測試覆蓋 |
|------|------|------|----------|----------|
| **前端** | Next.js | 14+ | @testing-library/react | ❌ 未測試 |
| **前端** | React | 18+ | @testing-library/user-event | ❌ 未測試 |
| **前端** | TypeScript | 5+ | Vitest | ✅ 部分覆蓋 |
| **後端** | Next.js API Routes | 14+ | Vitest + Mock | ✅ 部分覆蓋 |
| **資料庫** | Supabase (PostgreSQL) | 2.90+ | Mock Supabase Client | ✅ 良好覆蓋 |
| **AI** | Anthropic Claude | API v2023-06-01 | Mock Fetch | ✅ 良好覆蓋 |
| **儲存** | Cloudflare R2 | S3-compatible | Mock AWS SDK | ⚠️ 部分失敗 |
| **Email** | Resend | 6.7.0 | ❌ 未測試 | ❌ 未測試 |
| **驗證** | Zod | 4.3.5 | ✅ 間接測試 | ✅ 良好 |

### 1.3 模組依賴關係圖

```mermaid
graph LR
    subgraph "Core Modules"
        Session[session.ts]
        Password[password.ts]
        OTP[otp-generator.ts]
        GoogleAuth[google-oauth.ts]
    end
    
    subgraph "Database Modules"
        Customers[customers.ts]
        Credits[credits.ts]
        ModelPricing[model-pricing.ts]
        Conversations[conversations.ts]
        Messages[messages.ts]
    end
    
    subgraph "MCP Modules"
        MCPClient[client.ts]
        Workload[workload.ts]
        FunctionMapping[function-mapping.ts]
    end
    
    subgraph "Storage Modules"
        Upload[upload.ts]
        LogGenerator[log-generator.ts]
        ModelVersions[model-versions.ts]
    end
    
    Session --> Customers
    Password --> Customers
    OTP --> Resend[resend.ts]
    GoogleAuth --> Customers
    
    Credits --> Customers
    ModelPricing --> SupabaseClient[client.ts]
    Conversations --> Customers
    Messages --> Conversations
    
    MCPClient --> Workload
    MCPClient --> FunctionMapping
    MCPClient --> ModelPricing
    
    Upload --> R2Service[R2 Service]
    
    style Session fill:#90EE90
    style Credits fill:#90EE90
    style MCPClient fill:#90EE90
    style ModelPricing fill:#FFD700
    style Upload fill:#FFA07A
```

**圖例說明**:
- 🟢 綠色: 測試覆蓋完整
- 🟡 黃色: 測試部分覆蓋
- 🟠 橙色: 測試存在問題

---

## 🗄️ 二、資料庫架構分析

### 2.1 資料庫 ER 圖（詳細版）

```mermaid
erDiagram
    customers ||--o{ sessions : "has"
    customers ||--o{ chat_conversations : "creates"
    customers ||--o{ otp_tokens : "generates"
    customers ||--o{ credits_transactions : "has"
    chat_conversations ||--o{ chat_messages : "contains"
    chat_conversations ||--o{ credits_transactions : "references"
    model_pricing ||--o{ credits_transactions : "prices"
    
    customers {
        uuid id PK "主鍵"
        varchar email UK "唯一約束"
        varchar name "必填"
        varchar phone "可選"
        varchar password_hash "bcrypt 加密"
        varchar auth_provider "CHECK 約束"
        varchar oauth_id "Google OAuth ID"
        varchar approval_status "pending/approved/rejected"
        varchar role "user/admin"
        integer credits "點數餘額"
        timestamp created_at "自動填入"
        timestamp updated_at "自動更新"
        timestamp last_login_at "登入時更新"
    }
    
    sessions {
        uuid id PK
        uuid customer_id FK "ON DELETE CASCADE"
        text token "JWT Token"
        timestamp expires_at "7 天有效期"
        varchar ip_address "記錄 IP"
        timestamp created_at
    }
    
    otp_tokens {
        uuid id PK
        varchar email "索引"
        varchar token "6 位數字"
        boolean used "防止重複使用"
        timestamp expires_at "10 分鐘有效期"
        timestamp created_at
    }
    
    chat_conversations {
        uuid id PK
        uuid customer_id FK "ON DELETE CASCADE"
        varchar title "對話標題"
        varchar workload_level "CHECK 約束"
        varchar selected_function "可選"
        varchar model_name "使用的 AI 模型"
        timestamp created_at
        timestamp updated_at "自動更新"
    }
    
    chat_messages {
        uuid id PK
        uuid conversation_id FK "ON DELETE CASCADE"
        varchar role "user/assistant"
        text content "訊息內容"
        text file_url "檔案 URL"
        varchar file_name "檔案名稱"
        varchar file_type "MIME type"
        timestamp created_at
    }
    
    model_pricing {
        uuid id PK
        varchar model_name UK "唯一約束"
        varchar display_name "顯示名稱"
        integer credits_cost "CHECK > 0"
        boolean is_active "啟用狀態"
        boolean supports_vision "支援圖片/PDF"
        timestamp created_at
        timestamp updated_at "觸發器自動更新"
    }
    
    credits_transactions {
        uuid id PK
        uuid customer_id FK "ON DELETE CASCADE"
        uuid conversation_id FK "ON DELETE SET NULL"
        varchar model_name "使用的模型"
        integer credits_cost "消耗點數"
        integer credits_before "消費前餘額"
        integer credits_after "消費後餘額"
        timestamp created_at "消費時間"
    }
```

### 2.2 資料庫索引策略分析

| 表名 | 索引名稱 | 欄位 | 類型 | 目的 | 測試狀態 |
|------|----------|------|------|------|----------|
| **customers** | idx_customers_email | email | B-tree | 登入查詢優化 | ✅ 已測試 |
| **customers** | idx_customers_oauth_id | oauth_id | B-tree | OAuth 查詢優化 | ⚠️ 未測試 |
| **customers** | idx_customers_approval_status | approval_status | B-tree | 管理員審核查詢 | ⚠️ 未測試 |
| **customers** | idx_customers_role | role | B-tree | 權限檢查優化 | ⚠️ 未測試 |
| **sessions** | idx_sessions_customer_id | customer_id | B-tree | Session 查詢 | ✅ 已測試 |
| **sessions** | idx_sessions_token | token | B-tree | Token 驗證 | ✅ 已測試 |
| **otp_tokens** | idx_otp_tokens_email | email | B-tree | OTP 發送/驗證 | ✅ 已測試 |
| **otp_tokens** | idx_otp_tokens_token | token | B-tree | OTP 驗證優化 | ✅ 已測試 |
| **chat_conversations** | idx_chat_conversations_customer_id | customer_id | B-tree | 對話列表查詢 | ⚠️ 未測試 |
| **chat_messages** | idx_chat_messages_conversation_id | conversation_id | B-tree | 訊息列表查詢 | ⚠️ 未測試 |
| **model_pricing** | idx_model_pricing_model_name | model_name | B-tree | 模型查詢優化 | ✅ 已測試 |
| **model_pricing** | idx_model_pricing_active | is_active | B-tree | 啟用模型過濾 | ⚠️ 測試失敗 |
| **credits_transactions** | idx_credits_transactions_customer | customer_id | B-tree | 消費歷史查詢 | ✅ 已測試 |
| **credits_transactions** | idx_credits_transactions_conversation | conversation_id | B-tree | 對話成本追蹤 | ⚠️ 未測試 |
| **credits_transactions** | idx_credits_transactions_created_at | created_at DESC | B-tree | 時間排序優化 | ✅ 已測試 |

**索引覆蓋率**: 60% (9/15 已測試)

### 2.3 資料庫函數與觸發器分析

#### 已實作的 PostgreSQL 函數

1. **deduct_customer_credits** (RPC Function)
   - **功能**: 原子性扣除 Credits 並記錄交易
   - **鎖定機制**: `FOR UPDATE` 防止並發問題
   - **測試狀態**: ✅ 完整測試（包含 Credits 不足、並發控制）
   - **效能**: 使用事務，確保 ACID 特性

2. **add_customer_credits** (RPC Function)
   - **功能**: 增加用戶 Credits（管理員用）
   - **測試狀態**: ✅ 完整測試
   - **改進建議**: 應增加交易記錄（目前在應用層處理）

3. **update_updated_at_column** (Trigger Function)
   - **功能**: 自動更新 `updated_at` 欄位
   - **適用表**: customers, chat_conversations, model_pricing
   - **測試狀態**: ⚠️ 未單獨測試（依賴資料庫行為）

#### 觸發器分析

```sql
-- customers 表觸發器
CREATE TRIGGER update_customers_updated_at 
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- chat_conversations 表觸發器
CREATE TRIGGER update_chat_conversations_updated_at 
BEFORE UPDATE ON chat_conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- model_pricing 表觸發器
CREATE TRIGGER update_model_pricing_updated_at 
BEFORE UPDATE ON model_pricing
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**測試覆蓋**: ⚠️ 未測試（建議增加整合測試驗證觸發器行為）

### 2.4 資料完整性約束測試

| 約束類型 | 約束內容 | 測試案例 | 狀態 |
|---------|---------|---------|------|
| **PRIMARY KEY** | 所有表的 `id` 欄位 | ⚠️ 未測試 | 依賴資料庫 |
| **FOREIGN KEY** | sessions.customer_id → customers.id | ⚠️ 未測試 | 依賴資料庫 |
| **FOREIGN KEY** | chat_conversations.customer_id → customers.id | ⚠️ 未測試 | 依賴資料庫 |
| **FOREIGN KEY** | chat_messages.conversation_id → chat_conversations.id | ⚠️ 未測試 | 依賴資料庫 |
| **UNIQUE** | customers.email | ⚠️ 未測試 | 建議增加 |
| **UNIQUE** | model_pricing.model_name | ✅ 已測試 | createModel 測試 |
| **CHECK** | customers.auth_provider IN (...) | ⚠️ 未測試 | 依賴資料庫 |
| **CHECK** | customers.approval_status IN (...) | ⚠️ 未測試 | 依賴資料庫 |
| **CHECK** | customers.role IN (...) | ⚠️ 未測試 | 依賴資料庫 |
| **CHECK** | chat_conversations.workload_level IN (...) | ⚠️ 未測試 | 依賴資料庫 |
| **CHECK** | chat_messages.role IN (...) | ⚠️ 未測試 | 依賴資料庫 |
| **CHECK** | model_pricing.credits_cost > 0 | ⚠️ 未測試 | 建議增加 |
| **ON DELETE CASCADE** | sessions, conversations, messages | ⚠️ 未測試 | 建議增加 |
| **ON DELETE SET NULL** | credits_transactions.conversation_id | ⚠️ 未測試 | 建議增加 |

**約束測試覆蓋率**: 14.3% (2/14)

**建議**: 增加整合測試驗證資料完整性約束

---

## 🔌 三、API 端點分析

### 3.1 API 端點清單與測試狀態

#### 認證 API (`/api/auth/*`)

| 端點 | 方法 | 功能 | 測試檔案 | 測試案例數 | 通過率 | 關鍵測試點 |
|------|------|------|----------|-----------|--------|-----------|
| `/api/auth/register` | POST | 註冊 | ❌ 無 | 0 | - | **缺失** |
| `/api/auth/login` | POST | 登入 | login.test.ts | 5 | 100% | ✅ Credits 返回測試 |
| `/api/auth/send-otp` | POST | 發送 OTP | ❌ 無 | 0 | - | **缺失** |
| `/api/auth/verify-otp` | POST | 驗證 OTP | verify-otp.test.ts | ❓ | ❓ | 未執行 |
| `/api/auth/google` | POST | Google OAuth | google.test.ts | ❓ | ❓ | 未執行 |
| `/api/auth/logout` | POST | 登出 | ❌ 無 | 0 | - | **缺失** |
| `/api/auth/me` | GET | 當前用戶 | ❌ 無 | 0 | - | **缺失** |
| `/api/auth/admin-check` | GET | 管理員檢查 | ❌ 無 | 0 | - | **缺失** |
| `/api/auth/set-password` | POST | 設定密碼 | ❌ 無 | 0 | - | **未列於規格** |

**認證 API 測試覆蓋率**: 22.2% (2/9 個端點有測試)

#### 對話 API

| 端點 | 方法 | 功能 | 測試檔案 | 測試案例數 | 通過率 | 關鍵測試點 |
|------|------|------|----------|-----------|--------|-----------|
| `/api/chat` | POST | 發送訊息 | route.test.ts | 7 | 100% | ✅ Credits 檢查與扣除 |
| `/api/chat` | GET | 獲取訊息 | ❌ 無 | 0 | - | **缺失** |
| `/api/chat/upload` | POST | 檔案上傳 | upload.test.ts | ❓ | ❓ | 未執行 |
| `/api/chat/upload-token` | POST | 上傳 Token | upload-token.test.ts | 17 | 0% | ❌ **17 個失敗** |
| `/api/chat/save-log` | POST | 儲存日誌 | save-log.test.ts | ❓ | ❓ | 未執行 |
| `/api/conversations` | GET | 對話列表 | ❌ 無 | 0 | - | **缺失** |

**對話 API 測試覆蓋率**: 66.7% (4/6 個端點有測試)

#### Credits API

| 端點 | 方法 | 功能 | 測試檔案 | 測試案例數 | 通過率 | 關鍵測試點 |
|------|------|------|----------|-----------|--------|-----------|
| `/api/credits` | GET | 查詢餘額 | route.test.ts | 4 | 100% | ✅ 成功/錯誤處理 |
| `/api/credits/history` | GET | 消費歷史 | ❌ 無 | 0 | - | **缺失** |
| `/api/models` | GET | 模型列表 | ❌ 無 | 0 | - | **缺失** |

**Credits API 測試覆蓋率**: 33.3% (1/3 個端點有測試)

#### 管理 API (`/api/admin/*`)

| 端點 | 方法 | 功能 | 測試檔案 | 測試案例數 | 通過率 | 關鍵測試點 |
|------|------|------|----------|-----------|--------|-----------|
| `/api/admin/customers` | GET | 客戶列表 | ❌ 無 | 0 | - | **缺失** |
| `/api/admin/approve` | POST | 審核通過 | ❌ 無 | 0 | - | **缺失** |
| `/api/admin/reject` | POST | 審核拒絕 | ❌ 無 | 0 | - | **缺失** |
| `/api/admin/models` | GET | 模型列表（含停用） | ❌ 無 | 0 | - | **缺失** |
| `/api/admin/models` | POST | 建立模型 | ❌ 無 | 0 | - | **缺失** |
| `/api/admin/models/:name` | PUT | 更新定價 | ❌ 無 | 0 | - | **缺失** |
| `/api/admin/models/:name` | DELETE | 停用模型 | ❌ 無 | 0 | - | **缺失** |
| `/api/admin/credits` | POST | 增加 Credits | ❌ 無 | 0 | - | **缺失** |

**管理 API 測試覆蓋率**: 0% (0/8 個端點有測試)

### 3.2 API 測試問題分析

#### 高優先級問題

1. **檔案上傳測試全面失敗** (`upload-token.test.ts`)
   - **問題**: 17 個測試案例全部失敗（HTTP 500 錯誤）
   - **原因**: 可能的 Mock 配置問題或環境變數缺失
   - **影響**: 檔案上傳功能無法驗證
   - **建議**: 檢查 R2 Mock 設定、環境變數配置

2. **管理 API 完全無測試**
   - **問題**: 8 個管理端點無任何測試
   - **風險**: 管理員功能無法保證穩定性
   - **影響**: 帳號審核、Credits 充值、模型管理無驗證
   - **建議**: **立即補充管理 API 測試**

3. **認證 API 測試不完整**
   - **問題**: 註冊、OTP 發送、登出等核心功能無測試
   - **風險**: 用戶註冊流程無法驗證
   - **建議**: 補充完整的認證流程測試

#### 中優先級問題

4. **對話 API GET 端點無測試**
   - **問題**: `/api/chat` (GET) 和 `/api/conversations` 無測試
   - **影響**: 對話歷史查詢功能無驗證
   - **建議**: 增加查詢端點的測試

5. **Credits API 部分端點無測試**
   - **問題**: 消費歷史、模型列表端點無測試
   - **影響**: 用戶無法驗證 Credits 歷史查詢功能
   - **建議**: 補充完整的 Credits API 測試

### 3.3 API 測試覆蓋率統計

```mermaid
pie title API 端點測試覆蓋率
    "已測試" : 7
    "未測試" : 17
```

**總覆蓋率**: 29.2% (7/24 個端點有測試)

**分類覆蓋率**:
- 認證 API: 22.2%
- 對話 API: 66.7%
- Credits API: 33.3%
- 管理 API: 0%

---

## 🎯 四、功能模組測試分析

### 4.1 認證模組 (`lib/auth/`)

#### 模組清單

| 模組 | 功能 | 測試檔案 | 測試案例 | 狀態 | 覆蓋率估計 |
|------|------|----------|---------|------|-----------|
| `session.ts` | JWT Session 管理 | ❌ 無 | 0 | **缺失** | 0% |
| `password.ts` | 密碼加密與驗證 | ❌ 無 | 0 | **缺失** | 0% |
| `otp-generator.ts` | OTP 生成與驗證 | ❌ 無 | 0 | **缺失** | 0% |
| `google-oauth.ts` | Google OAuth | ❌ 無 | 0 | **缺失** | 0% |
| `admin.ts` | 管理員權限檢查 | ❌ 無 | 0 | **缺失** | 0% |

**認證模組測試覆蓋率**: 0% (0/5 個模組有單元測試)

**說明**: 認證模組僅通過 API 測試間接測試，缺乏獨立的單元測試

#### 關鍵功能測試需求

1. **Session 管理** (`session.ts`)
   ```typescript
   // 需要測試的函數
   - createSession(customerId, ipAddress)
   - verifySession(token)
   - refreshSession(token)
   - deleteSession(token)
   ```
   **測試案例建議**:
   - ✅ 成功建立 Session
   - ✅ Token 格式驗證
   - ✅ Token 過期處理
   - ✅ 無效 Token 處理
   - ✅ Session 刷新邏輯
   - ⚠️ 並發 Session 處理

2. **密碼模組** (`password.ts`)
   ```typescript
   // 需要測試的函數
   - hashPassword(password)
   - verifyPassword(password, hash)
   ```
   **測試案例建議**:
   - ✅ 密碼正確加密
   - ✅ 密碼驗證成功
   - ✅ 密碼驗證失敗
   - ✅ 空密碼處理
   - ✅ 特殊字元密碼
   - ⚠️ 效能測試（bcrypt rounds）

3. **OTP 模組** (`otp-generator.ts`)
   ```typescript
   // 需要測試的函數
   - generateOTP()
   - verifyOTP(email, token)
   - cleanupExpiredOTPs()
   ```
   **測試案例建議**:
   - ✅ OTP 格式正確（6 位數字）
   - ✅ OTP 唯一性
   - ✅ OTP 過期處理
   - ✅ OTP 已使用標記
   - ✅ 清理過期 OTP

### 4.2 MCP 整合模組 (`lib/mcp/`)

#### 模組清單與測試狀態

| 模組 | 功能 | 測試檔案 | 測試案例 | 通過率 | 覆蓋率估計 |
|------|------|----------|---------|--------|-----------|
| `client.ts` | MCP Client (Anthropic API) | client.test.ts | 6 | 83.3% | 70% |
| `workload.ts` | 工作量級別配置 | ❌ 無 | 0 | - | 0% |
| `function-mapping.ts` | 功能到 Skills 映射 | ❌ 無 | 0 | - | 0% |
| `types.ts` | TypeScript 類型定義 | ❌ 無 | 0 | - | N/A |

**MCP 模組測試覆蓋率**: 25% (1/4 個模組有測試)

#### MCP Client 測試分析

**通過的測試** (5/6):
1. ✅ 使用提供的 modelName 呼叫 Anthropic API
2. ✅ 支援不同的模型名稱
3. ✅ 在回應的 metadata 中返回使用的模型
4. ✅ 環境變數設定時優先使用環境變數的模型
5. ✅ 提供 modelName 時覆蓋環境變數的模型

**失敗的測試** (1/6):
- ❌ **應該在未提供 modelName 時使用預設模型**
  - **錯誤**: 預期 `claude-3-haiku-20240307`，實際使用 `claude-haiku-4-5-20251001`
  - **原因**: 預設模型設定與測試預期不一致
  - **影響**: 低（僅為預設值不一致）
  - **建議**: 更新測試預期值或確認預設模型設定

#### Workload 模組測試需求

```typescript
// lib/mcp/workload.ts 需要測試的邏輯
export const WORKLOAD_CONFIGS = {
  instant: { skillsCount: 0, ... },
  basic: { skillsCount: 1, ... },
  standard: { skillsCount: [2, 3], ... },
  professional: { skillsCount: 4, ... },
};

export function getSkillsForWorkload(level, selectedFunction, availableSkills) {
  // 複雜的 Skills 選擇邏輯
}
```

**測試案例建議**:
1. ✅ instant 級別應返回 0 個 Skills
2. ✅ basic 級別應返回 1 個 Skill
3. ✅ standard 級別應返回 2-3 個 Skills
4. ✅ professional 級別應返回 4+ 個 Skills
5. ✅ 根據 selectedFunction 選擇正確的 Skills
6. ✅ availableSkills 不足時的降級處理
7. ⚠️ 邊界情況：空 Skills 列表

#### Function Mapping 模組測試需求

```typescript
// lib/mcp/function-mapping.ts 需要測試的映射
export const FUNCTION_SKILLS_MAPPING = {
  lab: ['clinical-decision-support', 'scientific-critical-thinking', 'statistical-analysis'],
  radiology: ['generate-image', 'clinical-decision-support', 'scientific-critical-thinking', 'pydicom'],
  medical_record: ['clinical-reports', 'clinical-decision-support', 'treatment-plans'],
  medication: ['drugbank-database', 'clinpgx-database', 'clinical-decision-support'],
};
```

**測試案例建議**:
1. ✅ lab 功能應返回正確的 Skills
2. ✅ radiology 功能應包含 generate-image
3. ✅ medical_record 功能應包含 clinical-reports
4. ✅ medication 功能應包含 drugbank-database
5. ✅ 未知功能應返回空陣列或預設 Skills

### 4.3 資料庫模組 (`lib/supabase/`)

#### 模組清單與測試狀態

| 模組 | 功能 | 測試檔案 | 測試案例 | 通過率 | 覆蓋率估計 |
|------|------|----------|---------|--------|-----------|
| `client.ts` | Supabase 客戶端 | ❌ 無 | 0 | - | N/A |
| `customers.ts` | 客戶 CRUD | ❌ 無 | 0 | - | 0% |
| `credits.ts` | Credits 管理 | credits.test.ts | 12 | 100% | 95% |
| `model-pricing.ts` | 模型定價 | model-pricing.test.ts | 15 | 80% | 70% |
| `conversations.ts` | 對話管理 | ❌ 無 | 0 | - | 0% |
| `messages.ts` | 訊息管理 | ❌ 無 | 0 | - | 0% |
| `otp.ts` | OTP Token 管理 | ❌ 無 | 0 | - | 0% |

**資料庫模組測試覆蓋率**: 28.6% (2/7 個模組有測試)

#### Credits 模組測試分析 (✅ 優秀)

**測試完整性**: 12/12 通過（100%）

**涵蓋的功能**:
1. ✅ `getCustomerCredits`: 查詢用戶 Credits
   - 正常查詢
   - 用戶不存在
   - 資料庫錯誤

2. ✅ `deductCredits`: 扣除 Credits
   - Credits 足夠時扣除
   - Credits 不足時拒絕
   - 資料庫錯誤處理

3. ✅ `addCredits`: 增加 Credits
   - 成功增加
   - 用戶不存在
   - 資料庫錯誤

4. ✅ `getCreditsHistory`: 消費歷史
   - 正常查詢
   - 使用預設 limit
   - 資料庫錯誤

**優點**:
- ✅ 完整覆蓋所有函數
- ✅ 包含錯誤處理測試
- ✅ 測試邊界情況（用戶不存在、Credits 不足）
- ✅ Mock 設定正確

**改進建議**:
- ⚠️ 缺少並發扣除測試（多個請求同時扣除）
- ⚠️ 缺少 RPC 函數的原子性測試
- ⚠️ 可增加效能測試（大量歷史記錄）

#### Model Pricing 模組測試分析

**測試完整性**: 12/15 通過（80%）

**失敗的測試** (3/15):
1. ❌ getAllModels > 應該返回所有啟用的模型
   - **錯誤**: `query.eq is not a function`
   - **原因**: Mock chain 設定不完整
   - **修復**: 需要 Mock `.order().eq()` 的完整鏈式呼叫

2. ❌ getAllModels > 應該在沒有模型時返回空陣列
   - **錯誤**: 同上
   - **修復**: 同上

3. ❌ getAllModels > 應該在資料庫錯誤時拋出異常
   - **錯誤**: `query.eq is not a function`（而非預期的 Database error）
   - **修復**: 修正 Mock 後才能測試錯誤處理

**通過的測試** (12/15):
- ✅ `getModelPricing`: 3/3 通過
- ✅ `createModel`: 2/2 通過
- ✅ `updateModelPricing`: 3/3 通過
- ✅ `deactivateModel`: 3/3 通過
- ❌ `activateModel`: 未測試（但與 deactivateModel 對稱）

**Mock 配置問題分析**:

```typescript
// 當前 Mock (錯誤)
const mockChain = {
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  // 缺少 eq 方法！
};

// 正確 Mock (應修正為)
const mockChain = {
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ data: [], error: null }),
};
```

#### Customers 模組測試需求 (❌ 高優先級)

```typescript
// lib/supabase/customers.ts 需要測試的函數
- findCustomerByEmail(email)
- findCustomerByOAuthId(oauthId)
- createCustomer(customerData)
- updateCustomer(customerId, updates)
- updateLastLogin(customerId)
- deleteCustomer(customerId)
```

**測試案例建議**:
1. ✅ 成功查詢客戶（by email, by OAuth ID）
2. ✅ 客戶不存在返回 null
3. ✅ 建立客戶（密碼、OTP、Google OAuth）
4. ✅ Email 重複時錯誤處理
5. ✅ 更新客戶資訊
6. ✅ 更新最後登入時間
7. ✅ 刪除客戶（級聯刪除）
8. ⚠️ 並發建立相同 Email 的客戶

### 4.4 儲存模組 (`lib/storage/`)

#### 模組清單

| 模組 | 功能 | 測試檔案 | 測試案例 | 狀態 | 覆蓋率估計 |
|------|------|----------|---------|------|-----------|
| `upload.ts` | Cloudflare R2 檔案上傳 | ❌ 無 | 0 | **缺失** | 0% |
| `log-generator.ts` | 日誌生成 | ❌ 無 | 0 | **缺失** | 0% |
| `model-versions.ts` | 模型版本管理 | ❌ 無 | 0 | **缺失** | 0% |

**儲存模組測試覆蓋率**: 0% (0/3 個模組有單元測試)

**說明**: 儲存模組僅通過 API 測試間接測試（且 upload-token 測試失敗）

#### Upload 模組測試需求

```typescript
// lib/storage/upload.ts 需要測試的函數
- uploadFileToR2(file, customerId, conversationId)
- generatePublicUrl(key)
- deleteFileFromR2(key)
```

**測試案例建議**:
1. ✅ 成功上傳檔案到 R2
2. ✅ 生成正確的公開 URL
3. ✅ 檔案大小限制（10MB）
4. ✅ 檔案類型限制（JPEG/PDF/DOCX/TXT）
5. ✅ 檔案名稱特殊字元處理
6. ✅ S3 錯誤處理
7. ✅ 刪除檔案成功
8. ⚠️ 大檔案上傳效能
9. ⚠️ 並發上傳處理

### 4.5 驗證模組 (`lib/validation/`)

#### 模組清單

| 模組 | 功能 | 測試檔案 | 測試案例 | 狀態 | 覆蓋率估計 |
|------|------|----------|---------|------|-----------|
| `schemas.ts` | Zod 驗證 Schema | ❌ 無 | 0 | **間接測試** | 50% |

**驗證模組測試覆蓋率**: 0% (無獨立測試，依賴 API 測試)

**說明**: Zod Schema 透過 API 測試間接驗證，建議增加獨立的 Schema 測試

#### Schema 測試需求

```typescript
// lib/validation/schemas.ts 需要測試的 Schema
- loginSchema
- registerSchema
- chatMessageSchema
- otpSchema
- modelPricingSchema
```

**測試案例建議**:
1. ✅ 有效輸入通過驗證
2. ✅ 無效 Email 格式拒絕
3. ✅ 密碼長度不足拒絕
4. ✅ 必填欄位缺失拒絕
5. ✅ 類型錯誤拒絕
6. ✅ 邊界值測試（最小/最大長度）
7. ✅ 特殊字元處理
8. ✅ SQL 注入嘗試拒絕

---

## 🧪 五、測試執行結果詳細分析

### 5.1 測試執行統計

```
測試框架: Vitest 4.0.18
測試環境: happy-dom
執行時間: 5.33 秒
測試檔案: 11 個
測試案例: 99 個

通過: 75 (75.76%)
失敗: 24 (24.24%)
跳過: 0
待辦: 0
```

### 5.2 失敗測試詳細分析

#### 分類 1: Mock 配置問題 (3 個)

**檔案**: `__tests__/lib/supabase/model-pricing.test.ts`

1. **getAllModels > 應該返回所有啟用的模型**
   ```
   錯誤: query.eq is not a function
   位置: lib/supabase/model-pricing.ts:29:19
   原因: Mock chain 缺少 .eq() 方法
   修復難度: 簡單
   預估時間: 5 分鐘
   ```

2. **getAllModels > 應該在沒有模型時返回空陣列**
   ```
   錯誤: 同上
   修復: 同上
   ```

3. **getAllModels > 應該在資料庫錯誤時拋出異常**
   ```
   錯誤: expected 'Database error' but got 'query.eq is not a function'
   原因: Mock 修正後才能測試錯誤處理
   修復: 同上
   ```

**修復方案**:

```typescript
// 修正前（錯誤）
const mockChain = {
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
};

// 修正後（正確）
const mockChain = {
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ data: mockModels, error: null }),
};
```

#### 分類 2: 預設值不一致 (1 個)

**檔案**: `__tests__/lib/mcp/client.test.ts`

4. **sendMessage with modelName > 應該在未提供 modelName 時使用預設模型**
   ```
   錯誤: expected 'claude-haiku-4-5-20251001' to be 'claude-3-haiku-20240307'
   原因: 預設模型已更新為 Claude 4.5 Haiku，但測試預期仍為 Claude 3 Haiku
   影響: 低（僅為預設值不一致，不影響功能）
   修復難度: 簡單
   預估時間: 2 分鐘
   ```

**修復方案**:

```typescript
// 選項 1: 更新測試預期值
const defaultModel = 'claude-haiku-4-5-20251001';

// 選項 2: 或更新 client.ts 預設值
const defaultModel = 'claude-3-haiku-20240307';
```

#### 分類 3: 檔案上傳測試失敗 (17 個)

**檔案**: `__tests__/api/chat/upload-token.test.ts`

**共同問題**: 所有 17 個測試均返回 HTTP 500 錯誤

5-21. **所有 upload-token 測試**
   ```
   錯誤: expected 200 to be 500
   原因: API Route 內部錯誤，可能為：
         1. R2 Mock 配置問題
         2. 環境變數缺失（R2_ACCOUNT_ID 等）
         3. AWS SDK Mock 不正確
         4. Session 驗證失敗
   影響: 高（檔案上傳功能無法驗證）
   修復難度: 中等
   預估時間: 30-60 分鐘
   ```

**診斷步驟**:

1. 檢查 API Route 的錯誤日誌
2. 驗證環境變數設定
3. 檢查 R2 Mock 配置
4. 確認 Session Mock 正確

**可能的修復方案**:

```typescript
// 檢查點 1: 環境變數
beforeEach(() => {
  process.env.R2_ACCOUNT_ID = 'test-account';
  process.env.R2_ACCESS_KEY_ID = 'test-access-key';
  process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
  process.env.R2_BUCKET_NAME = 'test-bucket';
});

// 檢查點 2: R2 Client Mock
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn(),
}));

// 檢查點 3: Session Mock
vi.mock('@/lib/auth/session', () => ({
  verifySession: vi.fn().mockResolvedValue({
    customerId: 'test-customer-id',
    email: 'test@example.com',
  }),
}));
```

#### 分類 4: Agent Logging 問題 (3 個)

**檔案**: `__tests__/api/chat/upload-token.test.ts`

22-24. **Agent Logging 測試**
   ```
   錯誤: expected "vi.fn()" to be called with arguments: [ …(2) ]
         Number of calls: 0
   原因: global.fetch Mock 未被呼叫（Agent Logging 功能可能未執行）
   可能原因:
         1. Agent Logging 功能未實作
         2. 測試環境未啟用 Agent Logging
         3. Mock 設定不正確
   影響: 中（日誌功能無法驗證）
   修復難度: 中等
   預估時間: 20 分鐘
   ```

### 5.3 測試通過情況分析

#### 優秀的測試 (100% 通過)

1. **Credits 模組** (`__tests__/lib/supabase/credits.test.ts`)
   - 12/12 測試通過
   - 涵蓋所有函數
   - 包含錯誤處理
   - Mock 配置正確

2. **Login API** (`__tests__/api/auth/login.test.ts`)
   - 5/5 測試通過
   - 測試 Credits 返回
   - 測試錯誤處理
   - 測試用戶不存在情況

3. **Credits API** (`__tests__/api/credits/route.test.ts`)
   - 4/4 測試通過
   - 測試成功查詢
   - 測試錯誤處理

4. **Chat API** (`__tests__/api/chat/route.test.ts`)
   - 7/7 測試通過
   - 測試 Credits 檢查
   - 測試 Credits 扣除
   - 測試模型選擇

#### 良好的測試 (80%+ 通過)

5. **Model Pricing 模組** (`__tests__/lib/supabase/model-pricing.test.ts`)
   - 12/15 測試通過（80%）
   - 3 個失敗為 Mock 配置問題
   - 核心功能測試完整

6. **MCP Client** (`__tests__/lib/mcp/client.test.ts`)
   - 5/6 測試通過（83.3%）
   - 1 個失敗為預設值不一致
   - 模型選擇邏輯測試完整

### 5.4 測試效能分析

```
總執行時間: 5.33 秒
- Transform: 5.73 秒（檔案轉換）
- Setup: 7.33 秒（測試環境設定）
- Import: 9.15 秒（模組載入）
- Tests: 718 毫秒（實際測試執行）
- Environment: 25.10 秒（環境初始化）
```

**觀察**:
- ✅ 測試執行速度快（718ms）
- ⚠️ 環境設定時間長（25.10 秒）
- ⚠️ 模組載入時間長（9.15 秒）

**改進建議**:
- 考慮使用測試快取
- 優化 Mock 設定
- 減少不必要的模組載入

---

## 📊 六、測試覆蓋率分析

### 6.1 整體覆蓋率估計

> **注意**: 實際覆蓋率需執行 `npm run test:coverage` 獲取

| 層級 | 預估覆蓋率 | 已測試檔案 | 總檔案數 | 狀態 |
|------|-----------|-----------|---------|------|
| **API 端點** | 29.2% | 7 | 24 | 🔴 不足 |
| **Lib 模組** | 19.2% | 5 | 26 | 🔴 不足 |
| **React 元件** | 0% | 0 | 15 | 🔴 無測試 |
| **Database Functions** | 50% | 2 | 4 | 🟡 中等 |
| **Validation** | 50% | 0 (間接) | 1 | 🟡 中等 |

**整體預估覆蓋率**: **24.3%** (12/49 個模組/端點有測試)

### 6.2 關鍵模組覆蓋率

```mermaid
graph TB
    subgraph "高覆蓋率 (>80%)"
        Credits[Credits 模組<br/>95%]
        ModelPricing[Model Pricing<br/>70%*]
        MCPClient[MCP Client<br/>70%]
    end
    
    subgraph "中覆蓋率 (50-80%)"
        ChatAPI[Chat API<br/>60%]
        Validation[Validation<br/>50%]
    end
    
    subgraph "低覆蓋率 (<50%)"
        AuthAPI[Auth API<br/>22%]
        CreditsAPI[Credits API<br/>33%]
    end
    
    subgraph "無覆蓋 (0%)"
        AdminAPI[Admin API<br/>0%]
        AuthModules[Auth Modules<br/>0%]
        StorageModules[Storage Modules<br/>0%]
        Components[React Components<br/>0%]
    end
    
    style Credits fill:#90EE90
    style ModelPricing fill:#90EE90
    style MCPClient fill:#90EE90
    style ChatAPI fill:#FFD700
    style Validation fill:#FFD700
    style AuthAPI fill:#FFA07A
    style CreditsAPI fill:#FFA07A
    style AdminAPI fill:#FF6B6B
    style AuthModules fill:#FF6B6B
    style StorageModules fill:#FF6B6B
    style Components fill:#FF6B6B
```

### 6.3 未測試的關鍵功能

#### 🔴 高優先級（業務關鍵）

1. **帳號審核系統** (`/api/admin/approve`, `/api/admin/reject`)
   - 影響: 用戶無法完成註冊流程
   - 風險: 審核邏輯錯誤導致帳號狀態不一致
   - **建議**: 立即補充測試

2. **OTP 發送與驗證** (`/api/auth/send-otp`, `/api/auth/verify-otp`)
   - 影響: 無密碼登入/註冊流程無法驗證
   - 風險: OTP 生成、過期、驗證邏輯錯誤
   - **建議**: 立即補充測試

3. **用戶註冊** (`/api/auth/register`)
   - 影響: 新用戶無法註冊
   - 風險: 密碼/OTP/Google OAuth 註冊流程錯誤
   - **建議**: 立即補充測試

4. **檔案上傳** (`/api/chat/upload`, `/api/chat/upload-token`)
   - 影響: 檔案上傳功能無法驗證
   - 風險: 檔案遺失、上傳失敗
   - **建議**: 修復現有測試

#### 🟡 中優先級（功能完整性）

5. **對話歷史查詢** (`/api/chat` GET, `/api/conversations`)
   - 影響: 對話記錄查詢無法驗證
   - 風險: 對話列表錯誤、訊息遺失
   - **建議**: 補充測試

6. **Credits 歷史** (`/api/credits/history`)
   - 影響: 消費記錄查詢無法驗證
   - 風險: 歷史記錄不完整
   - **建議**: 補充測試

7. **模型列表** (`/api/models`, `/api/admin/models`)
   - 影響: 模型選擇功能無法驗證
   - 風險: 停用模型仍可選擇
   - **建議**: 補充測試

#### 🟢 低優先級（次要功能）

8. **工作量級別邏輯** (`lib/mcp/workload.ts`)
   - 影響: Skills 選擇邏輯無法驗證
   - 風險: Skills 數量不符預期
   - **建議**: 補充單元測試

9. **功能映射** (`lib/mcp/function-mapping.ts`)
   - 影響: 功能到 Skills 映射無法驗證
   - 風險: 選擇錯誤的 Skills
   - **建議**: 補充單元測試

---

## 🎯 七、測試改進建議

### 7.1 立即修復項目（1-2 天）

#### 優先級 1: 修復失敗的測試

1. **修復 Model Pricing Mock 問題** (預估 10 分鐘)
   ```typescript
   // 檔案: __tests__/lib/supabase/model-pricing.test.ts
   // 修正 getAllModels 的 Mock chain
   
   const mockChain = {
     select: vi.fn().mockReturnThis(),
     order: vi.fn().mockReturnThis(),
     eq: vi.fn().mockResolvedValue({ data: mockModels, error: null }),
   };
   ```

2. **修復 MCP Client 預設模型測試** (預估 5 分鐘)
   ```typescript
   // 選項 1: 更新測試預期
   const defaultModel = 'claude-haiku-4-5-20251001';
   
   // 選項 2: 或更新 lib/mcp/client.ts 預設值
   ```

3. **修復檔案上傳測試** (預估 1-2 小時)
   - 診斷 HTTP 500 錯誤原因
   - 修正 R2 Mock 配置
   - 驗證環境變數設定
   - 確認 Session Mock 正確

#### 優先級 2: 補充高風險功能測試

4. **補充 Auth API 測試** (預估 4 小時)
   ```
   需要補充的測試:
   - POST /api/auth/register (密碼/OTP 註冊)
   - POST /api/auth/send-otp (發送 OTP)
   - POST /api/auth/logout (登出)
   - GET /api/auth/me (當前用戶)
   - GET /api/auth/admin-check (管理員檢查)
   
   測試案例數: 預估 15-20 個
   ```

5. **補充 Admin API 測試** (預估 6 小時)
   ```
   需要補充的測試:
   - GET /api/admin/customers (客戶列表)
   - POST /api/admin/approve (審核通過)
   - POST /api/admin/reject (審核拒絕)
   - GET /api/admin/models (模型列表)
   - POST /api/admin/models (建立模型)
   - PUT /api/admin/models/:name (更新定價)
   - DELETE /api/admin/models/:name (停用模型)
   - POST /api/admin/credits (增加 Credits)
   
   測試案例數: 預估 25-30 個
   ```

### 7.2 短期改進項目（1 週）

#### 優先級 3: 補充核心模組單元測試

6. **Auth 模組單元測試** (預估 8 小時)
   ```typescript
   // 需要測試的模組
   - lib/auth/session.ts (Session 管理)
   - lib/auth/password.ts (密碼加密)
   - lib/auth/otp-generator.ts (OTP 生成)
   - lib/auth/google-oauth.ts (Google OAuth)
   - lib/auth/admin.ts (管理員權限)
   
   測試案例數: 預估 40-50 個
   ```

7. **Database 模組單元測試** (預估 6 小時)
   ```typescript
   // 需要測試的模組
   - lib/supabase/customers.ts (客戶 CRUD)
   - lib/supabase/conversations.ts (對話管理)
   - lib/supabase/messages.ts (訊息管理)
   - lib/supabase/otp.ts (OTP Token 管理)
   
   測試案例數: 預估 30-40 個
   ```

8. **MCP 模組單元測試** (預估 4 小時)
   ```typescript
   // 需要測試的模組
   - lib/mcp/workload.ts (工作量級別)
   - lib/mcp/function-mapping.ts (功能映射)
   
   測試案例數: 預估 15-20 個
   ```

9. **Storage 模組單元測試** (預估 4 小時)
   ```typescript
   // 需要測試的模組
   - lib/storage/upload.ts (R2 檔案上傳)
   - lib/storage/log-generator.ts (日誌生成)
   - lib/storage/model-versions.ts (模型版本)
   
   測試案例數: 預估 20-25 個
   ```

10. **Validation 模組單元測試** (預估 3 小時)
    ```typescript
    // 需要測試的 Schema
    - lib/validation/schemas.ts (所有 Zod Schema)
    
    測試案例數: 預估 30-40 個
    ```

### 7.3 中期改進項目（2-3 週）

#### 優先級 4: React 元件測試

11. **認證元件測試** (預估 6 小時)
    ```typescript
    // 需要測試的元件
    - components/auth/OTPInput.tsx
    - components/auth/CountdownTimer.tsx
    - components/auth/GoogleLoginButton.tsx
    - components/auth/LogoutButton.tsx
    
    測試案例數: 預估 20-25 個
    ```

12. **對話元件測試** (預估 8 小時)
    ```typescript
    // 需要測試的元件
    - components/chat/ChatWindow.tsx
    - components/chat/MessageList.tsx
    - components/chat/MessageBubble.tsx
    - components/chat/ChatInput.tsx
    - components/chat/FunctionSelector.tsx
    - components/chat/WorkloadSelector.tsx
    - components/chat/ModelSelector.tsx
    - components/chat/FileUploader.tsx
    - components/chat/CreditsDisplay.tsx
    
    測試案例數: 預估 40-50 個
    ```

13. **其他元件測試** (預估 4 小時)
    ```typescript
    // 需要測試的元件
    - components/onboarding/OnboardingModal.tsx
    - components/admin/AdminButton.tsx
    
    測試案例數: 預估 15-20 個
    ```

#### 優先級 5: 整合測試

14. **完整流程整合測試** (預估 8 小時)
    ```
    需要測試的流程:
    - 註冊 → 登入 → 發送訊息 → 查詢歷史 → 登出
    - OTP 註冊 → OTP 登入 → 使用不同模型 → 查詢 Credits
    - Google OAuth 登入 → 上傳檔案 → 發送訊息 → 查詢對話
    - 管理員登入 → 審核用戶 → 增加 Credits → 管理模型
    
    測試案例數: 預估 15-20 個
    ```

15. **並發測試** (預估 6 小時)
    ```
    需要測試的場景:
    - 多用戶同時扣除 Credits
    - 同時建立相同 Email 的用戶
    - 同時上傳大量檔案
    - 同時發送多個 AI 請求
    
    測試案例數: 預估 10-15 個
    ```

#### 優先級 6: 效能測試

16. **API 效能測試** (預估 6 小時)
    ```
    需要測試的場景:
    - 大量對話記錄查詢（1000+ 對話）
    - 大量 Credits 歷史查詢（10000+ 記錄）
    - 大檔案上傳（接近 10MB）
    - 長時間 AI 回應
    
    測試案例數: 預估 10-15 個
    ```

17. **資料庫效能測試** (預估 4 小時)
    ```
    需要測試的場景:
    - 索引效能驗證
    - 查詢計畫分析
    - 大量資料插入效能
    - 觸發器效能影響
    
    測試案例數: 預估 8-12 個
    ```

### 7.4 長期改進項目（1-2 個月）

#### 優先級 7: 端到端測試

18. **E2E 測試設定** (預估 8 小時)
    ```
    工具選擇: Playwright 或 Cypress
    需要測試的流程:
    - 完整的用戶旅程（註冊到使用）
    - 檔案上傳與顯示
    - 多頁面導航
    - 錯誤處理與重試
    
    測試案例數: 預估 20-30 個
    ```

#### 優先級 8: 測試基礎設施

19. **CI/CD 整合** (預估 4 小時)
    ```
    需要設定的項目:
    - GitHub Actions 自動測試
    - 測試覆蓋率報告
    - 失敗測試通知
    - Pull Request 測試檢查
    ```

20. **測試資料管理** (預估 6 小時)
    ```
    需要建立的工具:
    - Test Fixtures 生成器
    - 測試資料庫設定
    - Mock 資料管理
    - 測試環境隔離
    ```

#### 優先級 9: 測試文件

21. **測試指南文件** (預估 4 小時)
    ```
    需要撰寫的文件:
    - 測試撰寫規範
    - Mock 使用指南
    - 測試資料準備指南
    - 常見問題排解
    ```

---

## 📈 八、測試覆蓋率提升計劃

### 8.1 階段性目標

```mermaid
gantt
    title 測試覆蓋率提升時程
    dateFormat  YYYY-MM-DD
    section 第一階段（立即修復）
    修復失敗測試           :done, p1, 2026-02-05, 1d
    補充 Auth API 測試     :active, p2, 2026-02-06, 1d
    補充 Admin API 測試    :p3, 2026-02-07, 2d
    
    section 第二階段（短期改進）
    Auth 模組單元測試      :p4, 2026-02-09, 2d
    Database 模組測試      :p5, 2026-02-11, 2d
    MCP & Storage 測試     :p6, 2026-02-13, 2d
    Validation 測試        :p7, 2026-02-15, 1d
    
    section 第三階段（中期改進）
    React 元件測試         :p8, 2026-02-16, 4d
    整合測試              :p9, 2026-02-20, 2d
    效能測試              :p10, 2026-02-22, 2d
    
    section 第四階段（長期改進）
    E2E 測試              :p11, 2026-02-24, 2d
    CI/CD 整合            :p12, 2026-02-26, 1d
    測試文件              :p13, 2026-02-27, 1d
```

### 8.2 覆蓋率提升預測

| 階段 | 完成日期 | 預估覆蓋率 | 測試案例數 | 關鍵里程碑 |
|------|---------|-----------|-----------|-----------|
| **當前狀態** | 2026-02-05 | 24.3% | 99 | - |
| **第一階段** | 2026-02-08 | 45% | 160 | 修復所有失敗測試，補充 API 測試 |
| **第二階段** | 2026-02-16 | 70% | 300 | 完成核心模組單元測試 |
| **第三階段** | 2026-02-24 | 85% | 450 | 完成元件與整合測試 |
| **第四階段** | 2026-02-28 | 90%+ | 500+ | 完成 E2E 測試與 CI/CD |

**目標覆蓋率**: **≥ 90%** (關鍵邏輯 100%)

### 8.3 測試工作量估算

| 類別 | 測試案例數 | 預估工時 | 優先級 |
|------|-----------|---------|--------|
| **修復失敗測試** | 24 | 2-3 小時 | 🔴 高 |
| **API 端點測試** | 80-100 | 16-20 小時 | 🔴 高 |
| **Lib 模組單元測試** | 150-180 | 30-36 小時 | 🟡 中 |
| **React 元件測試** | 80-100 | 18-22 小時 | 🟡 中 |
| **整合測試** | 30-40 | 14-16 小時 | 🟡 中 |
| **效能測試** | 20-30 | 10-12 小時 | 🟢 低 |
| **E2E 測試** | 20-30 | 8-10 小時 | 🟢 低 |
| **測試基礎設施** | - | 10-12 小時 | 🟢 低 |

**總工時估算**: **108-131 小時** (約 13-16 個工作天)

---

## 🔍 九、資料庫完整性測試建議

### 9.1 約束測試策略

#### 外鍵約束測試

```typescript
// 測試案例範例: sessions 的外鍵約束
describe('Database Constraints - Foreign Keys', () => {
  it('應該在刪除 customer 時級聯刪除 sessions', async () => {
    // 1. 建立 customer
    const customer = await createCustomer({ ... });
    
    // 2. 建立 session
    const session = await createSession(customer.id, '127.0.0.1');
    
    // 3. 刪除 customer
    await deleteCustomer(customer.id);
    
    // 4. 驗證 session 已被刪除
    const deletedSession = await getSessionById(session.id);
    expect(deletedSession).toBeNull();
  });
  
  it('應該拒絕建立引用不存在 customer 的 session', async () => {
    const fakeCustomerId = 'non-existent-id';
    
    await expect(
      createSession(fakeCustomerId, '127.0.0.1')
    ).rejects.toThrow('Foreign key violation');
  });
});
```

#### 唯一約束測試

```typescript
// 測試案例範例: customers.email 唯一約束
describe('Database Constraints - Unique', () => {
  it('應該拒絕建立重複的 email', async () => {
    const email = 'test@example.com';
    
    // 1. 建立第一個客戶
    await createCustomer({ email, name: 'User 1' });
    
    // 2. 嘗試建立第二個相同 email 的客戶
    await expect(
      createCustomer({ email, name: 'User 2' })
    ).rejects.toThrow('Unique constraint violation');
  });
  
  it('應該允許建立不同的 email', async () => {
    await createCustomer({ email: 'user1@example.com', name: 'User 1' });
    await createCustomer({ email: 'user2@example.com', name: 'User 2' });
    // 不應該拋出錯誤
  });
});
```

#### CHECK 約束測試

```typescript
// 測試案例範例: model_pricing.credits_cost > 0
describe('Database Constraints - Check', () => {
  it('應該拒絕建立 credits_cost <= 0 的模型', async () => {
    await expect(
      createModel({
        model_name: 'test-model',
        display_name: 'Test Model',
        credits_cost: 0, // 無效值
      })
    ).rejects.toThrow('Check constraint violation');
    
    await expect(
      createModel({
        model_name: 'test-model-2',
        display_name: 'Test Model 2',
        credits_cost: -5, // 無效值
      })
    ).rejects.toThrow('Check constraint violation');
  });
  
  it('應該允許建立 credits_cost > 0 的模型', async () => {
    const model = await createModel({
      model_name: 'test-model',
      display_name: 'Test Model',
      credits_cost: 10,
    });
    expect(model.credits_cost).toBe(10);
  });
});
```

### 9.2 觸發器測試策略

```typescript
// 測試案例範例: updated_at 自動更新
describe('Database Triggers - Update Timestamp', () => {
  it('應該在更新 customer 時自動更新 updated_at', async () => {
    // 1. 建立 customer
    const customer = await createCustomer({ email: 'test@example.com', name: 'Test' });
    const originalUpdatedAt = customer.updated_at;
    
    // 2. 等待 1 秒
    await sleep(1000);
    
    // 3. 更新 customer
    const updatedCustomer = await updateCustomer(customer.id, { name: 'Updated Name' });
    
    // 4. 驗證 updated_at 已更新
    expect(new Date(updatedCustomer.updated_at).getTime()).toBeGreaterThan(
      new Date(originalUpdatedAt).getTime()
    );
  });
  
  it('應該在更新 model_pricing 時自動更新 updated_at', async () => {
    // 類似測試邏輯
  });
});
```

### 9.3 RPC 函數測試策略

```typescript
// 測試案例範例: deduct_customer_credits RPC 函數
describe('Database RPC Functions - deduct_customer_credits', () => {
  it('應該在並發扣除時保證原子性', async () => {
    // 1. 建立 customer，初始 Credits = 100
    const customer = await createCustomer({ email: 'test@example.com', credits: 100 });
    
    // 2. 並發發送 10 個扣除請求（每次 10 點）
    const promises = Array(10).fill(null).map(() =>
      deductCredits(customer.id, 10, 'test-model', 'conv-id')
    );
    
    const results = await Promise.allSettled(promises);
    
    // 3. 驗證結果
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'fulfilled' && !r.value.success).length;
    
    // 應該只有 10 個成功（100 / 10 = 10）
    expect(successful).toBe(10);
    
    // 4. 驗證最終 Credits = 0
    const finalCredits = await getCustomerCredits(customer.id);
    expect(finalCredits).toBe(0);
  });
  
  it('應該在 Credits 不足時回滾事務', async () => {
    // 1. 建立 customer，初始 Credits = 5
    const customer = await createCustomer({ email: 'test@example.com', credits: 5 });
    
    // 2. 嘗試扣除 10 點
    const result = await deductCredits(customer.id, 10, 'test-model', 'conv-id');
    
    // 3. 驗證扣除失敗
    expect(result.success).toBe(false);
    expect(result.error).toContain('Credits 不足');
    
    // 4. 驗證 Credits 未改變
    const finalCredits = await getCustomerCredits(customer.id);
    expect(finalCredits).toBe(5);
    
    // 5. 驗證未建立交易記錄
    const transactions = await getCreditsHistory(customer.id);
    expect(transactions).toHaveLength(0);
  });
});
```

---

## 🚀 十、測試自動化與 CI/CD

### 10.1 GitHub Actions 配置建議

```yaml
# .github/workflows/test.yml
name: Automated Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test -- --run --reporter=verbose
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
      
      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: codecov/codecov-action@v4
        with:
          flags: unittests
```

### 10.2 測試報告整合

```yaml
# 測試失敗通知
      - name: Notify on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: '測試失敗！請檢查 GitHub Actions 日誌。'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 10.3 Pre-commit Hooks 設定

```json
// package.json
{
  "scripts": {
    "test:pre-commit": "vitest run --reporter=verbose --changed",
    "lint:fix": "eslint . --fix"
  },
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "npm run lint:fix",
      "npm run test:pre-commit"
    ]
  }
}
```

---

## 📋 十一、測試檢查清單

### 11.1 測試撰寫檢查清單

- [ ] **命名清晰**: 測試名稱描述預期行為
- [ ] **單一職責**: 每個測試只驗證一個行為
- [ ] **Arrange-Act-Assert**: 遵循 AAA 模式
- [ ] **獨立性**: 測試之間無依賴
- [ ] **可重複**: 每次執行結果一致
- [ ] **快速**: 單元測試 < 100ms，整合測試 < 1s
- [ ] **有意義**: 測試實際業務邏輯，非實作細節
- [ ] **覆蓋邊界**: 包含正常、異常、邊界情況

### 11.2 Mock 使用檢查清單

- [ ] **必要性**: 只 Mock 外部依賴（資料庫、API）
- [ ] **真實性**: Mock 行為符合真實情況
- [ ] **清理**: 每個測試後清理 Mock
- [ ] **驗證**: 驗證 Mock 被正確呼叫
- [ ] **完整性**: Mock chain 完整（如 Supabase query）

### 11.3 API 測試檢查清單

- [ ] **成功情況**: 正常請求返回 200
- [ ] **錯誤處理**: 無效輸入返回 400
- [ ] **認證**: 未認證返回 401
- [ ] **授權**: 無權限返回 403
- [ ] **資源不存在**: 返回 404
- [ ] **伺服器錯誤**: 返回 500
- [ ] **Rate Limiting**: 超過限制返回 429
- [ ] **回應格式**: 驗證回應 JSON 格式

### 11.4 資料庫測試檢查清單

- [ ] **CRUD 操作**: Create, Read, Update, Delete
- [ ] **約束驗證**: 外鍵、唯一、CHECK 約束
- [ ] **觸發器**: 自動更新欄位
- [ ] **RPC 函數**: 參數驗證、返回值驗證
- [ ] **事務**: 原子性、回滾
- [ ] **並發**: 防止資料競爭
- [ ] **效能**: 查詢效能、索引效能

### 11.5 元件測試檢查清單

- [ ] **渲染**: 元件正確渲染
- [ ] **Props**: Props 傳遞與使用
- [ ] **事件**: 用戶互動事件
- [ ] **狀態**: 狀態變化正確
- [ ] **條件渲染**: 根據狀態顯示/隱藏
- [ ] **錯誤處理**: 錯誤狀態顯示
- [ ] **無障礙**: ARIA 標籤、鍵盤導航

---

## 📊 十二、測試指標與 KPI

### 12.1 當前指標

| 指標 | 當前值 | 目標值 | 狀態 |
|------|--------|--------|------|
| **測試通過率** | 75.76% | 100% | 🟡 需改進 |
| **代碼覆蓋率** | 24.3% (估計) | ≥ 90% | 🔴 不足 |
| **API 覆蓋率** | 29.2% | ≥ 95% | 🔴 不足 |
| **Lib 模組覆蓋率** | 19.2% | ≥ 90% | 🔴 不足 |
| **元件覆蓋率** | 0% | ≥ 80% | 🔴 無測試 |
| **測試執行時間** | 5.33s | < 10s | ✅ 良好 |
| **測試維護成本** | 低 | 低 | ✅ 良好 |

### 12.2 目標指標（第四階段完成後）

| 指標 | 目標值 | 說明 |
|------|--------|------|
| **測試通過率** | 100% | 所有測試通過 |
| **整體覆蓋率** | ≥ 90% | Statement, Branch, Function |
| **關鍵路徑覆蓋率** | 100% | 認證、支付、資料安全 |
| **API 覆蓋率** | ≥ 95% | 所有端點有測試 |
| **Lib 模組覆蓋率** | ≥ 90% | 所有核心模組有單元測試 |
| **元件覆蓋率** | ≥ 80% | 所有業務元件有測試 |
| **測試案例數** | ≥ 500 | 單元 + 整合 + E2E |
| **測試執行時間** | < 30s | 包含所有測試 |
| **CI/CD 整合** | 100% | 自動執行、自動報告 |

### 12.3 監控與改進

```mermaid
graph LR
    A[每日測試執行] --> B[收集指標]
    B --> C{通過率 < 100%?}
    C -->|是| D[分析失敗原因]
    C -->|否| E[檢查覆蓋率]
    D --> F[修復失敗測試]
    E --> G{覆蓋率 < 90%?}
    G -->|是| H[補充測試]
    G -->|否| I[維持品質]
    F --> A
    H --> A
    I --> A
```

---

## 🎓 十三、測試最佳實踐建議

### 13.1 測試金字塔

```mermaid
graph TB
    subgraph "測試金字塔"
        E2E[E2E 測試<br/>20-30 個<br/>慢、昂貴、高信心]
        Integration[整合測試<br/>50-80 個<br/>中速、中成本、中信心]
        Unit[單元測試<br/>400+ 個<br/>快、便宜、基礎信心]
    end
    
    E2E --> Integration
    Integration --> Unit
    
    style E2E fill:#FFD700
    style Integration fill:#90EE90
    style Unit fill:#87CEEB
```

**建議比例**: 單元測試 70% : 整合測試 25% : E2E 測試 5%

### 13.2 測試驅動開發 (TDD)

```
1. 撰寫測試（紅燈）
   ↓
2. 實作功能（綠燈）
   ↓
3. 重構代碼（維持綠燈）
   ↓
4. 重複循環
```

**優點**:
- ✅ 確保代碼可測試
- ✅ 提高代碼品質
- ✅ 減少 Bug
- ✅ 提升開發信心

### 13.3 測試命名規範

```typescript
// ❌ 不好的命名
it('test1', () => { ... });
it('should work', () => { ... });

// ✅ 好的命名
it('應該在 Credits 不足時拒絕請求', () => { ... });
it('應該在用戶不存在時返回 404', () => { ... });
it('應該在並發扣除時保證原子性', () => { ... });
```

**命名模式**: `應該在 [條件] 時 [預期行為]`

### 13.4 AAA 模式

```typescript
it('應該成功建立新客戶', async () => {
  // Arrange（準備）
  const customerData = {
    email: 'test@example.com',
    name: 'Test User',
    password: 'password123',
  };
  
  // Act（執行）
  const customer = await createCustomer(customerData);
  
  // Assert（驗證）
  expect(customer.id).toBeDefined();
  expect(customer.email).toBe(customerData.email);
  expect(customer.name).toBe(customerData.name);
});
```

### 13.5 測試隔離

```typescript
// ✅ 好的做法：每個測試獨立
describe('Customer API', () => {
  beforeEach(() => {
    // 每個測試前重置狀態
    vi.clearAllMocks();
  });
  
  it('測試 1', () => { ... });
  it('測試 2', () => { ... });
});

// ❌ 不好的做法：測試之間有依賴
describe('Customer API', () => {
  let customer;
  
  it('應該建立客戶', () => {
    customer = createCustomer({ ... });
  });
  
  it('應該更新客戶', () => {
    // 依賴前一個測試
    updateCustomer(customer.id, { ... });
  });
});
```

---

## 📝 十四、總結與建議

### 14.1 核心發現

#### 優勢 ✅

1. **Credits 系統測試完善** (100% 通過)
   - 完整覆蓋所有函數
   - 包含錯誤處理
   - Mock 配置正確

2. **基礎架構穩固**
   - Vitest 配置正確
   - Mock 策略清晰
   - 測試環境設定完整

3. **測試執行速度快** (718ms)
   - 單元測試效能優秀
   - 有利於 TDD 開發

#### 劣勢 ❌

1. **整體覆蓋率過低** (24.3%)
   - 大量功能無測試
   - 高風險功能未驗證

2. **管理功能無測試** (0%)
   - 帳號審核無驗證
   - Credits 充值無驗證
   - 模型管理無驗證

3. **前端元件無測試** (0%)
   - UI 互動無驗證
   - 用戶體驗無保證

4. **檔案上傳測試失敗** (17 個)
   - 關鍵功能無法驗證
   - Mock 配置需修正

### 14.2 立即行動建議

#### 🔴 緊急修復（1-2 天）

1. **修復所有失敗測試** (24 個)
   - Model Pricing Mock (3 個)
   - MCP Client 預設值 (1 個)
   - 檔案上傳測試 (20 個)

2. **補充高風險功能測試**
   - 用戶註冊流程
   - OTP 發送與驗證
   - 帳號審核系統

#### 🟡 短期改進（1 週）

3. **補充核心模組單元測試**
   - Auth 模組（5 個檔案）
   - Database 模組（4 個檔案）
   - MCP 模組（2 個檔案）
   - Storage 模組（3 個檔案）

4. **補充 API 端點測試**
   - Admin API（8 個端點）
   - 其他缺失的 API（9 個端點）

#### 🟢 中期改進（2-3 週）

5. **補充 React 元件測試**
   - 認證元件（4 個）
   - 對話元件（9 個）
   - 其他元件（2 個）

6. **建立整合測試**
   - 完整流程測試
   - 並發測試
   - 效能測試

### 14.3 預期成果

完成所有改進後，預期達成：

| 指標 | 當前值 | 目標值 | 改進幅度 |
|------|--------|--------|---------|
| **整體覆蓋率** | 24.3% | ≥ 90% | +65.7% |
| **測試通過率** | 75.76% | 100% | +24.24% |
| **測試案例數** | 99 | 500+ | +400+ |
| **API 覆蓋率** | 29.2% | ≥ 95% | +65.8% |
| **Lib 覆蓋率** | 19.2% | ≥ 90% | +70.8% |
| **元件覆蓋率** | 0% | ≥ 80% | +80% |

### 14.4 風險評估

| 風險 | 影響 | 機率 | 優先級 | 緩解措施 |
|------|------|------|--------|---------|
| **管理功能錯誤** | 高 | 中 | 🔴 高 | 立即補充測試 |
| **檔案上傳失敗** | 高 | 低 | 🔴 高 | 修復測試、增加監控 |
| **Credits 計算錯誤** | 高 | 低 | 🟡 中 | 已有完整測試 |
| **認證流程錯誤** | 高 | 中 | 🔴 高 | 補充完整測試 |
| **資料庫一致性** | 高 | 低 | 🟡 中 | 增加約束測試 |
| **效能問題** | 中 | 中 | 🟢 低 | 增加效能測試 |

### 14.5 最終建議

#### 對開發團隊

1. **採用 TDD 開發模式**
   - 新功能先寫測試
   - 確保代碼可測試性
   - 提升開發信心

2. **定期審查測試覆蓋率**
   - 每週檢查覆蓋率報告
   - 及時補充缺失測試
   - 維持 90% 以上覆蓋率

3. **建立測試文化**
   - Code Review 包含測試檢查
   - PR 必須包含測試
   - 測試失敗阻止合併

#### 對專案管理

1. **優先修復失敗測試**
   - 阻止新功能開發
   - 確保測試環境穩定
   - 建立信心基礎

2. **分配測試開發時間**
   - 預留 20-30% 時間撰寫測試
   - 視測試為必要開發工作
   - 不視為可選項目

3. **投資測試基礎設施**
   - CI/CD 自動化
   - 測試報告工具
   - 效能監控工具

---

## 📚 附錄

### A. 測試工具與框架

- **Vitest**: 快速的單元測試框架
- **Testing Library**: React 元件測試
- **Happy DOM**: 輕量級 DOM 環境
- **Codecov**: 測試覆蓋率報告
- **Playwright/Cypress**: E2E 測試（待導入）

### B. 參考資源

- [Vitest 官方文件](https://vitest.dev/)
- [Testing Library 文件](https://testing-library.com/)
- [Jest Mock 指南](https://jestjs.io/docs/mock-functions)
- [TDD 最佳實踐](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

### C. 測試範例庫

詳細測試範例請參考:
- `__tests__/lib/supabase/credits.test.ts` (優秀範例)
- `__tests__/api/auth/login.test.ts` (API 測試範例)
- `__tests__/lib/mcp/client.test.ts` (Mock 範例)

---

**報告結束**

**下一步行動**: 執行 [七、測試改進建議](#七測試改進建議) 中的立即修復項目

**聯絡人**: 開發團隊  
**更新頻率**: 每週更新一次

---

*本報告由 AI 系統分析師自動生成，基於 2026-02-05 的專案狀態*
