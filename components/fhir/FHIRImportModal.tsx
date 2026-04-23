'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { processFHIRContent } from '@/lib/fhir/parser';
import { mergeFhirImportsForLLM, type FhirParsedItem } from '@/lib/fhir/mergeFhirImport';
import { redactFileName, redactFhirResource } from '@/lib/privacy/redaction';

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
  const [simpleError, setSimpleError] = useState('');
  const [parseErrors, setParseErrors] = useState<Array<{ fileName: string; message: string }>>([]);
  const [parsedItems, setParsedItems] = useState<FhirParsedItem[]>([]);
  const [loadingHint, setLoadingHint] = useState('');
  const [hasPrivacyRedactions, setHasPrivacyRedactions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const zh = locale === 'zh-TW';
  const text = {
    title: zh ? '匯入 FHIR 資料' : 'Import FHIR Data',
    close: zh ? '關閉' : 'Close',
    dropzone: zh ? '點擊或拖放 FHIR 檔案至此' : 'Click or drop FHIR files here',
    dropzoneHint: zh
      ? '支援 JSON 或 XML，可多選或拖放多個檔案（最多 20 個）'
      : 'JSON or XML; multi-select or drop multiple files (max 20)',
    selectFiles: zh ? '選擇 FHIR 檔案' : 'Select FHIR files',
    parsing: zh ? '正在解析 FHIR 資料...' : 'Parsing FHIR data...',
    parseFailed: zh ? '匯入失敗' : 'Import Failed',
    retry: zh ? '重新選擇檔案' : 'Select files again',
    parseSuccess: zh ? '解析成功' : 'Parsed successfully',
    resourceStats: zh ? '資源統計' : 'Resource statistics',
    rawJson: zh ? '查看此檔案的原始 JSON' : 'Raw JSON for this file',
    cancel: zh ? '取消' : 'Cancel',
    confirm: zh ? '確認匯入' : 'Confirm Import',
    invalidFormat: zh
      ? '請選擇 JSON 或 XML 格式的 FHIR 檔案。'
      : 'Please select a FHIR file in JSON or XML format.',
    tooManyFiles: zh
      ? `一次最多只能匯入 ${MAX_FILES} 個檔案。`
      : `You can import at most ${MAX_FILES} files at once.`,
    privacyNotice: zh
      ? '已移除姓名、識別碼與聯絡資訊等敏感資料後匯入。'
      : 'Sensitive identifiers were removed before import.',
  };

  const resetState = useCallback(() => {
    setState('idle');
    setSimpleError('');
    setParseErrors([]);
    setParsedItems([]);
    setLoadingHint('');
    setHasPrivacyRedactions(false);
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
  }, [isOpen, onClose, resetState]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  const getErrorMessage = useCallback(
    (errorCode: string): string => {
      const errorMessages: Record<string, { zhTW: string; en: string }> = {
        PARSE_ERROR: {
          zhTW: '檔案格式錯誤，請確認內容為有效的 JSON 或 XML。',
          en: 'File format error. Please ensure it is valid JSON or XML.',
        },
        MISSING_RESOURCE_TYPE: {
          zhTW: '非有效的 FHIR 資源（缺少 resourceType 欄位）。',
          en: 'Invalid FHIR resource (missing resourceType field).',
        },
        UNSUPPORTED_TYPE: {
          zhTW: '此資源類型目前不支援。',
          en: 'This resource type is not supported.',
        },
        UNKNOWN_ERROR: {
          zhTW: '處理失敗，請稍後再試。',
          en: 'Processing failed. Please try again.',
        },
      };

      const msg = errorMessages[errorCode] || errorMessages.UNKNOWN_ERROR;
      return zh ? msg.zhTW : msg.en;
    },
    [zh]
  );

  const processFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) {
      return;
    }

    const invalidExt = list.filter((file) => !isValidFhirFile(file));
    if (invalidExt.length > 0) {
      setParseErrors(
        invalidExt.map((file) => ({
          fileName: redactFileName(file.name),
          message: text.invalidFormat,
        }))
      );
      setSimpleError('');
      setHasPrivacyRedactions(false);
      setState('error');
      return;
    }

    if (list.length > MAX_FILES) {
      setSimpleError(text.tooManyFiles);
      setParseErrors([]);
      setHasPrivacyRedactions(false);
      setState('error');
      return;
    }

    setState('loading');
    setSimpleError('');
    setParseErrors([]);
    setHasPrivacyRedactions(false);
    setLoadingHint(list.length === 1 ? redactFileName(list[0].name) : `${list.length} files`);

    const fhirLocale = zh ? 'zh-TW' : 'en';
    const items: FhirParsedItem[] = [];
    const errors: Array<{ fileName: string; message: string }> = [];
    let detectedPrivacyRedactions = false;

    for (const file of list) {
      try {
        const content = await file.text();
        const result = processFHIRContent(content, fhirLocale);
        const safeFileName = redactFileName(file.name);

        if (safeFileName !== file.name) {
          detectedPrivacyRedactions = true;
        }

        if (result.success && result.summary && result.resource) {
          const redactedResource = redactFhirResource(result.resource);
          if (JSON.stringify(redactedResource) !== JSON.stringify(result.resource)) {
            detectedPrivacyRedactions = true;
          }

          items.push({
            fileName: safeFileName,
            summary: result.summary,
            resource: result.resource,
          });
        } else {
          errors.push({
            fileName: safeFileName,
            message: getErrorMessage(result.error || 'UNKNOWN_ERROR'),
          });
        }
      } catch {
        errors.push({
          fileName: redactFileName(file.name),
          message: getErrorMessage('PARSE_ERROR'),
        });
      }
    }

    if (errors.length > 0) {
      setParseErrors(errors);
      setParsedItems([]);
      setHasPrivacyRedactions(false);
      setState('error');
      return;
    }

    setParsedItems(items);
    setHasPrivacyRedactions(detectedPrivacyRedactions);
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
    if (parsedItems.length === 0) {
      return;
    }

    const fhirLocale = zh ? 'zh-TW' : 'en';
    const { llmText, rawJsonMerged } = mergeFhirImportsForLLM(parsedItems, fhirLocale);
    onImport({
      summary: llmText,
      rawJson: rawJsonMerged,
    });
    handleClose();
  };

  if (!isOpen) {
    return null;
  }

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
            {text.title}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label={text.close}
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
              <p className="mt-4 text-sm font-medium text-gray-900">{text.dropzone}</p>
              <p className="mt-1 text-xs text-gray-500">{text.dropzoneHint}</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".json,.xml,application/json,application/xml,text/xml,application/fhir+json,application/fhir+xml"
                onChange={handleFileChange}
                className="hidden"
                aria-label={text.selectFiles}
              />
            </div>
          )}

          {state === 'loading' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="mt-4 text-sm text-gray-600">{text.parsing}</p>
              <p className="mt-1 text-xs text-gray-400">{loadingHint}</p>
            </div>
          )}

          {state === 'error' && (
            <div className="py-4">
              <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-red-800">{text.parseFailed}</p>
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
                {text.retry}
              </button>
            </div>
          )}

          {state === 'preview' && parsedItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-green-600">
                <CheckCircle size={18} />
                <span className="text-sm font-medium">{text.parseSuccess}</span>
                <span className="text-xs text-gray-400">
                  {zh ? `(${parsedItems.length} 個檔案)` : `(${parsedItems.length} files)`}
                </span>
              </div>

              {hasPrivacyRedactions && (
                <p
                  role="status"
                  className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700"
                >
                  {text.privacyNotice}
                </p>
              )}

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
                              ? `另有 ${item.summary.details.length - 5} 項`
                              : `${item.summary.details.length - 5} more`}
                          </p>
                        )}
                      </dl>
                      {item.summary.statistics && (
                        <>
                          <hr className="my-2 border-gray-200" />
                          <p className="mb-1 text-xs font-medium uppercase text-gray-500">
                            {text.resourceStats}
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
                        {text.rawJson}
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
            {text.cancel}
          </button>
          {state === 'preview' && (
            <button
              onClick={handleConfirm}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              {text.confirm}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
