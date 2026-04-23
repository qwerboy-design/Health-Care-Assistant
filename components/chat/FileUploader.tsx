'use client';

import { useState, useRef } from 'react';
import { useLocale } from '@/components/providers/LocaleProvider';

interface FileUploaderProps {
  onFileSelect?: (file: File | null) => void;
  onUploadSuccess?: (url: string) => void; // ?啣?嚗??單????
  onUploadError?: (error: string) => void; // ?啣?嚗??喳仃???
  maxSize?: number;
  acceptedTypes?: string[];
  /** compact嚗移蝪∪?擃??拙?撠店?湔???璈?*/
  variant?: 'default' | 'compact';
}

export function FileUploader({
  onFileSelect,
  onUploadSuccess,
  onUploadError,
  maxSize = 100 * 1024 * 1024, // 100MB (R2 銝?)
  acceptedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
  variant = 'default',
}: FileUploaderProps) {
  const isCompact = variant === 'compact';
  const { t } = useLocale();
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    if (file.size > maxSize) {
      setError(t('chat.fileTooBig', { max: Math.round(maxSize / 1024 / 1024) }));
      return false;
    }
    if (!acceptedTypes.includes(file.type)) {
      setError(t('chat.unsupportedFormat'));
      return false;
    }
    setError('');
    return true;
  };

  const handleFile = async (file: File) => {
    if (!validateFile(file)) return;


    // 1. ??嗥?隞嗆?獢歇?詨?
    onFileSelect?.(file);

    // 2. ???瑁? R2 隞??銝嚗? API ?踹? CORS ??嚗?
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // 2.1 ??銝??嚗pload key ?誨?垢暺?URL嚗?
      const tokenRes = await fetch('/api/chat/upload-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });


      const tokenData = await tokenRes.json();
      if (!tokenData.success) {
        throw new Error(tokenData.error || '??銝??憭望?');
      }

      const { uploadUrl, uploadKey, fileUrl, method } = tokenData.data;
      

      // 2.2 雿輻 XMLHttpRequest ?湔銝??R2嚗蝙??Presigned URL嚗???Vercel 4.5MB ?嚗?
      const uploadedFileUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentage = (e.loaded / e.total) * 100;
            setUploadProgress(percentage);
          }
        });

        xhr.addEventListener('load', () => {
          
          // Presigned URL PUT ????R2 餈? 200 OK嚗 body嚗?
          if (xhr.status >= 200 && xhr.status < 300) {
            // ?湔雿輻??閮???fileUrl
            resolve(fileUrl);
          } else {
            reject(new Error(`銝憭望?: ${xhr.statusText} (${xhr.status})`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed because of a network error'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was aborted'));
        });

        // 雿輻 PUT ?寞??湔銝??R2 Presigned URL
        xhr.open(method || 'PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // 3. 銝??嚗???URL
      onUploadSuccess?.(uploadedFileUrl);
      
    } catch (err: any) {
      const errorMessage = err?.message || t('chat.uploadFailedShort');
      setError(errorMessage);
      console.error('Upload error:', err);
      // ??嗥?隞嗡??喳仃??
      onUploadError?.(errorMessage);
      // 銝憭望???皜?詨???獢?霈?嗅隞亦??圈隤支蒂????閰?
      // 瑼??豢????冽??皜嚗?蝘駁??嚗?
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
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

  const dropZoneClass = isCompact
    ? `rounded-md border border-dashed py-2 px-3 transition ${
        dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      } ${isUploading ? 'cursor-not-allowed opacity-50' : ''}`
    : `rounded-lg border-2 border-dashed p-6 text-center transition ${
        dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      } ${isUploading ? 'cursor-not-allowed opacity-50' : ''}`;

  return (
    <div className={isCompact ? 'space-y-1' : 'space-y-2'}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={dropZoneClass}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleChange}
          className="hidden"
          disabled={isUploading}
        />

        {isCompact ? (
          <div className="flex flex-wrap items-center gap-2 text-left">
            {isUploading ? (
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span className="text-sm font-medium text-blue-600">{t('chat.uploading')}</span>
                {uploadProgress > 0 && (
                  <div className="min-w-[120px] flex-1">
                    <div className="h-1.5 rounded-full bg-gray-200">
                      <div
                        className="h-1.5 rounded-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-gray-600">{Math.round(uploadProgress)}%</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <svg
                  className="h-5 w-5 shrink-0 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  {t('chat.clickToUpload')}
                </button>
                <span className="text-xs text-gray-500">{t('chat.orDragFile')}</span>
                <span className="w-full text-[11px] leading-tight text-gray-400 sm:w-auto">
                  {t('chat.uploadFormat', { max: maxSize / 1024 / 1024 })}
                </span>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {isUploading ? (
              <div className="flex flex-col items-center">
                <div className="mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <p className="text-sm font-medium text-blue-600">{t('chat.uploading')}</p>
                {uploadProgress > 0 && (
                  <div className="mt-2 w-full max-w-xs">
                    <div className="h-2 rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">{Math.round(uploadProgress)}%</p>
                  </div>
                )}
              </div>
            ) : (
              <>
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
                    className="font-medium text-blue-600 hover:text-blue-700"
                  >
                    {t('chat.clickToUpload')}
                  </button>
                  <span className="text-gray-600"> {t('chat.orDragFile')}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {t('chat.uploadFormat', { max: maxSize / 1024 / 1024 })}
                </p>
              </>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

