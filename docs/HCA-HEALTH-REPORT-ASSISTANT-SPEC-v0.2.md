# HCA 成人健檢報告解讀與健康管理 SPEC v0.2

> 開發依據（2026-10-02）。本版取代 v0.1 的執行規則；草稿醫療條目在醫療專業審閱前不得啟用健康建議。

## 1. 產品目標與架構決策

HCA 服務醫療專業人員檢視成人常規健檢的檢驗數值與正式檢查報告，產生可核對、可引用、可追蹤的資料整理、一般性健康管理方向與醫師討論問題。它不是最終診斷、治療、分流或急迫性決策工具。

輸入先支援 PDF、報告照片與手動輸入，擷取在瀏覽器內完成；原檔、照片、OCR 文字只留在裝置記憶體，離開或取消即釋放，不進 localStorage、IndexedDB、analytics、log 或伺服器。使用者確認去識別化項目後，僅將確認的結構化資料與分析結果保存至 Supabase，提供手動下載；報告對話禁止自動 R2 匯出。沿用既有 Anthropic／Ollama，不啟用外部資料庫即時查詢。

流程：`檔案 → 裝置擷取 → 使用者核對／去識別化 → 原報告範圍比較 → 本地來源說明 → 保存／下載`。保留 provider、credits、對話權限與舊歷史相容性；不另建服務。不得宣稱臨床準確率或以外部模型記憶補足來源。

## 2. 瀏覽器擷取與核對

首批格式為 PDF/JPEG/PNG。PDF 使用 pdf.js 文字與座標；掃描頁轉成影像後使用 Tesseract.js。版本固定為 pdfjs-dist 6.3.289、tesseract.js 7.0.0、English 與 Traditional Chinese 語言資料；worker、WASM、字型與語言檔由同源 `/report-assets` 提供，不使用 runtime 第三方 CDN。單份 10 MB、10 頁、200 項，依序處理，顯示進度並支援取消、旋轉與裁切。

密碼 PDF 由使用者先解鎖；不支援或擷取失敗時提供手動文字／項目輸入，不把失敗當成成功。預覽顯示原頁面與可編輯項目：名稱、value、unit、原報告 reference range、original flag、頁碼／位置、extraction method。使用者必須逐列確認名稱、數值、單位及範圍；OCR 分數只是辨識品質，不是醫療信心，也不得自動確認。移除姓名、生日、病歷號、聯絡方式、條碼、原檔名；伺服器再次驗證與去識別化。每次新報告建立新報告上下文；同一報告可追問，首版不做年度趨勢。

## 3. 成人首批 16 項與比較

首批項目：glucose、HbA1c、total cholesterol、LDL-C、HDL-C、triglycerides、AST、ALT、creatinine、eGFR、BUN、hemoglobin、WBC、platelets、urine protein、urine occult blood。

保留未知項目與正式結論並標記 not covered；不可捏造建議、不可重新計算 eGFR。比較函式只讀原報告範圍與已確認值，輸出 high／low／within／unknown；無範圍、單位不相容、適用性不明、非純量或原旗標衝突時輸出 unknown 並顯示原因。超出範圍不等同疾病。

## 4. 本地知識與輸出

知識條目是可版本化的本地資料，優先參考 MedlinePlus/NIH、台灣衛生福利部／國民健康署公開資料，保存 id、aliases、meaning、common factors、applicability、limits、source URL、標題、出版／版本日、存取日與審查歷程。首批條目建立為 draft；醫療專業審閱並核准前，系統只能提供原報告整理、引用與限制說明，不提供健康建議。超過 90 天未審或 expired 亦同。更新是手動文件變更，不自動上網。

固定輸出：報告摘要、原始數值表、項目意義、引用來源、一般健康管理方向、醫師討論問題與限制。表格及數值由程式產生，模型不得改寫；建議只能來自 active、applicable、reviewed 的本地來源。不得輸出診斷、治療、藥物、劑量、分流、急迫性或個人追蹤期限。孕婦、兒童、透析、住院急性情境列為範圍外，回退為限制說明。

## 5. API、保存與隱私

報告使用 `/api/chat` 的 `reportInput` 欄位，另提供非串流報告流程。欄位含 reportId、reportType、sourceKind、applicability、confirmedItems、confirmedConclusions。JSON 實際大小上限 128 KB、200 項與欄位長度限制；未確認項目、原始檔 bytes、任意 URL、fileUrl 或 multipart bypass 一律在扣點前拒絕。

伺服器重新去識別化、比較、挑選 approved/applicable knowledge，再呼叫目前模型；結構化輸出經 schema 驗證。引用不存在、格式錯誤、截斷或模型改寫數值時不顯示部分建議，保留已確認資料並退款。回傳保留 `skillsUsed[]` 相容欄位，另提供實際 guidance/source 資訊。

`chat_messages.analysis_metadata JSONB NULL` 與 assistant message 同次保存，包含去識別化 confirmed data、structured analysis、provider/model、guidance／prompt 版本、selected references、input message ID、時間、`pending_review`、`retrieval_not_performed`。metadata 是 server-owned，使用者確認不等於專業審閱；舊訊息不回填。歷史與匯出使用已保存版本，不重新生成。

報告對話禁止進入既有 save-log 的 R2 自動流程；伺服器依 metadata 拒絕繞過。已授權的對話才可讀取；手動下載走 authenticated owner-checked Markdown endpoint，不需 R2。

## 6. 驗收與發布

測試涵蓋原生 PDF、掃描、照片、混合中英、欄位、多欄、旋轉、模糊、單位與所有失敗 fallback；100% 確認值的 value/unit/range 與列保持一致，保存、重載、下載不變。至少 40 個合成輸出案例由醫療專業人員審閱，不能以自動測試代替。檢查 network 不含原檔、離開後記憶體釋放、log 無臨床內容、無 R2；provider、FHIR、credits、舊歷史、zh/en、權限、migration 與模型失敗皆須驗證。新增模組 unit/integration/component/browser/migration 覆蓋率至少 80%，並執行 lint、typecheck、build。

開發估計 10–15 工程日，另計既有型別問題與醫療審閱。feature flag 預設關閉；staging 順序為 migration 後應用程式。回滾關閉 flag，保留舊歷史與下載。正式驗收紀錄須分開列出已實作、已測試、待醫療審閱與未驗證的真實 OCR／provider 狀態。

## 7. 明確不納入

本版不做自動外部查詢、原始影像醫學解讀、專科風險分數、完整審查後台、自動診斷、治療或急症判斷；未來若需要，另行立項並由醫療專業及法規審查。
