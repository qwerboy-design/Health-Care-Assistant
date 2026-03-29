import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { processFHIRContent } from '@/lib/fhir/parser';
import { mergeFhirImportsForLLM } from '@/lib/fhir/mergeFhirImport';

const fixturesPath = path.join(__dirname, '../../fixtures/fhir');

function loadFixtureRaw(filename: string): string {
  return fs.readFileSync(path.join(fixturesPath, filename), 'utf-8');
}

describe('mergeFhirImportsForLLM', () => {
  it('空陣列回傳空字串', () => {
    const out = mergeFhirImportsForLLM([], 'zh-TW');
    expect(out.llmText).toBe('');
    expect(out.rawJsonMerged).toBe('');
  });

  it('單檔合併應含檔名標題與 FHIR 標記', () => {
    const content = loadFixtureRaw('patient-minimal.json');
    const r = processFHIRContent(content, 'zh-TW');
    expect(r.success).toBe(true);
    const out = mergeFhirImportsForLLM(
      [{ fileName: 'patient-minimal.json', summary: r.summary!, resource: r.resource! }],
      'zh-TW'
    );
    expect(out.llmText).toContain('## 檔案：patient-minimal.json');
    expect(out.llmText).toContain('[FHIR 臨床資料匯入]');
    expect(out.rawJsonMerged).toContain('// file: patient-minimal.json');
    expect(out.rawJsonMerged).toContain('minimal-patient');
  });

  it('多檔應以 --- 分隔且 rawJson 含多個 file 註解', () => {
    const names = ['patient-valid.json', 'condition.json'] as const;
    const items = names.map((name) => {
      const r = processFHIRContent(loadFixtureRaw(name), 'en');
      expect(r.success).toBe(true);
      return { fileName: name, summary: r.summary!, resource: r.resource! };
    });
    const out = mergeFhirImportsForLLM(items, 'en');
    expect(out.llmText).toContain('## File: patient-valid.json');
    expect(out.llmText).toContain('## File: condition.json');
    expect(out.llmText).toContain('[FHIR Clinical Data Import]');
    expect(out.llmText).toContain('\n\n---\n\n');
    expect(out.rawJsonMerged).toContain('// file: patient-valid.json');
    expect(out.rawJsonMerged).toContain('// file: condition.json');
  });

  it('多檔合併時免責結尾（zh-TW）僅出現一次，且在最後', () => {
    const footerZh =
      '以上為 FHIR R5 標準格式匯入的病患臨床資料，請根據這些資料進行醫療分析與建議。';
    const names = ['patient-minimal.json', 'condition.json'] as const;
    const items = names.map((name) => {
      const r = processFHIRContent(loadFixtureRaw(name), 'zh-TW');
      expect(r.success).toBe(true);
      return { fileName: name, summary: r.summary!, resource: r.resource! };
    });
    const out = mergeFhirImportsForLLM(items, 'zh-TW');
    const matches = out.llmText.split(footerZh).length - 1;
    expect(matches).toBe(1);
    expect(out.llmText.endsWith(footerZh)).toBe(true);
  });

  it('單檔合併時免責結尾仍只出現一次', () => {
    const footerEn =
      'The above is patient clinical data imported in FHIR R5 standard format. Please analyze this data and provide medical insights and recommendations.';
    const r = processFHIRContent(loadFixtureRaw('patient-minimal.json'), 'en');
    expect(r.success).toBe(true);
    const out = mergeFhirImportsForLLM(
      [{ fileName: 'x.json', summary: r.summary!, resource: r.resource! }],
      'en'
    );
    expect(out.llmText.split(footerEn).length - 1).toBe(1);
    expect(out.llmText.endsWith(footerEn)).toBe(true);
  });
});
