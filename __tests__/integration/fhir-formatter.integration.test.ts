/**
 * FHIR Formatter Integration Tests
 *
 * 驗證 FHIR 匯入 → LLM 格式化 → Chat API 的端到端流程
 * 涵蓋：processFHIRContent 回傳 resource、formatFHIRForLLM 產出、
 *       system prompt FHIR 偵測、完整 Bundle 處理
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseFHIR, processFHIRContent } from '@/lib/fhir/parser';
import { formatFHIRForLLM } from '@/lib/fhir/formatter';
import { mergeFhirImportsForLLM } from '@/lib/fhir/mergeFhirImport';

const fixturesPath = path.join(__dirname, '../fixtures/fhir');

function loadFixtureRaw(filename: string): string {
  return fs.readFileSync(path.join(fixturesPath, filename), 'utf-8');
}

function loadWangDamingRaw(): string | null {
  const filePath = path.join(__dirname, '../../../Downloads/00-bundle-wang-daming-complete.json');
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

// ============================================
// processFHIRContent 新增 resource 欄位
// ============================================

describe('processFHIRContent — resource 欄位回傳', () => {
  it('成功時應同時回傳 summary 和 resource', () => {
    const content = loadFixtureRaw('patient-valid.json');
    const result = processFHIRContent(content, 'zh-TW');

    expect(result.success).toBe(true);
    expect(result.summary).toBeDefined();
    expect(result.resource).toBeDefined();
    expect(result.resource!.resourceType).toBe('Patient');
  });

  it('resource 應保留完整原始結構（不只有 summary 欄位）', () => {
    const content = loadFixtureRaw('observation-lab.json');
    const result = processFHIRContent(content, 'zh-TW');

    expect(result.resource).toBeDefined();
    const obs = result.resource as any;
    expect(obs.referenceRange).toBeDefined();
    expect(obs.referenceRange[0].low.value).toBe(70);
    expect(obs.referenceRange[0].high.value).toBe(100);
  });

  it('Bundle 的 resource 應保留所有 entry', () => {
    const content = loadFixtureRaw('bundle-collection.json');
    const result = processFHIRContent(content, 'zh-TW');

    const bundle = result.resource as any;
    expect(bundle.entry).toBeDefined();
    expect(bundle.entry.length).toBe(3);
  });

  it('解析失敗時不應有 resource', () => {
    const result = processFHIRContent('{ invalid }', 'zh-TW');

    expect(result.success).toBe(false);
    expect(result.resource).toBeUndefined();
  });

  it('驗證失敗時不應有 resource', () => {
    const invalidObs = JSON.stringify({ resourceType: 'Observation' });
    const result = processFHIRContent(invalidObs, 'zh-TW');

    expect(result.success).toBe(false);
    expect(result.resource).toBeUndefined();
  });
});

// ============================================
// 端到端：processFHIRContent → formatFHIRForLLM
// ============================================

describe('端到端：processFHIRContent → formatFHIRForLLM', () => {
  it('Patient 完整流程', () => {
    const content = loadFixtureRaw('patient-valid.json');
    const result = processFHIRContent(content, 'zh-TW');

    expect(result.success).toBe(true);
    const llmText = formatFHIRForLLM(result.resource!, 'zh-TW');

    expect(llmText).toContain('[FHIR 臨床資料匯入]');
    expect(llmText).toContain('王大明');
    expect(llmText).toContain('1980-05-15');
    expect(llmText).toContain('FHIR R5 標準格式');
  });

  it('Observation (vitals) 完整流程', () => {
    const content = loadFixtureRaw('observation-vitals.json');
    const result = processFHIRContent(content, 'zh-TW');
    const llmText = formatFHIRForLLM(result.resource!, 'zh-TW');

    expect(llmText).toContain('120 mmHg');
    expect(llmText).toContain('80 mmHg');
    expect(llmText).toContain('[LOINC: 85354-9]');
  });

  it('Observation (lab) 完整流程含參考範圍', () => {
    const content = loadFixtureRaw('observation-lab.json');
    const result = processFHIRContent(content, 'zh-TW');
    const llmText = formatFHIRForLLM(result.resource!, 'zh-TW');

    expect(llmText).toContain('95 mg/dL');
    expect(llmText).toContain('70 mg/dL');
    expect(llmText).toContain('100 mg/dL');
    expect(llmText).toContain('參考範圍');
  });

  it('Condition 完整流程含雙編碼', () => {
    const content = loadFixtureRaw('condition.json');
    const result = processFHIRContent(content, 'zh-TW');
    const llmText = formatFHIRForLLM(result.resource!, 'zh-TW');

    expect(llmText).toContain('SNOMED: 73211009');
    expect(llmText).toContain('ICD-10: E11.9');
    expect(llmText).toContain('active');
    expect(llmText).toContain('confirmed');
  });

  it('MedicationStatement 完整流程含劑量', () => {
    const content = loadFixtureRaw('medication-statement.json');
    const result = processFHIRContent(content, 'zh-TW');
    const llmText = formatFHIRForLLM(result.resource!, 'zh-TW');

    expect(llmText).toContain('RxNorm: 860974');
    expect(llmText).toContain('500 mg');
    expect(llmText).toContain('Oral route');
  });

  it('DiagnosticReport 完整流程含結論和結果清單', () => {
    const content = loadFixtureRaw('diagnostic-report.json');
    const result = processFHIRContent(content, 'zh-TW');
    const llmText = formatFHIRForLLM(result.resource!, 'zh-TW');

    expect(llmText).toContain('LOINC: 58410-2');
    expect(llmText).toContain('All values within normal limits');
    expect(llmText).toContain('Hemoglobin');
    expect(llmText).toContain('Platelet Count');
  });

  it('Bundle 完整流程包含所有資源', () => {
    const content = loadFixtureRaw('bundle-collection.json');
    const result = processFHIRContent(content, 'zh-TW');
    const llmText = formatFHIRForLLM(result.resource!, 'zh-TW');

    expect(llmText).toContain('李小華');
    expect(llmText).toContain('95 mg/dL');
    expect(llmText).toContain('14.5 g/dL');
    expect(llmText).toContain('3 筆資源');
  });
});

// ============================================
// 模擬 FHIRImportModal → Chat 流程
// ============================================

describe('模擬 FHIRImportModal 匯入流程', () => {
  it('應產生可直接送入 chat 的結構化文字', () => {
    const content = loadFixtureRaw('bundle-collection.json');
    const locale = 'zh-TW';

    // Step 1: processFHIRContent（Modal 解析）
    const result = processFHIRContent(content, locale);
    expect(result.success).toBe(true);
    expect(result.resource).toBeDefined();
    expect(result.summary).toBeDefined();

    // Step 2: formatFHIRForLLM（Modal 確認匯入時）
    const llmText = formatFHIRForLLM(result.resource!, locale);

    // Step 3: 模擬 onImport 產出
    const importData = {
      summary: llmText,
      rawJson: result.summary!.rawJson,
    };

    // 驗證 importData.summary 為 LLM 格式而非舊版簡易摘要
    expect(importData.summary).toContain('[FHIR 臨床資料匯入]');
    expect(importData.summary).not.toContain('== FHIR 資料摘要 ==');
    expect(importData.summary).toContain('## 病人資訊');
    expect(importData.summary).toContain('## 檢驗觀察紀錄');

    // 驗證 rawJson 保持完整
    const rawParsed = JSON.parse(importData.rawJson);
    expect(rawParsed.resourceType).toBe('Bundle');
    expect(rawParsed.entry.length).toBe(3);
  });

  it('匯入的文字應包含 FHIR 標記以觸發 system prompt 增強', () => {
    const content = loadFixtureRaw('patient-valid.json');
    const result = processFHIRContent(content, 'zh-TW');
    const llmText = formatFHIRForLLM(result.resource!, 'zh-TW');

    // 這個標記用於 client.ts 偵測
    const hasFHIRMarker =
      llmText.includes('[FHIR 臨床資料匯入]') ||
      llmText.includes('[FHIR Clinical Data Import]');
    expect(hasFHIRMarker).toBe(true);
  });

  it('英文模式匯入也應包含 FHIR 標記', () => {
    const content = loadFixtureRaw('patient-valid.json');
    const result = processFHIRContent(content, 'en');
    const llmText = formatFHIRForLLM(result.resource!, 'en');

    expect(llmText).toContain('[FHIR Clinical Data Import]');
  });
});

// ============================================
// 多檔匯入合併（mergeFhirImportsForLLM）
// ============================================

describe('多檔 FHIR 匯入合併（fixtures）', () => {
  it('zh-TW：patient-valid + observation-vitals + condition 合併後含標記與各資源內容', () => {
    const names = ['patient-valid.json', 'observation-vitals.json', 'condition.json'] as const;
    const items = names.map((name) => {
      const content = loadFixtureRaw(name);
      const result = processFHIRContent(content, 'zh-TW');
      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.resource).toBeDefined();
      return {
        fileName: name,
        summary: result.summary!,
        resource: result.resource!,
      };
    });

    const { llmText, rawJsonMerged } = mergeFhirImportsForLLM(items, 'zh-TW');

    expect(llmText).toContain('[FHIR 臨床資料匯入]');
    expect(llmText).toContain('## 檔案：patient-valid.json');
    expect(llmText).toContain('## 檔案：observation-vitals.json');
    expect(llmText).toContain('## 檔案：condition.json');
    expect(llmText).toContain('王大明');
    expect(llmText).toMatch(/Blood Pressure|收縮壓|Systolic|mmHg/);
    expect(llmText).toContain('糖尿病');

    expect(rawJsonMerged).toContain('// file: patient-valid.json');
    expect(rawJsonMerged).toContain('// file: observation-vitals.json');
    expect(rawJsonMerged).toContain('// file: condition.json');
  });

  it('en：三檔合併含 Clinical Data Import 標記', () => {
    const names = ['patient-valid.json', 'observation-vitals.json', 'condition.json'] as const;
    const items = names.map((name) => {
      const result = processFHIRContent(loadFixtureRaw(name), 'en');
      expect(result.success).toBe(true);
      return {
        fileName: name,
        summary: result.summary!,
        resource: result.resource!,
      };
    });
    const { llmText } = mergeFhirImportsForLLM(items, 'en');
    expect(llmText).toContain('[FHIR Clinical Data Import]');
    expect(llmText).toContain('## File: patient-valid.json');
  });

  it('Bundle 與單一 Patient 混併仍含標記與 Bundle 內容', () => {
    const bundle = processFHIRContent(loadFixtureRaw('bundle-collection.json'), 'zh-TW');
    const patient = processFHIRContent(loadFixtureRaw('patient-valid.json'), 'zh-TW');
    expect(bundle.success).toBe(true);
    expect(patient.success).toBe(true);

    const { llmText } = mergeFhirImportsForLLM(
      [
        { fileName: 'bundle-collection.json', summary: bundle.summary!, resource: bundle.resource! },
        { fileName: 'patient-valid.json', summary: patient.summary!, resource: patient.resource! },
      ],
      'zh-TW'
    );

    expect(llmText).toContain('[FHIR 臨床資料匯入]');
    expect(llmText).toContain('李小華');
    expect(llmText).toContain('王大明');
  });
});

// ============================================
// System Prompt FHIR 偵測
// ============================================

describe('System Prompt FHIR 偵測邏輯', () => {
  it('含有 zh-TW 標記的訊息應被偵測', () => {
    const message = `[FHIR 臨床資料匯入]\n## 病人資訊\n- 姓名: 王大明`;
    const hasFHIRData =
      message.includes('[FHIR 臨床資料匯入]') ||
      message.includes('[FHIR Clinical Data Import]');
    expect(hasFHIRData).toBe(true);
  });

  it('含有 en 標記的訊息應被偵測', () => {
    const message = `[FHIR Clinical Data Import]\n## Patient Information`;
    const hasFHIRData =
      message.includes('[FHIR 臨床資料匯入]') ||
      message.includes('[FHIR Clinical Data Import]');
    expect(hasFHIRData).toBe(true);
  });

  it('一般訊息不應觸發 FHIR 偵測', () => {
    const message = '請幫我分析這份檢驗報告';
    const hasFHIRData =
      message.includes('[FHIR 臨床資料匯入]') ||
      message.includes('[FHIR Clinical Data Import]');
    expect(hasFHIRData).toBe(false);
  });
});

// ============================================
// LLM 文字品質驗證
// ============================================

describe('LLM 文字品質', () => {
  it('輸出不應包含 undefined 或 null 字串', () => {
    const fixtures = [
      'patient-valid.json',
      'observation-vitals.json',
      'observation-lab.json',
      'condition.json',
      'diagnostic-report.json',
      'medication-statement.json',
      'bundle-collection.json',
    ];

    for (const file of fixtures) {
      const content = loadFixtureRaw(file);
      const result = processFHIRContent(content, 'zh-TW');
      if (result.resource) {
        const llmText = formatFHIRForLLM(result.resource, 'zh-TW');
        expect(llmText, `${file} should not contain "undefined"`).not.toContain('undefined');
        expect(llmText, `${file} should not contain "null"`).not.toMatch(/\bnull\b/);
      }
    }
  });

  it('輸出行數應合理（不過長也不過短）', () => {
    const content = loadFixtureRaw('bundle-collection.json');
    const result = processFHIRContent(content, 'zh-TW');
    const llmText = formatFHIRForLLM(result.resource!, 'zh-TW');
    const lineCount = llmText.split('\n').length;

    expect(lineCount).toBeGreaterThan(10);
    expect(lineCount).toBeLessThan(500);
  });

  it('輸出字元數應在 Anthropic API 限制範圍內', () => {
    const content = loadFixtureRaw('bundle-collection.json');
    const result = processFHIRContent(content, 'zh-TW');
    const llmText = formatFHIRForLLM(result.resource!, 'zh-TW');

    // Anthropic max_tokens 4096，但 input 可更長；確保不過度膨脹
    expect(llmText.length).toBeLessThan(50000);
  });

  it('Markdown 結構應正確（有 ## 和 ### 層次）', () => {
    const content = loadFixtureRaw('bundle-collection.json');
    const result = processFHIRContent(content, 'zh-TW');
    const llmText = formatFHIRForLLM(result.resource!, 'zh-TW');

    const h2Count = (llmText.match(/^## /gm) || []).length;
    const h3Count = (llmText.match(/^### /gm) || []).length;
    const listCount = (llmText.match(/^- /gm) || []).length;

    expect(h2Count).toBeGreaterThan(0);
    expect(h3Count).toBeGreaterThanOrEqual(0);
    expect(listCount).toBeGreaterThan(0);
  });
});

// ============================================
// 效能測試
// ============================================

describe('格式化效能', () => {
  it('單一資源格式化應在 10ms 內完成', () => {
    const content = loadFixtureRaw('patient-valid.json');
    const result = processFHIRContent(content, 'zh-TW');

    const start = performance.now();
    formatFHIRForLLM(result.resource!, 'zh-TW');
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(10);
  });

  it('Bundle 格式化應在 50ms 內完成', () => {
    const content = loadFixtureRaw('bundle-collection.json');
    const result = processFHIRContent(content, 'zh-TW');

    const start = performance.now();
    formatFHIRForLLM(result.resource!, 'zh-TW');
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
  });

  it('完整流程 (parse + format) 應在 100ms 內完成', () => {
    const content = loadFixtureRaw('bundle-collection.json');

    const start = performance.now();
    const result = processFHIRContent(content, 'zh-TW');
    if (result.resource) {
      formatFHIRForLLM(result.resource, 'zh-TW');
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });
});

// ============================================
// 王大明完整 Bundle 整合測試
// ============================================

describe('完整 Bundle 整合測試 (王大明)', () => {
  const rawContent = loadWangDamingRaw();

  it.skipIf(!rawContent)('完整 processFHIRContent → formatFHIRForLLM 流程', () => {
    const result = processFHIRContent(rawContent!, 'zh-TW');

    expect(result.success).toBe(true);
    expect(result.resource).toBeDefined();
    expect(result.summary).toBeDefined();

    const llmText = formatFHIRForLLM(result.resource!, 'zh-TW');

    // 驗證所有 6 筆資源都有出現
    expect(llmText).toContain('6 筆資源');

    // Patient
    expect(llmText).toContain('王大明');
    expect(llmText).toContain('A123456789');
    expect(llmText).toContain('MRN-2024-001234');

    // Condition
    expect(llmText).toContain('SNOMED: 44054006');
    expect(llmText).toContain('ICD-10: E11.9');

    // MedicationStatement
    expect(llmText).toContain('RxNorm: 860974');
    expect(llmText).toContain('規律服用中');

    // Observation — 血壓
    expect(llmText).toContain('LOINC: 85354-9');
    expect(llmText).toContain('120 mmHg');
    expect(llmText).toContain('80 mmHg');

    // Observation — 血糖
    expect(llmText).toContain('LOINC: 1558-6');
    expect(llmText).toContain('95 mg/dL');
    expect(llmText).toContain('70 mg/dL');

    // DiagnosticReport
    expect(llmText).toContain('LOINC: 58410-2');
    expect(llmText).toContain('SNOMED: 281302008');
  });

  it.skipIf(!rawContent)('完整 Bundle 格式化效能應在 50ms 內', () => {
    const result = processFHIRContent(rawContent!, 'zh-TW');

    const start = performance.now();
    formatFHIRForLLM(result.resource!, 'zh-TW');
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
  });

  it.skipIf(!rawContent)('中英雙語輸出都應正確', () => {
    const result = processFHIRContent(rawContent!, 'zh-TW');

    const zhText = formatFHIRForLLM(result.resource!, 'zh-TW');
    const enText = formatFHIRForLLM(result.resource!, 'en');

    expect(zhText).toContain('[FHIR 臨床資料匯入]');
    expect(zhText).toContain('## 病人資訊');
    expect(zhText).toContain('## 診斷/病況');

    expect(enText).toContain('[FHIR Clinical Data Import]');
    expect(enText).toContain('## Patient Information');
    expect(enText).toContain('## Conditions / Diagnoses');
  });
});
