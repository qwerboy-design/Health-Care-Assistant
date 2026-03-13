# 客製化 UI 功能 - 實作完成文件

## 實作摘要

已成功實作客製化 UI 功能，允許管理員為每個用戶控制「選擇功能」、「工作量級別」、「截圖」功能的顯示/隱藏。

## 已完成的功能

### 1. 資料庫層
- ✅ 建立 `customer_settings` 表
- ✅ 新增自動更新 `updated_at` 的 trigger
- ✅ 建立索引提升查詢效能
- ✅ 設定外鍵約束確保資料一致性

### 2. API 層
- ✅ `/api/customer-settings` - 用戶端 API（GET/POST）
- ✅ `/api/admin/customer-settings` - 管理員 API（GET/POST）
- ✅ 支援批次載入設定（減少 N+1 查詢）
- ✅ JWT 認證與權限驗證

### 3. 前端 Hooks
- ✅ `useCustomerSettings` - 設定管理 Hook
- ✅ `useDeviceType` - 裝置偵測 Hook（螢幕寬度 + User-Agent）

### 4. UI 整合
- ✅ Chat 頁面動態顯示/隱藏組件
- ✅ 手機版強制隱藏截圖功能
- ✅ 後台管理介面設定控制 UI
- ✅ 樂觀更新提升 UX

### 5. 國際化
- ✅ 新增繁體中文翻譯
- ✅ 新增英文翻譯

## 使用方式

### 管理員操作

1. 登入後台管理系統（需要 admin 權限）
2. 進入「帳號審核管理」頁面
3. 在用戶列表中，每個用戶下方顯示「系統設定」區域
4. 使用三個開關控制：
   - ☑️ 顯示功能選擇
   - ☑️ 顯示工作量級別
   - ☑️ 顯示截圖功能
5. 點擊開關即時更新設定

### 用戶體驗

1. 用戶登入後，系統自動載入個人設定
2. Chat 頁面根據設定動態顯示/隱藏組件：
   - 功能選擇器（檢驗、放射、病歷、藥物）
   - 工作量級別選擇器（即時、基本、標準、專業）
   - 截圖按鈕
3. **手機版特殊處理**：
   - 螢幕寬度 < 768px OR 行動裝置 User-Agent
   - 截圖功能強制隱藏（即使管理員啟用）

## 預設行為

- 新用戶預設所有功能**隱藏**
- 管理員可為特定用戶啟用功能
- 設定變更即時生效

## 技術架構

```
┌─────────────────┐
│  Admin UI       │ 設定開關
└────────┬────────┘
         │ POST /api/admin/customer-settings
         ▼
┌─────────────────┐
│  API Layer      │ JWT 驗證 + 權限檢查
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase       │ customer_settings 表
└─────────────────┘
         ▲
         │ GET /api/customer-settings
         │
┌─────────────────┐
│  Chat Page      │ useCustomerSettings Hook
│                 │ + useDeviceType Hook
└─────────────────┘
```

## 檔案清單

### 新增檔案
- `supabase/migrations/20260312_create_customer_settings.sql` - 資料庫 migration
- `lib/supabase/customer-settings.ts` - 資料庫操作層
- `app/api/customer-settings/route.ts` - 用戶設定 API
- `app/api/admin/customer-settings/route.ts` - 管理員設定 API
- `hooks/useCustomerSettings.ts` - 設定管理 Hook
- `hooks/useDeviceType.ts` - 裝置偵測 Hook

### 修改檔案
- `types/index.ts` - 新增 CustomerSettings 類型
- `app/(main)/chat/page.tsx` - 整合設定與裝置偵測
- `components/chat/ChatWindow.tsx` - 傳遞顯示狀態 props
- `components/chat/ChatInput.tsx` - 條件渲染選擇器
- `app/(admin)/admin/page.tsx` - 新增設定控制 UI
- `lib/i18n/translations.ts` - 新增翻譯鍵

## 資料庫 Migration 執行方式

請在 Supabase Dashboard 的 SQL Editor 中執行：

```bash
supabase/migrations/20260312_create_customer_settings.sql
```

或使用 Supabase CLI：

```bash
supabase migration up
```

## 測試建議

### 功能測試
1. ✅ 建立新用戶，確認預設值為全部隱藏
2. ✅ 管理員啟用「功能選擇」，確認用戶端顯示 FunctionSelector
3. ✅ 桌面版啟用截圖，手機版確認仍隱藏
4. ✅ 調整瀏覽器視窗大小，確認 768px 斷點正常作用

### 邊界測試
- User-Agent 偽造測試（模擬行動裝置）
- API 失敗時的 fallback 行為（預設隱藏）
- 並發更新測試（兩個管理員同時修改設定）

## 注意事項

1. **資料庫 Migration 必須先執行** - 在使用功能前必須建立 `customer_settings` 表
2. **手機版截圖永久隱藏** - 這是硬編碼行為，無法由管理員覆蓋
3. **設定變更即時生效** - 無需重新登入
4. **預設值策略** - 新用戶所有功能隱藏，需要管理員啟用

## 效能優化

- 使用批次 API 減少資料庫查詢
- 樂觀更新提升 UI 響應速度
- React state 快取減少 API 呼叫
- 索引加速資料庫查詢

## 安全性

- JWT 認證確保 API 安全
- 管理員權限驗證防止越權操作
- SQL 注入防護（使用 Supabase Client）
- XSS 防護（React 自動轉義）
