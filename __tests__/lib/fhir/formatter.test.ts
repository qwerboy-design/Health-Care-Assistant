/**
 * FHIR Formatter Unit Tests
 *
 * 測試 FHIR → LLM 結構化臨床文字的轉換功能
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { formatFHIRForLLM } from '@/lib/fhir/formatter';
import { parseFHIR } from '@/lib/fhir/parser';
import type {
  FHIRResource,
  FHIRPatient,
  FHIRObservation,
  FHIRBundle,
  FHIRCondition,
  FHIRDiagnosticReport,
  FHIRMedicationStatement,
} from '@/lib/fhir/types';

const fixturesPath = path.join(__dirname, '../../fixtures/fhir');

function loadFixture(filename: string): FHIRResource {
  const content = fs.readFileSync(path.join(fixturesPath, filename), 'utf-8');
  const result = parseFHIR(content);
  if (!result.success || !result.data) {
    throw new Error(`Failed to parse fixture ${filename}: ${result.error}`);
  }
  return result.data;
}

function loadWangDaming(): FHIRResource | null {
  const filePath = path.join(__dirname, '../../../../Downloads/00-bundle-wang-daming-complete.json');
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result = parseFHIR(content);
    return result.success ? result.data! : null;
  } catch {
    return null;
  }
}

// ============================================
// 共通結構測試
// ============================================

describe('formatFHIRForLLM — 共通結構', () => {
  it('所有輸出都應包含 header tag 和 footer', () => {
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
      const resource = loadFixture(file);
      const output = formatFHIRForLLM(resource, 'zh-TW');
      expect(output, `${file} should contain zh-TW header`).toContain('[FHIR 臨床資料匯入]');
      expect(output, `${file} should contain zh-TW footer`).toContain('FHIR R5 標準格式');
    }
  });

  it('英文模式應使用英文 header/footer', () => {
    const resource = loadFixture('patient-valid.json');
    const output = formatFHIRForLLM(resource, 'en');
    expect(output).toContain('[FHIR Clinical Data Import]');
    expect(output).toContain('FHIR R5 standard format');
  });
});

// ============================================
// Patient 格式化
// ============================================

describe('formatFHIRForLLM — Patient', () => {
  it('應包含病人基本資訊', () => {
    const patient = loadFixture('patient-valid.json');
    const output = formatFHIRForLLM(patient, 'zh-TW');

    expect(output).toContain('## 病人資訊');
    expect(output).toContain('姓名: 王大明');
    expect(output).toContain('性別: 男');
    expect(output).toContain('出生日期: 1980-05-15');
  });

  it('應包含識別碼', () => {
    const patient = loadFixture('patient-valid.json');
    const output = formatFHIRForLLM(patient, 'zh-TW');

    expect(output).toContain('A123456789');
  });

  it('應包含聯絡資訊', () => {
    const patient = loadFixture('patient-valid.json');
    const output = formatFHIRForLLM(patient, 'zh-TW');

    expect(output).toContain('0912-345-678');
    expect(output).toContain('wang.daming@example.com');
  });

  it('應包含婚姻狀態', () => {
    const patient = loadFixture('patient-valid.json');
    const output = formatFHIRForLLM(patient, 'zh-TW');

    expect(output).toContain('婚姻狀態');
    expect(output).toContain('Married');
  });

  it('最小化 Patient 也應正常格式化', () => {
    const patient = loadFixture('patient-minimal.json');
    const output = formatFHIRForLLM(patient, 'zh-TW');

    expect(output).toContain('## 病人資訊');
    expect(output).toContain('[FHIR 臨床資料匯入]');
  });

  it('英文模式應使用英文標籤', () => {
    const patient = loadFixture('patient-valid.json');
    const output = formatFHIRForLLM(patient, 'en');

    expect(output).toContain('## Patient Information');
    expect(output).toContain('Name:');
    expect(output).toContain('Gender: Male');
    expect(output).toContain('Date of Birth: 1980-05-15');
  });
});

// ============================================
// Observation — Vital Signs
// ============================================

describe('formatFHIRForLLM — Observation (Vital Signs)', () => {
  it('應包含血壓 component 分項', () => {
    const obs = loadFixture('observation-vitals.json');
    const output = formatFHIRForLLM(obs, 'zh-TW');

    expect(output).toContain('## 檢驗觀察紀錄');
    expect(output).toContain('組成項目');
    expect(output).toContain('120 mmHg');
    expect(output).toContain('80 mmHg');
  });

  it('應包含 LOINC 編碼', () => {
    const obs = loadFixture('observation-vitals.json');
    const output = formatFHIRForLLM(obs, 'zh-TW');

    expect(output).toContain('[LOINC: 85354-9]');
    expect(output).toContain('[LOINC: 8480-6]');
    expect(output).toContain('[LOINC: 8462-4]');
  });

  it('應包含類別和狀態', () => {
    const obs = loadFixture('observation-vitals.json');
    const output = formatFHIRForLLM(obs, 'zh-TW');

    expect(output).toContain('vital-signs');
    expect(output).toContain('final');
  });

  it('應包含執行者', () => {
    const obs = loadFixture('observation-vitals.json');
    const output = formatFHIRForLLM(obs, 'zh-TW');

    expect(output).toContain('Dr. Chen');
  });
});

// ============================================
// Observation — Laboratory
// ============================================

describe('formatFHIRForLLM — Observation (Laboratory)', () => {
  it('應包含數值和參考範圍', () => {
    const obs = loadFixture('observation-lab.json');
    const output = formatFHIRForLLM(obs, 'zh-TW');

    expect(output).toContain('95 mg/dL');
    expect(output).toContain('參考範圍');
    expect(output).toContain('70 mg/dL');
    expect(output).toContain('100 mg/dL');
  });

  it('應包含 LOINC 編碼', () => {
    const obs = loadFixture('observation-lab.json');
    const output = formatFHIRForLLM(obs, 'zh-TW');

    expect(output).toContain('[LOINC: 2339-0]');
  });

  it('應包含 laboratory 類別', () => {
    const obs = loadFixture('observation-lab.json');
    const output = formatFHIRForLLM(obs, 'zh-TW');

    expect(output).toContain('laboratory');
  });
});

// ============================================
// Condition
// ============================================

describe('formatFHIRForLLM — Condition', () => {
  it('應包含診斷名稱與雙編碼', () => {
    const condition = loadFixture('condition.json');
    const output = formatFHIRForLLM(condition, 'zh-TW');

    expect(output).toContain('## 診斷/病況');
    expect(output).toContain('第二型糖尿病');
    expect(output).toContain('[SNOMED: 73211009');
    expect(output).toContain('ICD-10: E11.9');
  });

  it('應包含臨床狀態和驗證狀態', () => {
    const condition = loadFixture('condition.json');
    const output = formatFHIRForLLM(condition, 'zh-TW');

    expect(output).toContain('臨床狀態');
    expect(output).toContain('active');
    expect(output).toContain('驗證狀態');
    expect(output).toContain('confirmed');
  });

  it('應包含嚴重程度和 SNOMED 編碼', () => {
    const condition = loadFixture('condition.json');
    const output = formatFHIRForLLM(condition, 'zh-TW');

    expect(output).toContain('嚴重程度');
    expect(output).toContain('Moderate');
    expect(output).toContain('SNOMED: 6736007');
  });

  it('應包含發病日期和紀錄日期', () => {
    const condition = loadFixture('condition.json');
    const output = formatFHIRForLLM(condition, 'zh-TW');

    expect(output).toContain('2020-01-15');
    expect(output).toContain('2020-01-20');
  });
});

// ============================================
// MedicationStatement
// ============================================

describe('formatFHIRForLLM — MedicationStatement', () => {
  it('應包含藥物名稱與 RxNorm 編碼', () => {
    const med = loadFixture('medication-statement.json');
    const output = formatFHIRForLLM(med, 'zh-TW');

    expect(output).toContain('## 用藥紀錄');
    expect(output).toContain('Metformin');
    expect(output).toContain('[RxNorm: 860974]');
  });

  it('應包含劑量資訊', () => {
    const med = loadFixture('medication-statement.json');
    const output = formatFHIRForLLM(med, 'zh-TW');

    expect(output).toContain('500mg twice daily with meals');
    expect(output).toContain('500 mg');
  });

  it('應包含給藥途徑', () => {
    const med = loadFixture('medication-statement.json');
    const output = formatFHIRForLLM(med, 'zh-TW');

    expect(output).toContain('Oral route');
  });

  it('應包含用藥原因', () => {
    const med = loadFixture('medication-statement.json');
    const output = formatFHIRForLLM(med, 'zh-TW');

    expect(output).toContain('Diabetes mellitus');
    expect(output).toContain('SNOMED: 73211009');
  });

  it('應包含狀態', () => {
    const med = loadFixture('medication-statement.json');
    const output = formatFHIRForLLM(med, 'zh-TW');

    expect(output).toContain('recorded');
  });
});

// ============================================
// DiagnosticReport
// ============================================

describe('formatFHIRForLLM — DiagnosticReport', () => {
  it('應包含報告名稱和 LOINC 編碼', () => {
    const report = loadFixture('diagnostic-report.json');
    const output = formatFHIRForLLM(report, 'zh-TW');

    expect(output).toContain('## 診斷報告');
    expect(output).toContain('Complete Blood Count');
    expect(output).toContain('[LOINC: 58410-2]');
  });

  it('應包含結論', () => {
    const report = loadFixture('diagnostic-report.json');
    const output = formatFHIRForLLM(report, 'zh-TW');

    expect(output).toContain('結論');
    expect(output).toContain('All values within normal limits');
  });

  it('應包含結果項目清單', () => {
    const report = loadFixture('diagnostic-report.json');
    const output = formatFHIRForLLM(report, 'zh-TW');

    expect(output).toContain('Hemoglobin');
    expect(output).toContain('White Blood Cell Count');
    expect(output).toContain('Platelet Count');
  });

  it('應包含執行單位', () => {
    const report = loadFixture('diagnostic-report.json');
    const output = formatFHIRForLLM(report, 'zh-TW');

    expect(output).toContain('Central Laboratory');
  });
});

// ============================================
// Bundle
// ============================================

describe('formatFHIRForLLM — Bundle', () => {
  it('應包含 Bundle 元資料', () => {
    const bundle = loadFixture('bundle-collection.json');
    const output = formatFHIRForLLM(bundle, 'zh-TW');

    expect(output).toContain('FHIR R5 Bundle (collection)');
    expect(output).toContain('3 筆資源');
  });

  it('Bundle 中的 Patient 應放在最前面', () => {
    const bundle = loadFixture('bundle-collection.json');
    const output = formatFHIRForLLM(bundle, 'zh-TW');

    const patientIdx = output.indexOf('## 病人資訊');
    const obsIdx = output.indexOf('## 檢驗觀察紀錄');

    expect(patientIdx).toBeGreaterThan(-1);
    expect(obsIdx).toBeGreaterThan(-1);
    expect(patientIdx).toBeLessThan(obsIdx);
  });

  it('應包含 Bundle 內各資源的內容', () => {
    const bundle = loadFixture('bundle-collection.json');
    const output = formatFHIRForLLM(bundle, 'zh-TW');

    expect(output).toContain('李小華');
    expect(output).toContain('95 mg/dL');
    expect(output).toContain('14.5 g/dL');
  });

  it('英文模式也應正確', () => {
    const bundle = loadFixture('bundle-collection.json');
    const output = formatFHIRForLLM(bundle, 'en');

    expect(output).toContain('## Patient Information');
    expect(output).toContain('## Observations / Lab Results');
    expect(output).toContain('3 resources');
  });
});

// ============================================
// 完整 Bundle 測試 (00-bundle-wang-daming-complete.json)
// ============================================

describe('formatFHIRForLLM — 完整 Bundle (王大明)', () => {
  const resource = loadWangDaming();

  it.skipIf(!resource)('應包含完整 header 與資源計數', () => {
    const output = formatFHIRForLLM(resource!, 'zh-TW');
    expect(output).toContain('[FHIR 臨床資料匯入]');
    expect(output).toContain('6 筆資源');
  });

  it.skipIf(!resource)('應包含病人完整資訊', () => {
    const output = formatFHIRForLLM(resource!, 'zh-TW');
    expect(output).toContain('王大明');
    expect(output).toContain('A123456789');
    expect(output).toContain('MRN-2024-001234');
    expect(output).toContain('0912-345-678');
    expect(output).toContain('已婚');
    expect(output).toContain('王小華');
  });

  it.skipIf(!resource)('應包含糖尿病診斷與雙編碼', () => {
    const output = formatFHIRForLLM(resource!, 'zh-TW');
    expect(output).toContain('第二型糖尿病');
    expect(output).toContain('SNOMED: 44054006');
    expect(output).toContain('ICD-10: E11.9');
    expect(output).toContain('中度');
  });

  it.skipIf(!resource)('應包含 Metformin 用藥紀錄', () => {
    const output = formatFHIRForLLM(resource!, 'zh-TW');
    expect(output).toContain('Metformin');
    expect(output).toContain('RxNorm: 860974');
    expect(output).toContain('500');
    expect(output).toContain('口服');
    expect(output).toContain('規律服用中');
  });

  it.skipIf(!resource)('應包含血壓 components', () => {
    const output = formatFHIRForLLM(resource!, 'zh-TW');
    expect(output).toContain('收縮壓');
    expect(output).toContain('120 mmHg');
    expect(output).toContain('舒張壓');
    expect(output).toContain('80 mmHg');
    expect(output).toContain('心率');
    expect(output).toContain('72 beats/minute');
    expect(output).toContain('LOINC: 85354-9');
  });

  it.skipIf(!resource)('應包含空腹血糖與參考範圍', () => {
    const output = formatFHIRForLLM(resource!, 'zh-TW');
    expect(output).toContain('空腹血糖');
    expect(output).toContain('95 mg/dL');
    expect(output).toContain('70 mg/dL');
    expect(output).toContain('100 mg/dL');
    expect(output).toContain('LOINC: 1558-6');
  });

  it.skipIf(!resource)('應包含 CBC 報告', () => {
    const output = formatFHIRForLLM(resource!, 'zh-TW');
    expect(output).toContain('全血球計數');
    expect(output).toContain('LOINC: 58410-2');
    expect(output).toContain('血紅素 14.5 g/dL');
    expect(output).toContain('白血球計數');
    expect(output).toContain('SNOMED: 281302008');
  });

  it.skipIf(!resource)('資源排序應為 Patient → Condition → Medication → Observation → Report', () => {
    const output = formatFHIRForLLM(resource!, 'zh-TW');
    const patientIdx = output.indexOf('## 病人資訊');
    const conditionIdx = output.indexOf('## 診斷/病況');
    const medIdx = output.indexOf('## 用藥紀錄');
    const obsIdx = output.indexOf('## 檢驗觀察紀錄');
    const reportIdx = output.indexOf('## 診斷報告');

    expect(patientIdx).toBeLessThan(conditionIdx);
    expect(conditionIdx).toBeLessThan(medIdx);
    expect(medIdx).toBeLessThan(obsIdx);
    expect(obsIdx).toBeLessThan(reportIdx);
  });

  it.skipIf(!resource)('應包含臨床筆記', () => {
    const output = formatFHIRForLLM(resource!, 'zh-TW');
    expect(output).toContain('HbA1c 7.8%');
    expect(output).toContain('病人耐受性良好');
    expect(output).toContain('病人休息15分鐘後測量');
    expect(output).toContain('病人已禁食8小時');
  });
});

// ============================================
// 邊界情況
// ============================================

describe('formatFHIRForLLM — 邊界情況', () => {
  it('未知的 resourceType 應使用 generic fallback', () => {
    const resource: FHIRResource = {
      resourceType: 'Encounter',
      id: 'enc-001',
    };
    const output = formatFHIRForLLM(resource, 'zh-TW');

    expect(output).toContain('[FHIR 臨床資料匯入]');
    expect(output).toContain('Encounter');
    expect(output).toContain('enc-001');
  });

  it('空的 Bundle 應正常處理', () => {
    const bundle: FHIRResource = {
      resourceType: 'Bundle',
      id: 'empty',
      type: 'collection',
      entry: [],
    } as any;
    const output = formatFHIRForLLM(bundle, 'zh-TW');

    expect(output).toContain('[FHIR 臨床資料匯入]');
    expect(output).toContain('0 筆資源');
  });

  it('Observation 只有 valueString 時應正常顯示', () => {
    const obs: FHIRResource = {
      resourceType: 'Observation',
      id: 'obs-text',
      status: 'final',
      code: {
        coding: [{ system: 'http://loinc.org', code: '8310-5', display: 'Body temperature' }],
      },
      valueString: 'Normal',
    } as any;
    const output = formatFHIRForLLM(obs, 'zh-TW');

    expect(output).toContain('Normal');
    expect(output).toContain('LOINC: 8310-5');
  });

  it('沒有 coding 的 CodeableConcept 應 fallback 到 text', () => {
    const condition: FHIRResource = {
      resourceType: 'Condition',
      id: 'cond-text',
      code: { text: '頭痛' },
      subject: { reference: 'Patient/1' },
    } as any;
    const output = formatFHIRForLLM(condition, 'zh-TW');

    expect(output).toContain('頭痛');
  });
});
