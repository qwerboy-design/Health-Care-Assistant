# HCA 成人健檢報告功能驗收紀錄

日期：2026-10-02  
版本：v0.2 implementation baseline

## 已實作

- 兩版 SPEC 已保存；v0.2 明確取代 v0.1，欄位採 `analysis_metadata`。
- PDF、JPEG、PNG、WebP 在瀏覽器內擷取；PDF 文字使用 pdf.js，圖片使用同源 Tesseract.js worker 與英／繁中語言包。
- 擷取結果只能先進入可編輯、未確認的表格；使用者逐列確認項目、數值、單位、原報告範圍與旗標後，才建立報告輸入。
- 報告輸入有 128 KB、200 項、欄位長度與 confirmed schema 驗證；伺服器會再次去識別化。
- 16 項成人常規健檢項目與只依原報告範圍的 high/low/within/unknown 比較已建立。
- 本地知識條目與 MedlinePlus 來源 metadata 已建立為 draft；draft/未審閱內容不產生健康建議。
- 報告分析以 deterministic draft 產生固定輸出、引用、醫師討論問題與限制，保留 `analysis_metadata`、review status 與 retrieval status。
- 新增 owner-checked 手動 Markdown 下載；報告對話進入既有 R2 save-log 時會被拒絕。
- feature flag `ENABLE_HEALTH_REPORT_ASSISTANT` 預設為 `false`；migration 只提供檔案，未套用任何遠端資料庫。

## 已測試

- `npm test -- --run __tests__/lib/reports/domain.test.ts __tests__/lib/reports/browser.test.ts`：5 tests passed。
- P0 全量 `npm test -- --run`：44 個測試檔、363 passed、12 skipped、0 failed；FHIR 去識別化契約與既有測試型別錯誤已收斂。
- `npx tsc --noEmit`：通過。
- `npm run lint`：通過。
- `npm run build`：Next.js production build 編譯與型別檢查通過（建置前準備同源 OCR assets）。
- `npm run test:coverage -- --run __tests__/lib/reports/domain.test.ts __tests__/lib/reports/browser.test.ts`：報告核心 92.30% statements、91.37% lines；新增模組合計 93.38% statements、94.94% lines。
- `npx tsc --noEmit --incremental false`：通過；P0 已收斂既有測試型別錯誤。

## 尚待驗收／不得誤稱為 production-ready

- P1 尚未完成 Chrome、Edge、Safari、Mobile Safari 的登入後人工驗收；目前僅有 browser extraction unit/component/build 證據。需要 staging/preview URL 與 seeded test account；Modal 已提供旋轉控制，但尚未提供裁切控制，因此兩項仍不能標記為完整通過。
- P2 尚未完成 Anthropic／Ollama 各 40 個合成案例。現行報告流程刻意使用 `provider=local-rules`、`model=draft-safe-analysis`，尚未呼叫任一真實模型；prompt injection、個資、timeout、格式錯誤案例仍待 provider contract 與安全 harness 完成後執行。
- P3 必須等待 P2 真實輸出，並由醫療專業人員審核知識條目與案例；自動測試不能取代此簽核。
- P4 尚未在 staging 套用 migration 008、測試 rollback、跨使用者權限／RLS 或實際網路封包；目前只有 migration source review 與靜態檢查。靜態檢查顯示 `008_add_analysis_metadata.sql` 只有 nullable 欄位的 forward migration、沒有 rollback；既有 migrations 也未看到 `chat_conversations`／`chat_messages` 的 RLS policy，必須在 staging 以兩個測試使用者驗證並補足或明確核准其隔離方案。
- P5 尚未執行；feature flag 仍應維持關閉，直到 P1、P2、P3、P4 的證據與簽核齊備。

## 開放條件

醫療專業審閱並核准知識條目、完成合成報告與模型失敗測試、staging migration 與權限／隱私檢查後，才可將 feature flag 開啟。

## P1 fix round (2026-10-02)

- PDF 文字改以相對字高重建行、依 x 座標排序並以相對字寬切分雙欄；加入 NFKC／全形標點、單位／範圍／旗標解析、junk／PHI 過濾與 needs-review 行，避免疑似檢驗資料靜默遺失。
- 掃描 PDF 會在文字層空白／近乎空白或沒有可解析項目時，以 pdf.js 逐頁、同源 Tesseract OCR 回退；圖片與 OCR 頁面在沒有本機 OSD asset 時使用 0/90/180/270 度候選，Modal 顯示 warnings、進度與圖片手動旋轉，OCR 語言資料啟用本機快取。
- 報告輸入與錯誤訊息統一為 zh-TW；client/server 都檢查 128 KB，伺服器在建立 conversation 前先驗證輸入與完整 analysis metadata，驗證失敗不建立 orphan conversation；Modal API 失敗保留表格資料並顯示 inline error。
- `analysis.meanings` 採「每一列確認項目都產生 deterministic meaning」方案，限制由 32 提高至與報告項目一致的 200；知識 lookup 以 NFKC、大小寫、空白與 aliases 對應，支援 eGFR/WBC 等人工／OCR label。
- 檢查結果：`npm test -- --run` → 48 files、388 passed、12 skipped；`npx tsc --noEmit` 通過；`npm run lint` 通過；`npm run build` 通過。Build 僅有既有 Browserslist/caniuse-lite 過期提示。

本輪未連接遠端服務、未啟用 `ENABLE_HEALTH_REPORT_ASSISTANT`，亦未以真實瀏覽器 fixture 做 P1 staging 驗收；正式開啟前仍需人工核對 OCR 結果及醫療專業審閱。

### Round 2 (2026-10-02)

- OCR 方向候選改以可疑度／可信度排序：要求檢驗項目名稱、數值／定性值與單位或範圍具合理性；旋轉候選必須明顯勝過偏好方向才切換，手動左／右轉則固定使用指定方向。低可信度或沒有合理列時不把垃圾填入表格，顯示明確的繁中影像提示。
- 解析器新增定性值（Negative、Positive、Trace、Normal、陰性、陽性、微量、`+/-`、`1+`～`4+`）、保留空白 pipe 欄位位置、合併單位／範圍與尾端旗標拆分、唯一列 ID、垃圾列拒絕、PDF 雙欄 gutter 重建、CJK 相鄰文字合併，以及頁首／頁尾／PHI 遮罩與略過列數提示。
- PDF 只有跨文件文字層總量／平均量都近乎空白時才回退 OCR；有文字但沒有檢驗項目時保留原文字層並提示使用者確認內容。匯入 Modal 新增逐列「刪除」與「新增一列」，確認狀態不會因刪除其他列而重置。
- 新增／調整 R1～R11 的 Vitest 回歸測試，涵蓋 OCR 純函式排名、手動旋轉、垃圾與模糊影像、PDF OCR 條件、定性／定位欄位、雙欄與 CJK、PHI、略過提示、列操作與 eGFR／WBC within 狀態。
- 檢查結果：`npm test -- --run` → 48 個 test files、402 passed、12 skipped；`npx tsc --noEmit` 通過；`npm run lint` 通過（0 warnings、0 errors）；`npm run build` 通過。Build 僅有既有 Browserslist/caniuse-lite 過期提示。

本輪未讀取或輸出任何 `.env*` 內容、未連接遠端服務、未修改 migration、未啟用 `ENABLE_HEALTH_REPORT_ASSISTANT`，也未重新執行真實瀏覽器 fixture；因此仍不可將本功能誤稱為 production-ready，正式開啟前須完成真實瀏覽器與醫療專業覆核。

### Round 3 (2026-10-02)

- 修正 PDF 單欄寬 label/value 間距被誤判為雙欄；只有兩側都具備重複檢驗列、數值與欄位覆蓋的版面才切 gutter。加入真實 pdf.js item fixture mapper 回歸測試，涵蓋 d1 單欄、d1 跨頁、d3 雙欄、d6 雙語與 d8 非報告；雙欄換行 label、range 與 H/L/A flag 會保留並合併。
- OCR 任何角度都先繪製到 HTML canvas；0° 優先，只有可信度與合理列數都明顯更好才換向。辨識例外會以繁中提示並記錄候選角度；垃圾列、低可信度、損毀 PNG/JPEG/WebP 結構會 fail-closed，圖片損毀會在建立 OCR worker 前回報。
- 新增常見 OCR 單位 fuzzy correction（包含 U/L、mL/min/1.73m2、10^3/uL 與 full-width/micro variants），修正過的單位保留列但標記需人工確認；needs-review 與 no-lab warnings 不再互相矛盾。
- 檢查結果：`npm test -- --run` → 48 個 test files、415 passed、12 skipped；`npx tsc --noEmit` 通過；`npm run lint` 通過（0 warnings、0 errors）；`npm run build` 通過。Build 僅有既有 Browserslist/caniuse-lite 過期提示。

本輪仍未連接遠端服務、未啟用 `ENABLE_HEALTH_REPORT_ASSISTANT`、未修改 migration，亦未將單元測試誤稱為 Chrome／Safari 真實瀏覽器或醫療專業驗收；正式開啟前仍需完成真實瀏覽器 fixture、人工逐列核對與醫療專業覆核。

### Round 4 (2026-10-02)

- 共享報告文字正規化現在先做 NFKC、相容／全形標點轉換與反覆 CJK 字元空白合併；client preview、junk/header/PHI 判斷與 server `redactReportInput` 共用同一遮罩邊界，包含 spaced-CJK PHI 與同列 English identifiers。Modal 只建立 confirmed rows，不把 raw textarea 欄位送入 `/api/chat`。
- 補強 OCR 單位 `U 人`、`U/ 人`、`U 八`、`IU 人` 等 fuzzy correction→`U/L`／`IU/L`，CJK label 會合併；`BH4IRBIEE`、`GIucose` 等疑似 garbage/misread label 保留原始數值並標記需人工確認。
- 零列結果現在只保留圖片 unreadable、PDF/text no-items 與硬錯誤；有列時才保留 OCR／逐列人工核對提示。新增 normalization、client/server PHI、Modal payload、unit/label review、route persistence 與 zero/non-zero warning 回歸測試。
- 檢查結果：`npm test -- --run` → 48 個 test files、422 passed、12 skipped；`npx tsc --noEmit` 通過；`npm run lint` 通過（0 warnings、0 errors）；`npm run build` 通過。Build 僅有既有 Browserslist/caniuse-lite 過期提示。

### Round 4b (2026-10-02)

- B8：`extractImage()` 低可信度 OCR 會清空文字，但提醒仍依被丟棄的解析列數顯示（「OCR 結果必須逐列人工核對…」與「有 N 行疑似檢驗資料未能完整解析…」）。改為只依實際回傳的列（`reliable && rows.length`）產生提醒；0 列時只顯示無法辨識訊息。PDF OCR 路徑回傳的文字與解析列一致，無相同問題。新增低可信度但有解析列的回歸測試。
- 檢查結果：`npm test -- --run` → 48 個 test files、423 passed、12 skipped；`npx tsc --noEmit` 通過；`npm run lint` 通過；`npm run build` 通過。

## P4 RLS 與 rollback 準備（2026-10-02）

### 盤點與資料存取邊界

本次檢查了 `001`～`008`、`20260312_create_customer_settings.sql`、`20260422_add_rate_limits.sql`、`check_customer_settings.sql` 與 `fix_customer_settings.sql`。`008_add_analysis_metadata.sql` 沒有新增資料表，而是在 `chat_messages` 增加 nullable 的 `analysis_metadata` 欄位；`007` 新增兩張 LLM runtime 表。

| Table | owner column | RLS before 009 | RLS after 009 | Policies | App access path |
|---|---|---|---|---|---|
| `customers` | `id` | 是（003） | 是（003） | 無 | server-side `lib/supabase/customers.ts`、credits/admin routes；`supabaseAdmin`／service role |
| `otp_tokens` | `email`（註冊／登入前資料） | 否 | 是（009） | 無 | server-side `lib/supabase/otp.ts`；service role |
| `sessions` | `customer_id`，另以 `token` 查詢 | 否 | 是（009） | 無 | server-side `lib/auth/session.ts`；custom JWT/session + service role |
| `chat_conversations` | `customer_id` | 否 | 是（009） | 無 | server-side `lib/supabase/conversations.ts`、chat/conversations routes；service role |
| `chat_messages` | 間接為 `conversation_id → chat_conversations.customer_id` | 否 | 是（009） | 無 | server-side `lib/supabase/messages.ts`、chat/report/export/save-log routes；service role。`analysis_metadata` 由 008 加入，仍受同一表的 RLS 邊界保護 |
| `model_pricing` | 無（全域模型定價） | 是（003） | 是（003） | 003/005 的既有 policy（詳下） | server-side API 使用 service role；`components/chat/ModelSelector.tsx` 與 `app/test-realtime/page.tsx` 另使用 browser anon client 做 Realtime／直接 SELECT |
| `credits_transactions` | `customer_id` | 是（003） | 是（003） | 003 的既有 policy（詳下） | server-side `lib/supabase/credits.ts`；service role；RPC 也由 server-side service role 呼叫 |
| `llm_runtime_settings` | 無（`id='default'` singleton） | 否 | 是（009） | 無 | `lib/llm/settings.ts`、admin LLM settings route、runtime route；custom session 驗證後由 service role 讀寫 |
| `llm_runtime_audit_logs` | `actor_customer_id`（可為 NULL） | 否 | 是（009） | 無 | `lib/llm/settings.ts` server-side 寫入 metadata-only audit；service role；沒有 browser direct access |
| `customer_settings` | `customer_id` | 否（create/fix scripts 均未啟用） | 是（009） | 無 | `lib/supabase/customer-settings.ts` 經 `/api/customer-settings`；API 驗證 custom Bearer JWT，資料查詢仍由 service role 執行 |
| `rate_limits` | `key`（IP/email scope） | 否 | 是（009） | 無 | `lib/rate-limit.ts` 只透過 `consume_rate_limit` RPC server-side 呼叫；service role，非 user-owned row |

### Auth model、既有 policy 與 009 設計

程式碼使用 `jose` 簽發／驗證 custom JWT、`bcryptjs` 處理密碼，並以 `customers`／`sessions` 保存 custom session；沒有以 Supabase Auth 建立 `auth.uid()` 與 `customers.id` 的 identity binding。因此 009 沒有新增任何 `auth.uid()` owner policy，也沒有改寫或削弱 003/005 的既有 policy。對 server-only tables，RLS 開啟後沒有 anon/authenticated policy，形成 deny-by-default；server-side `service_role` 會 bypass RLS，故既有 API 存取維持運作。

既有 policy inventory：

- `model_pricing`：`Users can view active models`（003，`SELECT TO authenticated`，`USING (is_active = true)`，無明寫 `WITH CHECK`）；`Admins can manage models`（003，`ALL TO authenticated`，`USING (EXISTS (SELECT 1 FROM customers WHERE customers.id = auth.uid()::uuid AND customers.role = 'admin'))`，無明寫 `WITH CHECK`）；`Authenticated users can read all models for Realtime sync`（005，`SELECT TO authenticated`，`USING (true)`）；`Anonymous can view active models`（005，`SELECT TO anon`，`USING (is_active = true)`）。
- `credits_transactions`：`Users can view own transactions`（003，`SELECT TO authenticated`，`USING (customer_id = auth.uid()::uuid)`）；`Service role can insert transactions`（003，`INSERT TO service_role`，`WITH CHECK (true)`）。
- `customers` 雖由 003 啟用 RLS，但沒有既有 policy；其餘表在 009 前也沒有 policy。

009 只對 `otp_tokens`、`sessions`、`chat_conversations`、`chat_messages`、`llm_runtime_settings`、`llm_runtime_audit_logs`、`customer_settings`、`rate_limits` 做存在性 guarded `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`。`model_pricing` 的 browser anon SELECT／Realtime 是實際存在的例外，且 005 的 authenticated `USING (true)` policy 具有廣泛可讀範圍；為遵守不削弱既有 policy 與不靜默破壞 UI 的要求，本次只在 SQL 註解與本文件標示風險，沒有偷偷撤銷 grant 或修改 policy。

### Rollback 檔案與順序

- `supabase/rollback/009_down.sql`：手動 disable 009 啟用、且在 009 前未啟用的八張表；009 沒有建立 policy、沒有 revoke grant，因此不會刪除 003/005 policy 或虛構還原 grant。
- `supabase/rollback/008_down.sql`：先清除 008 對 `chat_messages.analysis_metadata` 的 comment，再刪除該欄位；這會永久遺失欄位內的分析 metadata。
- `supabase/rollback/README.md`：說明 rollback 位於 `supabase/rollback/`，不會被 Supabase CLI 當成 forward migration 自動套用。

手動順序是 `009_down.sql` → `008_down.sql`；確認 schema 後才依需要重新套用 `008_add_analysis_metadata.sql` → `009_enable_rls_policies.sql`。本次沒有連接遠端資料庫，也沒有執行任何 rollback。

### 驗證結果

- 靜態測試：`npm test -- --run __tests__/supabase/rls-migrations.test.ts`，5 tests passed；檢查所有 migration 建表在 009 後都有 RLS、009 policy rollback 對應、008 欄位 rollback、rollback 不在 migrations 目錄，以及 009 沒有新增 anon/authenticated broad policy。
- 全量測試：`npm test -- --run`，45 test files、368 passed、12 skipped、0 failed。執行期間的 React `act(...)` 與預期錯誤輸出是既有測試訊息，未造成失敗。
- TypeScript：`npx tsc --noEmit` 通過。
- Lint：`npm run lint` 通過，0 warnings、0 errors。
- Local DB verification：未執行。重查結果為 Docker CLI 存在但 Docker daemon 不可用，`supabase`、`psql`、`postgres` binary 均不可用；依任務要求沒有安裝工具、啟動 Docker 或連線資料庫。可執行的手動腳本是 `supabase/tests/rls_local_verification.sql`，且已註明必須是 local throwaway DB。

### 風險與 staging 待辦

- `model_pricing` 仍有 anon direct SELECT 與 Realtime browser path；其既有 `authenticated USING (true)` policy 並非 custom `customerId` owner isolation。staging 必須確認模型定價是否可接受這個全域／Realtime 例外，並測試停用模型、更新定價與 Realtime delivery。
- custom JWT 不會自動成為 Supabase `auth.uid()`；003 的 authenticated policies 只在真正帶 Supabase Auth claims 的 client 情境成立。正式 app 目前依賴 server-side session checks + service role，不能把 RLS 靜態啟用誤稱為 database-level custom-user isolation。
- `chat_messages` 的 owner 是透過 conversation 間接推導，DB policy 沒有替 custom JWT 做 owner join；chat/report routes 目前在 service-role 查詢前做 conversation/customer 檢查，需在 staging 以兩個測試帳號驗證跨 conversation 讀取、匯出、save-log 與 report flow。
- 啟用 009 前應在 staging 先 apply 001～009、檢查 `pg_class.relrowsecurity`／`pg_policies`，執行 local verification SQL 的等價 staging-safe 測試，檢查 service-role API 與 anon model/realtime UI，再測試 009→008 rollback 與 008→009 re-apply。不要把本次靜態測試或 source review 當成 staging／production readiness，也不要開啟 `ENABLE_HEALTH_REPORT_ASSISTANT`。

## model_pricing 改為僅後台可見（2026-10-02）

### 實作與存取邊界

- 新增 `supabase/migrations/010_restrict_model_pricing.sql`：維持 `model_pricing` 的 RLS enabled，移除 003/005 建立的四個 client-facing policies（`Users can view active models`、`Admins can manage models`、`Authenticated users can read all models for Realtime sync`、`Anonymous can view active models`），撤銷 `anon`／`authenticated` 的 table privileges，並以 `pg_publication_tables` 條件檢查後移除 `supabase_realtime` publication membership。未撤銷 `service_role` 存取。
- 新增 `supabase/rollback/010_down.sql`：guarded/idempotent 地恢復 003/005 的四個 policies、先前可確認存在的 SELECT grants 與 Realtime publication membership。rollback 不虛構 003/005 未明確宣告的 write grants。
- `supabase/rollback/README.md` 已改為 `010_down.sql` → `009_down.sql` → `008_down.sql`；`supabase/tests/rls_local_verification.sql` 改為檢查 anon 沒有 `model_pricing` SELECT grant。該腳本僅供 local throwaway DB，未執行於遠端或任何資料庫。

### 客戶模型選擇器與 API contract

`GET /api/models` 現在必須有專案 custom `session` cookie 且 `verifySession` 成功，否則回傳 HTTP 401。成功時只使用 server-side `supabaseAdmin`，以 explicit select 查詢 active rows，回傳的 JSON shape 為：

```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "model-uuid",
        "model_name": "claude-sonnet-4-5-20250929",
        "display_name": "Claude Sonnet 4.5",
        "supports_vision": true
      }
    ]
  }
}
```

`models` 不包含 `credits_cost`、price、cost、credit、`is_active` 或其他財務欄位；active filtering 留在 server query。現有 schema 沒有可可靠提供的 `provider` 欄位，因此不捏造該欄位。`components/chat/ModelSelector.tsx` 改為 mount fetch，並在 window focus 時 refetch；移除 browser anon Supabase client、Realtime subscription、定價顯示與 client-side 定價版本快取。`userCredits` prop 保留以維持既有 call sites 相容，但不再用於客戶端定價判斷。

**更新（使用者決策）**：`/api/models` 每個 model 另回傳唯一的 credits 欄位 `credits_per_use`（server 端由 `model_pricing.credits_cost` 映射，與 `app/api/chat/route.ts` 經 `getModelPricing()` 每次呼叫實際扣除的固定整數相同，不隨 token 變動），`ModelSelector` 據此顯示「X Credits」並在 `userCredits < credits_per_use` 時 disable 該選項；其他定價細節（`credits_cost` 原欄位名、token 價格、成本、毛利、`is_active` 等）仍僅後台可見。

### 管理後台定價路徑

`app/(admin)/admin/models/page.tsx` 只呼叫 `/api/admin/models`。該 route 的 GET/POST/PATCH/DELETE 均使用 `lib/auth/admin.ts` 的 `requireAdmin` guard；通過後才由 `lib/supabase/model-pricing.ts` 使用 `supabaseAdmin` 讀寫完整定價資料。聊天與報告扣點仍由 server-side `getModelPricing()` 取得定價，不會經過客戶端 API。

`app/test-realtime/page.tsx` 在 production 呼叫 `notFound()`，development 只顯示停用說明，不再直接讀取或訂閱 `model_pricing`。根目錄 `tmp_rovodev_test_realtime.html` 保留但已移除 Supabase script、嵌入的 anon key 與直接查詢，改為歷史停用說明。

### 驗證結果

- 針對性測試：`npm test -- --run __tests__/api/models/route.test.ts __tests__/components/chat/ModelSelector.test.tsx __tests__/supabase/rls-migrations.test.ts`：3 個 test files、12 passed、0 failed。
- 全量測試：`npm test -- --run`：47 個 test files、375 passed、12 skipped、0 failed。
- TypeScript：`npx tsc --noEmit` 通過。
- Lint：`npm run lint` 通過，0 warnings、0 errors。
- Build：`npm run build` 通過；Next.js production compilation、lint/type check、static generation 均完成。僅有既有 Browserslist/caniuse-lite 過期提示，以及測試中的既有 React `act(...)`／預期錯誤情境 stderr，未造成失敗。
- 未連接遠端 Supabase、未執行 Supabase CLI、`psql` 或任何 network DB command；因此 RLS／grant／publication 的實際環境狀態仍需部署後 dashboard 驗證。

### Deploy notes

1. 在已套用 001～009 的 staging/production Supabase 專案套用 `010_restrict_model_pricing.sql`。
2. 於 Supabase Dashboard 檢查 `model_pricing` 沒有 `anon` 或 `authenticated` policies、`anon`／`authenticated` 沒有 SELECT privilege，且 `model_pricing` 不在 `supabase_realtime` publication。
3. 以登入的一般使用者驗證 `/api/models` 只收到上述非財務欄位；以未登入請求確認 401；以管理員驗證 `/admin/models` 與 `/api/admin/models` 仍可讀寫定價。
4. 若需 rollback，先人工確認資料庫狀態，再依 `010_down.sql` → `009_down.sql` → `008_down.sql` 執行；不要把 rollback 檔案當成 Supabase forward migration。
