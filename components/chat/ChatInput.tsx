'use client';

import { useState, useRef, useEffect } from 'react';
import { FunctionSelector } from './FunctionSelector';
import { WorkloadSelector } from './WorkloadSelector';
import { FileUploader } from './FileUploader';

interface ChatInputProps {
  onSend: (message: string, options: {
    workloadLevel: 'instant' | 'basic' | 'standard' | 'professional';
    selectedFunction?: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
  }) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [workloadLevel, setWorkloadLevel] = useState<'instant' | 'basic' | 'standard' | 'professional'>('standard');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileType, setUploadedFileType] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

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
    });

    // 重置表單
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
    <div className="border-t border-gray-200 bg-white p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 功能選擇和工作量級別 */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
          >
            {showOptions ? '隱藏選項' : '顯示選項'}
            <svg
              className={`w-4 h-4 transition-transform ${showOptions ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showOptions && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <FunctionSelector value={selectedFunction} onChange={setSelectedFunction} />
              <WorkloadSelector value={workloadLevel} onChange={setWorkloadLevel} />
            </div>
          )}
        </div>

        {/* 檔案上傳 */}
        {!selectedFile && !uploadedFileUrl && (
          <FileUploader
            onFileSelect={(file) => {
              // #region agent log
              fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatInput.tsx:onFileSelect',message:'onFileSelect callback called',data:{fileIsNull:file === null,fileIsUndefined:file === undefined,hasFileName:!!file?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
              setSelectedFile(file);
              if (file) {
                setUploadedFileName(file.name);
                setUploadedFileType(file.type);
              } else {
                // #region agent log
                fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatInput.tsx:onFileSelect',message:'File is null, clearing state',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                setUploadedFileName(null);
                setUploadedFileType(null);
              }
            }}
            onUploadSuccess={(url) => {
              // #region agent log
              fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatInput.tsx:onUploadSuccess',message:'onUploadSuccess callback called',data:{url,hasUrl:!!url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
              try {
                setUploadedFileUrl(url);
                setUploadError(null); // 清除錯誤訊息
                // #region agent log
                fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatInput.tsx:onUploadSuccess',message:'setUploadedFileUrl called',data:{url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
              } catch (err: any) {
                // #region agent log
                fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatInput.tsx:onUploadSuccess',message:'Error in onUploadSuccess',data:{errorMessage:err?.message,errorName:err?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                console.error('Error in onUploadSuccess:', err);
              }
            }}
            onUploadError={(error) => {
              setUploadError(error);
            }}
          />
        )}

        {(selectedFile || uploadedFileUrl) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-900">
                📎 {uploadedFileName || selectedFile?.name} 
                {selectedFile && ` (${(selectedFile.size / 1024).toFixed(1)} KB)`}
                {uploadedFileUrl && ' ✓ 已上傳'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setUploadedFileUrl(null);
                  setUploadedFileName(null);
                  setUploadedFileType(null);
                  setUploadError(null);
                }}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                移除
              </button>
            </div>
            {uploadError && (
              <p className="text-sm text-red-600 px-2">{uploadError}</p>
            )}
          </div>
        )}

        {/* 文字輸入 */}
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入訊息... (Enter 發送, Shift+Enter 換行)"
            disabled={disabled}
            rows={1}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={disabled || (!message.trim() && !uploadedFileUrl)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            發送
          </button>
        </div>
      </form>
    </div>
  );
}
