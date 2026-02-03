-- Migration: Enable Supabase Realtime for model_pricing table
-- Description: 將 model_pricing 加入 supabase_realtime publication，讓前端能即時接收模型定價變更
--
-- 重要：Realtime Postgres Changes 需要表格在 publication 中才能廣播變更事件
-- 參考：https://supabase.com/docs/guides/realtime/postgres-changes

-- 1. 將 model_pricing 加入 Realtime 發布（若尚未加入）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'model_pricing'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE model_pricing;
  END IF;
END $$;

-- 2. 放寬 RLS 政策：讓認證使用者能讀取所有 model_pricing 列（含 is_active=false）
-- 原因：Realtime 需能「看到」變更才能轉發；若僅允許 is_active=true，
--       當管理員將模型停用時，一般使用者收不到變動通知
-- 過濾邏輯由 API 層負責（/api/models 僅回傳 is_active=true）
DROP POLICY IF EXISTS "Authenticated users can read all models for Realtime sync" ON model_pricing;
CREATE POLICY "Authenticated users can read all models for Realtime sync"
  ON model_pricing FOR SELECT
  TO authenticated
  USING (true);

-- 3. 允許 anon 讀取啟用中的模型（供測試頁 /test-realtime 使用）
DROP POLICY IF EXISTS "Anonymous can view active models" ON model_pricing;
CREATE POLICY "Anonymous can view active models"
  ON model_pricing FOR SELECT
  TO anon
  USING (is_active = true);
