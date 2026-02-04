# Realtime 模型同步驗證流程

## 問題描述
後台調整模型時，前台模型選擇器無法自動更新。

## 根本原因
Supabase Realtime 需要將 `model_pricing` 表加入 `supabase_realtime` publication 才能廣播變更事件。

## 解決方案已執行
✅ 已執行 `005_add_realtime_publication.sql` migration

## 驗證步驟

### 1. 資料庫端驗證

在 Supabase Dashboard SQL Editor 中執行以下查詢：

```sql
-- 查詢 1: 確認 model_pricing 是否在 supabase_realtime publication 中
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'model_pricing';

-- 預期結果：應該返回 1 列（public, model_pricing）
```

```sql
-- 查詢 2: 檢查 RLS policies
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'model_pricing';

-- 預期結果：應該看到以下 policies
-- 1. "Authenticated users can read all models for Realtime sync" (SELECT, authenticated, true)
-- 2. "Anonymous can view active models" (SELECT, anon, is_active = true)
```

```sql
-- 查詢 3: 測試讀取權限（使用您的帳號登入後執行）
SELECT id, model_name, display_name, credits_cost, is_active 
FROM model_pricing 
ORDER BY credits_cost;

-- 預期結果：應該能看到所有模型（包括 is_active = false 的）
```

### 2. 前端測試（方法 A：測試頁面）

1. 開啟測試頁面：http://localhost:3000/test-realtime
2. 確認狀態顯示：**✅ Realtime 已連接並訂閱成功**
3. 開啟新分頁：http://localhost:3000/admin/models（需管理員登入）
4. 在後台修改任一模型的定價或狀態
5. 切回測試頁面，觀察日誌是否即時顯示變更事件

**預期結果：**
- 日誌顯示：`🎯 收到 UPDATE 事件`
- 狀態更新為：`✅ Realtime 運作正常 - 剛收到事件！`

### 3. 前端測試（方法 B：實際聊天頁面）

1. 開啟聊天頁面：http://localhost:3000/chat
2. 點擊「顯示選項」展開模型選擇器
3. 記下當前可用的模型列表
4. 開啟新分頁到後台：http://localhost:3000/admin/models
5. 執行以下操作之一：
   - 修改某個模型的定價
   - 停用某個模型（is_active → false）
   - 啟用某個模型（is_active → true）
6. **不要重新整理頁面**，切回聊天頁面
7. 觀察模型選擇器是否在 **5 秒內**自動更新

**預期結果：**
- 修改定價：下拉選單中該模型的 Credits 數字應自動更新
- 停用模型：該模型應從下拉選單消失
- 啟用模型：該模型應出現在下拉選單中

### 4. 檢查瀏覽器 Console

開啟瀏覽器開發者工具 (F12) → Console：

**成功的 Log 應包含：**
```
Supabase Realtime 訂閱狀態: {"status":"SUBSCRIBED"}
模型資料實時變動: {eventType: "UPDATE", new: {...}, old: {...}}
```

**失敗的 Log 可能包含：**
```
❌ 訂閱失敗
CHANNEL_ERROR
TIMED_OUT
```

### 5. 常見問題排查

#### 問題：測試頁面顯示「連接失敗」
**解決方案：**
1. 確認 `.env.local` 中的 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 正確
2. 重新執行資料庫端驗證步驟 1
3. 檢查 Supabase Dashboard → Settings → API → Realtime 是否啟用

#### 問題：訂閱成功但收不到事件
**解決方案：**
1. 檢查 RLS policies（資料庫端驗證查詢 2）
2. 確認後台更新操作真的成功寫入資料庫
3. 嘗試清除瀏覽器快取並重新整理

#### 問題：前台有時更新、有時不更新
**原因：**
- Supabase 的 Replica Lag（複製延遲）
- 前端有保護機制：收到 Realtime 更新後 5 秒內會忽略 API 輪詢，避免被舊資料覆蓋

**解決方案：**
- 這是正常現象，前端已有多重機制保護
- 最差情況：30 秒輪詢會補上

### 6. 多重保險機制說明

`ModelSelector.tsx` 已實作以下機制確保同步：

1. **主要機制：Realtime 訂閱**（即時，< 1 秒）
2. **備援機制 1：Window Focus**（切換分頁回來時）
3. **備援機制 2：Visibility Change**（頁面可見時）
4. **備援機制 3：定期輪詢**（每 30 秒）

即使 Realtime 暫時失效，使用者最多等待 30 秒就會看到更新。

## 驗證完成清單

- [ ] 資料庫端查詢 1：model_pricing 在 publication 中
- [ ] 資料庫端查詢 2：RLS policies 正確
- [ ] 資料庫端查詢 3：能讀取所有模型
- [ ] 測試頁面顯示「✅ Realtime 已連接並訂閱成功」
- [ ] 後台修改模型後，測試頁面日誌即時顯示事件
- [ ] 聊天頁面的模型選擇器能自動更新（無需重新整理）
- [ ] 瀏覽器 Console 顯示 SUBSCRIBED 狀態
- [ ] 瀏覽器 Console 收到 postgres_changes 事件

## 下一步行動

如果上述驗證都通過，問題已解決 ✅

如果仍有問題，請提供：
1. 哪一個驗證步驟失敗？
2. 瀏覽器 Console 的錯誤訊息
3. Supabase Dashboard → Database → Publications 的截圖
