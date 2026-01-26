# Chat API 自動測試文檔

## 概述

本文檔說明 Chat API 的自動測試架構與測試案例。測試使用 Vitest 框架，涵蓋三個主要端點：
- `/api/chat/save-log` - 保存對話日誌到 R2
- `/api/chat/upload` - 上傳檔案到 R2
- `/api/chat/upload-token` - 生成檔案上傳授權

## 測試架構

### 技術棧
- **測試框架**: Vitest 4.0.18
- **環境**: Happy-DOM
- **Mock 工具**: Vitest Mock Functions
- **覆蓋率**: V8 Provider

### 測試檔案結構
```
__tests__/
├── api/
│   ├── chat/
│   │   ├── route.test.ts          # 主要聊天端點測試（已存在）
│   │   ├── save-log.test.ts       # 日誌保存測試（新增）
│   │   ├── upload.test.ts         # 檔案上傳測試（新增）
│   │   └── upload-token.test.ts   # 上傳授權測試（新增）
├── utils/
│   ├── mock-session.ts            # Session Mock 工具
│   └── mock-supabase.ts           # Supabase Mock 工具
└── setup.ts                       # 全局測試設定
```

## 測試案例詳細說明

### 1. save-log.test.ts (11 個測試案例)

#### 測試類別：身份驗證 (2 個測試)
- ✓ 應該在沒有 Session Token 時返回 401
- ✓ 應該在 Session 無效時返回 401

#### 測試類別：請求驗證 (3 個測試)
- ✓ 應該在缺少 conversationId 時返回 400
- ✓ 應該在對話不存在時返回 403
- ✓ 應該在對話不屬於當前用戶時返回 403

#### 測試類別：日誌生成與上傳 (4 個測試)
- ✓ 應該成功生成並上傳對話日誌
- ✓ 應該使用預設 serialNumber 為 1
- ✓ 應該在 R2 上傳失敗時返回錯誤
- ✓ 應該在缺少 R2 配置時返回錯誤

#### 測試類別：邊界情況 (2 個測試)
- ✓ 應該能處理空的對話（無訊息）
- ✓ 應該能處理大量訊息的對話（100 條訊息）

**覆蓋範圍**：
- Session 驗證流程
- 對話所有權驗證
- Markdown 日誌生成
- R2 上傳與錯誤處理
- 環境變數驗證

---

### 2. upload.test.ts (12 個測試案例)

#### 測試類別：身份驗證 (2 個測試)
- ✓ 應該在沒有 Session Token 時返回 401
- ✓ 應該在 Session 無效時返回 401

#### 測試類別：請求驗證 (4 個測試)
- ✓ 應該在缺少檔案時返回 400
- ✓ 應該在缺少 uploadKey 時返回 400
- ✓ 應該在檔案太大時返回 400（> 100MB）
- ✓ 應該在 uploadKey 不屬於當前用戶時返回 403

#### 測試類別：檔案上傳 (3 個測試)
- ✓ 應該成功上傳檔案到 R2
- ✓ 應該處理不同類型的檔案（PNG, PDF, JSON）
- ✓ 應該在 R2 上傳失敗時返回錯誤

#### 測試類別：邊界情況 (2 個測試)
- ✓ 應該能處理正好 100MB 的檔案
- ✓ 應該能處理特殊字元的檔案名稱

#### 測試類別：Agent Logging (1 個測試)
- ✓ 應該記錄上傳前的資訊

**覆蓋範圍**：
- FormData 處理
- 檔案大小驗證（100MB 限制）
- 路徑權限驗證
- S3 Client 整合（AWS SDK）
- 多種檔案類型支援
- Agent Logging 機制

---

### 3. upload-token.test.ts (18 個測試案例)

#### 測試類別：身份驗證 (2 個測試)
- ✓ 應該在沒有 Session Token 時返回 401
- ✓ 應該在 Session 無效時返回 401

#### 測試類別：請求驗證 (2 個測試)
- ✓ 應該在檔案太大時返回 400（> 100MB）
- ✓ 應該接受正好 100MB 的檔案

#### 測試類別：上傳 Token 生成 (5 個測試)
- ✓ 應該成功生成上傳授權
- ✓ 應該為不同使用者生成不同的 uploadKey
- ✓ 應該在 uploadKey 中包含時間戳記
- ✓ 應該在 uploadKey 中保留原始檔案名稱
- ✓ 應該使用預設的 R2_BUCKET_DOMAIN

#### 測試類別：不同檔案類型 (4 個測試)
- ✓ 應該處理 'image/png' 類型的檔案
- ✓ 應該處理 'application/pdf' 類型的檔案
- ✓ 應該處理 'application/json' 類型的檔案
- ✓ 應該處理 'video/mp4' 類型的檔案

#### 測試類別：邊界情況 (3 個測試)
- ✓ 應該處理特殊字元的檔案名稱
- ✓ 應該處理空檔案（0 bytes）
- ✓ 應該處理非常長的檔案名稱（200 字元）

#### 測試類別：Agent Logging (1 個測試)
- ✓ 應該記錄 Token 生成的資訊

#### 測試類別：錯誤處理 (1 個測試)
- ✓ 應該在發生未預期錯誤時返回 500

**覆蓋範圍**：
- Token 生成邏輯
- 檔案大小預驗證
- 時間戳記生成
- 多種檔案類型支援
- 特殊字元處理
- Agent Logging 機制
- 錯誤處理流程

---

## 執行測試

### 執行所有 Chat API 測試
```bash
npm test -- __tests__/api/chat/
```

### 執行特定測試檔案
```bash
npm test -- __tests__/api/chat/save-log.test.ts
npm test -- __tests__/api/chat/upload.test.ts
npm test -- __tests__/api/chat/upload-token.test.ts
```

### 生成覆蓋率報告
```bash
npm run test:coverage -- __tests__/api/chat/ --run
```

### 使用 UI 模式
```bash
npm run test:ui
```

## Mock 策略

### 1. 全局 Mocks
- `global.fetch` - 模擬 Agent Logging 的 HTTP 請求
- 環境變數 - 在 `beforeEach` 中設定測試用環境變數

### 2. 模組 Mocks
- `@/lib/auth/session` - Session 驗證邏輯
- `@/lib/supabase/*` - 資料庫操作
- `@/lib/storage/log-generator` - 日誌生成函數
- `@aws-sdk/client-s3` - AWS S3 Client（用於 R2）
- `next/headers` - Next.js Cookies API

### 3. Mock 實作範例

#### S3Client Mock
```typescript
vi.mock('@aws-sdk/client-s3', () => {
  class MockPutObjectCommand {
    constructor(public params: any) {}
  }
  
  return {
    S3Client: vi.fn(function (this: any) {
      return {
        send: (...args: any[]) => {
          if (mockSendImplementation) {
            return mockSendImplementation(...args);
          }
          return Promise.resolve({});
        },
      };
    }),
    PutObjectCommand: MockPutObjectCommand,
  };
});
```

## 測試覆蓋率目標

- **行覆蓋率**: > 80%
- **函數覆蓋率**: > 80%
- **分支覆蓋率**: > 75%

## 測試資料規格

### 環境變數（測試用）
```typescript
process.env.R2_ACCOUNT_ID = 'test-account-id';
process.env.R2_ACCESS_KEY_ID = 'test-access-key';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.R2_BUCKET_NAME = 'test-bucket';
process.env.R2_PUBLIC_URL = 'https://test.r2.dev';
process.env.R2_BUCKET_DOMAIN = 'hca.qwerboy.com';
```

### Mock Session
```typescript
const mockSession = {
  customerId: 'test-customer-id',
  email: 'test@example.com',
};
```

### Mock Conversation
```typescript
const mockConversation = {
  id: 'conv-123',
  customer_id: 'test-customer-id',
  title: '測試對話',
  workload_level: 'standard',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};
```

## 測試案例設計原則

### 1. AAA 模式（Arrange-Act-Assert）
所有測試遵循 AAA 模式：
- **Arrange**: 設定測試資料與 Mock
- **Act**: 執行被測試的函數
- **Assert**: 驗證結果

### 2. 隔離性
每個測試案例互相獨立，使用 `beforeEach` 清除所有 Mock

### 3. 可讀性
使用描述性的測試名稱，清楚說明測試目的

### 4. 完整性
涵蓋以下測試場景：
- 成功路徑（Happy Path）
- 失敗路徑（Error Path）
- 邊界條件（Edge Cases）
- 權限驗證（Authorization）
- 錯誤處理（Error Handling）

## 維護指南

### 新增測試案例
1. 識別需要測試的新功能或邊界情況
2. 在對應的 `describe` 區塊中新增 `it` 測試
3. 遵循現有的 Mock 策略
4. 確保測試名稱清晰描述測試內容
5. 執行測試確認通過

### 更新現有測試
當 API 行為變更時：
1. 更新對應的 Mock 資料
2. 調整斷言邏輯
3. 確保測試仍然通過
4. 更新本文檔

### 測試失敗處理
1. 檢查錯誤訊息
2. 確認 Mock 是否正確設定
3. 驗證測試資料是否符合 API 預期
4. 檢查 API 實作是否有變更

## 已知限制

1. **FormData 測試**: 由於 Node.js 環境限制，FormData 測試需要特殊處理
2. **S3Client Mock**: 需要使用特殊的 class-based mock 才能正確模擬 constructor
3. **Agent Logging**: 所有 Agent Logging 的 HTTP 請求都被 mock，不會實際發送

## 未來改進方向

1. **E2E 測試**: 新增完整的端到端測試流程
2. **效能測試**: 測試大檔案上傳的效能表現
3. **並發測試**: 測試多個並發請求的處理能力
4. **整合測試**: 整合真實的 R2 環境進行測試
5. **快照測試**: 新增 Markdown 日誌格式的快照測試

## 聯絡資訊

如有測試相關問題，請參考：
- Vitest 文檔: https://vitest.dev/
- 專案 Testing Guide: `Reference documents/TESTING_GUIDE_REGISTER_OTP.md`

---

**最後更新**: 2026-01-23
**版本**: 1.0.0
**測試總數**: 41 個測試案例
**測試狀態**: ✅ 全部通過
