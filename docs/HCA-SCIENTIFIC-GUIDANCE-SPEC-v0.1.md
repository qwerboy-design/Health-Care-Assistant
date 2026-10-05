# HCA 技能指引更版 SPEC v0.1

> 歷史方案（2026-10-02）。本文件保存早期規劃原文；開發以 [v0.2](./HCA-HEALTH-REPORT-ASSISTANT-SPEC-v0.2.md) 為準。兩版衝突時，v0.2 優先。v0.2 使用 `analysis_metadata`，不建立本版規劃的 `guidance_metadata`。

## 1. 目的與可行性

本方案將 K-Dense-AI scientific-agent-skills 的安全設計轉化為 HCA 的本地、版本化指引，協助醫療專業人員整理檢驗、影像報告、病歷摘要與藥物資訊。輸出只能是資料整理、一般性說明、來源與限制，不能是最終診斷或治療決定。

現有 HCA 已有 Anthropic／Ollama provider、對話、Supabase 訊息保存與 R2 匯出，因此可用小至中型改動加入共享提示建構器、版本化來源與訊息 metadata，不需新增模型服務。主要效益是輸出一致、來源可追溯、人工覆核有明確狀態，代價是提示與資料結構、測試及 UI 狀態需要調整。上游技能名稱目前由 HCA 帶入提示，但不代表實際執行上游工具或資料庫。

## 2. 來源與版本

- upstream：K-Dense-AI/scientific-agent-skills v2.72.0，commit `526ebce143bc326f44471554e33d66a19c840360`。
- HCA 指引：`hca-guidance-1.0.0`。
- HCA prompt：`hca-prompt-1.0.0`。
- 每個指引區塊保存 upstream tag、commit、來源 URL、HCA 本地修改與 SHA-256；執行時使用 TypeScript 靜態檔，不在 runtime 下載或執行第三方程式碼。
- 上游臨床技能僅作研究與文件設計參考，不直接對病人資料執行。

## 3. 適用範圍與安全邊界

首批區塊：檢驗報告、正式影像報告文字、病歷時間線、藥物資訊。檢驗只列出原始數值、單位、原報告旗標、缺漏與不確定性；影像只整理正式報告文字，不解讀原始影像；病歷保留來源時間線及衝突；藥物只做一般資訊，不提供個人交互作用、劑量或調藥。

禁止捏造數值、單位、日期、診斷、引用；禁止治療、用藥、劑量、分流、急迫程度與個人追蹤期限。AI 輸出一律標示 pending review；來源、說明、不確定性與未知必須分開。雲端 fallback、未經同意的原檔上傳、對話自動 R2 匯出均不啟用。

## 4. 指引與提示

共用提示建構器依 instant／basic／standard／professional 產生摘要、缺漏、不確定性、來源、人工覆核區塊。安全區塊不可被長度裁切，總提示以 2,500 個 Unicode 字元為上限；保留現有 Anthropic／Ollama streaming 與本地附件路徑，不新增另一套 Ollama stream。

最低安全內容：不是診斷、不能取代專業判斷、只使用已提供資料、未知不得猜測、引用必須來自已核准來源、低信心與衝突需人工確認。metadata 包含指引／prompt 版本、上游來源、區塊 ID、system guidance SHA-256（不含病人資料）、provider/model、UTC 時間、輸入訊息 ID、review status 與 retrieval status。

## 5. API、資料庫與 UI

保留既有 request envelope、credits、對話與 `skillsUsed` 相容欄位；新增 `guidanceApplied`。`chat_messages.guidance_metadata JSONB NULL` 僅供歷史方案，v0.2 改採 `analysis_metadata JSONB NULL`。

metadata 必須由伺服器產生，與 assistant message 同次保存；失敗要退款並回報錯誤，不可靜默遺失。舊訊息保持 null，不回填目前版本。UI 顯示「AI 產出／待人工覆核／未進行外部檢索」，可展開版本、模型、時間與引用；Markdown 匯出保留 metadata。中英文介面不可再暗示執行 skills；log 不含臨床內容。

## 6. 驗證與發布

需要涵蓋 16 個 workload 組合、provider redaction、無雲端 fallback、stream、輸入授權、跨使用者存取、nullable migration、退款、歷史匯出、zh/en、手機 UI，新增模組覆蓋率至少 80%。既有基線測試與 TypeScript 錯誤分開記錄，不宣稱全專案通過。上線順序為 migration、應用程式、feature flag；回滾只關閉新功能並保留歷史。

## 7. 後續限制

不在本版加入外部資料庫查詢、Python OCR、模型訓練、新審查後台或自動臨床決策。任何網路檢索須另立需求、人工提供查詢與審查流程。
