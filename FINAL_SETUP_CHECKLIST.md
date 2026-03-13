# 最終設置檢查清單

## ✅ 已完成的步驟

1. ✅ 編譯錯誤已修復（import 路徑更正）
2. ✅ 所有測試通過（13/13 tests passed）
3. ✅ 前端 UI 已整合（後台管理介面 + Chat 頁面）
4. ✅ API routes 已建立並增強日誌
5. ✅ 錯誤訊息已改進（友善提示）

## 🔧 立即執行的步驟

### 步驟 1：確認編譯成功
檢查終端機（terminal 18），應該顯示：
```
✓ Compiled in Xms
```

如果顯示錯誤，請告知錯誤訊息。

### 步驟 2：在 Supabase 執行 SQL

**重要**：先執行檢查腳本，確認表的狀態：

```sql
-- 檢查表是否存在
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'customer_settings'
) as table_exists;
```

**如果表不存在或有問題，執行完整重建**：

```sql
DROP TRIGGER IF EXISTS trigger_update_customer_settings_updated_at ON customer_settings;
DROP FUNCTION IF EXISTS update_customer_settings_updated_at();
DROP TABLE IF EXISTS customer_settings CASCADE;

CREATE TABLE customer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE,
  show_function_selector BOOLEAN NOT NULL DEFAULT false,
  show_workload_selector BOOLEAN NOT NULL DEFAULT false,
  show_screenshot BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_customer_settings_customer_id ON customer_settings(customer_id);

CREATE OR REPLACE FUNCTION update_customer_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_settings_updated_at
  BEFORE UPDATE ON customer_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_settings_updated_at();
```

**驗證**：
```sql
SELECT 'Success!' as status, COUNT(*) as count FROM customer_settings;
```

### 步驟 3：清除瀏覽器快取並重新整理

1. 按 `Ctrl + Shift + R`（Windows）或 `Cmd + Shift + R`（Mac）強制重新整理
2. 或者：
   - 按 F12 開啟開發者工具
   - 右鍵點擊瀏覽器的重新整理按鈕
   - 選擇「清空快取並強制重新整理」

### 步驟 4：檢查 Console 日誌

打開開發者工具（F12），切換到 Console 標籤，應該看到：

**成功的日誌**：
```
[fetchCustomerSettings] Fetching settings for X customers
[Admin Customer Settings API] GET request received
[Admin Customer Settings API] Has auth header: true
[Admin Customer Settings API] Token verified, payload: {...}
[Admin Customer Settings API] Customer found, role: admin
[Admin Customer Settings API] Batch mode: true Customer IDs: xxx,yyy,zzz
[Admin Customer Settings API] Fetching settings for X customers
[Admin Customer Settings API] Retrieved X settings
[fetchCustomerSettings] Response status: 200
[fetchCustomerSettings] Response data: {success: true, ...}
[fetchCustomerSettings] Settings loaded successfully X records
```

**如果看到錯誤**：
- `401 Unauthorized` → 重新登入
- `403 Forbidden` → 確認帳號是 admin 角色
- `500 Server Error` → 檢查資料庫表是否建立成功

### 步驟 5：檢查 Network 標籤

1. 切換到 Network 標籤
2. 重新整理頁面
3. 搜尋 `customer-settings`
4. 點擊請求查看詳細資訊
5. 檢查 Response：
   - 狀態碼應該是 200
   - Response 應該包含 `{success: true, data: {settings: {...}}}`

## 🎯 成功標誌

當一切正常時，您應該看到：

1. **後台管理介面**：
   - 每個用戶下方顯示「系統設定：」
   - 三個可點擊的開關：
     - ☐ 顯示功能選擇
     - ☐ 顯示工作量級別
     - ☐ 顯示截圖功能
   - 開關預設都是未勾選（false）
   - 點擊開關會立即更新

2. **Console 無錯誤**：
   - 沒有紅色錯誤訊息
   - 有藍色/灰色的 info 訊息（正常）

3. **Network 請求成功**：
   - 200 狀態碼
   - success: true

## 🐛 常見問題速查

| 問題 | 原因 | 解決方法 |
|------|------|---------|
| 仍顯示「設定載入失敗」 | 資料庫表未建立 | 執行 SQL 腳本 |
| 401 錯誤 | Token 過期 | 重新登入 |
| 403 錯誤 | 不是 admin 角色 | 檢查資料庫 customers 表的 role 欄位 |
| 500 錯誤 | 資料庫連接問題 | 檢查 Supabase 連接與表結構 |
| 編譯錯誤 | 代碼問題 | 已修復，重新載入頁面 |

## 📞 需要協助？

如果問題仍未解決，請提供：
1. 終端機的編譯訊息
2. Console 的完整日誌輸出
3. Network 標籤中 `/api/admin/customer-settings` 的 Response
4. Supabase SQL Editor 中執行 `SELECT * FROM customer_settings;` 的結果

---

## 測試功能

當系統正常運作後，您可以測試：

1. **啟用功能**：
   - 在後台勾選「顯示功能選擇」
   - 使用該用戶帳號登入前台
   - 在 Chat 頁面應該可以看到功能選擇器

2. **手機版測試**：
   - 按 F12 開啟開發者工具
   - 按 Ctrl + Shift + M 切換到行動裝置模式
   - 即使啟用截圖功能，手機版也不應顯示截圖按鈕

3. **設定即時更新**：
   - 開啟兩個瀏覽器視窗
   - 一個登入後台，一個登入前台（同一用戶）
   - 在後台切換開關
   - 前台重新整理後應該看到變化
