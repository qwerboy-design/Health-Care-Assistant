'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { processFHIRContent } from '@/lib/fhir/parser';
import { FHIRSummary, FHIRResource } from '@/lib/fhir/types';
import { formatFHIRForLLM } from '@/lib/fhir/formatter';

interface FHIRImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: { summary: string; rawJson: string }) => void;
}

type ImportState = 'idle' | 'loading' | 'preview' | 'error';

export function FHIRImportModal({ isOpen, onClose, onImport }: FHIRImportModalProps) {
  const { t, locale } = useLocale();
  const [state, setState] = useState<ImportState>('idle');
  const [error, setError] = useState<string>('');
  const [summary, setSummary] = useState<FHIRSummary | null>(null);
  const [parsedResource, setParsedResource] = useState<FHIRResource | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const resetState = useCallback(() => {
    setState('idle');
    setError('');
    setSummary(null);
    setParsedResource(null);
    setFileName('');
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

  const processFile = async (file: File) => {
    setFileName(file.name);
    setState('loading');
    setError('');

    try {
      const content = await file.text();
      const fhirLocale = locale === 'zh-TW' ? 'zh-TW' : 'en';
      const result = processFHIRContent(content, fhirLocale);

      if (result.success && result.summary) {
        setSummary(result.summary);
        if (result.resource) {
          setParsedResource(result.resource);
        }
        setState('preview');
      } else {
        setError(getErrorMessage(result.error || 'UNKNOWN_ERROR'));
        setState('error');
      }
    } catch (err) {
      setError(getErrorMessage('PARSE_ERROR'));
      setState('error');
    }
  };

  const getErrorMessage = (errorCode: string): string => {
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
        zhTW: '處理失敗，請稍後重試。',
        en: 'Processing failed. Please try again.',
      },
    };

    const msg = errorMessages[errorCode] || errorMessages.UNKNOWN_ERROR;
    return locale === 'zh-TW' ? msg.zhTW : msg.en;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/json',
        'application/fhir+json',
        'text/xml',
        'application/xml',
        'application/fhir+xml',
      ];
      const isValidType = validTypes.includes(file.type) || 
        file.name.endsWith('.json') || 
        file.name.endsWith('.xml');

      if (!isValidType) {
        setError(locale === 'zh-TW' 
          ? '請選擇 JSON 或 XML 格式的 FHIR 檔案。'
          : 'Please select a FHIR file in JSON or XML format.');
        setState('error');
        return;
      }

      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleConfirm = () => {
    if (summary && parsedResource) {
      const fhirLocale = locale === 'zh-TW' ? 'zh-TW' : 'en';
      const llmText = formatFHIRForLLM(parsedResource, fhirLocale);
      onImport({
        summary: llmText,
        rawJson: summary.rawJson,
      });
      handleClose();
    }
  };

  if (!isOpen) return null;

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
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 id="fhir-modal-title" className="text-lg font-semibold text-gray-900">
            {locale === 'zh-TW' ? '匯入 FHIR 資料' : 'Import FHIR Data'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            aria-label={locale === 'zh-TW' ? '關閉' : 'Close'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          {state === 'idle' && (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-sm font-medium text-gray-900">
                {locale === 'zh-TW' ? '點擊或拖放 FHIR 檔案至此' : 'Click or drop FHIR file here'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {locale === 'zh-TW' ? '支援 JSON, XML 格式' : 'Supports JSON, XML formats'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.xml,application/json,application/xml,text/xml"
                onChange={handleFileChange}
                className="hidden"
                aria-label={locale === 'zh-TW' ? '選擇 FHIR 檔案' : 'Select FHIR file'}
              />
            </div>
          )}

          {state === 'loading' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="mt-4 text-sm text-gray-600">
                {locale === 'zh-TW' ? '正在解析 FHIR 資料...' : 'Parsing FHIR data...'}
              </p>
              <p className="mt-1 text-xs text-gray-400">{fileName}</p>
            </div>
          )}

          {state === 'error' && (
            <div className="py-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    {locale === 'zh-TW' ? '匯入失敗' : 'Import Failed'}
                  </p>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                  {fileName && (
                    <p className="mt-1 text-xs text-red-600">
                      {locale === 'zh-TW' ? '檔案' : 'File'}: {fileName}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={resetState}
                className="mt-4 w-full px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {locale === 'zh-TW' ? '重新選擇檔案' : 'Select another file'}
              </button>
            </div>
          )}

          {state === 'preview' && summary && (
            <div className="space-y-4">
              {/* Success indicator */}
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle size={18} />
                <span className="text-sm font-medium">
                  {locale === 'zh-TW' ? '解析成功' : 'Parsed successfully'}
                </span>
                <span className="text-xs text-gray-400">({fileName})</span>
              </div>

              {/* Resource type badge */}
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  {summary.resourceType}
                </span>
                <span className="text-sm text-gray-600">{summary.resourceTypeDisplay}</span>
              </div>

              {/* Summary details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  {summary.title}
                </h3>
                <dl className="space-y-2">
                  {summary.details.map((detail, index) => (
                    <div key={index} className="flex text-sm">
                      <dt className="w-1/3 text-gray-500">{detail.label}</dt>
                      <dd className="w-2/3 text-gray-900 font-medium">{detail.value}</dd>
                    </div>
                  ))}
                </dl>

                {summary.statistics && (
                  <>
                    <hr className="my-3 border-gray-200" />
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                      {locale === 'zh-TW' ? '資源統計' : 'Resource Statistics'}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(summary.statistics.byType).map(([type, count]) => (
                        <span
                          key={type}
                          className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded"
                        >
                          {type}: {count}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Collapsible raw JSON */}
              <details className="text-sm">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                  {locale === 'zh-TW' ? '查看原始 JSON' : 'View raw JSON'}
                </summary>
                <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs max-h-48">
                  {summary.rawJson}
                </pre>
              </details>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {locale === 'zh-TW' ? '取消' : 'Cancel'}
          </button>
          {state === 'preview' && (
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {locale === 'zh-TW' ? '確認匯入' : 'Confirm Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
