# Supabase 手動 rollback

這個資料夾不在 `supabase/migrations/`，因此不會被 Supabase CLI 當成 forward migration 自動套用。rollback 必須由操作者在確認過的 local/staging throwaway database 以 `psql` 或 SQL editor 手動執行。

建議順序：

1. `20261002_down.sql`：還原 `20261002_enable_rls_customer_settings_rate_limits.sql`，對 `customer_settings`、`rate_limits` 停用 RLS 並恢復 anon/authenticated 的 Supabase 預設 table grant（ALL）。這會恢復 anon key 可讀寫兩表的舊狀態，請勿當作 production 捷徑。
2. `010_down.sql`：恢復 003/005 的 `model_pricing` client policies、SELECT grant 與 Realtime publication membership。
3. `009_down.sql`：移除 009 對八個原本未啟用 RLS 的表所做的 RLS enable；不刪除既有 policy，也不還原任何 grant。
4. `008_down.sql`：清除 `chat_messages.analysis_metadata` 的 comment 並刪除欄位；這會遺失該欄位所有資料。
5. `011_down.sql`：確認 runtime provider 已切回 Anthropic 或 Ollama 後，移除 OpenAI provider constraint。
6. schema review 後，依需求依序重新套用 `008_add_analysis_metadata.sql`、`009_enable_rls_policies.sql`、`010_restrict_model_pricing.sql`、`011_add_openai_provider.sql`、`20261002_enable_rls_customer_settings_rate_limits.sql`。

注意：Supabase CLI 依檔名排序套用 migration，`20260312_*`、`20260422_*` 會排在 `009`／`010` 之後，因此 `customer_settings`、`rate_limits` 的 RLS 由 `20261002_*` 負責。

執行前請先備份／確認可接受的資料損失，並以兩個測試使用者執行 `supabase/tests/rls_local_verification.sql`。
