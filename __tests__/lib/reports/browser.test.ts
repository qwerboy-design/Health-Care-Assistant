import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import d8Nonreport from '@/__tests__/fixtures/reports/d8_nonreport.json';
import {
  buildWarnings,
  extractReportFile,
  parseExtractedRows,
  REPORT_EXTRACTION_ERRORS,
  rankOcrCandidates,
  selectBestOcrCandidate,
} from '@/lib/reports/browser/extract';
import { reconstructTextLines } from '@/lib/reports/parser';

const { ocrRecognize, pdfPageTexts } = vi.hoisted(() => ({
  ocrRecognize: vi.fn().mockResolvedValue({ data: { text: '血糖 105', confidence: 80 } }),
  pdfPageTexts: ['Glucose 105 mg/dL 70-99 H'],
}));

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: () => ({ promise: Promise.resolve({
    numPages: pdfPageTexts.length,
    getPage: async (pageNumber: number) => ({
      getTextContent: async () => ({ items: [{ str: pdfPageTexts[pageNumber - 1], transform: [10, 0, 0, 10, 10, 100], width: 180, height: 10 }] }),
    }),
  }) }),
}));
vi.mock('tesseract.js', () => ({
  createWorker: async () => ({ recognize: ocrRecognize, terminate: async () => undefined }),
}));

const canvasContext = {
  translate: vi.fn(),
  rotate: vi.fn(),
  drawImage: vi.fn(),
};
const originalCanvasGetContext = HTMLCanvasElement.prototype.getContext;

function validPngFile(name = 'report.png'): File {
  return new File([new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10,
    0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
  ])], name, { type: 'image/png' });
}

function validJpegFile(name = 'report.jpg'): File {
  return new File([new Uint8Array([255, 216, 255, 217])], name, { type: 'image/jpeg' });
}

beforeEach(() => {
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 800, height: 600, close: vi.fn() })));
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => canvasContext),
  });
});

afterEach(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: originalCanvasGetContext,
  });
  vi.unstubAllGlobals();
});

describe('browser report extraction helpers', () => {
  it('parses editable rows as unconfirmed', () => {
    const rows = parseExtractedRows('Glucose\t105\tmg/dL\t70-99\tH\nHbA1c | 5.6 | % | 4-6 |');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ value: '105', unit: 'mg/dL', confirmed: false });
  });

  it('ignores empty or incomplete OCR lines', () => {
    expect(parseExtractedRows('header\n\nGlucose\t105')).toHaveLength(1);
    expect(parseExtractedRows('Glucose 105 mg/dL 70-99 H')[0]).toMatchObject({ value: '105', unit: 'mg/dL', referenceRange: '70-99', originalFlag: 'H' });
  });

  it('extracts native PDF text and aborts safely', async () => {
    const progress: string[] = [];
    const result = await extractReportFile(new File(['pdf'], 'report.pdf', { type: 'application/pdf' }), (event) => progress.push(event.stage));
    expect(result).toMatchObject({ text: 'Glucose 105 mg/dL 70-99 H', method: 'pdf_text', pages: 1 });
    expect(progress).toContain('reading');
    const controller = new AbortController(); controller.abort();
    await expect(extractReportFile(new File(['x'], 'report.pdf', { type: 'application/pdf' }), undefined, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('extracts image OCR and rejects unsupported files and oversized files', async () => {
    ocrRecognize.mockResolvedValue({ data: { text: '血糖 105', confidence: 80 } });
    const result = await extractReportFile(validPngFile());
    expect(result).toMatchObject({ text: '血糖 105', method: 'ocr' });
    expect(result.warnings).toContain('OCR 結果必須逐列人工核對，辨識分數不代表醫療正確性。');
    await expect(extractReportFile(new File(['x'], 'report.txt', { type: 'text/plain' }))).rejects.toThrow('只支援');
    const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' });
    await expect(extractReportFile(oversized)).rejects.toThrow('10 MB');
  });

  it('ranks plausible OCR rows above garbage-heavy candidates', () => {
    const ranked = rankOcrCandidates([
      { rotation: 0, confidence: 88, text: '5 託 空 喬 言 $ 日 +4\nclc|lc| I mle\n3' },
      { rotation: 90, confidence: 62, text: 'Glucose 105 mg/dL 70-99 H\nALT 45 U/L 0-41 H' },
    ]);
    expect(ranked[0]).toMatchObject({ rotation: 90 });
    expect(ranked[0].plausibleRows).toBeGreaterThan(ranked[1].plausibleRows);
  });

  it('lets a clearly better rotated candidate beat the preferred orientation', () => {
    const ranked = rankOcrCandidates([
      { rotation: 0, confidence: 58, text: 'Glucose 105 ???\nALT 45 ???' },
      { rotation: 270, confidence: 82, text: 'Glucose 105 mg/dL 70-99 H\nALT 45 U/L 0-41 H\nWBC 6.1 10^3/uL 4.0-10.0' },
    ]);
    expect(ranked[0]).toMatchObject({ rotation: 270 });
  });

  it('uses an explicitly requested manual rotation without auto-rotation', async () => {
    ocrRecognize.mockClear().mockResolvedValue({ data: { text: 'Glucose 105 mg/dL 70-99 H', confidence: 80 } });
    const result = await extractReportFile(
      validPngFile(),
      undefined,
      undefined,
      { rotation: 90, autoRotate: false },
    );
    expect(result.rotation).toBe(90);
    expect(ocrRecognize).toHaveBeenCalledTimes(1);
  });

  it('returns the zh-TW unreadable message and no OCR text for a low-confidence result', async () => {
    ocrRecognize.mockClear().mockResolvedValue({ data: { text: '5 託 空 喬 言 $ 日 +4', confidence: 20 } });
    const result = await extractReportFile(validJpegFile('blur.jpg'));
    expect(result.text).toBe('');
    expect(result.warnings).toContain('無法從圖片辨識出檢驗數值，影像可能模糊、方向錯誤或不是檢驗報告。請旋轉、改用較清晰的檔案，或手動輸入。');
    expect(result.warnings).not.toContain('OCR 結果必須逐列人工核對，辨識分數不代表醫療正確性。');
    expect(result.warnings).not.toContain('擷取結果必須逐列人工核對，辨識結果不代表醫療正確性。');
  });

  it('shows only the unreadable message when low-confidence OCR rows are discarded', async () => {
    ocrRecognize.mockClear().mockResolvedValue({ data: {
      text: 'Glucose 105 mg/dL 70-99 H\nAST (GOT) 22 L 人 0-40\nALT (GPT) 45 U 人 0-41 H\nWBC 6.1 10^3/uL 4.0-10.0',
      confidence: 30,
    } });
    const result = await extractReportFile(validJpegFile('blur.jpg'));
    expect(result.text).toBe('');
    expect(parseExtractedRows(result.text)).toEqual([]);
    expect(result.warnings).toEqual(['無法從圖片辨識出檢驗數值，影像可能模糊、方向錯誤或不是檢驗報告。請旋轉、改用較清晰的檔案，或手動輸入。']);
  });

  it('does not OCR a text-present PDF that has no lab rows', async () => {
    pdfPageTexts.splice(0, pdfPageTexts.length, 'This is a narrative document with no laboratory measurements.');
    ocrRecognize.mockClear().mockRejectedValue(new Error('OCR should not run'));
    const result = await extractReportFile(new File(['pdf'], 'nonreport.pdf', { type: 'application/pdf' }));
    expect(result.method).toBe('pdf_text');
    expect(result.warnings).toContain('未在檔案中找到可辨識的檢驗項目，請確認檔案內容或手動輸入。');
    expect(result.warnings).not.toContain('PDF 沒有可讀文字，已改用本機 OCR；請逐列人工核對辨識結果。');
    expect(result.warnings).not.toContain('擷取結果必須逐列人工核對，辨識結果不代表醫療正確性。');
    expect(ocrRecognize).not.toHaveBeenCalled();
    pdfPageTexts.splice(0, pdfPageTexts.length, 'Glucose 105 mg/dL 70-99 H');
  });

  it('passes a canvas to tesseract for upright OCR instead of an ImageBitmap', async () => {
    ocrRecognize.mockClear().mockResolvedValue({ data: { text: 'Glucose 105 mg/dL 70-99 H\nALT 45 U/L 0-41 H\nWBC 6.1 10^3/uL 4.0-10.0\nPlatelets 245 10^3/uL 150-400', confidence: 92 } });
    const result = await extractReportFile(validPngFile());
    expect(result.rotation).toBe(0);
    expect(ocrRecognize).toHaveBeenCalledTimes(1);
    expect(ocrRecognize.mock.calls[0][0]).toBeInstanceOf(HTMLCanvasElement);
  });

  it('surfaces an OCR recognition failure after recording failed candidates', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    ocrRecognize.mockClear().mockRejectedValue(new Error('worker failure'));
    const result = await extractReportFile(validPngFile());
    expect(result.text).toBe('');
    expect(result.warnings).toContain('OCR 辨識失敗，請重試或手動輸入。');
    expect(warning).toHaveBeenCalled();
    warning.mockRestore();
  });

  it('prefers 0 degrees for ties and near-ties', () => {
    expect(selectBestOcrCandidate([
      { rotation: 0, confidence: 80, text: 'Glucose 105 mg/dL 70-99 H' },
      { rotation: 90, confidence: 80, text: 'Glucose 105 mg/dL 70-99 H' },
    ], 0).rotation).toBe(0);
    expect(selectBestOcrCandidate([
      { rotation: 0, confidence: 80, text: 'Glucose 105 mg/dL 70-99 H' },
      { rotation: 90, confidence: 89, text: 'Glucose 105 mg/dL 70-99 H' },
    ], 0).rotation).toBe(0);
  });

  it('rejects a corrupt PNG before creating an OCR worker', async () => {
    const corrupt = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])], 'corrupt.png', { type: 'image/png' });
    await expect(extractReportFile(corrupt)).rejects.toThrow(REPORT_EXTRACTION_ERRORS.corruptImage);
    expect(ocrRecognize).not.toHaveBeenCalled();
  });

  it('uses only the no-lab warning for the real non-report text fixture', () => {
    const text = d8Nonreport.pages
      .map((page) => reconstructTextLines(page.map((item) => ({
        text: String(item.str ?? ''),
        x: Number((item.transform as number[])[4]),
        y: Number((item.transform as number[])[5]),
        width: Number(item.width),
        height: Number(item.height),
      }))).join('\n'))
      .join('\n');
    const warnings = buildWarnings(text, parseExtractedRows(text));
    expect(warnings).toEqual(['未在檔案中找到可辨識的檢驗項目，請確認檔案內容或手動輸入。']);
  });

  it('does not combine a needs-review warning with the no-lab warning', () => {
    const text = 'Glucose ??? mg/dL';
    const warnings = buildWarnings(text, parseExtractedRows(text));
    expect(warnings).toEqual(['有 1 行疑似檢驗資料未能完整解析，請在表格中人工補正。']);
  });

  it('keeps manual-review notices when rows exist but hides them for zero-row results', () => {
    const rows = parseExtractedRows('Glucose 105 mg/dL 70-99 H');
    const withRows = buildWarnings('Glucose 105 mg/dL 70-99 H', rows);
    expect(withRows).toContain('擷取結果必須逐列人工核對，辨識結果不代表醫療正確性。');
    expect(buildWarnings('Glucose 105 mg/dL 70-99 H', rows, true)).toContain('PDF 沒有可讀文字，已改用本機 OCR；請逐列人工核對辨識結果。');
    const withoutRows = buildWarnings('not a report', [], true);
    expect(withoutRows).toEqual(['未在檔案中找到可辨識的檢驗項目，請確認檔案內容或手動輸入。']);
  });
});
