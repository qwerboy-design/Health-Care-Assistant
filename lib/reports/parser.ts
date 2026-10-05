import { getKnowledgeKeyForLabel } from './knowledge';
import {
  isReportPhiLikeLine,
  normalizeReportLabel,
  normalizeReportText,
  normalizeReportUnit,
  redactReportTextLine,
} from './normalize';

export { normalizeReportLabel, normalizeReportText };

export type PositionedTextItem = {
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
};

export type ParsedExtractedRow = {
  id: string;
  label: string;
  value: string;
  unit: string;
  referenceRange: string;
  originalFlag: string;
  confirmed: false;
  needsReview?: boolean;
  rawText?: string;
};

export type ParsedExtractedRows = {
  rows: ParsedExtractedRow[];
  skippedLineCount: number;
};

type TextLine = { items: PositionedTextItem[]; y: number; fontSize: number };

function median(values: number[]): number {
  if (!values.length) return 1;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function itemFontSize(item: PositionedTextItem): number {
  return Math.max(1, item.fontSize ?? item.height ?? 10);
}

function itemCharacterWidth(item: PositionedTextItem): number {
  const characters = Math.max(1, [...item.text].length);
  return Math.max(1, (item.width ?? itemFontSize(item) * characters * 0.55) / characters);
}

function itemEnd(item: PositionedTextItem): number {
  return item.x + (item.width ?? itemCharacterWidth(item) * [...item.text].length);
}

function startsWithCjk(value: string): boolean {
  return /^\p{Script=Han}/u.test(value);
}

function endsWithCjk(value: string): boolean {
  return /\p{Script=Han}$/u.test(value);
}

function formatTextLine(line: TextLine): string {
  const sorted = [...line.items].sort((left, right) => left.x - right.x);
  const medianCharWidth = median(sorted.map(itemCharacterWidth));
  const columnGap = Math.max(medianCharWidth * 8, line.fontSize * 4);
  let output = '';
  for (const [index, item] of sorted.entries()) {
    const previous = sorted[index - 1];
    if (previous) {
      const gap = item.x - itemEnd(previous);
      const joinCjk = gap <= Math.max(2, line.fontSize * 0.6) && endsWithCjk(previous.text) && startsWithCjk(item.text);
      output += joinCjk ? '' : (gap > columnGap ? '\t' : ' ');
    }
    output += item.text;
  }
  return output.trim();
}

function lineHasReportValue(text: string): boolean {
  return text.split('\t').some((cell) => isPlausibleReportValue(cell));
}

function isLabelOnlyLine(text: string): boolean {
  return text.split('\t').length === 1 && isPlausibleReportLabel(text) && !lineHasReportValue(text);
}

function joinWrappedColumnLines(lines: TextLine[]): string[] {
  const formatted = lines.map((line) => ({ text: formatTextLine(line), y: line.y, fontSize: line.fontSize }));
  const groups: Array<typeof formatted> = [];
  for (const line of formatted) {
    const previous = groups[groups.length - 1]?.[groups[groups.length - 1].length - 1];
    const closeEnough = previous && Math.abs(previous.y - line.y) <= Math.max(previous.fontSize, line.fontSize) * 1.25;
    if (previous && closeEnough && (isLabelOnlyLine(previous.text) || isLabelOnlyLine(line.text))) {
      groups[groups.length - 1].push(line);
    } else {
      groups.push([line]);
    }
  }

  return groups.flatMap((group) => {
    if (group.length < 2 || !group.some((line) => isLabelOnlyLine(line.text))) return [group[0].text, ...group.slice(1).map((line) => line.text)];
    const labels: string[] = [];
    const dataCells: string[] = [];
    for (const line of group) {
      const cells = line.text.split(/[\t\s]+/u).map((cell) => cell.trim()).filter(Boolean);
      const valueIndex = cells.findIndex((cell) => isPlausibleReportValue(cell));
      if (valueIndex >= 0) {
        labels.push(...cells.slice(0, valueIndex).filter((cell) => isPlausibleReportLabel(cell)));
        dataCells.push(...cells.slice(valueIndex));
      } else if (cells.length === 1 && isPlausibleReportLabel(cells[0])) {
        labels.push(cells[0]);
      }
    }
    if (!labels.length || !dataCells.length) return group.map((line) => line.text);
    return [`${labels.join(' ')}\t${dataCells.join('\t')}`];
  });
}

function detectColumnGutter(lines: TextLine[]): number | null {
  const candidates: number[] = [];
  for (const line of lines) {
    const sorted = [...line.items].sort((left, right) => left.x - right.x);
    const medianCharWidth = median(sorted.map(itemCharacterWidth));
    const threshold = Math.max(medianCharWidth * 8, line.fontSize * 4);
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      const gap = current.x - itemEnd(previous);
      if (gap > threshold) candidates.push(itemEnd(previous) + gap / 2);
    }
  }
  if (!candidates.length) return null;

  const scored = candidates.map((gutter) => {
    let leftRows = 0;
    let rightRows = 0;
    let leftLabelRows = 0;
    let rightLabelRows = 0;
    let pairedRows = 0;
    let tableLines = 0;
    for (const line of lines) {
      const left = { ...line, items: line.items.filter((item) => item.x < gutter) };
      const right = { ...line, items: line.items.filter((item) => item.x >= gutter) };
      const leftText = left.items.length ? formatTextLine(left) : '';
      const rightText = right.items.length ? formatTextLine(right) : '';
      const leftFirstCell = leftText.split('\t').map((cell) => cell.trim()).find(Boolean) ?? '';
      const rightFirstCell = rightText.split('\t').map((cell) => cell.trim()).find(Boolean) ?? '';
      const leftHasRow = parseExtractedRows(leftText).some(isRecognizableReportRow);
      const rightHasRow = parseExtractedRows(rightText).some(isRecognizableReportRow);
      if (isPlausibleReportLabel(leftFirstCell)) leftLabelRows += 1;
      if (isPlausibleReportLabel(rightFirstCell)) rightLabelRows += 1;
      if (leftHasRow) leftRows += 1;
      if (rightHasRow) rightRows += 1;
      if (leftHasRow || rightHasRow) tableLines += 1;
      if (leftHasRow && rightHasRow) pairedRows += 1;
    }
    const minimumSideRows = lines.length < 10 ? 1 : 4;
    const rowCoverage = tableLines ? (leftRows + rightRows) / tableLines : 0;
    const valid = leftRows >= minimumSideRows && rightRows >= minimumSideRows
      && leftLabelRows >= minimumSideRows && rightLabelRows >= minimumSideRows && rowCoverage >= 1;
    return { gutter, leftRows, rightRows, leftLabelRows, rightLabelRows, pairedRows, tableLines, rowCoverage, valid };
  });
  const best = scored
    .filter((candidate) => candidate.valid)
    .sort((left, right) => (
      (right.leftLabelRows + right.rightLabelRows) - (left.leftLabelRows + left.rightLabelRows)
      || right.pairedRows - left.pairedRows
      || Math.min(right.leftRows, right.rightRows) - Math.min(left.leftRows, left.rightRows)
    ))[0];
  return best?.gutter ?? null;
}

/** Reconstruct PDF.js text items with relative spacing and stable two-column order. */
export function reconstructTextLines(items: PositionedTextItem[]): string[] {
  const cleaned = items
    .map((item) => ({ ...item, text: normalizeReportText(item.text) }))
    .filter((item) => item.text.length > 0);
  const lines: TextLine[] = [];

  for (const item of cleaned) {
    const size = itemFontSize(item);
    const tolerance = Math.max(1, size * 0.55);
    const matching = lines
      .map((line, index) => ({ line, index, distance: Math.abs(line.y - item.y) }))
      .filter(({ line, distance }) => distance <= Math.max(tolerance, line.fontSize * 0.55))
      .sort((left, right) => left.distance - right.distance)[0];
    if (matching) {
      matching.line.items.push(item);
      matching.line.y = (matching.line.y + item.y) / 2;
      matching.line.fontSize = Math.max(matching.line.fontSize, size);
    } else {
      lines.push({ items: [item], y: item.y, fontSize: size });
    }
  }

  const ordered = lines.sort((left, right) => right.y - left.y);
  const gutter = detectColumnGutter(ordered);
  if (gutter === null) return ordered.map(formatTextLine);

  const leftLines = ordered
    .map((line) => ({ ...line, items: line.items.filter((item) => item.x < gutter) }))
    .filter((line) => line.items.length > 0)
  const rightLines = ordered
    .map((line) => ({ ...line, items: line.items.filter((item) => item.x >= gutter) }))
    .filter((line) => line.items.length > 0);
  const leftText = joinWrappedColumnLines(leftLines);
  const rightText = joinWrappedColumnLines(rightLines);
  return [...leftText, ...rightText];
}

const HEADER_WORDS = /(?:test|item|result|value|unit|reference|range|flag|檢驗項目|項目|結果|數值|單位|參考值|參考範圍|旗標)/iu;
const REPORT_TITLE = /(?:laboratory|lab(?:oratory)?\s+report|health\s+check|健檢報告|檢驗報告|檢查報告|醫療院所|hospital|clinic)/iu;
const ADDRESS_LINE = /(?:address|地址|street|road|avenue|郵遞區號|hospital|clinic|醫院|院區|路\s*\d*\s*段|街|號)/iu;
const DATE_ONLY = /^(?:date|時間|日期)?\s*\d{2,4}[/-年]\d{1,2}[/-月]\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/iu;
const PAGE_LINE = /^(?:page\s+\d+(?:\s+of\s+\d+)?|第\s*\d+\s*頁)(?:\s*\/\s*\d+)?$/iu;
const KNOWN_CJK_LAB_TERM = /(?:血糖|糖化血色素|膽固醇|三酸甘油脂|轉胺酶|肌酸酐|腎絲球|尿蛋白|尿液潛血|血紅素|白血球|血小板)/u;
const LATIN_LABEL = /[a-z]{2,}/iu;

export function isPhiLikeLine(line: string): boolean {
  return isReportPhiLikeLine(line);
}

export function isJunkReportLine(line: string): boolean {
  const normalized = normalizeReportText(line);
  if (!normalized) return true;
  if (isPhiLikeLine(normalized) || PAGE_LINE.test(normalized) || DATE_ONLY.test(normalized)) return true;
  if (REPORT_TITLE.test(normalized) && !getKnowledgeKeyForLabel(normalized)) return true;
  if (ADDRESS_LINE.test(normalized) && !getKnowledgeKeyForLabel(normalized)) return true;
  const headerMatches = normalized.match(new RegExp(HEADER_WORDS.source, 'giu')) ?? [];
  return headerMatches.length >= 2 && !/[-+]?\d+(?:[.,]\d+)?/.test(normalized);
}

const VALUE_TOKEN = /(?:^|\s)([<>≤≥]?\s*[-+]?\d+(?:[.,]\d+)?|positive|negative|trace|normal|陰性|陽性|微量|[+-](?:\/[+-])?|[1-4]\+)(?=\s|$)/iu;
const RANGE_TOKEN = /(?:^|\s)((?:<=|>=|<|>|≤|≥)\s*[-+]?\d+(?:[.,]\d+)?|[-+]?\d+(?:[.,]\d+)?\s*(?:-|~)\s*[-+]?\d+(?:[.,]\d+)?|positive|negative|trace|normal|陰性|陽性|微量)(?=\s|$)/iu;
const FLAG_TOKEN = /(?:^|\s)(High|Low|H|L|A|↑|↓|\*)(?=\s|$)$/iu;
const UNIT_TOKEN = /^(?:%|(?:x)?\d+(?:\^\d+)?(?:\/[a-zµμ0-9.*()+-]+)+|[a-zµμ]+[a-zµμ0-9^.*()+-]*(?:\/[a-zµμ0-9^.*()+-]+)*)$/iu;

export function isPlausibleReportLabel(value: string): boolean {
  const label = normalizeReportText(value);
  if ([...label].filter((character) => /[a-z\p{Script=Han}]/iu.test(character)).length < 2) return false;
  const meaningful = [...label].filter((character) => /[a-z\p{Script=Han}]/iu.test(character)).length;
  const symbols = [...label].filter((character) => !/[a-z\p{Script=Han}0-9\s()/-]/iu.test(character)).length;
  if (symbols > Math.max(2, Math.floor(meaningful * 0.35))) return false;
  return Boolean(getKnowledgeKeyForLabel(label) || LATIN_LABEL.test(label) || KNOWN_CJK_LAB_TERM.test(label));
}

export function isPlausibleReportValue(value: string): boolean {
  const normalized = normalizeReportText(value);
  return /^([<>≤≥]?\s*[-+]?\d+(?:[.,]\d+)?|positive|negative|trace|normal|陰性|陽性|微量|[+-](?:\/[+-])?|[1-4]\+)$/iu.test(normalized);
}

function isUnitLike(value: string): boolean {
  return UNIT_TOKEN.test(normalizeReportText(value));
}

function isReferenceLike(value: string): boolean {
  const normalized = normalizeReportText(value);
  return RANGE_TOKEN.test(normalized) && normalized.length > 0;
}

export function isPlausibleReportRow(row: Pick<ParsedExtractedRow, 'label' | 'value' | 'unit' | 'referenceRange'>): boolean {
  if (!isPlausibleReportLabel(row.label) || !isPlausibleReportValue(row.value)) return false;
  return isUnitLike(row.unit) || isReferenceLike(row.referenceRange);
}

export function isRecognizableReportRow(row: Pick<ParsedExtractedRow, 'label' | 'value' | 'unit' | 'referenceRange'>): boolean {
  return isPlausibleReportRow(row) || Boolean(getKnowledgeKeyForLabel(row.label) && isPlausibleReportValue(row.value));
}

function makeId(label: string, index: number, usedIds: Set<string>): string {
  const knownId = getKnowledgeKeyForLabel(label);
  const base = knownId || `manual_${index + 1}`;
  let id: string = base;
  let duplicate = 2;
  while (usedIds.has(id)) id = `${base}_${duplicate++}`;
  usedIds.add(id);
  return id;
}

function buildRow(
  cells: { label?: string; value?: string; unit?: string; referenceRange?: string; originalFlag?: string },
  index: number,
  usedIds: Set<string>,
  rawText?: string,
  needsReview = false,
): ParsedExtractedRow {
  const sourceLabel = normalizeReportText(cells.label ?? '');
  const label = sourceLabel.replace(/\bGIucose\b/gu, 'Glucose');
  const normalizedUnit = normalizeReportUnit(cells.unit ?? '');
  const rowNeedsReview = needsReview || normalizedUnit.corrected || hasOcrGarbageLabel(sourceLabel);
  return {
    id: makeId(label || rawText || 'manual', index, usedIds),
    label,
    value: normalizeReportText(cells.value ?? ''),
    unit: normalizedUnit.value,
    referenceRange: normalizeReportText(cells.referenceRange ?? ''),
    originalFlag: normalizeReportText(cells.originalFlag ?? ''),
    confirmed: false,
    ...(rowNeedsReview ? { needsReview: true, ...(rawText ? { rawText } : {}) } : {}),
  };
}

function hasOcrGarbageLabel(label: string): boolean {
  if (/\bGIucose\b/u.test(label)) return true;
  const tokens = label.match(/[A-Za-z][A-Za-z0-9]{4,}/gu) ?? [];
  return tokens.some((token) => {
    if (getKnowledgeKeyForLabel(token) || getKnowledgeKeyForLabel(label)) return false;
    return (/[A-Z]/u.test(token) && /\d/u.test(token)) || !/[AEIOU]/iu.test(token);
  });
}

function removeTrailingFlag(value: string): { body: string; flag: string } {
  const normalized = normalizeReportText(value);
  const match = normalized.match(FLAG_TOKEN);
  if (!match || match.index === undefined) return { body: normalized, flag: '' };
  return { body: normalized.slice(0, match.index).trim(), flag: match[1] };
}

function splitUnitAndRange(unitValue: string, rangeValue: string, flagValue: string): { unit: string; referenceRange: string; originalFlag: string } {
  let unit = normalizeReportText(unitValue);
  let referenceRange = normalizeReportText(rangeValue);
  let originalFlag = normalizeReportText(flagValue);

  const rangeWithFlag = removeTrailingFlag(referenceRange);
  referenceRange = rangeWithFlag.body;
  if (!originalFlag) originalFlag = rangeWithFlag.flag;

  const unitRange = unit.match(RANGE_TOKEN);
  if (unitRange && unitRange.index !== undefined) {
    const before = unit.slice(0, unitRange.index).trim();
    const after = unit.slice(unitRange.index + unitRange[0].length).trim();
    unit = before;
    if (!referenceRange) referenceRange = unitRange[1].trim();
    if (!originalFlag) originalFlag = removeTrailingFlag(after).flag;
  }

  const unitFlag = removeTrailingFlag(unit);
  if (unitFlag.flag && !originalFlag) {
    unit = unitFlag.body;
    originalFlag = unitFlag.flag;
  }
  if (!referenceRange && unit && !isUnitLike(unit) && isReferenceLike(unit)) {
    referenceRange = unit;
    unit = '';
  }
  return { unit, referenceRange, originalFlag };
}

function parseDelimitedRow(line: string, index: number, usedIds: Set<string>): ParsedExtractedRow | null {
  if (!/[\t|]/u.test(line)) return null;
  const cells = line.split(/[\t|]/u).map((cell) => normalizeReportText(cell));
  if (cells.length < 2 || !cells[0] || !isPlausibleReportLabel(cells[0]) || !isPlausibleReportValue(cells[1])) return null;
  const split = splitUnitAndRange(cells[2] ?? '', cells[3] ?? '', cells[4] ?? '');
  return buildRow({ label: cells[0], value: cells[1], ...split }, index, usedIds);
}

function parseLooseRow(line: string, index: number, usedIds: Set<string>): ParsedExtractedRow | null {
  const valueMatch = line.match(VALUE_TOKEN);
  if (!valueMatch || valueMatch.index === undefined) return null;
  const value = normalizeReportText(valueMatch[1]).replace(/,/g, '.').replace(/\s+/g, '');
  const label = line.slice(0, valueMatch.index).trim();
  if (!isPlausibleReportLabel(label) || !isPlausibleReportValue(value)) return null;
  const remainder = line.slice(valueMatch.index + valueMatch[0].length).trim();
  const split = splitUnitAndRange(remainder, '', '');
  return buildRow({ label, value, ...split }, index, usedIds);
}

function containsKnownLabLabel(line: string): boolean {
  return /(?:glucose|hba1c|cholesterol|ldl|hdl|triglyceride|ast|got|alt|gpt|creatinine|egfr|bun|hemoglobin|hgb|wbc|platelet|urine|血糖|糖化血色素|膽固醇|三酸甘油脂|轉胺酶|肌酸酐|腎絲球|尿蛋白|尿液潛血|血紅素|白血球|血小板)/iu.test(line);
}

function looksLikeLabLine(line: string): boolean {
  const valueMatch = line.match(VALUE_TOKEN);
  if (valueMatch?.index !== undefined) return isPlausibleReportLabel(line.slice(0, valueMatch.index).trim());
  return containsKnownLabLabel(line) && isPlausibleReportLabel(line.replace(/\?+/g, ' ').trim().split(/\s{2,}/u)[0] ?? line);
}

function buildNeedsReviewRow(line: string, index: number, usedIds: Set<string>): ParsedExtractedRow | null {
  if (!looksLikeLabLine(line)) return null;
  const valueMatch = line.match(VALUE_TOKEN);
  if (valueMatch?.index !== undefined) {
    const label = line.slice(0, valueMatch.index).trim();
    if (isPlausibleReportLabel(label)) {
      const value = normalizeReportText(valueMatch[1]).replace(/\s+/g, '');
      return buildRow({ label, value }, index, usedIds, line, true);
    }
  }
  return buildRow({ label: line }, index, usedIds, line, true);
}

export function parseExtractedRowsDetailed(text: string): ParsedExtractedRows {
  const usedIds = new Set<string>();
  const rows: ParsedExtractedRow[] = [];
  let skippedLineCount = 0;
  let rowIndex = 0;
  for (const sourceLine of text.split(/\r?\n/u)) {
    const line = normalizeReportText(sourceLine);
    if (isJunkReportLine(line)) {
      if (line) skippedLineCount += 1;
      continue;
    }

    const explicit = parseDelimitedRow(line, rowIndex, usedIds);
    if (explicit) {
      rows.push(explicit);
      rowIndex += 1;
      continue;
    }

    const loose = parseLooseRow(line, rowIndex, usedIds);
    if (loose) {
      rows.push(loose);
      rowIndex += 1;
      continue;
    }

    const tabSegments = line.split('\t').map((segment) => segment.trim()).filter(Boolean);
    const segmentRows = tabSegments.length > 1
      ? tabSegments.map((segment) => parseLooseRow(segment, rowIndex, usedIds)).filter((row): row is ParsedExtractedRow => Boolean(row))
      : [];
    if (segmentRows.length) {
      rows.push(...segmentRows);
      rowIndex += segmentRows.length;
      continue;
    }

    const needsReview = buildNeedsReviewRow(line, rowIndex, usedIds);
    if (needsReview) {
      rows.push(needsReview);
      rowIndex += 1;
    }
  }
  return { rows, skippedLineCount };
}

export function parseExtractedRows(text: string): ParsedExtractedRow[] {
  return parseExtractedRowsDetailed(text).rows;
}

/** Remove PHI lines and redact identifier fragments before text is shown in the UI. */
export function redactReportText(text: string): string {
  return text
    .split(/\r?\n/u)
    .map(redactReportTextLine)
    .filter((line): line is string => line !== null)
    .join('\n');
}
