import { describe, expect, it } from 'vitest';
import d1Multipage from '@/__tests__/fixtures/reports/d1_multipage.json';
import d1TextEn from '@/__tests__/fixtures/reports/d1_text_en.json';
import d3Multicolumn from '@/__tests__/fixtures/reports/d3_multicolumn.json';
import d6Bilingual from '@/__tests__/fixtures/reports/d6_bilingual.json';
import d8Nonreport from '@/__tests__/fixtures/reports/d8_nonreport.json';
import { positionedItemsFromPdf } from '@/lib/reports/browser/extract';
import {
  normalizeReportText,
  parseExtractedRows,
  parseExtractedRowsDetailed,
  redactReportText,
  reconstructTextLines,
} from '@/lib/reports/parser';

type PdfItemsFixture = { pages: Array<Array<Record<string, unknown>>> };

function fixtureText(fixture: PdfItemsFixture): string {
  return fixture.pages
    .map((page) => reconstructTextLines(positionedItemsFromPdf({ items: page })).join('\n'))
    .join('\n');
}

const expectedSyntheticRows = [
  { label: 'Glucose (AC)', value: '105', unit: 'mg/dL', referenceRange: '70-99', originalFlag: 'H' },
  { label: 'HbA1c', value: '5.4', unit: '%', referenceRange: '4.0-5.6', originalFlag: '' },
  { label: 'Total Cholesterol', value: '182', unit: 'mg/dL', referenceRange: '<200', originalFlag: '' },
  { label: 'LDL-C', value: '131', unit: 'mg/dL', referenceRange: '<130', originalFlag: 'H' },
  { label: 'HDL-C', value: '52', unit: 'mg/dL', referenceRange: '>40', originalFlag: '' },
  { label: 'Triglycerides', value: '96', unit: 'mg/dL', referenceRange: '<150', originalFlag: '' },
  { label: 'AST (GOT)', value: '22', unit: 'U/L', referenceRange: '0-40', originalFlag: '' },
  { label: 'ALT (GPT)', value: '45', unit: 'U/L', referenceRange: '0-41', originalFlag: 'H' },
  { label: 'Creatinine', value: '0.92', unit: 'mg/dL', referenceRange: '0.70-1.30', originalFlag: '' },
  { label: 'eGFR', value: '88', unit: 'mL/min/1.73m2', referenceRange: '>60', originalFlag: '' },
  { label: 'BUN', value: '14', unit: 'mg/dL', referenceRange: '7-20', originalFlag: '' },
  { label: 'Hemoglobin', value: '13.2', unit: 'g/dL', referenceRange: '13.5-17.5', originalFlag: 'L' },
  { label: 'WBC', value: '6.1', unit: '10^3/uL', referenceRange: '4.0-10.0', originalFlag: '' },
  { label: 'Platelets', value: '245', unit: '10^3/uL', referenceRange: '150-400', originalFlag: '' },
  { label: 'Urine Protein', value: 'Negative', unit: '', referenceRange: 'Negative', originalFlag: '' },
  { label: 'Urine Occult Blood', value: 'Trace', unit: '', referenceRange: 'Negative', originalFlag: 'A' },
  { label: 'Uric Acid', value: '6.8', unit: 'mg/dL', referenceRange: '', originalFlag: '' },
];

function fullyMatchingExpectedRows(rows: ReturnType<typeof parseExtractedRows>): number {
  return expectedSyntheticRows.filter((expected) => rows.some((row) => (
    row.label === expected.label
    && row.value === expected.value
    && row.unit === expected.unit
    && row.referenceRange === expected.referenceRange
    && row.originalFlag === expected.originalFlag
  ))).length;
}

describe('health report parser', () => {
  it('normalizes NFKC/full-width and small-form punctuation without changing micro units', () => {
    expect(normalizeReportText('ＷＢＣ：５．０ x10^3／µL ﹣ 4．0 ～ 10．0')).toBe('WBC:5.0 x10^3/µL - 4.0 ~ 10.0');
    expect(parseExtractedRows('ＷＢＣ｜５．０｜x10^3／µL｜４．０ ～ １０．０｜↑')[0]).toMatchObject({
      id: 'wbc', value: '5.0', unit: 'x10^3/µL', referenceRange: '4.0 ~ 10.0', originalFlag: '↑',
    });
  });

  it('normalizes spaced CJK OCR labels and compatibility punctuation before detection', () => {
    expect(normalizeReportText('成 人 健 康 檢 查 報 告 ( 合 成 測 試 資 料 ， 非 真 實 病 人 ﹚')).toBe('成人健康檢查報告 ( 合成測試資料, 非真實病人)');
    expect(normalizeReportText('受 檢 者 ﹕ 測 試 人 員 報 告 日 期 ﹕ 2026-00-30 ﹍ 檢 驗 機 構 ﹕ Example Test Lab')).toBe('受檢者: 測試人員報告日期: 2026-00-30 _ 檢驗機構: Example Test Lab');
  });

  it('reconstructs lines using relative font height, drops whitespace items, and separates columns', () => {
    const lines = reconstructTextLines([
      { text: 'Glucose', x: 10, y: 100, width: 40, height: 10 },
      { text: '105', x: 58, y: 99.5, width: 20, height: 10 },
      { text: '   ', x: 90, y: 100, width: 3, height: 10 },
      { text: 'WBC', x: 300, y: 100.2, width: 30, height: 10 },
      { text: '5.0', x: 338, y: 100, width: 20, height: 10 },
      { text: 'HbA1c', x: 10, y: 70, width: 35, height: 10 },
      { text: '5.6', x: 55, y: 70, width: 18, height: 10 },
    ]);
    expect(lines).toHaveLength(3);
    expect(parseExtractedRows(lines.join('\n'))).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Glucose', value: '105' }),
      expect.objectContaining({ id: 'wbc', label: 'WBC', value: '5.0' }),
    ]));
  });

  it('keeps lab-like unparsed lines as needs-review rows and filters headers, footers, and PHI', () => {
    const rows = parseExtractedRows([
      'Test Item Result Unit Reference Range Flag',
      'Page 1 of 2',
      '姓名：王大明 病歷號：A123456789',
      'Glucose ??? mg/dL',
      'Glucose 105 mg/dL 70-99 H',
      '第 2 頁',
    ].join('\n'));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ needsReview: true, rawText: 'Glucose ??? mg/dL' });
    expect(rows[1]).toMatchObject({ label: 'Glucose', value: '105', unit: 'mg/dL', referenceRange: '70-99', originalFlag: 'H' });
    expect(JSON.stringify(rows)).not.toContain('王大明');
  });

  it('rejects OCR garbage instead of creating needs-review rows', () => {
    expect(parseExtractedRows([
      '5 託 空 喬 言 $ 日 +4',
      'clc|lc| I mle',
      '3',
    ].join('\n'))).toEqual([]);
  });

  it('parses qualitative values and keeps empty pipe cells positional', () => {
    const rows = parseExtractedRows([
      'Urine Protein\tNegative\tNegative',
      'Urine Occult Blood | Trace | | Negative | A',
      'Urine Protein | Positive | | Positive |',
    ].join('\n'));
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Urine Protein', value: 'Negative', unit: '', referenceRange: 'Negative' }),
      expect.objectContaining({ label: 'Urine Occult Blood', value: 'Trace', unit: '', referenceRange: 'Negative', originalFlag: 'A' }),
      expect.objectContaining({ label: 'Urine Protein', value: 'Positive', unit: '', referenceRange: 'Positive' }),
    ]));
  });

  it('splits merged unit/range cells and trailing flags', () => {
    expect(parseExtractedRows('Glucose\t105\tmg/dL 70-99\t\tH')[0]).toMatchObject({
      unit: 'mg/dL', referenceRange: '70-99', originalFlag: 'H',
    });
    expect(parseExtractedRows('Hemoglobin 13.2 g/dL 13.5-17.5 L')[0]).toMatchObject({
      unit: 'g/dL', referenceRange: '13.5-17.5', originalFlag: 'L',
    });
  });

  it('corrects common OCR unit mistakes and marks corrected rows for review', () => {
    const rows = parseExtractedRows([
      'AST (GOT) 22 L 人 0-40',
      'eGFR 88 mLmin/1.73m2 >60',
      'WBC 6.1 1053uL 4.0-10.0',
      'Platelets 245 10^3uL 150-400',
    ].join('\n'));
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'AST (GOT)', unit: 'U/L', needsReview: true }),
      expect.objectContaining({ label: 'eGFR', unit: 'mL/min/1.73m2', needsReview: true }),
      expect.objectContaining({ label: 'WBC', unit: '10^3/uL', needsReview: true }),
      expect.objectContaining({ label: 'Platelets', unit: '10^3/uL', needsReview: true }),
    ]));
  });

  it('corrects CJK OCR unit variants, collapses CJK labels, and flags garbage labels', () => {
    const rows = parseExtractedRows([
      '天 門 冬 胺 酸 轉 胺 酪 AST (GOT) 22 U 人 0﹣40',
      'ALT (GPT) 45 U/ 人 0-41 H',
      'Creatinine 0.92 IU 八 0.70-1.30',
      'BH4IRBIEE eGFR 88 mL/min/1.73m2 >60',
      'GIucose (AC) 105 mg/dL 70-99 H',
    ].join('\n'));
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '天門冬胺酸轉胺酪 AST (GOT)', unit: 'U/L', needsReview: true }),
      expect.objectContaining({ label: 'ALT (GPT)', unit: 'U/L', needsReview: true }),
      expect.objectContaining({ label: 'Creatinine', unit: 'IU/L', needsReview: true }),
      expect.objectContaining({ label: 'BH4IRBIEE eGFR', value: '88', needsReview: true }),
      expect.objectContaining({ label: 'Glucose (AC)', value: '105', needsReview: true }),
    ]));
    expect(rows.find((row) => row.label.includes('BH4IRBIEE'))?.value).toBe('88');
  });

  it('reports skipped header, title, and PHI lines and redacts displayed text', () => {
    const source = [
      'Health Check Report',
      'Subject: Test Person',
      'Patient: Test Person',
      'Glucose 105 mg/dL 70-99 H',
    ].join('\n');
    expect(parseExtractedRowsDetailed(source)).toMatchObject({ skippedLineCount: 3 });
    const redacted = redactReportText(source);
    expect(redacted).not.toMatch(/Test Person|Subject|Patient/iu);
    expect(redacted).toContain('Glucose 105');
  });

  it('removes spaced-CJK PHI lines and interleaved English identifiers from the client preview', () => {
    const source = [
      '成 人 健 康 檢 查 報 告 ( 合 成 測 試 資 料 ， 非 真 實 病 人 ﹚',
      '受 檢 者 ﹕ 測 試 人 員 報 告 日 期 ﹕ 2026-00-30 ﹍ 檢 驗 機 構 ﹕ Example Test Lab',
      'Name: Test Person Glucose 105 mg/dL 70-99 H',
      'Glucose 105 mg/dL 70-99 H',
    ].join('\n');
    const redacted = redactReportText(source);
    expect(redacted).not.toMatch(/受檢者|受\s+檢\s+者|測試人員|測\s+試\s+人\s+員|Test Person/iu);
    expect(redacted).toContain('Glucose 105');
  });

  it('joins adjacent CJK PDF items without inserting spaces', () => {
    expect(reconstructTextLines([
      { text: '空腹', x: 10, y: 100, width: 18, height: 10 },
      { text: '血', x: 29, y: 100, width: 9, height: 10 },
      { text: '糖', x: 39, y: 100, width: 9, height: 10 },
      { text: 'Glucose (AC)', x: 58, y: 100, width: 70, height: 10 },
    ])[0]).toContain('空腹血糖');
  });

  it('reconstructs a consistent two-column gutter as left column then right column', () => {
    const items = [
      ['Glucose', 10, 105, 40], ['105', 58, 105, 20], ['mg/dL', 84, 105, 35], ['70-99', 125, 105, 35], ['H', 166, 105, 10],
      ['ALT', 10, 85, 20], ['45', 58, 85, 20], ['U/L', 84, 85, 20], ['0-41', 125, 85, 30], ['H', 161, 85, 10],
      ['Total Cholesterol', 300, 105, 90], ['182', 400, 105, 20], ['mg/dL', 426, 105, 35], ['<200', 467, 105, 30],
      ['Urine Protein', 300, 85, 70], ['Negative', 378, 85, 50], ['Negative', 434, 85, 50],
    ].map(([text, x, y, width]) => ({ text: String(text), x: Number(x), y: Number(y), width: Number(width), height: 10 }));
    const lines = reconstructTextLines(items);
    const rows = parseExtractedRows(lines.join('\n'));
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Glucose', value: '105', originalFlag: 'H' }),
      expect.objectContaining({ label: 'ALT', value: '45', originalFlag: 'H' }),
      expect.objectContaining({ label: 'Total Cholesterol', value: '182', referenceRange: '<200' }),
      expect.objectContaining({ label: 'Urine Protein', value: 'Negative', referenceRange: 'Negative' }),
    ]));
  });

  it('keeps a very wide single-column label/value gap on the same row', () => {
    const items = [
      ['Glucose', 10, 100, 45], ['105', 220, 100, 20], ['mg/dL', 360, 100, 35], ['70-99', 500, 100, 35], ['H', 620, 100, 10],
      ['ALT', 10, 80, 20], ['45', 220, 80, 20], ['U/L', 360, 80, 20], ['0-41', 500, 80, 30], ['H', 620, 80, 10],
    ].map(([text, x, y, width]) => ({ text: String(text), x: Number(x), y: Number(y), width: Number(width), height: 10 }));
    const rows = parseExtractedRows(reconstructTextLines(items).join('\n'));
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Glucose', value: '105', unit: 'mg/dL', referenceRange: '70-99', originalFlag: 'H' }),
      expect.objectContaining({ label: 'ALT', value: '45', unit: 'U/L', referenceRange: '0-41', originalFlag: 'H' }),
    ]));
  });

  it('parses the real single-column pdf.js fixture without turning cell gaps into columns', () => {
    const rows = parseExtractedRows(fixtureText(d1TextEn));
    expect(rows.length).toBe(17);
    expect(fullyMatchingExpectedRows(rows)).toBeGreaterThanOrEqual(15);
  });

  it('parses every row across the real multipage fixture without junk rows', () => {
    const rows = parseExtractedRows(fixtureText(d1Multipage));
    expect(rows.length).toBe(17);
    expect(rows.every((row) => !row.needsReview)).toBe(true);
    expect(fullyMatchingExpectedRows(rows)).toBe(17);
  });

  it('parses both blocks of the real two-column fixture, including wrapped labels, ranges and flags', () => {
    const text = fixtureText(d3Multicolumn);
    const rows = parseExtractedRows(text);
    expect(rows.length).toBe(17);
    expect(fullyMatchingExpectedRows(rows)).toBe(17);
    expect(rows.map((row) => row.label)).toEqual(expect.not.arrayContaining(['Total', 'Cholesterol', 'Urine', 'Protein', 'Occult', 'Blood']));
  });

  it('parses the real bilingual fixture without spurious spaces inside CJK labels', () => {
    const text = fixtureText(d6Bilingual);
    const rows = parseExtractedRows(text);
    expect(rows.length).toBe(17);
    const bilingualMatches = expectedSyntheticRows.filter((expected) => rows.some((row) => (
      row.label.includes(expected.label)
      && row.value === expected.value
      && row.unit === expected.unit
      && row.referenceRange === expected.referenceRange
      && row.originalFlag === expected.originalFlag
    ))).length;
    expect(bilingualMatches).toBeGreaterThanOrEqual(14);
    expect(rows.some((row) => /空\s+腹|血\s+糖|尿\s+蛋白/u.test(row.label))).toBe(false);
  });

  it('does not create rows from the real non-report fixture', () => {
    expect(parseExtractedRows(fixtureText(d8Nonreport))).toEqual([]);
  });

  it('keeps duplicate labels unique while preserving parseable rows', () => {
    const rows = parseExtractedRows('Glucose 105 mg/dL 70-99 H\nGlucose 95 mg/dL 70-99');
    expect(rows.map((row) => row.id)).toEqual(['glucose', 'glucose_2']);
  });
});
