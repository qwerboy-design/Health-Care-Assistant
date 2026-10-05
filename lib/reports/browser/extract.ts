import type { Worker } from 'tesseract.js';
import {
  isPlausibleReportRow,
  isRecognizableReportRow,
  parseExtractedRows,
  parseExtractedRowsDetailed,
  redactReportText,
  reconstructTextLines,
  type ParsedExtractedRow,
  type PositionedTextItem,
} from '@/lib/reports/parser';

export type ExtractionProgress = { stage: 'reading' | 'ocr' | 'complete'; current: number; total: number };
export type ImageRotation = 0 | 90 | 180 | 270;
export type ExtractedReport = {
  text: string;
  pages: number;
  method: 'pdf_text' | 'ocr' | 'manual';
  warnings: string[];
  rotation?: ImageRotation;
};

export type OcrCandidate = { text: string; rotation: ImageRotation; confidence: number; confidenceKnown?: boolean };
export type RankedOcrCandidate = OcrCandidate & {
  rows: ParsedExtractedRow[];
  completeRows: number;
  plausibleRows: number;
  plausibilityScore: number;
};

export const UNREADABLE_OCR_MESSAGE = '無法從圖片辨識出檢驗數值，影像可能模糊、方向錯誤或不是檢驗報告。請旋轉、改用較清晰的檔案，或手動輸入。';
export const OCR_RECOGNITION_ERROR = 'OCR 辨識失敗，請重試或手動輸入。';
export const NO_LAB_ROWS_MESSAGE = '未在檔案中找到可辨識的檢驗項目，請確認檔案內容或手動輸入。';

export const REPORT_EXTRACTION_ERRORS = {
  unsupported: '只支援 PDF、JPEG、PNG 或 WebP 報告檔',
  oversized: '檔案超過 10 MB 上限',
  pages: 'PDF 超過 10 頁上限',
  corruptPdf: 'PDF 檔案損毀或無法讀取',
  corruptImage: '圖片檔案損毀或無法讀取',
} as const;

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_PDF_PAGES = 10;
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Extraction cancelled', 'AbortError');
}

function extensionOf(file: File): string {
  const name = file.name.toLowerCase();
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index) : '';
}

function getFileKind(file: File): 'pdf' | 'image' {
  const extension = extensionOf(file);
  const type = file.type.toLowerCase();
  const pdf = extension === '.pdf' && (!type || type === 'application/pdf');
  const image = IMAGE_EXTENSIONS.has(extension) && (!type || IMAGE_MIME_TYPES.has(type));
  if (pdf) return 'pdf';
  if (image) return 'image';
  throw new Error(REPORT_EXTRACTION_ERRORS.unsupported);
}

function createCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  throw new Error(REPORT_EXTRACTION_ERRORS.corruptImage);
}

function canvasContext(canvas: HTMLCanvasElement | OffscreenCanvas): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) throw new Error(REPORT_EXTRACTION_ERRORS.corruptImage);
  return context;
}

function canvasInput(canvas: HTMLCanvasElement | OffscreenCanvas): Parameters<Worker['recognize']>[0] {
  return canvas as Parameters<Worker['recognize']>[0];
}

function imageDimensions(source: unknown): { width: number; height: number } | null {
  const value = source as { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number };
  const width = value.naturalWidth || value.width || 0;
  const height = value.naturalHeight || value.height || 0;
  return width > 0 && height > 0 ? { width, height } : null;
}

function hasBytes(bytes: Uint8Array, offset: number, values: number[]): boolean {
  return values.every((value, index) => bytes[offset + index] === value);
}

function hasPngEndChunk(bytes: Uint8Array): boolean {
  if (!hasBytes(bytes, 0, [137, 80, 78, 71, 13, 10, 26, 10])) return false;
  let offset = 8;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    if (length > bytes.length - offset - 12) return false;
    if (hasBytes(bytes, offset + 4, [73, 69, 78, 68])) return true;
    offset += 12 + length;
  }
  return false;
}

function hasJpegEndMarker(bytes: Uint8Array): boolean {
  if (!hasBytes(bytes, 0, [255, 216])) return false;
  for (let index = bytes.length - 2; index >= 0; index -= 1) {
    if (bytes[index] === 255 && bytes[index + 1] === 217) return true;
  }
  return false;
}

function hasWebpHeader(bytes: Uint8Array): boolean {
  return hasBytes(bytes, 0, [82, 73, 70, 70]) && hasBytes(bytes, 8, [87, 69, 66, 80]);
}

async function validateImageBytes(file: File): Promise<void> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = extensionOf(file);
  const valid = extension === '.png'
    ? hasPngEndChunk(bytes)
    : extension === '.jpg' || extension === '.jpeg'
      ? hasJpegEndMarker(bytes)
      : extension === '.webp'
        ? hasWebpHeader(bytes)
        : false;
  if (!valid) throw new Error(REPORT_EXTRACTION_ERRORS.corruptImage);
}

async function decodeImageFile(file: File): Promise<unknown> {
  await validateImageBytes(file);
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      if (!imageDimensions(bitmap)) throw new Error(REPORT_EXTRACTION_ERRORS.corruptImage);
      rotateImage(bitmap, 0);
      return bitmap;
    } catch {
      throw new Error(REPORT_EXTRACTION_ERRORS.corruptImage);
    }
  }
  if (typeof Image !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    try {
      image.src = objectUrl;
      if (typeof image.decode === 'function') await image.decode();
      if (!imageDimensions(image)) throw new Error(REPORT_EXTRACTION_ERRORS.corruptImage);
      rotateImage(image, 0);
      return image;
    } catch {
      throw new Error(REPORT_EXTRACTION_ERRORS.corruptImage);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
  throw new Error(REPORT_EXTRACTION_ERRORS.corruptImage);
}

function rotateImage(source: unknown, rotation: ImageRotation): Parameters<Worker['recognize']>[0] {
  const dimensions = imageDimensions(source);
  if (!dimensions) throw new Error(REPORT_EXTRACTION_ERRORS.corruptImage);
  const quarterTurn = rotation === 90 || rotation === 270;
  const canvas = createCanvas(quarterTurn ? dimensions.height : dimensions.width, quarterTurn ? dimensions.width : dimensions.height);
  const context = canvasContext(canvas);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(rotation * Math.PI / 180);
  context.drawImage(source as CanvasImageSource, -dimensions.width / 2, -dimensions.height / 2, dimensions.width, dimensions.height);
  return canvasInput(canvas);
}

function confidenceOf(result: Awaited<ReturnType<Worker['recognize']>>): number {
  const confidence = result.data.confidence;
  return typeof confidence === 'number' && Number.isFinite(confidence) ? confidence : 0;
}

function confidenceKnown(result: Awaited<ReturnType<Worker['recognize']>>): boolean {
  return typeof result.data.confidence === 'number' && Number.isFinite(result.data.confidence);
}

function rowQuality(text: string, confidence: number, known: boolean) {
  const rows = parseExtractedRows(text);
  return {
    rows,
    completeRows: rows.filter((row) => Boolean(row.label && row.value)).length,
    plausibleRows: rows.filter(isPlausibleReportRow).length,
    confidence,
    confidenceKnown: known,
  };
}

/** Pure OCR candidate ranking: plausible lab rows dominate raw row count. */
export function rankOcrCandidates(candidates: OcrCandidate[]): RankedOcrCandidate[] {
  return candidates
    .map((candidate) => {
      const quality = rowQuality(candidate.text, candidate.confidence, candidate.confidenceKnown ?? true);
      return {
        ...candidate,
        rows: quality.rows,
        completeRows: quality.completeRows,
        plausibleRows: quality.plausibleRows,
        plausibilityScore: quality.plausibleRows * 1000 + quality.completeRows * 5 + Math.max(0, Math.min(100, candidate.confidence)) * 0.5,
      };
    })
    .sort((left, right) => right.plausibilityScore - left.plausibilityScore || right.confidence - left.confidence);
}

/** Keep the requested/preferred result unless a rotated result is clearly better. */
export function selectBestOcrCandidate(candidates: OcrCandidate[], preferredRotation: ImageRotation): RankedOcrCandidate {
  const ranked = rankOcrCandidates(candidates);
  const preferred = ranked.find((candidate) => candidate.rotation === preferredRotation) ?? ranked[0];
  if (!preferred) {
    return { text: '', rotation: preferredRotation, confidence: 0, confidenceKnown: false, rows: [], completeRows: 0, plausibleRows: 0, plausibilityScore: 0 };
  }
  const best = ranked[0];
  if (!best || best.rotation === preferred.rotation) return preferred;
  const plausibleGain = best.plausibleRows - preferred.plausibleRows;
  const confidenceGain = best.confidence - preferred.confidence;
  const clearlyBetter = plausibleGain > 0 && confidenceGain > 10;
  return clearlyBetter ? best : preferred;
}

async function recognizeWithBestOrientation(
  worker: Worker,
  source: unknown,
  signal: AbortSignal | undefined,
  preferredRotation: ImageRotation,
  autoRotate = true,
): Promise<{ text: string; rotation: ImageRotation; confidence: number; rows: ParsedExtractedRow[]; recognitionFailed: boolean }> {
  const results: OcrCandidate[] = [];
  let successfulRecognitions = 0;

  const recognizeOne = async (rotation: ImageRotation) => {
    throwIfAborted(signal);
    try {
      const input = rotateImage(source, rotation);
      const result = await worker.recognize(input);
      successfulRecognitions += 1;
      const text = result.data.text || '';
      const confidence = confidenceOf(result);
      results.push({ text, rotation, confidence, confidenceKnown: confidenceKnown(result) });
    } catch (error) {
      console.warn('Health report OCR candidate failed', {
        rotation,
        error: error instanceof Error ? error.message : 'unknown error',
      });
      results.push({ text: '', rotation, confidence: 0, confidenceKnown: true });
    }
  };

  await recognizeOne(preferredRotation);
  const first = rankOcrCandidates(results).find((candidate) => candidate.rotation === preferredRotation);
  const shouldTryRotations = autoRotate && Boolean(imageDimensions(source)) && first !== undefined
    && (first.plausibleRows < 3 || (first.confidenceKnown && first.confidence < 70));
  if (shouldTryRotations) {
    for (const rotation of [90, 180, 270] as const) {
      const candidate = ((preferredRotation + rotation) % 360) as ImageRotation;
      if (candidate !== preferredRotation) await recognizeOne(candidate);
    }
  }

  const best = selectBestOcrCandidate(results, preferredRotation);
  return {
    text: best.text,
    rotation: best.rotation,
    confidence: best.confidence,
    rows: best.rows,
    recognitionFailed: successfulRecognitions === 0,
  };
}

async function createOcrWorker() {
  const { createWorker } = await import('tesseract.js');
  return createWorker('eng+chi_tra', 1, {
    workerPath: '/report-assets/worker.min.js',
    langPath: '/report-assets/lang-data',
    corePath: '/report-assets/tesseract-core.wasm.js',
    cacheMethod: 'write',
    errorHandler: () => undefined,
  });
}

export function buildWarnings(text: string, rows: ParsedExtractedRow[], ocrUsed = false, skippedLineCount = parseExtractedRowsDetailed(text).skippedLineCount): string[] {
  const warnings: string[] = [];
  const needsReview = rows.filter((row) => row.needsReview).length;
  if (!rows.length) {
    return [NO_LAB_ROWS_MESSAGE];
  }
  if (ocrUsed) warnings.push('PDF 沒有可讀文字，已改用本機 OCR；請逐列人工核對辨識結果。');
  if (needsReview) warnings.push(`有 ${needsReview} 行疑似檢驗資料未能完整解析，請在表格中人工補正。`);
  if (skippedLineCount > 0) {
    warnings.splice(ocrUsed ? 1 : 0, 0, `已略過 ${skippedLineCount} 行頁首、頁尾或個資內容`);
  }
  if (text.trim() && !ocrUsed && rows.length && !needsReview) warnings.push('擷取結果必須逐列人工核對，辨識結果不代表醫療正確性。');
  return warnings;
}

export function positionedItemsFromPdf(content: { items: unknown[] }): PositionedTextItem[] {
  return content.items.flatMap((rawItem) => {
    const item = rawItem as { str?: unknown; transform?: unknown; width?: unknown; height?: unknown };
    if (typeof item.str !== 'string') return [];
    const transform = Array.isArray(item.transform) ? item.transform.map(Number) : [];
    return [{
      text: item.str,
      x: Number.isFinite(transform[4]) ? transform[4] : 0,
      y: Number.isFinite(transform[5]) ? transform[5] : 0,
      width: typeof item.width === 'number' ? item.width : undefined,
      height: typeof item.height === 'number' ? item.height : undefined,
      fontSize: transform.length >= 4 ? Math.max(Math.abs(transform[0]), Math.abs(transform[3])) : undefined,
    }];
  });
}

async function renderPdfPage(page: { getViewport: (options: { scale: number }) => { width: number; height: number }; render: (options: { canvasContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<unknown> } }): Promise<unknown> {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({ canvasContext: canvasContext(canvas), viewport }).promise;
  return canvas;
}

async function extractPdf(file: File, onProgress: ((progress: ExtractionProgress) => void) | undefined, signal: AbortSignal | undefined): Promise<ExtractedReport> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = '/report-assets/pdf.worker.min.mjs';
  const data = new Uint8Array(await file.arrayBuffer());
  let document: { numPages: number; getPage: (pageNumber: number) => Promise<any> };
  try {
    document = await pdfjs.getDocument({ data }).promise;
  } catch {
    throw new Error(REPORT_EXTRACTION_ERRORS.corruptPdf);
  }
  if (document.numPages > MAX_PDF_PAGES) throw new Error(REPORT_EXTRACTION_ERRORS.pages);

  const pages: Array<{ page: any; text: string }> = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      throwIfAborted(signal);
      onProgress?.({ stage: 'reading', current: pageNumber, total: document.numPages });
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push({ page, text: reconstructTextLines(positionedItemsFromPdf(content)).join('\n') });
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error(REPORT_EXTRACTION_ERRORS.corruptPdf);
  }

  const rawText = pages.map((page) => page.text).join('\n');
  const text = redactReportText(rawText);
  const textRows = parseExtractedRows(text);
  const requiresOcr = shouldUsePdfOcr(pages.map((page) => page.text));
  if (!requiresOcr) {
    onProgress?.({ stage: 'complete', current: document.numPages, total: document.numPages });
    return { text, pages: document.numPages, method: 'pdf_text', warnings: buildWarnings(rawText, textRows) };
  }

  let worker: Awaited<ReturnType<typeof createOcrWorker>> | null = null;
  try {
    worker = await createOcrWorker();
    const ocrPages: string[] = [];
    let rotation: ImageRotation = 0;
    for (const [index, page] of pages.entries()) {
      throwIfAborted(signal);
      onProgress?.({ stage: 'ocr', current: index + 1, total: pages.length });
      const canvas = await renderPdfPage(page.page);
      const result = await recognizeWithBestOrientation(worker, canvas, signal, 0);
      ocrPages.push(result.text);
      rotation = result.rotation;
    }
    const rawOcrText = ocrPages.join('\n');
    const ocrText = redactReportText(rawOcrText);
    const rows = parseExtractedRows(ocrText);
    onProgress?.({ stage: 'complete', current: document.numPages, total: document.numPages });
    return { text: ocrText, pages: document.numPages, method: 'ocr', warnings: buildWarnings(rawOcrText, rows, true), rotation };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error(REPORT_EXTRACTION_ERRORS.corruptPdf);
  } finally {
    if (worker) await worker.terminate().catch(() => undefined);
  }
}

async function extractImage(file: File, onProgress: ((progress: ExtractionProgress) => void) | undefined, signal: AbortSignal | undefined, preferredRotation: ImageRotation, autoRotate: boolean): Promise<ExtractedReport> {
  throwIfAborted(signal);
  onProgress?.({ stage: 'ocr', current: 0, total: 1 });
  let worker: Awaited<ReturnType<typeof createOcrWorker>> | null = null;
  try {
    const source = await decodeImageFile(file);
    worker = await createOcrWorker();
    const result = await recognizeWithBestOrientation(worker, source, signal, preferredRotation, autoRotate);
    const details = parseExtractedRowsDetailed(result.text);
    const safeText = redactReportText(result.text);
    const rows = details.rows;
    const reliable = (!result.confidence || result.confidence >= 50) && rows.some(isRecognizableReportRow);
    // Notices must describe the rows actually returned: unreliable OCR text is
    // discarded, so its parsed rows must not trigger review/disclaimer notices.
    const returnedRows = reliable ? rows : [];
    onProgress?.({ stage: 'complete', current: 1, total: 1 });
    return {
      text: reliable ? safeText : '',
      pages: 1,
      method: 'ocr',
      warnings: [
        ...(result.recognitionFailed ? [OCR_RECOGNITION_ERROR] : []),
        ...(!returnedRows.length ? [UNREADABLE_OCR_MESSAGE] : []),
        ...(returnedRows.length ? ['OCR 結果必須逐列人工核對，辨識分數不代表醫療正確性。'] : []),
        ...(returnedRows.length ? buildWarnings(result.text, returnedRows, false, details.skippedLineCount) : []),
      ].filter((warning, index, all) => all.indexOf(warning) === index),
      rotation: result.rotation,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    if (error instanceof Error && error.message === REPORT_EXTRACTION_ERRORS.corruptImage) throw error;
    throw new Error(REPORT_EXTRACTION_ERRORS.corruptImage);
  } finally {
    if (worker) await worker.terminate().catch(() => undefined);
  }
}

export async function extractReportFile(
  file: File,
  onProgress?: (progress: ExtractionProgress) => void,
  signal?: AbortSignal,
  options?: { rotation?: ImageRotation; autoRotate?: boolean },
): Promise<ExtractedReport> {
  if (file.size > MAX_FILE_BYTES) throw new Error(REPORT_EXTRACTION_ERRORS.oversized);
  throwIfAborted(signal);
  const kind = getFileKind(file);
  if (kind === 'pdf') return extractPdf(file, onProgress, signal);
  return extractImage(file, onProgress, signal, options?.rotation ?? 0, options?.autoRotate ?? true);
}

export { parseExtractedRows };

export function shouldUsePdfOcr(pageTexts: string[]): boolean {
  const totalCharacters = pageTexts.reduce((total, page) => total + page.replace(/\s/g, '').length, 0);
  const averageCharacters = pageTexts.length ? totalCharacters / pageTexts.length : 0;
  return totalCharacters < 20 || averageCharacters < 20;
}
