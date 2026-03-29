'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { processFHIRContent } from '@/lib/fhir/parser';
import { mergeFhirImportsForLLM, type FhirParsedItem } from '@/lib/fhir/mergeFhirImport';

interface FHIRImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: { summary: string; rawJson: string }) => void;
}

type ImportState = 'idle' | 'loading' | 'preview' | 'error';

const MAX_FILES = 20;

function isValidFhirFile(file: File): boolean {
  const validTypes = [
    'application/json',
    'application/fhir+json',
    'text/xml',
    'application/xml',
    'application/fhir+xml',
  ];
  return (
    validTypes.includes(file.type) ||
    file.name.endsWith('.json') ||
    file.name.endsWith('.xml')
  );
}

export function FHIRImportModal({ isOpen, onClose, onImport }: FHIRImportModalProps) {
  const { locale } = useLocale();
  const [state, setState] = useState<ImportState>('idle');
  const [simpleError, setSimpleError] = useState<string>('');
  const [parseErrors, setParseErrors] = useState<Array<{ fileName: string; message: string }>>([]);
  const [parsedItems, setParsedItems] = useState<FhirParsedItem[]>([]);
  const [loadingHint, setLoadingHint] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const resetState = useCallback(() => {
    setState('idle');
    setSimpleError('');
    setParseErrors([]);
    setParsedItems([]);
    setLoadingHint('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        resetState();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, resetState, onClose]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  const getErrorMessage = useCallback(
    (errorCode: string): string => {
      const errorMessages: Record<string, { zhTW: string; en: string }> = {
        PARSE_ERROR: {
          zhTW: '檔案格式錯誤，無法解析。請確認是有效的 JSON 或 XML 格式。',
          en: 'File format error. Please ensure it is valid JSON or XML.',
        },
        MISSING_RESOURCE_TYPE: {
          zhTW: '非有效的 FHIR 資源（缺少 resourceType 欄位）。',
          en: 'Invalid FHIR resource (missing resourceType field).',
        },
        UNSUPPORTED_TYPE: {
          zhTW: '暫不支援此資源類型。',
          en: 'This resource type is not supported.',
        },
        UNKNOWN_ERROR: {
          zhTW: '處理失敗，請稍後再試。',
          en: 'Processing failed. Please try again.',
        },
      };

      const msg = errorMessages[errorCode] || errorMessages.UNKNOWN_ERROR;
      return locale === 'zh-TW' ? msg.zhTW : msg.en;
    },
    [locale]
  );

  const processFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    const invalidExt = list.filter((f) => !isValidFhirFile(f));
    if (invalidExt.length > 0) {
      setParseErrors(
        invalidExt.map((f) => ({
          fileName: f.name,
          message:
            locale === 'zh-TW'
              ? '請選擇 JSON 或 XML 格式的 FHIR 檔案。'
              : 'Please select a FHIR file in JSON or XML format.',
        }))
      );
      setSimpleError('');
      setState('error');
      return;
    }

    if (list.length > MAX_FILES) {
      setSimpleError(
        locale === 'zh-TW'
          ? `一次最多匯入 ${MAX_FILES} 個檔案。`
          : `You can import at most ${MAX_FILES} files at once.`
      );
      setParseErrors([]);
      setState('error');
      return;
    }

    setState('loading');
    setSimpleError('');
    setParseErrors([]);
    setLoadingHint(
      list.length === 1
        ? list[0].name
        : locale === 'zh-TW'
          ? `${list.length} 個檔案`
          : `${list.length} files`
    );

    const fhirLocale = locale === 'zh-TW' ? 'zh-TW' : 'en';
    const items: FhirParsedItem[] = [];
    const errors: Array<{ fileName: string; message: string }> = [];

    for (const file of list) {
      try {
        const content = await file.text();
        const result = processFHIRContent(content, fhirLocale);

        if (result.success && result.summary && result.resource) {
          items.push({
            fileName: file.name,
            summary: result.summary,
            resource: result.resource,
          });
        } else {
          errors.push({
            fileName: file.name,
            message: getErrorMessage(result.error || 'UNKNOWN_ERROR'),
          });
        }
      } catch {
        errors.push({
          fileName: file.name,
          message: getErrorMessage('PARSE_ERROR'),
        });
      }
    }

    if (errors.length > 0) {
      setParseErrors(errors);
      setParsedItems([]);
      setState('error');
      return;
    }

    setParsedItems(items);
    setState('preview');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      void processFiles(files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      void processFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleConfirm = () => {
    if (parsedItems.length === 0) return;
    const fhirLocale = locale === 'zh-TW' ? 'zh-TW' : 'en';
    const { llmText, rawJsonMerged } = mergeFhirImportsForLLM(parsedItems, fhirLocale);
    onImport({
      summary: llmText,
      rawJson: rawJsonMerged,
    });
    handleClose();
  };

  if (!isOpen) return null;

  const zh = locale === 'zh-TW';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fhir-modal-title"
    >
      <div
        ref={modalRef}
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 id="fhir-modal-title" className="text-lg font-semibold text-gray-900">
            {zh ? '匯入 FHIR 資料' : 'Import FHIR Data'}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label={zh ? '關閉' : 'Close'}
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {state === 'idle' && (
            <div
              className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-blue-400 hover:bg-blue-50"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-sm font-medium text-gray-900">
                {zh ? '點擊或拖放 FHIR 檔案至此' : 'Click or drop FHIR files here'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {zh
                  ? '支援 JSON、XML；可一次選擇或多檔拖放（最多 20 個）'
                  : 'JSON or XML; multi-select or drop multiple files (max 20)'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".json,.xml,application/json,application/xml,text/xml,application/fhir+json,application/fhir+xml"
                onChange={handleFileChange}
                className="hidden"
                aria-label={zh ? '選擇 FHIR 檔案' : 'Select FHIR files'}
              />
            </div>
          )}

          {state === 'loading' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="mt-4 text-sm text-gray-600">
                {zh ? '正在解析 FHIR 資料...' : 'Parsing FHIR data...'}
              </p>
              <p className="mt-1 text-xs text-gray-400">{loadingHint}</p>
            </div>
          )}

          {state === 'error' && (
            <div className="py-4">
              <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-red-800">
                    {zh ? '匯入失敗' : 'Import Failed'}
                  </p>
                  {simpleError && <p className="mt-1 text-sm text-red-700">{simpleError}</p>}
                  {parseErrors.length > 0 && (
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-700">
                      {parseErrors.map((row, idx) => (
                        <li key={`${row.fileName}-${idx}`}>
                          <span className="font-medium">{row.fileName}</span>: {row.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <button
                onClick={resetState}
                className="mt-4 w-full rounded-lg px-4 py-2 text-sm text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
              >
                {zh ? '重新選擇檔案' : 'Select files again'}
              </button>
            </div>
          )}

          {state === 'preview' && parsedItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-green-600">
                <CheckCircle size={18} />
                <span className="text-sm font-medium">
                  {zh ? '解析成功' : 'Parsed successfully'}
                </span>
                <span className="text-xs text-gray-400">
                  ({zh ? `共 ${parsedItems.length} 個檔案` : `${parsedItems.length} files`})
                </span>
              </div>

              <div className="space-y-4">
                {parsedItems.map((item) => (
                  <div
                    key={item.fileName}
                    className="rounded-lg border border-gray-200 bg-gray-50/80 p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                        {item.summary.resourceType}
                      </span>
                      <span className="text-sm text-gray-600">{item.summary.resourceTypeDisplay}</span>
                      <span className="text-xs text-gray-400">({item.fileName})</span>
                    </div>
                    <div className="rounded-md bg-white p-3">
                      <h3 className="mb-2 text-sm font-medium text-gray-700">{item.summary.title}</h3>
                      <dl className="space-y-1">
                        {item.summary.details.slice(0, 5).map((detail, index) => (
                          <div key={index} className="flex text-sm">
                            <dt className="w-1/3 text-gray-500">{detail.label}</dt>
                            <dd className="w-2/3 font-medium text-gray-900">{detail.value}</dd>
                          </div>
                        ))}
                        {item.summary.details.length > 5 && (
                          <p className="text-xs text-gray-400">
                            {zh
                              ? `… 另有 ${item.summary.details.length - 5} 項`
                              : `… ${item.summary.details.length - 5} more`}
                          </p>
                        )}
                      </dl>
                      {item.summary.statistics && (
                        <>
                          <hr className="my-2 border-gray-200" />
                          <p className="mb-1 text-xs font-medium uppercase text-gray-500">
                            {zh ? '資源統計' : 'Resource statistics'}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(item.summary.statistics.byType).map(([type, count]) => (
                              <span
                                key={type}
                                className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700"
                              >
                                {type}: {count}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <details className="mt-2 text-sm">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                        {zh ? '查看此檔原始 JSON' : 'Raw JSON for this file'}
                      </summary>
                      <pre className="mt-2 max-h-32 overflow-x-auto overflow-y-auto rounded-lg bg-gray-900 p-2 text-xs text-gray-100">
                        {item.summary.rawJson}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">
          <button
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900"
          >
            {zh ? '取消' : 'Cancel'}
          </button>
          {state === 'preview' && (
            <button
              onClick={handleConfirm}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              {zh ? '確認匯入' : 'Confirm Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
