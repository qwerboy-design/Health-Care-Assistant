'use client';

import { useMemo, useRef, useState } from 'react';
import { extractReportFile, NO_LAB_ROWS_MESSAGE, UNREADABLE_OCR_MESSAGE, type ExtractionProgress, type ImageRotation } from '@/lib/reports/browser/extract';
import { parseExtractedRows, parseExtractedRowsDetailed, redactReportText } from '@/lib/reports/parser';
import type { ReportInput, ReportItem } from '@/lib/reports/types';
import { REPORT_INPUT_MAX_BYTES } from '@/lib/reports/types';
import { useLocale } from '@/components/providers/LocaleProvider';

type DraftRow = Omit<ReportItem, 'confirmed'> & { confirmed: boolean; needsReview?: boolean; rawText?: string };

type Props = { isOpen: boolean; onClose: () => void; onConfirm: (input: ReportInput) => void | Promise<void> };

const ACCEPTED_FILE_TYPES = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';

function reportInputByteLength(input: ReportInput): number {
  return new TextEncoder().encode(JSON.stringify(input)).byteLength;
}

export function ReportImportModal({ isOpen, onClose, onConfirm }: Props) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [rotation, setRotation] = useState<ImageRotation>(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const extractionController = useRef<AbortController | null>(null);
  const manualRowSequence = useRef(1);
  const { t } = useLocale();
  const parsedRows = useMemo<DraftRow[]>(() => rows.length ? rows : parseExtractedRows(text).map((row) => ({ ...row, confirmed: false })), [rows, text]);
  if (!isOpen) return null;

  function close() {
    extractionController.current?.abort();
    extractionController.current = null;
    setText(''); setRows([]); setFileName(''); setSourceFile(null); setRotation(0); setWarnings([]); setProgress(null); setError('');
    onClose();
  }

  async function runExtraction(file: File, nextRotation: ImageRotation, autoRotate: boolean) {
    setBusy(true); setError(''); setWarnings([]); setProgress(null);
    const controller = new AbortController();
    extractionController.current = controller;
    try {
      const result = await extractReportFile(file, setProgress, controller.signal, { rotation: nextRotation, autoRotate });
      const safeText = redactReportText(result.text);
      setText(safeText);
      setRows(parseExtractedRows(safeText).map((row) => ({ ...row, confirmed: false, extractionMethod: result.method })));
      setWarnings(result.warnings);
      setRotation(result.rotation ?? nextRotation);
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError(cause instanceof Error ? cause.message : '無法擷取報告');
      }
    } finally {
      if (extractionController.current === controller) extractionController.current = null;
      setBusy(false); setProgress(null);
    }
  }

  async function onFile(file?: File) {
    if (!file) return;
    setFileName(file.name); setSourceFile(file); setRotation(0);
    await runExtraction(file, 0, true);
  }

  async function rotate(delta: -90 | 90) {
    if (!sourceFile || busy) return;
    const nextRotation = ((rotation + delta + 360) % 360) as ImageRotation;
    await runExtraction(sourceFile, nextRotation, false);
  }

  function update(index: number, field: keyof DraftRow, value: string | boolean) {
    setRows(parsedRows.map((row, rowIndex) => rowIndex === index
      ? { ...row, [field]: value, ...(field !== 'confirmed' ? { confirmed: false } : {}) }
      : row));
  }

  function removeRow(index: number) {
    const nextRows = parsedRows.filter((_, rowIndex) => rowIndex !== index);
    setRows(nextRows);
    if (nextRows.length === 0) setText('');
    setError('');
  }

  function addRow() {
    const existingIds = new Set(parsedRows.map((row) => row.id));
    let id = `manual_${manualRowSequence.current++}`;
    while (existingIds.has(id)) id = `manual_${manualRowSequence.current++}`;
    setText('');
    setRows([...parsedRows, {
      id,
      label: '', value: '', unit: '', referenceRange: '', originalFlag: '', confirmed: false,
      extractionMethod: 'manual',
    }]);
    setError('');
  }

  async function confirm() {
    if (!parsedRows.length || parsedRows.some((row) => !row.label || !row.value || !row.confirmed)) {
      setError(t('chat.reportConfirmRequired')); return;
    }
    const input: ReportInput = {
      reportId: crypto.randomUUID(), reportType: 'adult_health_check',
      sourceKind: fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : fileName ? 'image' : 'manual',
      applicability: 'general_adult',
      items: parsedRows.map(({ id, label, value, unit, referenceRange, originalFlag, confirmed, extractionMethod }) => ({ id, label, value, unit, referenceRange, originalFlag, confirmed: true, extractionMethod })),
    };
    if (reportInputByteLength(input) > REPORT_INPUT_MAX_BYTES) {
      setError('報告內容超過 128 KB 上限'); return;
    }
    setBusy(true); setError('');
    try {
      await onConfirm(input);
      setRows([]); setText(''); setFileName(''); setSourceFile(null); setWarnings([]); setRotation(0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '報告分析失敗，請稍後再試');
    } finally {
      setBusy(false);
    }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={t('chat.reportTitle')}>
    <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl bg-white p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{t('chat.reportTitle')}</h2><button onClick={close} aria-label={t('common.close') || 'Close'}>×</button></div>
      <p className="mb-3 text-sm text-gray-600">{t('chat.reportPrivacy')}</p>
      <input type="file" accept={ACCEPTED_FILE_TYPES} onChange={(event) => onFile(event.target.files?.[0])} disabled={busy} />
      {sourceFile && !sourceFile.name.toLowerCase().endsWith('.pdf') && <div className="mt-2 flex gap-2 text-sm"><button className="rounded border px-3 py-1" onClick={() => rotate(-90)} disabled={busy}>左轉 90°</button><button className="rounded border px-3 py-1" onClick={() => rotate(90)} disabled={busy}>右轉 90°</button><span className="self-center text-gray-500">目前方向：{rotation}°</span></div>}
      {progress && <p className="my-2 text-sm" role="status">{t('chat.reportProcessing')}：{progress.stage === 'ocr' ? 'OCR' : progress.stage} {progress.current}/{progress.total}</p>}
      {warnings.length > 0 && <ul className="my-2 list-disc rounded border border-amber-200 bg-amber-50 p-3 pl-7 text-sm text-amber-900" role="status">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
      <textarea className="mt-3 min-h-24 w-full rounded border p-2" value={text} onChange={(event) => {
        const source = event.target.value;
        const details = parseExtractedRowsDetailed(source);
        setText(redactReportText(source));
        setRows([]);
        setWarnings(details.rows.length > 0 && details.skippedLineCount > 0 ? [`已略過 ${details.skippedLineCount} 行頁首、頁尾或個資內容`] : []);
        setError('');
      }} placeholder={t('chat.reportPlaceholder')} />
      {text.trim() && !parsedRows.length && !warnings.includes(NO_LAB_ROWS_MESSAGE) && !warnings.includes(UNREADABLE_OCR_MESSAGE) && <p className="my-2 text-sm text-amber-700" role="status">{NO_LAB_ROWS_MESSAGE}</p>}
      {error && <p className="my-2 text-sm text-red-600" role="alert">{error}</p>}
      <div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead><tr><th>確認</th><th>項目</th><th>數值</th><th>單位</th><th>原報告範圍</th><th>旗標</th><th>操作</th></tr></thead><tbody>{parsedRows.map((row, index) => <tr key={row.id}><td><input type="checkbox" checked={row.confirmed} onChange={(event) => update(index, 'confirmed', event.target.checked)} /></td>{(['label', 'value', 'unit', 'referenceRange', 'originalFlag'] as const).map((field) => <td key={field}><input aria-label={`${field}-${index + 1}`} className="m-1 w-full rounded border p-1" value={row[field]} onChange={(event) => update(index, field, event.target.value)} />{field === 'label' && row.needsReview && <span className="text-xs text-amber-700">需人工確認</span>}</td>)}<td><button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => removeRow(index)}>刪除</button></td></tr>)}</tbody></table></div>
      <div className="mt-3"><button type="button" className="rounded border px-3 py-1 text-sm" onClick={addRow}>新增一列</button></div>
      <div className="mt-4 flex justify-end gap-2"><button className="rounded border px-4 py-2" onClick={close}>{t('common.cancel')}</button><button className="rounded bg-medical-purple px-4 py-2 text-white disabled:opacity-50" disabled={busy} onClick={confirm}>{t('chat.reportConfirm')}</button></div>
    </div>
  </div>;
}
