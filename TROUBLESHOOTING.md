# 故障排除：後台顯示「設定載入失敗」

## 問題症狀
- 執行 SQL 時出現錯誤：`ERROR: 42P07: relation "idx_customer_settings_customer_id" already exists`
- 後台管理介面顯示：「⚠️ 設定載入失敗 - 請確認 customer_settings 資料表已建立」

## 原因分析
索引已存在但表可能不完整或建立失敗，導致 API 無法正常查詢資料。

## 解決方案

### 方法 1：檢查現有狀態（推薦先執行）

1. 在 Supabase Dashboard → SQL Editor 中執行：

```sql
-- 檢查表是否存在
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'customer_settings'
) as table_exists;

-- 如果表存在，檢查結構
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'customer_settings'
ORDER BY ordinal_position;
```

### 方法 2：完整重建表（如果方法 1 顯示表不存在或結構不正確）

**⚠️ 警告：這將刪除所有現有的客戶設定資料！**

在 Supabase Dashboard → SQL Editor 中執行以下完整腳本：

```sql
-- 完整重建 customer_settings 表

-- 步驟 1: 刪除舊的觸發器
DROP TRIGGER IF EXISTS trigger_update_customer_settings_updated_at ON customer_settings;

-- 步驟 2: 刪除觸發器函數
DROP FUNCTION IF EXISTS update_customer_settings_updated_at();

-- 步驟 3: 刪除表（CASCADE 會同時刪除相關索引）
DROP TABLE IF EXISTS customer_settings CASCADE;

-- 步驟 4: 重新建立表
CREATE TABLE customer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE,
  show_function_selector BOOLEAN NOT NULL DEFAULT false,
  show_workload_selector BOOLEAN NOT NULL DEFAULT false,
  show_screenshot BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_customer
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE CASCADE
);

-- 步驟 5: 建立索引
CREATE INDEX idx_customer_settings_customer_id ON customer_settings(customer_id);

-- 步驟 6: 建立觸發器函數
CREATE OR REPLACE FUNCTION update_customer_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 步驟 7: 建立觸發器
CREATE TRIGGER trigger_update_customer_settings_updated_at
  BEFORE UPDATE ON customer_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_settings_updated_at();

-- 步驟 8: 添加註解
COMMENT ON TABLE customer_settings IS 'Stores customer UI customization settings';

-- 步驟 9: 驗證
SELECT 'Success! Table created' as status;
```

### 方法 3：驗證表已正確建立

執行以下查詢確認：

```sql
-- 1. 確認表存在
SELECT * FROM customer_settings LIMIT 1;

-- 2. 測試插入資料（替換 'your-customer-id' 為實際的客戶 ID）
INSERT INTO customer_settings (customer_id) 
VALUES ('your-customer-id')
ON CONFLICT (customer_id) DO NOTHING;

-- 3. 查詢資料
SELECT * FROM customer_settings;
```

## 驗證步驟

### 1. 在瀏覽器中測試

1. 重新整理後台管理頁面（按 F5）
2. 打開開發者工具（F12）
3. 切換到 Network 標籤
4. 查找 `/api/admin/customer-settings` 請求
5. 檢查回應：
   - ✅ 成功：`{"success": true, "data": {...}}`
   - ❌ 失敗：檢查 error 訊息

### 2. 檢查 Console 錯誤

在開發者工具的 Console 標籤中，查看是否有錯誤訊息：
- `載入客戶設定失敗:` - API 調用失敗
- `401 Unauthorized` - Token 問題，嘗試重新登入
- `403 Forbidden` - 權限問題，確認是 admin 角色

### 3. 手動測試 API

在 Console 中執行：

```javascript
// 測試取得設定
fetch('/api/admin/customer-settings?batch=true&customerIds=test-id', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## 常見問題

### Q1: 仍然顯示「設定載入失敗」
**A:** 檢查：
1. 是否已執行完整的 SQL 腳本
2. 是否已重新整理頁面
3. Token 是否過期（嘗試重新登入）
4. 網路請求是否成功（檢查 Network 標籤）

### Q2: API 返回 401 錯誤
**A:** Token 問題：
1. 重新登入後台
2. 確認 localStorage 中有 'token'
3. 檢查 token 是否過期

### Q3: API 返回 403 錯誤
**A:** 權限問題：
1. 確認登入的帳號角色為 'admin'
2. 在 Supabase 檢查 customers 表中該用戶的 role 欄位

### Q4: 表建立成功但沒有資料
**A:** 這是正常的！
- 新用戶的設定會在首次訪問時自動建立
- 管理員可以在後台為每個用戶設定

## 成功標誌

當一切正常時，您應該看到：

1. **後台管理介面**：
   - 每個用戶下方顯示「系統設定」區域
   - 三個開關：☑️ 顯示功能選擇、☑️ 顯示工作量級別、☑️ 顯示截圖功能
   - 開關可以點擊並即時更新

2. **Network 請求**：
   - `/api/admin/customer-settings` 返回 200 狀態碼
   - 回應包含 `success: true` 和設定資料

3. **Console 無錯誤**：
   - 沒有紅色錯誤訊息
   - 可能有藍色的 info 訊息（正常）

## 仍需協助？

如果問題仍未解決，請提供：
1. Supabase SQL Editor 中執行檢查腳本的結果
2. 瀏覽器 Console 的錯誤訊息截圖
3. Network 標籤中 API 請求的回應內容
4. 您的 Supabase 專案 URL（請勿包含敏感資訊）
