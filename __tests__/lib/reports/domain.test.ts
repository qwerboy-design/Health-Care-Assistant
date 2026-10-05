import { describe, expect, it } from 'vitest';
import { compareReportItems } from '@/lib/reports/comparison';
import { createDraftAnalysis, buildReportPrompt } from '@/lib/reports/analysis';
import { redactReportInput, serializeReportInput, validateReportInput } from '@/lib/reports/types';
import { validateAnalysisAgainstInput } from '@/lib/reports/analysis';

const base = { reportId: '123e4567-e89b-12d3-a456-426614174000', reportType: 'adult_health_check' as const, sourceKind: 'manual' as const, applicability: 'general_adult' as const, items: [{ id: 'glucose', label: 'Glucose', value: '105', unit: 'mg/dL', referenceRange: '70-99', originalFlag: 'H', confirmed: true as const }] };

describe('health report domain', () => {
  it('requires confirmed rows and rejects unknown fields', () => {
    expect(() => validateReportInput({ ...base, items: [{ ...base.items[0], confirmed: false }] })).toThrow();
    expect(() => validateReportInput({ ...base, extra: 'raw-file' })).toThrow();
    expect(validateReportInput(base).items[0].value).toBe('105');
  });

  it('compares only the original reference range', () => {
    expect(compareReportItems(base.items)[0].status).toBe('high');
    expect(compareReportItems([{ ...base.items[0], referenceRange: '' }])[0].status).toBe('unknown');
    expect(compareReportItems([{ ...base.items[0], value: 'positive', referenceRange: 'negative' }])[0].status).toBe('unknown');
    expect(compareReportItems([{ ...base.items[0], value: '5', referenceRange: '<= 10' }])[0].status).toBe('within');
    expect(compareReportItems([{ ...base.items[0], value: '5', referenceRange: '>= 10' }])[0].status).toBe('low');
    expect(compareReportItems([{ ...base.items[0], value: '5', referenceRange: '10' }])[0].status).toBe('unknown');
    expect(compareReportItems([{ ...base.items[0], value: '5', referenceRange: '20-10' }])[0].status).toBe('unknown');
  });

  it('keeps confirmed values unchanged and draft guidance empty', () => {
    const analysis = createDraftAnalysis(base);
    expect(analysis.facts[0].itemId).toBe('glucose');
    expect(analysis.generalGuidance).toEqual([]);
    expect(buildReportPrompt(base)).toContain('不得改寫數值');
  });

  it('matches knowledge and status by normalized label for extracted ids', () => {
    const input = { ...base, items: [
      { ...base.items[0], id: 'manual_1', label: ' eGFR ', value: '65', referenceRange: '>=60' },
      { ...base.items[0], id: 'manual_2', label: 'ＷＢＣ', value: '5.0', unit: 'x10^3/µL', referenceRange: '4.0-10.0' },
    ] };
    const analysis = createDraftAnalysis(input);
    expect(analysis.facts.map((fact) => fact.status)).toEqual(['within', 'within']);
    expect(analysis.meanings[0].text).toContain('估算值');
    expect(analysis.meanings[1].text).toContain('全血球');
  });

  it('keeps extracted/manual ids unique and marks eGFR and WBC within', () => {
    const input = { ...base, items: [
      { ...base.items[0], id: 'egfr', label: 'eGFR', value: '88', unit: 'mL/min/1.73m2', referenceRange: '>60', originalFlag: '' },
      { ...base.items[0], id: 'manual_2', label: 'WBC', value: '6.1', unit: '10^3/uL', referenceRange: '4.0-10.0', originalFlag: '' },
    ] };
    expect(createDraftAnalysis(input).facts.map((fact) => fact.status)).toEqual(['within', 'within']);
  });

  it('redacts direct identifiers while retaining clinical rows', () => {
    const redacted = redactReportInput({ ...base, conclusions: ['姓名：王大明 病歷號：A123456789'] });
    expect(redacted.conclusions?.[0]).not.toContain('王大明');
    expect(redacted.items[0].value).toBe('105');
  });

  it('redacts spaced-CJK PHI from report fields before server persistence', () => {
    const redacted = redactReportInput({
      ...base,
      items: [
        { ...base.items[0], label: '受 檢 者 ﹕ 測 試 人 員' },
        { ...base.items[0], id: 'manual_2', value: '姓 名：王 小 明' },
      ],
      conclusions: ['病 歷 號 ﹕ A123456789'],
    });
    const serialized = JSON.stringify(redacted);
    expect(serialized).not.toMatch(/受檢者|受\s+檢\s+者|測試人員|測\s+試\s+人\s+員|王小明|王\s+小\s+明/iu);
    expect(redacted.items[0].label).toBe('');
    expect(redacted.items[1].value).toBe('');
  });

  it('validates model facts against confirmed ids and enforces size', () => {
    expect(serializeReportInput(base)).toContain('adult_health_check');
    expect(validateAnalysisAgainstInput({ facts: [{ itemId: 'glucose', status: 'high', reason: 'range' }] }, base).facts).toHaveLength(1);
    expect(() => validateAnalysisAgainstInput({ facts: [{ itemId: 'invented', status: 'high', reason: 'x' }] }, base)).toThrow('unknown');
    expect(() => validateReportInput({ ...base, items: [] })).toThrow('至少需要一列');
    expect(() => validateReportInput({ ...base, conclusions: ['x'.repeat(100_001)] })).toThrow();
  });
});
