'use client';

import { useState, useRef } from 'react';
import { useLocale } from '@/components/providers/LocaleProvider';

interface FileUploaderProps {
  onFileSelect?: (file: File | null) => void;
  onUploadSuccess?: (url: string) => void; // 新增：上傳成功的回傳
  onUploadError?: (error: string) => void; // 新增：上傳失敗的回傳
  maxSize?: number;
  acceptedTypes?: string[];
  /** compact：精簡列高，適合對話側欄與手機 */
  variant?: 'default' | 'compact';
}

export function FileUploader({
  onFileSelect,
  onUploadSuccess,
  onUploadError,
  maxSize = 100 * 1024 * 1024, // 100MB (R2 上限)
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

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'File validated, calling onFileSelect',data:{fileName:file.name,fileSize:file.size,fileType:file.type,hasCallback:!!onFileSelect},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // 1. 通知父組件檔案已選取
    onFileSelect?.(file);

    // 2. 開始執行 R2 代理上傳（通過 API 避免 CORS 問題）
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // 2.1 取得上傳授權（upload key 和代理端點 URL）
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'Before fetch upload-token',data:{fileName:file.name,fileSize:file.size,fileType:file.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const tokenRes = await fetch('/api/chat/upload-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'After fetch upload-token',data:{status:tokenRes.status,ok:tokenRes.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      const tokenData = await tokenRes.json();
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'Token data parsed',data:{success:tokenData.success,hasUploadUrl:!!tokenData.data?.uploadUrl,uploadUrlPreview:tokenData.data?.uploadUrl?.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (!tokenData.success) {
        throw new Error(tokenData.error || '取得上傳授權失敗');
      }

      const { uploadUrl, uploadKey, fileUrl, method } = tokenData.data;
      
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'Extracted upload credentials',data:{uploadUrl: uploadUrl?.substring(0, 100),uploadKey,fileUrl,method},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      // 2.2 使用 XMLHttpRequest 直接上傳到 R2（使用 Presigned URL，繞過 Vercel 4.5MB 限制）
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'Before XHR direct R2 upload',data:{method: method || 'PUT',uploadKey,fileType:file.type,fileSize:file.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const uploadedFileUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentage = (e.loaded / e.total) * 100;
            setUploadProgress(percentage);
          }
        });

        xhr.addEventListener('load', () => {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'XHR load event',data:{status:xhr.status,statusText:xhr.statusText,responseLength:xhr.responseText?.length,readyState:xhr.readyState},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          
          // Presigned URL PUT 成功時 R2 返回 200 OK（無 body）
          if (xhr.status >= 200 && xhr.status < 300) {
            // 直接使用預先計算的 fileUrl
            resolve(fileUrl);
          } else {
            // #region agent log
            fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'XHR load failed',data:{status:xhr.status,statusText:xhr.statusText,responseText:xhr.responseText?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            reject(new Error(`上傳失敗: ${xhr.statusText} (${xhr.status})`));
          }
        });

        xhr.addEventListener('error', (e) => {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'XHR error event',data:{type:e.type,readyState:xhr.readyState,status:xhr.status,statusText:xhr.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          reject(new Error('上傳過程中發生網路錯誤'));
        });

        xhr.addEventListener('abort', () => {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'XHR abort event',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          reject(new Error('上傳已取消'));
        });

        // 使用 PUT 方法直接上傳到 R2 Presigned URL
        xhr.open(method || 'PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'XHR PUT send called',data:{method: method || 'PUT',uploadKey,fileType:file.type,fileSize:file.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        xhr.send(file);
      });

      // 3. 上傳成功，回傳 URL
      onUploadSuccess?.(uploadedFileUrl);
      
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'Upload error caught',data:{errorMessage:err?.message,errorName:err?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const errorMessage = err?.message || t('chat.uploadFailedShort');
      setError(errorMessage);
      console.error('Upload error:', err);
      // 通知父組件上傳失敗
      onUploadError?.(errorMessage);
      // 上傳失敗時不清除選取的檔案，讓用戶可以看到錯誤並有機會重試
      // 檔案選擇狀態由用戶手動清除（通過移除按鈕）
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