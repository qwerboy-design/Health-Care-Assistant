# 📋 系統規格文件

> 最後更新：2026-04-05
> 版本：v1.3.1

## 📋 目錄

1. [功能規格](#功能規格)
2. [API 規格](#api-規格)
3. [資料庫規格](#資料庫規格)
4. [UI/UX 規格](#uiux-規格)
5. [安全性規格](#安全性規格)
6. [效能規格](#效能規格)

---

## 功能規格

### 1. 認證系統

#### 1.1 註冊功能

**功能描述**：使用者可以透過三種方式註冊帳號

**支援方式**：
1. **密碼註冊**
   - Email + 密碼
   - 密碼長度：至少 8 個字元
   - 密碼加密：bcrypt（salt rounds: 10）

2. **OTP 註冊**
   - Email 發送 6 位數驗證碼
   - OTP 有效期：10 分鐘
   - 每個 Email 每 15 分鐘最多 3 次請求

3. **Google OAuth 註冊**
   - 使用 Google Identity Services
   - 自動建立帳號或綁定現有帳號

**業務規則**：
- 新註冊帳號預設狀態為 `pending`（待審核）
- 只有管理員可以審核帳號
- 未審核帳號無法使用對話功能

#### 1.2 登入功能

**功能描述**：使用者可以透過三種方式登入

**支援方式**：
1. **密碼登入**
   - Email + 密碼
   - 驗證失敗 5 次後鎖定 15 分鐘（Rate Limiting）

2. **OTP 登入**
   - Email 發送 6 位數驗證碼
   - OTP 有效期：10 分鐘
   - 每個 Email 每 15 分鐘最多 10 次驗證嘗試

3. **Google OAuth 登入**
   - 一鍵登入
   - 自動綁定或建立帳號

**Session 管理**：
- JWT Token 有效期：7 天
- Token 儲存在 HttpOnly Cookie
- 自動刷新機制（未來可擴展）

#### 1.3 登出功能

**功能描述**：使用者登出並清除 Session

**實作**：
- 清除 Server 端 Session 記錄
- 清除 Client 端 Cookie

---

### 2. 對話系統

#### 2.1 對話建立

**功能描述**：使用者可以建立新對話或繼續現有對話

**輸入參數**：
- `message`：文字訊息（可選，如果有檔案）
- `file`：上傳的檔案（可選）
- `workloadLevel`：工作量級別（必填）
  - `instant`：即時回應，0 Skills
  - `basic`：初級分析，1 Skill
  - `standard`：標準分析，2-3 Skills
  - `professional`：專業分析，4+ Skills
- `selectedFunction`：功能選擇（可選）
  - `lab`：檢驗報告分析
  - `radiology`：放射影像分析
  - `medical_record`：病歷資料分析
  - `medication`：藥物相關分析
- `conversationId`：對話 ID（可選，繼續現有對話）

**業務規則**：
- 訊息或檔案至少需要一個
- 檔案大小限制：10MB
- 支援檔案格式：JPEG、PDF、DOCX、TXT
- 圖片會自動轉換為 base64 格式傳遞給 AI

#### 2.2 AI 回應生成

**功能描述**：根據使用者輸入生成 AI 回應

**處理流程**：
1. 驗證使用者 Session
2. 上傳檔案（如果有）到 Cloudflare R2
3. 儲存使用者訊息到資料庫
4. 構建系統提示詞（根據工作量級別和功能選擇）
5. 選擇相關的 Skills（根據功能映射）
6. 呼叫 Anthropic API
7. 儲存 AI 回應到資料庫
8. 返回完整對話

**Skills 映射規則**：

| 功能 | 建議的 Skills |
|------|---------------|
| `lab` | clinical-decision-support, scientific-critical-thinking, statistical-analysis |
| `radiology` | generate-image, clinical-decision-support, scientific-critical-thinking, pydicom |
| `medical_record` | clinical-reports, clinical-decision-support, treatment-plans |
| `medication` | drugbank-database, clinpgx-database, clinical-decision-support |

**工作量級別與 Skills 數量**：

| 級別 | Skills 數量 |
|------|-------------|
| `instant` | 0 |
| `basic` | 1 |
| `standard` | 2-3 |
| `professional` | 4+ |

#### 2.3 對話歷史

**功能描述**：使用者可以查看所有對話記錄

**功能**：
- 列出所有對話（按更新時間排序）
- 點擊對話繼續對話
- 顯示對話標題、建立時間、最後更新時間

---

### 3. 管理員系統

#### 3.1 帳號審核

**功能描述**：管理員可以審核使用者帳號

**功能**：
- 查看待審核帳號列表
- 審核通過（`approval_status: 'approved'`）
- 審核拒絕（`approval_status: 'rejected'`）
- 批次審核操作

**權限**：
- 只有 `role: 'admin'` 的使用者可以存取
- 所有管理 API 都需要管理員權限驗證

#### 3.2 客戶管理

**功能描述**：管理員可以查看所有客戶

**功能**：
- 列出所有客戶
- 查看客戶詳細資訊
- 查看客戶審核狀態
- 管理客戶 UI 自訂設定

#### 3.3 模型管理

**功能描述**：管理員可以管理 AI 模型與定價

**功能**：
- 查看所有可用模型
- 設定模型定價（每 1K tokens 價格）
- 啟用/停用模型
- 設定模型顯示順序

**業務規則**：
- 模型定價以 credits 為單位
- 支援動態調整定價
- 可設定模型是否對使用者可見

#### 3.4 點數管理

**功能描述**：管理員可以管理使用者點數

**功能**：
- 查看使用者點數餘額
- 手動增加/扣除點數
- 查看點數交易記錄
- 匯出點數使用報表

---

### 4. FHIR 匯入系統

#### 4.1 FHIR R5 資料匯入

**功能描述**：使用者可以匯入 FHIR R5 格式的醫療資料

**支援資源類型**：
- Patient（病患資料）
- Observation（觀察/檢驗數據）
- Condition（診斷/病況）
- MedicationRequest（用藥處方）
- DiagnosticReport（診斷報告）
- Procedure（醫療程序）
- Encounter（就診記錄）
- AllergyIntolerance（過敏資訊）
- Immunization（疫苗接種）
- CarePlan（照護計畫）

**匯入方式**：
1. **單檔匯入**：上傳單一 FHIR JSON 檔案
2. **多檔匯入**：同時上傳多個 FHIR 檔案
3. **Bundle 匯入**：上傳 FHIR Bundle 格式

**處理流程**：
1. 驗證 FHIR 資源格式（符合 R5 規範）
2. 解析 FHIR 資源內容
3. 轉換為 LLM 可讀的臨床敘述
4. 自動建立對話並附加 FHIR 資料
5. 生成初步分析報告

#### 4.2 FHIR 資料格式化

**功能描述**：將 FHIR 資源轉換為結構化的臨床敘述

**格式化規則**：
- **Patient**：基本資料、聯絡方式、緊急聯絡人
- **Observation**：檢驗項目、數值、單位、參考範圍、異常標記
- **Condition**：診斷名稱、嚴重度、發病日期、臨床狀態
- **MedicationRequest**：藥物名稱、劑量、頻率、療程
- **DiagnosticReport**：報告類型、結論、相關檢驗數據
- **Procedure**：醫療程序名稱、執行日期、執行者
- **Encounter**：就診類型、日期、診斷、處置
- **AllergyIntolerance**：過敏原、反應類型、嚴重度
- **Immunization**：疫苗名稱、接種日期、劑次
- **CarePlan**：照護目標、活動、時程

**輸出格式**：
```
=== 病患基本資料 ===
姓名：[Name]
性別：[Gender]
出生日期：[Birth Date]
...

=== 檢驗數據 ===
[Observation 1]
- 項目：[Code]
- 數值：[Value] [Unit]
- 參考範圍：[Reference Range]
- 狀態：[Status]
...
```

#### 4.3 FHIR 資料驗證

**驗證項目**：
- FHIR 版本檢查（必須為 R5）
- 資源類型驗證
- 必填欄位檢查
- 資料格式驗證（日期、編碼系統等）
- 參照完整性檢查（Resource references）

**錯誤處理**：
- 格式錯誤：返回詳細錯誤訊息
- 部分資源失敗：記錄錯誤但繼續處理其他資源
- 全部失敗：返回錯誤並建議修正方式

---

### 5. 客戶 UI 自訂系統

#### 5.1 UI 設定管理

**功能描述**：客戶可以自訂系統 UI 外觀

**可自訂項目**：
- **主題色彩**：主色調、強調色
- **Logo**：上傳自訂 Logo（支援 PNG、SVG）
- **網站標題**：自訂瀏覽器標題
- **歡迎訊息**：首頁歡迎文字
- **頁尾資訊**：版權聲明、聯絡資訊

**儲存方式**：
- 設定儲存在 `customer_settings` 資料表
- 每個客戶一筆設定記錄
- 使用 JSONB 格式儲存彈性設定

**套用規則**：
- 登入後自動載入客戶設定
- 未設定項目使用系統預設值
- 即時預覽功能

#### 5.2 設定 API

**功能**：
- 取得客戶設定
- 更新客戶設定
- 重設為預設值
- 上傳 Logo 檔案

---

### 6. 點數系統

#### 6.1 點數機制

**功能描述**：使用者使用 AI 功能需消耗點數

**點數計算**：
- 根據使用的 AI 模型計費
- 計費單位：每 1K tokens
- 不同模型有不同價格
- 輸入 tokens 與輸出 tokens 分別計費

**點數來源**：
- 新註冊贈送初始點數
- 管理員手動增加
- 未來可擴展：購買點數、訂閱方案

#### 6.2 點數交易記錄

**功能描述**：記錄所有點數異動

**記錄內容**：
- 交易類型（`usage`、`purchase`、`admin_adjustment`、`refund`）
- 異動金額（正數為增加、負數為扣除）
- 交易前餘額
- 交易後餘額
- 關聯對話 ID（若為使用扣除）
- 交易時間
- 備註說明

**查詢功能**：
- 使用者可查看自己的交易記錄
- 管理員可查看所有交易記錄
- 支援日期範圍篩選
- 支援交易類型篩選

---

### 7. 模型管理系統

#### 7.1 模型定價

**功能描述**：動態管理 AI 模型與定價

**資料結構**：
- 模型 ID（對應 Anthropic API）
- 模型顯示名稱
- 輸入價格（per 1K tokens）
- 輸出價格（per 1K tokens）
- 是否啟用
- 顯示順序

**支援模型**：
- Claude 3.5 Sonnet
- Claude 3 Opus
- Claude 3 Haiku
- 未來可擴展其他模型

#### 7.2 模型選擇

**功能描述**：使用者可選擇使用的 AI 模型

**選擇規則**：
- 只顯示已啟用的模型
- 顯示模型價格資訊
- 預設選擇最便宜的模型
- 點數不足時提示

---

## API 規格

### 認證 API

#### POST `/api/auth/register`

**功能**：註冊新帳號

**請求格式**：
```typescript
// 密碼註冊
{
  email: string;
  password: string;
  name: string;
  phone?: string;
  authType: 'password';
}

// OTP 註冊
{
  email: string;
  name: string;
  phone?: string;
  authType: 'otp';
  otp: string;
}
```

**回應格式**：
```typescript
{
  success: true;
  data: {
    customer: Customer;
    session: {
      token: string;
      expiresAt: string;
    };
  };
}
```

**錯誤回應**：
```typescript
{
  success: false;
  error: string;
}
```

#### POST `/api/auth/login`

**功能**：登入

**請求格式**：
```typescript
// 密碼登入
{
  email: string;
  password: string;
  authType: 'password';
}

// OTP 登入
{
  email: string;
  otp: string;
  authType: 'otp';
}
```

**回應格式**：同註冊 API

#### POST `/api/auth/send-otp`

**功能**：發送 OTP 驗證碼

**請求格式**：
```typescript
{
  email: string;
}
```

**回應格式**：
```typescript
{
  success: true;
  message: string;
}
```

**Rate Limiting**：每 Email 每 15 分鐘最多 3 次

#### POST `/api/auth/verify-otp`

**功能**：驗證 OTP

**請求格式**：
```typescript
{
  email: string;
  otp: string;
}
```

**回應格式**：同登入 API

#### POST `/api/auth/google`

**功能**：Google OAuth 登入/註冊

**請求格式**：
```typescript
{
  credential: string; // Google ID Token
}
```

**回應格式**：同登入 API

#### POST `/api/auth/logout`

**功能**：登出

**認證**：需要 Session Cookie

**回應格式**：
```typescript
{
  success: true;
  message: string;
}
```

#### GET `/api/auth/me`

**功能**：獲取當前使用者資訊

**認證**：需要 Session Cookie

**回應格式**：
```typescript
{
  success: true;
  data: {
    customer: Customer;
  };
}
```

### 對話 API

#### POST `/api/chat`

**功能**：發送訊息並取得 AI 回應

**認證**：需要 Session Cookie

**請求格式**：`FormData`
```
message: string (可選)
file: File (可選)
workloadLevel: 'instant' | 'basic' | 'standard' | 'professional'
selectedFunction?: 'lab' | 'radiology' | 'medical_record' | 'medication'
conversationId?: string
```

**回應格式**：
```typescript
{
  success: true;
  data: {
    conversation: Conversation;
    message: Message;
    response: Message;
  };
}
```

**錯誤回應**：
```typescript
{
  success: false;
  error: string;
}
```

#### GET `/api/chat`

**功能**：獲取對話訊息

**認證**：需要 Session Cookie

**查詢參數**：
- `conversationId`: string (必填)

**回應格式**：
```typescript
{
  success: true;
  data: {
    conversation: Conversation;
    messages: Message[];
  };
}
```

#### GET `/api/conversations`

**功能**：獲取對話列表

**認證**：需要 Session Cookie

**回應格式**：
```typescript
{
  success: true;
  data: {
    conversations: Conversation[];
  };
}
```

### 管理 API

#### GET `/api/admin/customers`

**功能**：獲取客戶列表

**認證**：需要管理員權限

**查詢參數**：
- `status?`: 'pending' | 'approved' | 'rejected' (可選)

**回應格式**：
```typescript
{
  success: true;
  data: {
    customers: Customer[];
  };
}
```

#### POST `/api/admin/approve`

**功能**：審核通過

**認證**：需要管理員權限

**請求格式**：
```typescript
{
  customerId: string;
}
```

**回應格式**：
```typescript
{
  success: true;
  message: string;
}
```

#### POST `/api/admin/reject`

**功能**：審核拒絕

**認證**：需要管理員權限

**請求格式**：
```typescript
{
  customerId: string;
}
```

**回應格式**：
```typescript
{
  success: true;
  message: string;
}
```

### FHIR 匯入 API

#### POST `/api/fhir/import`

**功能**：匯入單一 FHIR R5 資源

**認證**：需要 Session Cookie

**請求格式**：`FormData`
```
fhirFile: File (JSON 格式)
autoAnalyze?: boolean (是否自動生成分析，預設 true)
```

**回應格式**：
```typescript
{
  success: true;
  data: {
    resourceType: string;
    resourceId: string;
    conversationId: string;
    clinicalNarrative: string;
  };
}
```

**錯誤回應**：
```typescript
{
  success: false;
  error: string;
  details?: {
    validationErrors: string[];
  };
}
```

#### POST `/api/fhir/import/bundle`

**功能**：匯入 FHIR Bundle（多資源批次匯入）

**認證**：需要 Session Cookie

**請求格式**：`FormData`
```
bundleFile: File (FHIR Bundle JSON)
autoAnalyze?: boolean
```

**回應格式**：
```typescript
{
  success: true;
  data: {
    totalResources: number;
    successCount: number;
    failedCount: number;
    conversationId: string;
    resources: Array<{
      resourceType: string;
      resourceId: string;
      status: 'success' | 'failed';
      error?: string;
    }>;
  };
}
```

#### POST `/api/fhir/import/multiple`

**功能**：同時匯入多個 FHIR 檔案

**認證**：需要 Session Cookie

**請求格式**：`FormData`
```
files: File[] (多個 FHIR JSON 檔案)
autoAnalyze?: boolean
```

**回應格式**：同 Bundle 匯入

#### GET `/api/fhir/resources`

**功能**：查詢已匯入的 FHIR 資源

**認證**：需要 Session Cookie

**查詢參數**：
- `conversationId?`: string (篩選特定對話)
- `resourceType?`: string (篩選資源類型)
- `limit?`: number (預設 50)
- `offset?`: number (預設 0)

**回應格式**：
```typescript
{
  success: true;
  data: {
    resources: Array<{
      id: string;
      resourceType: string;
      conversationId: string;
      importedAt: string;
      clinicalNarrative: string;
    }>;
    total: number;
  };
}
```

### 客戶設定 API

#### GET `/api/customer/settings`

**功能**：取得客戶 UI 自訂設定

**認證**：需要 Session Cookie

**回應格式**：
```typescript
{
  success: true;
  data: {
    settings: {
      theme: {
        primaryColor?: string;
        accentColor?: string;
      };
      branding: {
        logoUrl?: string;
        siteTitle?: string;
        welcomeMessage?: string;
        footerText?: string;
      };
      features: {
        enableFhirImport?: boolean;
        enableModelSelection?: boolean;
      };
    };
  };
}
```

#### PUT `/api/customer/settings`

**功能**：更新客戶 UI 設定

**認證**：需要管理員權限

**請求格式**：
```typescript
{
  theme?: {
    primaryColor?: string;
    accentColor?: string;
  };
  branding?: {
    siteTitle?: string;
    welcomeMessage?: string;
    footerText?: string;
  };
  features?: {
    enableFhirImport?: boolean;
    enableModelSelection?: boolean;
  };
}
```

**回應格式**：
```typescript
{
  success: true;
  data: {
    settings: CustomerSettings;
  };
}
```

#### POST `/api/customer/settings/logo`

**功能**：上傳客戶 Logo

**認證**：需要管理員權限

**請求格式**：`FormData`
```
logo: File (PNG 或 SVG，最大 2MB)
```

**回應格式**：
```typescript
{
  success: true;
  data: {
    logoUrl: string;
  };
}
```

#### DELETE `/api/customer/settings/logo`

**功能**：刪除客戶 Logo（恢復預設）

**認證**：需要管理員權限

**回應格式**：
```typescript
{
  success: true;
  message: string;
}
```

### 模型管理 API

#### GET `/api/models`

**功能**：取得可用的 AI 模型列表（使用者端）

**認證**：需要 Session Cookie

**回應格式**：
```typescript
{
  success: true;
  data: {
    models: Array<{
      id: string;
      name: string;
      displayName: string;
      inputPricePerK: number;
      outputPricePerK: number;
      isEnabled: boolean;
      description?: string;
    }>;
  };
}
```

#### GET `/api/admin/models`

**功能**：取得所有模型（含停用模型）

**認證**：需要管理員權限

**回應格式**：
```typescript
{
  success: true;
  data: {
    models: Array<{
      id: string;
      name: string;
      displayName: string;
      inputPricePerK: number;
      outputPricePerK: number;
      isEnabled: boolean;
      displayOrder: number;
      createdAt: string;
      updatedAt: string;
    }>;
  };
}
```

#### PUT `/api/admin/models/:id`

**功能**：更新模型設定

**認證**：需要管理員權限

**請求格式**：
```typescript
{
  displayName?: string;
  inputPricePerK?: number;
  outputPricePerK?: number;
  isEnabled?: boolean;
  displayOrder?: number;
}
```

**回應格式**：
```typescript
{
  success: true;
  data: {
    model: Model;
  };
}
```

#### POST `/api/admin/models`

**功能**：新增模型

**認證**：需要管理員權限

**請求格式**：
```typescript
{
  name: string;
  displayName: string;
  inputPricePerK: number;
  outputPricePerK: number;
  isEnabled?: boolean;
  displayOrder?: number;
}
```

**回應格式**：
```typescript
{
  success: true;
  data: {
    model: Model;
  };
}
```

### 點數 API

#### GET `/api/credits/balance`

**功能**：查詢點數餘額

**認證**：需要 Session Cookie

**回應格式**：
```typescript
{
  success: true;
  data: {
    balance: number;
    lastUpdated: string;
  };
}
```

#### GET `/api/credits/transactions`

**功能**：查詢點數交易記錄

**認證**：需要 Session Cookie

**查詢參數**：
- `type?`: 'usage' | 'purchase' | 'admin_adjustment' | 'refund'
- `startDate?`: string (ISO 8601)
- `endDate?`: string (ISO 8601)
- `limit?`: number (預設 50)
- `offset?`: number (預設 0)

**回應格式**：
```typescript
{
  success: true;
  data: {
    transactions: Array<{
      id: string;
      type: 'usage' | 'purchase' | 'admin_adjustment' | 'refund';
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      conversationId?: string;
      description?: string;
      createdAt: string;
    }>;
    total: number;
  };
}
```

#### POST `/api/admin/credits/adjust`

**功能**：管理員調整使用者點數

**認證**：需要管理員權限

**請求格式**：
```typescript
{
  customerId: string;
  amount: number; // 正數為增加，負數為扣除
  description: string;
}
```

**回應格式**：
```typescript
{
  success: true;
  data: {
    transaction: CreditTransaction;
    newBalance: number;
  };
}
```

#### GET `/api/admin/credits/report`

**功能**：匯出點數使用報表

**認證**：需要管理員權限

**查詢參數**：
- `startDate`: string (必填)
- `endDate`: string (必填)
- `format?`: 'json' | 'csv' (預設 json)

**回應格式**：
```typescript
{
  success: true;
  data: {
    summary: {
      totalUsage: number;
      totalPurchase: number;
      totalAdjustment: number;
      totalRefund: number;
      activeUsers: number;
    };
    transactions: CreditTransaction[];
  };
}
```

---

## 資料庫規格

### 資料表結構

詳細資料表結構請參考 [ARCHITECTURE.md](./ARCHITECTURE.md#資料庫設計)

### 資料完整性約束

1. **外鍵約束**：
   - `sessions.customer_id` → `customers.id` (ON DELETE CASCADE)
   - `chat_conversations.customer_id` → `customers.id` (ON DELETE CASCADE)
   - `chat_messages.conversation_id` → `chat_conversations.id` (ON DELETE CASCADE)

2. **唯一約束**：
   - `customers.email` (唯一)

3. **檢查約束**：
   - `customers.auth_provider` IN ('password', 'otp', 'google')
   - `customers.approval_status` IN ('pending', 'approved', 'rejected')
   - `customers.role` IN ('user', 'admin')
   - `chat_conversations.workload_level` IN ('instant', 'basic', 'standard', 'professional')
   - `chat_messages.role` IN ('user', 'assistant')

### 索引策略

所有查詢欄位都有建立索引以優化效能：

- `customers.email` - 主要查詢欄位
- `customers.oauth_id` - OAuth 查詢
- `customers.approval_status` - 審核狀態查詢
- `customers.role` - 角色查詢
- `sessions.customer_id` - 客戶 Session 查詢
- `sessions.token` - Token 驗證
- `otp_tokens.email` - OTP 查詢
- `otp_tokens.token` - OTP 驗證
- `chat_conversations.customer_id` - 客戶對話查詢
- `chat_messages.conversation_id` - 對話訊息查詢

---

## UI/UX 規格

### 頁面結構

#### 認證頁面

1. **登入頁面** (`/login`)
   - Email 輸入框
   - 密碼輸入框（密碼登入）
   - OTP 輸入框（OTP 登入）
   - Google 登入按鈕
   - 切換登入方式
   - 註冊連結

2. **註冊頁面** (`/register`)
   - Email 輸入框
   - 姓名輸入框
   - 密碼輸入框（密碼註冊）
   - OTP 輸入框（OTP 註冊）
   - Google 註冊按鈕
   - 切換註冊方式
   - 登入連結

#### 主頁面

1. **對話頁面** (`/chat`)
   - 對話視窗（訊息列表）
   - 輸入區域（文字輸入框）
   - 檔案上傳按鈕
   - 功能選擇器（檢驗/放射/病歷/藥物）
   - 工作量級別選擇器（即時/初級/標準/專業）
   - 發送按鈕

2. **對話記錄頁面** (`/conversations`)
   - 對話列表（卡片式）
   - 每個對話顯示：標題、建立時間、最後更新時間
   - 點擊對話繼續對話

3. **管理頁面** (`/admin`)
   - 客戶列表
   - 審核按鈕（通過/拒絕）
   - 客戶詳細資訊

### 元件規格

#### 認證元件

1. **OTPInput**
   - 6 個獨立的輸入框
   - 自動跳轉到下一個輸入框
   - 支援貼上 6 位數驗證碼
   - 自動聚焦第一個輸入框

2. **CountdownTimer**
   - 倒數計時顯示（秒）
   - 倒數結束後顯示「重新發送」按鈕

3. **GoogleLoginButton**
   - Google 品牌樣式
   - 點擊後觸發 Google OAuth 流程

#### 對話元件

1. **ChatWindow**
   - 對話視窗容器
   - 自動滾動到底部
   - 響應式佈局

2. **MessageList**
   - 訊息列表
   - 使用者訊息（右側，藍色）
   - AI 回應（左側，灰色）
   - 載入狀態顯示

3. **MessageBubble**
   - 訊息氣泡樣式
   - 支援文字內容
   - 支援檔案顯示（圖片預覽、檔案下載連結）

4. **ChatInput**
   - 文字輸入框
   - 檔案上傳按鈕
   - 功能選擇器
   - 工作量級別選擇器
   - 發送按鈕

5. **FunctionSelector**
   - 4 個功能選項（檢驗/放射/病歷/藥物）
   - 單選按鈕樣式
   - 可選（可選可不選）

6. **WorkloadSelector**
   - 4 個級別選項（即時/初級/標準/專業）
   - 單選按鈕樣式
   - 必選

7. **FileUploader**
   - 拖放上傳區域
   - 點擊上傳按鈕
   - 檔案預覽
   - 檔案大小限制提示（10MB）
   - 支援格式提示（JPEG/PDF/DOCX/TXT）

#### 引導元件

1. **OnboardingModal**
   - 4 個步驟卡片
   - 進度指示器
   - 下一步/上一步按鈕
   - 完成按鈕
   - 首次登入自動顯示

### 設計規範

1. **色彩系統**：
   - 主色：藍色（#3B82F6）
   - 成功：綠色（#10B981）
   - 錯誤：紅色（#EF4444）
   - 警告：黃色（#F59E0B）

2. **字體**：
   - 預設：系統字體堆疊
   - 標題：粗體
   - 內文：正常

3. **間距**：
   - 使用 Tailwind CSS 標準間距系統

4. **響應式設計**：
   - 行動裝置：單欄佈局
   - 桌面：雙欄佈局（對話列表 + 對話視窗）

---

## 安全性規格

### 認證安全

1. **密碼安全**：
   - 最小長度：8 個字元
   - 加密方式：bcrypt（salt rounds: 10）
   - 不儲存明文密碼

2. **Session 安全**：
   - JWT Token 使用 HS256 演算法
   - Token 有效期：7 天
   - Token 儲存在 HttpOnly Cookie
   - SameSite: 'lax'

3. **OTP 安全**：
   - 6 位數隨機數字
   - 有效期：10 分鐘
   - 使用後立即失效
   - Rate Limiting：每 Email 每 15 分鐘最多 3 次發送

### API 安全

1. **Rate Limiting**：
   - 登入/註冊：每 IP 每 15 分鐘 5 次
   - OTP 發送：每 Email 每 15 分鐘 3 次
   - OTP 驗證：每 Email 每 15 分鐘 10 次

2. **輸入驗證**：
   - 所有 API 輸入都經過 Zod 驗證
   - 防止 SQL 注入（使用參數化查詢）
   - 防止 XSS（React 自動轉義）

3. **權限控制**：
   - 所有 API 都需要 Session 驗證（除了認證 API）
   - 管理 API 需要管理員權限
   - 使用者只能存取自己的資料

### 資料安全

1. **敏感資料加密**：
   - 密碼：bcrypt 雜湊
   - JWT Secret：環境變數（不提交到 Git）

2. **資料庫安全**：
   - 使用 Supabase 託管服務
   - 連線使用 SSL
   - 使用最小權限原則

3. **檔案上傳安全**：
   - 檔案大小限制：10MB
   - 檔案類型限制：JPEG、PDF、DOCX、TXT
   - 檔案儲存在 Cloudflare R2（私有儲存）

---

## 效能規格

### 回應時間目標

| 操作 | 目標回應時間 |
|------|--------------|
| 頁面載入 | < 2 秒 |
| API 回應 | < 1 秒 |
| AI 回應生成 | < 10 秒 |
| 檔案上傳 | < 5 秒（10MB） |

### 並發處理

- **API 並發**：Vercel Serverless Functions 自動擴展
- **資料庫連線**：Supabase 自動管理連線池
- **檔案上傳**：Cloudflare R2 支援高並發

### 快取策略

- **Session 驗證**：可快取驗證結果（未來可擴展）
- **對話列表**：可實作客戶端快取（未來可擴展）

### 優化措施

1. **資料庫優化**：
   - 所有查詢欄位都有索引
   - 使用參數化查詢
   - 避免 N+1 查詢問題

2. **前端優化**：
   - Next.js App Router 自動程式碼分割
   - Tailwind CSS 僅載入使用的樣式
   - 圖片優化（未來可擴展）

3. **API 優化**：
   - 減少不必要的資料庫查詢
   - 使用適當的 HTTP 狀態碼
   - 錯誤處理優化
   - **模型資料即時性**：API 使用 `force-dynamic`，前端 Fetch 使用 `cache: 'no-store'`

---

## 參考文件

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系統架構
- [README.md](./README.md) - 專案說明
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 部署指南
- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - 環境變數說明

---

**文件維護者**：開發團隊  
**最後審查日期**：2026-01-29
