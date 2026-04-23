'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { FunctionSelector } from './FunctionSelector';
import { WorkloadSelector } from './WorkloadSelector';
import { FileUploader } from './FileUploader';
import { ModelSelector } from './ModelSelector';

interface ChatInputProps {
  onSend: (message: string, options: {
    workloadLevel: 'instant' | 'basic' | 'standard' | 'professional';
    selectedFunction?: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    modelName?: string;
  }) => void;
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
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [workloadLevel, setWorkloadLevel] = useState<'instant' | 'basic' | 'standard' | 'professional'>('standard');
  const [selectedModel, setSelectedModel] = useState<string>('claude-sonnet-4-5-20250929');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileType, setUploadedFileType] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [modelVisionWarning, setModelVisionWarning] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [allModels, setAllModels] = useState<Array<{ model_name: string; display_name: string; supports_vision: boolean }>>([]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // ?脣???芋??銵剁??冽瑼Ｘ閬死?舀?
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
    fetchModels();
  }, []);

  // ??憭?喳??獢?憒??
  useEffect(() => {
    if (externalFile) {
      setSelectedFile(externalFile);
      setUploadedFileName(externalFile.name);
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

  // 瑼Ｘ銝??獢?阡?閬??閬箇?璅∪?
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
        const currentModel = allModels.find(m => m.model_name === selectedModel);
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
  }, [uploadedFileUrl, uploadedFileType, selectedModel, allModels, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() && !uploadedFileUrl) {
      return;
    }

    onSend(message, {
      workloadLevel,
      selectedFunction: selectedFunction || undefined,
      fileUrl: uploadedFileUrl || undefined,
      fileName: uploadedFileName || undefined,
      fileType: uploadedFileType || undefined,
      modelName: selectedModel || undefined,
    });

    // ?蔭銵典
    setMessage('');
    setSelectedFile(null);
    setUploadedFileUrl(null);
    setUploadedFileName(null);
    setUploadedFileType(null);
    setUploadError(null);
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
        {/* ??豢??極雿?蝝 - ?舀?????*/}
        <div className="shrink-0 border-b border-paper-gray100">
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="w-full px-4 py-2 text-sm text-paper-gray700 hover:text-paper-gray900 hover:bg-paper-gray50 flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2">
              {showOptions ? t('chat.hideOptions') : t('chat.showOptions')}
              <span className="text-xs text-paper-gray700">
                {t('chat.optionsHint')}
              </span>
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${showOptions ? 'rotate-180' : ''}`}
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
              <div className="p-4 space-y-3 bg-paper-gray50">
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

        {/* 瑼?銝???蝎曄陛????嚗?*/}
        <div className="shrink-0 px-4 pt-2">
          {!selectedFile && !uploadedFileUrl && (
            <FileUploader
              variant="compact"
              onFileSelect={(file) => {
                setSelectedFile(file);
                if (file) {
                  setUploadedFileName(file.name);
                  setUploadedFileType(file.type);
                } else {
                  setUploadedFileName(null);
                  setUploadedFileType(null);
                }
              }}
              onUploadSuccess={(url) => {
                try {
                  setUploadedFileUrl(url);
                  setUploadError(null); // 皜?航炊閮
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
              <div className="flex items-center justify-between p-2 bg-terracotta/10 border border-terracotta/20 rounded-lg gap-2">
                <span className="text-sm text-paper-gray900 truncate flex-1 min-w-0">
                  ?? {uploadedFileName || selectedFile?.name}
                  {selectedFile && ` (${(selectedFile.size / 1024).toFixed(1)} KB)`}
                  {uploadedFileUrl && ` ??${t('chat.uploaded')}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setUploadedFileUrl(null);
                    setUploadedFileName(null);
                    setUploadedFileType(null);
                    setUploadError(null);
                    setModelVisionWarning(null);
                  }}
                  className="text-terracotta hover:text-terracotta-deep text-sm flex-shrink-0"
                >
                  {t('chat.remove')}
                </button>
              </div>
              {uploadError && (
                <p className="text-sm text-error px-2">{uploadError}</p>
              )}
              {modelVisionWarning && (
                <p className="text-sm text-warning bg-warning/10 px-3 py-2 rounded-lg border border-warning/20">{modelVisionWarning}</p>
              )}
            </div>
          )}
        </div>

        {/* ??頛詨???獢撌行?蝮勗?憛急遛 */}
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2">
          <div className="flex min-h-0 flex-1 flex-col gap-2 sm:flex-row lg:flex-col">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.inputPlaceholder')}
              disabled={disabled}
              rows={isEmptyState ? 3 : 1}
              className={`input-field min-h-0 flex-1 resize-none overflow-y-auto ${
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

