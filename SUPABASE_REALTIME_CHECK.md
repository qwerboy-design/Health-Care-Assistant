# 如何確認 Supabase Realtime 是否啟用

## 方法 1：Supabase Dashboard（推薦）

### 步驟 1：登入並進入專案
1. 前往 https://supabase.com/dashboard
2. 選擇您的專案

### 步驟 2：檢查 Realtime 設定
1. 點擊左側選單的 **Settings** (⚙️ 圖示)
2. 在 Settings 子選單中點擊 **API**
3. 向下捲動找到 **Realtime** 區塊

### 步驟 3：確認狀態
在 Realtime 區塊中，您應該會看到：

```
✅ Realtime is enabled
```

或者

```
❌ Realtime is disabled
```

**重要：** 如果顯示 disabled，請點擊 **Enable Realtime** 按鈕啟用。

### 步驟 4：檢查 Realtime Configuration
在同一個 Realtime 區塊中，確認以下設定：

- **Database Changes**: 應該是 ✅ Enabled
  - 這是監聽資料庫變更的功能，是我們需要的
- **Presence**: 可選（用於追蹤線上使用者）
- **Broadcast**: 可選（用於廣播訊息）

## 方法 2：檢查 Publications（更精確）

Realtime 依賴於 PostgreSQL Publications 來廣播資料變更。

### 步驟 1：進入 SQL Editor
1. 點擊左側選單的 **SQL Editor**
2. 建立新查詢

### 步驟 2：執行檢查查詢

```sql
-- 查詢 1: 檢查 supabase_realtime publication 是否存在
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';
```

**預期結果：** 應該返回 1 列，包含 publication 的資訊

```sql
-- 查詢 2: 檢查 model_pricing 是否在 publication 中
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'model_pricing';
```

**預期結果：** 應該返回 1 列：
```
schemaname | tablename
-----------+--------------
public     | model_pricing
```

```sql
-- 查詢 3: 列出 supabase_realtime 中的所有表格
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

**預期結果：** 應該看到一個列表，其中包含 `model_pricing`

## 方法 3：使用 Supabase CLI（本地開發）

如果您使用本地開發環境：

```bash
# 連接到本地 Supabase
supabase status

# 應該顯示：
# Realtime URL: ws://localhost:54321/realtime/v1
```

## 方法 4：程式碼測試（最直接）

使用我們的測試頁面：

1. 前往 http://localhost:3000/test-realtime
2. 查看頁面狀態：
   - ✅ **SUBSCRIBED** = Realtime 正常運作
   - ❌ **CHANNEL_ERROR** = Realtime 可能未啟用或設定錯誤
   - ❌ **TIMED_OUT** = 連線逾時

## 常見問題

### Q1: Realtime 顯示 Enabled，但仍無法連線
**可能原因：**
1. 環境變數錯誤（檢查 NEXT_PUBLIC_SUPABASE_URL 和 ANON_KEY）
2. 防火牆阻擋 WebSocket 連線（port 443/wss）
3. 瀏覽器擴充套件干擾（嘗試無痕模式）

**解決方案：**
1. 在測試頁面查看 Debug 資訊
2. 檢查瀏覽器 Console 錯誤訊息
3. 嘗試使用 curl 測試 API 可達性：
   ```bash
   curl https://your-project.supabase.co/rest/v1/
   ```

### Q2: Publication 存在但收不到事件
**可能原因：**
1. RLS (Row Level Security) 政策阻擋
2. 使用者沒有 SELECT 權限
3. Replica lag（資料還沒同步）

**解決方案：**
執行以下 SQL 檢查權限：
```sql
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  roles, 
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'model_pricing';
```

確保有類似以下的政策：
```
policyname: "Authenticated users can read all models for Realtime sync"
roles: {authenticated}
cmd: SELECT
qual: true
```

### Q3: Supabase Dashboard 找不到 Realtime 設定
**可能原因：**
1. 使用舊版 Supabase Dashboard
2. 專案類型不支援 Realtime（舊專案）

**解決方案：**
1. 重新整理頁面或清除快取
2. 確認專案建立時間（2021 年後的專案通常都支援）
3. 聯絡 Supabase 支援確認專案狀態

## 驗證清單

請依序檢查以下項目：

- [ ] Supabase Dashboard → Settings → API → Realtime 顯示 "Enabled"
- [ ] Database Changes 功能已啟用
- [ ] SQL 查詢確認 `supabase_realtime` publication 存在
- [ ] SQL 查詢確認 `model_pricing` 在 publication 中
- [ ] 測試頁面顯示 "SUBSCRIBED" 狀態
- [ ] 瀏覽器 Console 無錯誤訊息
- [ ] Debug 資訊顯示環境變數正確（兩個綠色勾勾）

## 下一步

如果所有檢查都通過但仍無法同步，請提供：
1. Supabase Dashboard 截圖（Settings → API → Realtime 區塊）
2. 瀏覽器 Console 完整錯誤訊息
3. 測試頁面的日誌內容

這樣我可以更精確地診斷問題。
