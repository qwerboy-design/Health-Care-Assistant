'use client';

import { useState, useRef } from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  maxSize?: number; // bytes
  acceptedTypes?: string[];
}

export function FileUploader({ 
  onFileSelect, 
  maxSize = 4 * 1024 * 1024, // 4MB (Vercel limit is 4.5MB)
  acceptedTypes = ['image/jpeg', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
}: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // #region agent log
    const logData = {
      location: 'components/chat/FileUploader.tsx:validateFile',
      message: 'File validation entry',
      data: { fileName: file.name, fileSize: file.size, fileType: file.type, maxSize, acceptedTypes },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A'
    };
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData) }).catch(() => {});
    // #endregion

    if (file.size > maxSize) {
      // #region agent log
      const logDataSize = {
        location: 'components/chat/FileUploader.tsx:validateFile',
        message: 'File size validation failed',
        data: { fileName: file.name, fileSize: file.size, maxSize, exceedsBy: file.size - maxSize },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C'
      };
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataSize) }).catch(() => {});
      // #endregion
      setError(`檔案大小超過 ${Math.round(maxSize / 1024 / 1024)}MB 限制`);
      return false;
    }

    // #region agent log
    const logDataType = {
      location: 'components/chat/FileUploader.tsx:validateFile',
      message: 'File type check',
      data: { fileName: file.name, fileType: file.type, isInAcceptedTypes: acceptedTypes.includes(file.type), acceptedTypes },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A'
    };
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataType) }).catch(() => {});
    // #endregion

    if (!acceptedTypes.includes(file.type)) {
      // #region agent log
      const logDataTypeFail = {
        location: 'components/chat/FileUploader.tsx:validateFile',
        message: 'File type validation failed',
        data: { fileName: file.name, fileType: file.type, acceptedTypes, isPdfExtension: file.name.toLowerCase().endsWith('.pdf') },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A'
      };
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataTypeFail) }).catch(() => {});
      // #endregion
      setError('不支援的檔案格式，僅支援 JPEG、PDF、WORD、TXT');
      return false;
    }

    // #region agent log
    const logDataSuccess = {
      location: 'components/chat/FileUploader.tsx:validateFile',
      message: 'File validation success',
      data: { fileName: file.name, fileSize: file.size, fileType: file.type },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A'
    };
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataSuccess) }).catch(() => {});
    // #endregion
    setError('');
    return true;
  };

  const handleFile = (file: File) => {
    // #region agent log
    const logData = {
      location: 'components/chat/FileUploader.tsx:handleFile',
      message: 'File selected',
      data: { fileName: file.name, fileSize: file.size, fileType: file.type },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'B'
    };
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData) }).catch(() => {});
    // #endregion
    if (validateFile(file)) {
      // #region agent log
      const logDataSelect = {
        location: 'components/chat/FileUploader.tsx:handleFile',
        message: 'Calling onFileSelect',
        data: { fileName: file.name, fileSize: file.size, fileType: file.type },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B'
      };
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataSelect) }).catch(() => {});
      // #endregion
      onFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const getFileTypeLabel = (type: string): string => {
    if (type.startsWith('image/')) return '圖片';
    if (type === 'application/pdf') return 'PDF';
    if (type.includes('wordprocessingml')) return 'WORD';
    if (type === 'text/plain') return 'TXT';
    return '檔案';
  };

  return (
    <div className="space-y-2">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition
          ${dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleChange}
          className="hidden"
        />
        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              點擊上傳
            </button>
            <span className="text-gray-600"> 或拖放檔案至此</span>
          </div>
          <p className="text-xs text-gray-500">
            支援 JPEG、PDF、WORD、TXT，最大 4MB
          </p>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
