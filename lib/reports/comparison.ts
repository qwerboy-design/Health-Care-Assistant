import type { ReportItem } from './types';

export type ReportStatus = 'high' | 'low' | 'within' | 'unknown';
export type Comparison = { itemId: string; status: ReportStatus; reason: string; value: string; unit: string; referenceRange: string };

function numberFrom(value: string): number | null {
  const match = value.replace(/,/g, '').match(/[-+]?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function compareOne(value: string, range: string): { status: ReportStatus; reason: string } {
  const actual = numberFrom(value);
  if (actual === null || !range.trim() || /[a-z]/i.test(value.replace(/[a-z%μ/.-]/gi, ''))) {
    return { status: 'unknown', reason: '數值或原報告參考範圍不是可安全比較的純量' };
  }
  const normalized = range.replace(/,/g, '').replace(/−/g, '-');
  const numbers = (normalized.match(/\d+(?:\.\d+)?/g) || []).map(Number);
  if (numbers.length < 1 || numbers.length > 2) return { status: 'unknown', reason: '參考範圍格式不明，保留原文' };
  if (/^\s*[<>≤≥]/.test(normalized)) {
    const symbol = normalized.trim()[0];
    if (symbol === '<' || symbol === '≤') return { status: actual <= numbers[0] ? 'within' : 'high', reason: `依原報告 ${symbol}${numbers[0]}` };
    return { status: actual >= numbers[0] ? 'within' : 'low', reason: `依原報告 ${symbol}${numbers[0]}` };
  }
  if (numbers.length !== 2) return { status: 'unknown', reason: '只有單一界線，無法推定完整範圍' };
  const [lower, upper] = numbers;
  if (lower > upper) return { status: 'unknown', reason: '原報告範圍上下限順序不明' };
  if (actual < lower) return { status: 'low', reason: `低於原報告範圍 ${lower}-${upper}` };
  if (actual > upper) return { status: 'high', reason: `高於原報告範圍 ${lower}-${upper}` };
  return { status: 'within', reason: `落在原報告範圍 ${lower}-${upper}` };
}

export function compareReportItem(item: ReportItem): Comparison {
  if (item.originalFlag && /(?:high|low|異常|陽性|positive|negative)/i.test(item.originalFlag)) {
    const parsed = compareOne(item.value, item.referenceRange);
    if (parsed.status !== 'unknown' && /(?:high|low|異常)/i.test(item.originalFlag)) {
      return { ...item, itemId: item.id, status: parsed.status, reason: `${parsed.reason}；原報告旗標：${item.originalFlag}` };
    }
  }
  const parsed = compareOne(item.value, item.referenceRange);
  return { ...item, itemId: item.id, ...parsed };
}

export function compareReportItems(items: ReportItem[]): Comparison[] {
  return items.map(compareReportItem);
}
