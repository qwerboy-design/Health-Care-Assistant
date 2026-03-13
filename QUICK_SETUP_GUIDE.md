# 快速設置指南 - 客製化 UI 功能

## 問題：後台管理介面顯示「設定載入失敗」

如果您在後台管理介面看到以下訊息：
```
⚠️ 設定載入失敗 - 請確認 customer_settings 資料表已建立
```

這表示 Supabase 資料庫中的 `customer_settings` 表尚未建立。

## 解決方案

### 步驟 1：在 Supabase 執行 Migration

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. 點擊左側選單的 **SQL Editor**
4. 點擊 **+ New query**
5. 複製以下 SQL 腳本並貼上：

```sql
-- Create customer_settings table
CREATE TABLE IF NOT EXISTS customer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE,
  show_function_selector BOOLEAN NOT NULL DEFAULT false,
  show_workload_selector BOOLEAN NOT NULL DEFAULT false,
  show_screenshot BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Foreign key constraint
  CONSTRAINT fk_customer
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE CASCADE
);

-- Create index on customer_id for faster lookups
CREATE INDEX idx_customer_settings_customer_id ON customer_settings(customer_id);

-- Create trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_customer_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_customer_settings_updated_at
  BEFORE UPDATE ON customer_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_settings_updated_at();

-- Add comment for documentation
COMMENT ON TABLE customer_settings IS 'Stores customer UI customization settings for showing/hiding features';
COMMENT ON COLUMN customer_settings.show_function_selector IS 'Whether to show the function selector component';
COMMENT ON COLUMN customer_settings.show_workload_selector IS 'Whether to show the workload level selector';
COMMENT ON COLUMN customer_settings.show_screenshot IS 'Whether to show the screenshot feature';
```

6. 點擊右下角的 **Run** 按鈕執行
7. 確認沒有錯誤訊息

### 步驟 2：驗證表已建立

在 SQL Editor 中執行：

```sql
SELECT * FROM customer_settings LIMIT 5;
```

如果沒有錯誤，表示表已成功建立。

### 步驟 3：重新整理後台頁面

1. 回到後台管理介面
2. 按 F5 或點擊瀏覽器的重新整理按鈕
3. 現在應該可以看到三個開關：
   - ☑️ 顯示功能選擇
   - ☑️ 顯示工作量級別
   - ☑️ 顯示截圖功能

## 使用方式

### 為用戶啟用功能

1. 在後台管理介面的用戶列表中
2. 找到要設定的用戶
3. 在「系統設定」區域勾選想要啟用的功能
4. 變更會立即儲存並生效

### 用戶端效果

當用戶登入後：
- 如果「顯示功能選擇」被啟用 → Chat 頁面會顯示功能選擇器
- 如果「顯示工作量級別」被啟用 → Chat 頁面會顯示工作量級別選擇器
- 如果「顯示截圖功能」被啟用 → Chat 頁面會顯示截圖按鈕（桌面版）

**注意**：手機版（螢幕寬度 < 768px 或行動裝置 User-Agent）會自動隱藏截圖功能。

## 預設值

- 新用戶的所有功能預設為**隱藏**（false）
- 管理員需要手動為用戶啟用所需的功能

## 疑難排解

### 問題 1：執行 SQL 時出現「relation "customers" does not exist」

**原因**：customers 表不存在
**解決**：請先確保已建立 customers 表

### 問題 2：仍然顯示「設定載入失敗」

**檢查步驟**：
1. 開啟瀏覽器開發者工具（F12）
2. 切換到 Network 標籤
3. 重新整理頁面
4. 查找 `/api/admin/customer-settings` 的請求
5. 檢查回應內容

**可能原因**：
- Token 過期：重新登入
- 沒有 admin 權限：確認帳號角色為 admin
- API 錯誤：檢查 Console 標籤的錯誤訊息

### 問題 3：更改設定後沒有反應

**解決**：
1. 檢查 Network 標籤中 POST 請求的回應
2. 確認沒有 CORS 或認證錯誤
3. 嘗試重新登入

## 技術支援

如果問題仍然存在，請提供以下資訊：
- 瀏覽器 Console 的錯誤訊息
- Network 標籤中的 API 回應
- Supabase 資料庫的錯誤日誌
