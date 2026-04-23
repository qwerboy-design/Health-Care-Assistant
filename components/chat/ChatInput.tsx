'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { FunctionSelector } from './FunctionSelector';
import { WorkloadSelector } from './WorkloadSelector';
import { FileUploader } from './FileUploader';
import { ModelSelector } from './ModelSelector';
import { redactFileName, redactFreeText } from '@/lib/privacy/redaction';

type WorkloadLevel = 'instant' | 'basic' | 'standard' | 'professional';

interface ChatInputProps {
  onSend: (
    message: string,
    options: {
      workloadLevel: WorkloadLevel;
      selectedFunction?: string;
      fileUrl?: string;
      fileName?: string;
      fileType?: string;
      modelName?: string;
    }
  ) => void;
  disabled?: boolean;
  userCredits?: number;
  isEmptyState?: boolean;
  externalFile?: File | null;
  externalMessage?: string | null;
  onExternalMessageConsumed?: () => void;
  showFunctionSelector?: boolean;
  showWorkloadSelector?: boolean;
}

export function ChatInput({
  onSend,
  disabled = false,
  userCredits = 0,
  isEmptyState = false,
  externalFile = null,
  externalMessage = null,
  onExternalMessageConsumed,
  showFunctionSelector = true,
  showWorkloadSelector = true,
}: ChatInputProps) {
  const { t } = useLocale();
  const [message, setMessage] = useState('');
  const [selectedFunction, setSelectedFunction] = useState('');
  const [workloadLevel, setWorkloadLevel] = useState<WorkloadLevel>('standard');
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-5-20250929');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileType, setUploadedFileType] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [modelVisionWarning, setModelVisionWarning] = useState<string | null>(null);
  const [privacyAppliedNotice, setPrivacyAppliedNotice] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [allModels, setAllModels] = useState<
    Array<{ model_name: string; display_name: string; supports_vision: boolean }>
  >([]);

  const pendingRedactedMessage = redactFreeText(message).content;
  const hasRedactedMessage = Boolean(message) && pendingRedactedMessage !== message;
  const hasRedactedSelectedFile =
    selectedFile !== null && redactFileName(selectedFile.name) !== selectedFile.name;
  const hasPendingRedaction = hasRedactedMessage || hasRedactedSelectedFile;
  const redactionPendingText =
    t('chat.redactionPending') === 'chat.redactionPending'
      ? '已偵測到姓名、身分證字號等敏感資料，送出時會自動移除。'
      : t('chat.redactionPending');
  const redactionAppliedText =
    t('chat.redactionApplied') === 'chat.redactionApplied'
      ? '已移除敏感資料後送出。'
      : t('chat.redactionApplied');

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch(`/api/models?_t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.success) {
          setAllModels(data.data.models || []);
        }
      } catch (err) {
        console.error('Failed to fetch models:', err);
      }
    };

    void fetchModels();
  }, []);

  useEffect(() => {
    if (externalFile) {
      setSelectedFile(externalFile);
      setUploadedFileName(redactFileName(externalFile.name));
      setUploadedFileType(externalFile.type);
    }
  }, [externalFile]);

  useEffect(() => {
    if (externalMessage) {
      setMessage(externalMessage);
      onExternalMessageConsumed?.();
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [externalMessage, onExternalMessageConsumed]);

  useEffect(() => {
    if (!privacyAppliedNotice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPrivacyAppliedNotice(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [privacyAppliedNotice]);

  useEffect(() => {
    if (privacyAppliedNotice && (message.trim() || selectedFile)) {
      setPrivacyAppliedNotice(null);
    }
  }, [message, privacyAppliedNotice, selectedFile]);

  const checkVisionRequirement = (fileType: string | null): boolean => {
    const visionRequiredTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    return fileType ? visionRequiredTypes.includes(fileType) : false;
  };

  useEffect(() => {
    if (uploadedFileUrl && uploadedFileType) {
      const needsVision = checkVisionRequirement(uploadedFileType);
      if (needsVision) {
        const currentModel = allModels.find((model) => model.model_name === selectedModel);
        if (currentModel && !currentModel.supports_vision) {
          setModelVisionWarning(t('chat.modelVisionWarning'));
        } else {
          setModelVisionWarning(null);
        }
      } else {
        setModelVisionWarning(null);
      }
    } else {
      setModelVisionWarning(null);
    }
  }, [uploadedFileType, uploadedFileUrl, selectedModel, allModels, t]);

  const clearFileState = () => {
    setSelectedFile(null);
    setUploadedFileUrl(null);
    setUploadedFileName(null);
    setUploadedFileType(null);
    setUploadError(null);
    setModelVisionWarning(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() && !uploadedFileUrl) {
      return;
    }

    const safeMessage = pendingRedactedMessage;
    const safeFileName =
      uploadedFileName || (selectedFile ? redactFileName(selectedFile.name) : undefined);
    const redactionApplied =
      safeMessage !== message || (selectedFile ? safeFileName !== selectedFile.name : false);

    onSend(safeMessage, {
      workloadLevel,
      selectedFunction: selectedFunction || undefined,
      fileUrl: uploadedFileUrl || undefined,
      fileName: safeFileName || undefined,
      fileType: uploadedFileType || undefined,
      modelName: selectedModel || undefined,
    });

    if (redactionApplied) {
      setPrivacyAppliedNotice(redactionAppliedText);
    }

    setMessage('');
    clearFileState();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-paper-gray100 bg-paper lg:border-t-0">
      <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-paper-gray100">
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="flex w-full items-center justify-between px-4 py-2 text-sm text-paper-gray700 transition-colors hover:bg-paper-gray50 hover:text-paper-gray900"
          >
            <span className="flex items-center gap-2">
              {showOptions ? t('chat.hideOptions') : t('chat.showOptions')}
              <span className="text-xs text-paper-gray700">{t('chat.optionsHint')}</span>
            </span>
            <svg
              className={`h-4 w-4 transition-transform ${showOptions ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div
            className={`overflow-hidden transition-all ${showOptions ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}
            aria-hidden={!showOptions}
          >
            <div className="max-h-64 overflow-y-auto border-t border-paper-gray100">
              <div className="space-y-3 bg-paper-gray50 p-4">
                <ModelSelector
                  value={selectedModel}
                  onChange={setSelectedModel}
                  userCredits={userCredits}
                />
                {showFunctionSelector && (
                  <FunctionSelector value={selectedFunction} onChange={setSelectedFunction} />
                )}
                {showWorkloadSelector && (
                  <WorkloadSelector value={workloadLevel} onChange={setWorkloadLevel} />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 px-4 pt-2">
          {!selectedFile && !uploadedFileUrl && (
            <FileUploader
              variant="compact"
              onFileSelect={(file) => {
                setSelectedFile(file);
                if (file) {
                  setUploadedFileName(redactFileName(file.name));
                  setUploadedFileType(file.type);
                } else {
                  setUploadedFileName(null);
                  setUploadedFileType(null);
                }
              }}
              onUploadSuccess={(url) => {
                try {
                  setUploadedFileUrl(url);
                  setUploadError(null);
                } catch (err: any) {
                  console.error('Error in onUploadSuccess:', err);
                }
              }}
              onUploadError={(error) => {
                setUploadError(error);
              }}
            />
          )}

          {(selectedFile || uploadedFileUrl) && (
            <div className="mb-2 space-y-2">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-terracotta/20 bg-terracotta/10 p-2">
                <span className="min-w-0 flex-1 truncate text-sm text-paper-gray900">
                  ?? {uploadedFileName || selectedFile?.name}
                  {selectedFile && ` (${(selectedFile.size / 1024).toFixed(1)} KB)`}
                  {uploadedFileUrl && ` ??${t('chat.uploaded')}`}
                </span>
                <button
                  type="button"
                  onClick={clearFileState}
                  className="flex-shrink-0 text-sm text-terracotta hover:text-terracotta-deep"
                >
                  {t('chat.remove')}
                </button>
              </div>
              {uploadError && <p className="px-2 text-sm text-error">{uploadError}</p>}
              {modelVisionWarning && (
                <p className="rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-warning">
                  {modelVisionWarning}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2">
          <div className="flex min-h-0 flex-1 flex-col gap-2 sm:flex-row lg:flex-col">
            {(privacyAppliedNotice || hasPendingRedaction) && (
              <div className="space-y-2">
                {privacyAppliedNotice && (
                  <p
                    role="status"
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                  >
                    {privacyAppliedNotice}
                  </p>
                )}
                {hasPendingRedaction && (
                  <p
                    role="status"
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700"
                  >
                    {redactionPendingText}
                  </p>
                )}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.inputPlaceholder')}
              disabled={disabled}
              rows={isEmptyState ? 3 : 1}
              className={`input-field min-h-0 flex-1 resize-none overflow-y-auto transition-all duration-300 ${
                isEmptyState ? 'max-h-[300px] lg:max-h-none' : 'max-h-[150px] lg:max-h-none'
              } lg:min-h-[7rem]`}
            />
            <button
              type="submit"
              disabled={disabled || (!message.trim() && !uploadedFileUrl)}
              className="btn-primary shrink-0 sm:self-end lg:w-full lg:self-stretch"
            >
              {t('chat.send')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
