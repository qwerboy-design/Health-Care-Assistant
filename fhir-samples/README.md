# FHIR 測試檔案使用指南

此目錄包含符合 **HL7 FHIR R5** 規範的測試檔案，可直接用於測試 Health Care Assistant 的 FHIR 匯入功能。

---

## 📁 測試檔案清單

### 基礎資源測試

1. **01-patient-complete.json**
   - **資源類型**: Patient（病人）
   - **說明**: 完整的病人資料，包含身份證號、病歷號、聯絡方式、地址、緊急聯絡人
   - **適用場景**: 測試 Patient 資源的完整欄位解析
   - **檔案大小**: ~2 KB

2. **02-observation-blood-pressure.json**
   - **資源類型**: Observation（觀察/檢驗）
   - **說明**: 生命徵象 - 血壓測量（包含收縮壓、舒張壓、心率）
   - **適用場景**: 測試複合數值的 Observation
   - **檔案大小**: ~1.5 KB

3. **03-observation-glucose.json**
   - **資源類型**: Observation
   - **說明**: 實驗室檢驗 - 空腹血糖
   - **適用場景**: 測試單一數值的 Observation
   - **檔案大小**: ~1 KB

### 複合資源測試

4. **04-bundle-health-checkup.json**
   - **資源類型**: Bundle（資源集合）
   - **說明**: 健康檢查資料包，包含 1 個 Patient + 4 個 Observation（血壓、血糖、血紅素、膽固醇）
   - **適用場景**: 測試 Bundle 解析與資源統計功能
   - **檔案大小**: ~4 KB

5. **05-condition-diabetes.json**
   - **資源類型**: Condition（疾病診斷）
   - **說明**: 第二型糖尿病診斷記錄
   - **適用場景**: 測試疾病診斷資料的解析
   - **檔案大小**: ~1.5 KB

6. **06-diagnostic-report-cbc.json**
   - **資源類型**: DiagnosticReport（診斷報告）
   - **說明**: 全血球計數 (CBC) 檢驗報告
   - **適用場景**: 測試診斷報告的解析與結論顯示
   - **檔案大小**: ~2 KB

7. **07-medication-statement-metformin.json**
   - **資源類型**: MedicationStatement（用藥記錄）
   - **說明**: Metformin（降血糖藥物）用藥記錄，包含完整劑量說明
   - **適用場景**: 測試用藥記錄的解析
   - **檔案大小**: ~2 KB

### 完整臨床場景

8. **08-bundle-diabetes-patient-full.json**
   - **資源類型**: Bundle
   - **說明**: 糖尿病病人的完整臨床記錄，包含：
     - 1 個 Patient
     - 2 個 Condition（糖尿病、高血壓）
     - 2 個 MedicationStatement（Metformin、Amlodipine）
     - 3 個 Observation（血糖、HbA1c、血壓）
   - **適用場景**: 測試複雜的多資源 Bundle
   - **檔案大小**: ~5 KB

---

## 🧪 測試步驟

### 方法 1: 在 Web UI 測試

1. 啟動開發伺服器：`npm run dev`
2. 開啟瀏覽器訪問 Chat 頁面
3. 點擊紫色「匯入 FHIR」按鈕
4. 選擇任一測試檔案上傳
5. 查看摘要預覽
6. 點擊「確認匯入」
7. 觀察摘要是否正確填入輸入框

### 方法 2: 使用自動化測試

```bash
# 執行所有 FHIR 測試
npm test -- __tests__/lib/fhir/ __tests__/components/fhir/ --run

# 執行整合測試
npm test -- __tests__/integration/fhir.integration.test.ts --run
```

---

## 📊 預期測試結果

### 01-patient-complete.json

**預期摘要顯示**:
```
== FHIR 資料摘要 ==
資源類型: 病人
識別碼: A123456789
姓名: 王大明
性別: 男
出生日期: 1980-05-15
電話: 0912-345-678
地址: 台北市 大安區
```

### 02-observation-blood-pressure.json

**預期摘要顯示**:
```
== FHIR 資料摘要 ==
資源類型: 觀察/檢驗
狀態: final
代碼: Blood pressure panel with all children optional
類別: Vital Signs
生效日期: 2026/03/26 10:30
Systolic blood pressure: 120 mmHg
Diastolic blood pressure: 80 mmHg
Heart rate: 72 /min
```

### 04-bundle-health-checkup.json

**預期摘要顯示**:
```
== FHIR 資料摘要 ==
資源類型: 資源集合
Bundle 類型: collection
時間戳記: 2026/03/26 11:00
資源數量: 5
---
資源統計:
  - Patient: 1
  - Observation: 4
```

### 08-bundle-diabetes-patient-full.json

**預期摘要顯示**:
```
== FHIR 資料摘要 ==
資源類型: 資源集合
Bundle 類型: collection
時間戳記: 2026/03/26 12:00
資源數量: 8
---
資源統計:
  - Patient: 1
  - Condition: 2
  - MedicationStatement: 2
  - Observation: 3
```

---

## ✅ 驗證檢查清單

測試每個檔案時，請確認：

- [ ] 檔案可以成功上傳
- [ ] 解析狀態顯示「解析成功」
- [ ] 資源類型正確顯示（中英文）
- [ ] 摘要資訊完整且易讀
- [ ] 可以查看原始 JSON
- [ ] 點擊「確認匯入」後摘要正確填入輸入框
- [ ] 可以編輯匯入的摘要
- [ ] 可以成功發送給 AI 分析

---

## 🔍 錯誤測試

如果您想測試錯誤處理，可以手動建立以下測試檔案：

### 缺少 resourceType

```json
{
  "id": "invalid-001",
  "name": [{"family": "Test"}]
}
```

**預期結果**: 顯示錯誤「非有效的 FHIR 資源（缺少 resourceType 欄位）」

### JSON 格式錯誤

```json
{
  "resourceType": "Patient",
  "name": [{"family": "Broken"
}
```

**預期結果**: 顯示錯誤「檔案格式錯誤，無法解析」

---

## 📖 FHIR 資源說明

### Patient（病人）
- 病人基本資料：姓名、性別、出生日期、聯絡方式、地址
- 識別碼：身份證號、病歷號
- 緊急聯絡人

### Observation（觀察/檢驗）
- 生命徵象：血壓、心率、體溫、呼吸速率
- 實驗室檢驗：血糖、血紅素、膽固醇、肝腎功能
- 支援複合數值（如血壓的收縮壓/舒張壓）

### Condition（疾病診斷）
- 疾病診斷記錄
- 臨床狀態（active/inactive）
- 驗證狀態（confirmed/provisional）
- 發病日期、嚴重程度

### DiagnosticReport（診斷報告）
- 檢驗報告彙總
- 包含多個 Observation 結果
- 報告結論與建議

### MedicationStatement（用藥記錄）
- 藥物名稱、劑量
- 服用頻率、途徑
- 用藥原因、遵從性

### Bundle（資源集合）
- 包含多個 FHIR 資源
- 類型：collection、searchset、document 等
- 自動統計各類型資源數量

---

## 🌐 參考資料

- [HL7 FHIR R5 官方文件](https://hl7.org/fhir/)
- [FHIR Patient Resource](https://hl7.org/fhir/patient.html)
- [FHIR Observation Resource](https://hl7.org/fhir/observation.html)
- [FHIR Bundle Resource](https://hl7.org/fhir/bundle.html)
- [LOINC 檢驗代碼](https://loinc.org/)
- [SNOMED CT 臨床術語](https://www.snomed.org/)

---

## 💡 使用建議

1. **從簡單開始**: 先測試單一 Patient 或 Observation
2. **測試 Bundle**: 使用 Bundle 測試多資源場景
3. **測試錯誤處理**: 上傳格式錯誤的檔案
4. **測試多語言**: 切換系統語言測試摘要顯示
5. **測試 AI 分析**: 匯入後發送給 AI，觀察分析結果

---

**建立日期**: 2026-03-26  
**FHIR 版本**: R5  
**檔案狀態**: 已驗證並通過測試
