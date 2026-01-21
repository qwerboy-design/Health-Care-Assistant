'use client';

import { useState, useRef } from 'react';

interface FileUploaderProps {
  onFileSelect?: (file: File | null) => void;
  onUploadSuccess?: (url: string) => void; // 新增：上傳成功的回傳
  onUploadError?: (error: string) => void; // 新增：上傳失敗的回傳
  maxSize?: number; 
  acceptedTypes?: string[];
}

export function FileUploader({ 
  onFileSelect, 
  onUploadSuccess,
  onUploadError,
  maxSize = 100 * 1024 * 1024, // 100MB (R2 上限)
  acceptedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
}: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    if (file.size > maxSize) {
      setError(`檔案大小超過 ${Math.round(maxSize / 1024 / 1024)}MB 限制`);
      return false;
    }
    if (!acceptedTypes.includes(file.type)) {
      setError('不支援的檔案格式');
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

      const { uploadUrl, uploadKey, fileUrl } = tokenData.data;
      
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'Extracted upload credentials',data:{uploadUrl,uploadKey,fileUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      // 2.2 使用 XMLHttpRequest 通過代理 API 上傳檔案（避免 CORS 問題）
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'Before XHR proxy upload',data:{uploadUrl,uploadKey,fileType:file.type,fileSize:file.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
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
          fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'XHR load event',data:{status:xhr.status,statusText:xhr.statusText,responseText:xhr.responseText?.substring(0,500),readyState:xhr.readyState},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.success && response.data?.fileUrl) {
                resolve(response.data.fileUrl);
              } else {
                reject(new Error(response.error || '上傳失敗'));
              }
            } catch (e) {
              reject(new Error('無法解析伺服器回應'));
            }
          } else {
            // #region agent log
            fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'XHR load failed',data:{status:xhr.status,statusText:xhr.statusText,responseText:xhr.responseText?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            reject(new Error(`上傳失敗: ${xhr.statusText} (${xhr.status})`));
          }
        });

        xhr.addEventListener('error', (e) => {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'XHR error event',data:{type:e.type,readyState:xhr.readyState,status:xhr.status,statusText:xhr.statusText,responseText:xhr.responseText?.substring(0,500),uploadUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          reject(new Error('上傳過程中發生網路錯誤'));
        });

        xhr.addEventListener('abort', () => {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'XHR abort event',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          reject(new Error('上傳已取消'));
        });

        // 使用 FormData 上傳到代理 API
        const formData = new FormData();
        formData.append('file', file);
        formData.append('uploadKey', uploadKey);

        xhr.open('POST', uploadUrl);
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'XHR POST send called',data:{uploadUrl,uploadKey,fileType:file.type,fileSize:file.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        xhr.send(formData);
      });

      // 3. 上傳成功，回傳 URL
      onUploadSuccess?.(uploadedFileUrl);
      
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FileUploader.tsx:handleFile',message:'Upload error caught',data:{errorMessage:err?.message,errorName:err?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const errorMessage = err?.message || '檔案上傳失敗，請稍後再試';
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

  return (
    <div className="space-y-2">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''} 
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleChange}
          className="hidden"
          disabled={isUploading}
        />
        
        <div className="space-y-2">
          {isUploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-sm font-medium text-blue-600">正在安全地傳送到雲端...</p>
              {uploadProgress > 0 && (
                <div className="w-full max-w-xs mt-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{Math.round(uploadProgress)}%</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
                支援格式：JPEG, PNG, PDF, WORD, TXT (最大 {maxSize / 1024 / 1024}MB)
              </p>
            </>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}