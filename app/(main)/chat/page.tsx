'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { CreditsDisplay } from '@/components/chat/CreditsDisplay';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { ScreenshotCapture } from '@/components/screenshot/ScreenshotCapture';
import { useLocale } from '@/components/providers/LocaleProvider';
import { useCustomerSettings } from '@/hooks/useCustomerSettings';
import { useDeviceType } from '@/hooks/useDeviceType';
import { Download, Camera } from 'lucide-react';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  fileUrl?: string;
  fileName?: string;
  createdAt?: Date;
}

export default function ChatPage() {
  const { t } = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  // 客戶設定與裝置偵測
  const { settings, loading: settingsLoading } = useCustomerSettings();
  const { isMobile } = useDeviceType();

  // 動態控制 UI 顯示
  const shouldShowScreenshot = isMobile ? false : (settings?.show_screenshot ?? false);
  const shouldShowFunction = settings?.show_function_selector ?? false;
  const shouldShowWorkload = settings?.show_workload_selector ?? false;

  // 追蹤已自動上傳的對話輪次，避免重複上傳
  const autoUploadedRounds = useRef<Set<string>>(new Set());
  const uploadSerialNumber = useRef<number>(1);
  const conversationRoundCounter = useRef<number>(0);

  // 檢查是否需要顯示 Onboarding
  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');
    if (!completed) {
      setShowOnboarding(true);
    }
  }, []);

  // 從 URL 參數獲取對話 ID（如果有）
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(main)/chat/page.tsx:31',message:'useEffect for URL params',data:{windowLocationSearch:window.location.search,windowLocationHref:window.location.href},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    const params = new URLSearchParams(window.location.search);
    const id = params.get('conversationId');
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(main)/chat/page.tsx:33',message:'Extracted conversationId from URL',data:{id,hasId:!!id,allParams:Object.fromEntries(params)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    if (id) {
      loadConversation(id);
    }
  }, []);

  const loadConversation = async (id: string) => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(main)/chat/page.tsx:39',message:'Before fetch GET /api/chat',data:{id,apiUrl:`/api/chat?conversationId=${id}`},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const res = await fetch(`/api/chat?conversationId=${id}`);
      const data = await res.json();
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(main)/chat/page.tsx:42',message:'After fetch GET /api/chat',data:{success:data.success,error:data.error,hasMessages:!!data.data?.messages},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      if (data.success && data.data.messages) {
        setMessages(
          data.data.messages.map((msg: any) => ({
            ...msg,
            createdAt: new Date(msg.created_at),
          }))
        );
        setConversationId(id);
        // 載入對話時重置上傳追蹤
        autoUploadedRounds.current.clear();
        uploadSerialNumber.current = 1;
        conversationRoundCounter.current = 0;
      }
    } catch (error) {
      console.error('載入對話錯誤:', error);
    }
  };

  const handleSend = async (
    message: string,
    options: {
      workloadLevel: 'instant' | 'basic' | 'standard' | 'professional';
      selectedFunction?: string;
      fileUrl?: string;
      fileName?: string;
      fileType?: string;
      modelName?: string;
    }
  ) => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/page.tsx:handleSend',message:'handleSend called',data:{hasMessage:!!message,hasFileUrl:!!options.fileUrl,fileName:options.fileName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion

    // 清理截圖檔案狀態
    setScreenshotFile(null);

    // 添加使用者訊息到 UI
    const userMessage: Message = {
      role: 'user',
      content: message,
      fileName: options.fileName,
      fileUrl: options.fileUrl,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // 準備 JSON 請求體（不帶檔案，只有元數據）
      const requestBody = {
        message,
        workloadLevel: options.workloadLevel,
        selectedFunction: options.selectedFunction,
        conversationId: conversationId,
        fileUrl: options.fileUrl,
        fileName: options.fileName,
        fileType: options.fileType,
        modelName: options.modelName,
      };

      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/page.tsx:handleSend',message:'Before fetch /api/chat',data:{requestBody},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion

      // 發送請求（只傳送元數據，檔案已直傳到 Vercel Blob）
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/page.tsx:handleSend',message:'After fetch /api/chat',data:{status:res.status,ok:res.ok,statusText:res.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion

      const data = await res.json();
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/page.tsx:handleSend',message:'Response parsed',data:{success:data.success,error:data.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion

      if (data.success) {
        // 更新對話 ID（如果是新對話）
        const finalConversationId = conversationId || data.data.conversationId;
        if (!conversationId) {
          setConversationId(data.data.conversationId);
          // 更新 URL（不重新載入頁面）
          window.history.pushState(
            {},
            '',
            `/chat?conversationId=${data.data.conversationId}`
          );
          // 新對話時重置上傳追蹤
          autoUploadedRounds.current.clear();
          uploadSerialNumber.current = 1;
          conversationRoundCounter.current = 0;
        }

        // 更新 Credits（如果 API 返回了）
        if (typeof data.data.creditsAfter === 'number') {
          setUserCredits(data.data.creditsAfter);
        }

        // 添加 AI 回應
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.data.message.content,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // 對話結束後自動上傳記錄
        // 使用輪次計數器作為唯一標識，避免重複上傳
        conversationRoundCounter.current += 1;
        const roundKey = `${finalConversationId}-${conversationRoundCounter.current}`;
        
        // 延遲執行以確保訊息已保存到資料庫
        setTimeout(() => {
          autoSaveLog(finalConversationId, roundKey);
        }, 500);
      } else {
        alert(data.error || t('chat.sendFailed'));
        setMessages((prev) => prev.slice(0, -1));
      }
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/page.tsx:handleSend',message:'Error caught in handleSend',data:{errorMessage:error?.message,errorName:error?.name,errorString:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      console.error('發送訊息錯誤:', error);
      alert(t('common.errorNetwork'));
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 自動上傳對話記錄（靜默執行，不顯示提示）
   */
  const autoSaveLog = async (currentConversationId: string, roundKey: string) => {
    // 檢查是否已經上傳過這一輪
    if (autoUploadedRounds.current.has(roundKey)) {
      console.log('[auto-save-log] 已上傳過，跳過:', roundKey);
      return;
    }

    try {
      console.log('[auto-save-log] 開始自動上傳對話記錄:', {
        conversationId: currentConversationId,
        roundKey,
        serialNumber: uploadSerialNumber.current,
      });

      const res = await fetch('/api/chat/save-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: currentConversationId,
          serialNumber: uploadSerialNumber.current,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // 標記為已上傳
        autoUploadedRounds.current.add(roundKey);
        uploadSerialNumber.current += 1;
        
        console.log('[auto-save-log] 自動上傳成功:', {
          filename: data.data.filename,
          url: data.data.url,
          messageCount: data.data.messageCount,
          roundKey,
        });
      } else {
        console.error('[auto-save-log] 自動上傳失敗:', data.error);
        // 靜默失敗，不影響用戶體驗
      }
    } catch (error: any) {
      console.error('[auto-save-log] 自動上傳錯誤:', {
        error: error.message,
        roundKey,
      });
      // 靜默失敗，不影響用戶體驗
    }
  };

  /**
   * 手動下載對話記錄（顯示提示）
   */
  const handleDownloadLog = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(main)/chat/page.tsx:handleDownloadLog:entry',message:'handleDownloadLog called',data:{conversationId,hasConversationId:!!conversationId},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'ALL'})}).catch(()=>{});
    // #endregion

    if (!conversationId) {
      alert(t('chat.startConversation'));
      return;
    }

    setIsSavingLog(true);
    try {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(main)/chat/page.tsx:handleDownloadLog:before-fetch',message:'Before fetch /api/chat/save-log',data:{conversationId,serialNumber:uploadSerialNumber.current},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'ALL'})}).catch(()=>{});
      // #endregion

      const res = await fetch('/api/chat/save-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          serialNumber: uploadSerialNumber.current,
        }),
      });

      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(main)/chat/page.tsx:handleDownloadLog:after-fetch',message:'After fetch response',data:{status:res.status,ok:res.ok,statusText:res.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'ALL'})}).catch(()=>{});
      // #endregion

      const data = await res.json();

      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(main)/chat/page.tsx:handleDownloadLog:data-parsed',message:'Response data parsed',data:{success:data.success,hasError:!!data.error,hasData:!!data.data,error:data.error},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'ALL'})}).catch(()=>{});
      // #endregion

      if (data.success) {
        // Download the file
        const downloadUrl = data.data.url;
        const filename = data.data.filename;
        const messageCount = data.data.messageCount || 0;
        
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(main)/chat/page.tsx:handleDownloadLog:success',message:'API returned success',data:{downloadUrl,filename,messageCount},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'ALL'})}).catch(()=>{});
        // #endregion

        console.log('[save-log] 上傳成功:', {
          filename,
          url: downloadUrl,
          storagePath: data.data.storagePath,
          messageCount,
        });

        // 更新序列號
        uploadSerialNumber.current += 1;

        // 嘗試下載檔案
        try {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(main)/chat/page.tsx:handleDownloadLog:before-download',message:'Before download attempt',data:{downloadUrl,filename},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'ALL'})}).catch(()=>{});
          // #endregion

          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(main)/chat/page.tsx:handleDownloadLog:download-success',message:'Download link clicked',data:{downloadUrl,filename},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'ALL'})}).catch(()=>{});
          // #endregion
          
          alert(`${t('chat.downloadSuccess')}\n\n${filename}\n${messageCount}`);
        } catch (downloadError) {
          console.error('[save-log] 下載失敗:', downloadError);
          alert(`${t('chat.downloadSuccessR2')}\n\n${filename}\n${messageCount}\n\n${downloadUrl}`);
        }
      } else {
        console.error('[save-log] API 返回錯誤:', data);
        alert(`${t('chat.uploadFailed')}: ${data.error || t('chat.uploadErrorUnknown')}`);
      }
    } catch (error: any) {
      console.error('[save-log] 網路錯誤:', { error: error.message, stack: error.stack });
      alert(`${t('common.errorNetwork')} ${error.message || ''}`);
    } finally {
      setIsSavingLog(false);
    }
  };

  const handleScreenshot = () => {
    setShowScreenshot(true);
  };

  const handleScreenshotCapture = (file: File) => {
    setScreenshotFile(file);
    setShowScreenshot(false);
  };

  const handleScreenshotCancel = () => {
    setShowScreenshot(false);
  };

  return (
    <>
      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}
      {showScreenshot && (
        <ScreenshotCapture 
          onCapture={handleScreenshotCapture}
          onCancel={handleScreenshotCancel}
        />
      )}
      <div className="h-[calc(100vh-4rem)] max-w-6xl mx-auto flex flex-col">
        {/* Header with download button and credits */}
        <div className="flex justify-between items-center p-4 border-b">
          <h1 className="text-xl font-semibold">{t('chat.title')}</h1>
          <div className="flex items-center gap-4">
            {shouldShowScreenshot && (
              <button
                onClick={handleScreenshot}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                title={t('chat.screenshot')}
              >
                <Camera size={18} />
                {t('chat.screenshot')}
              </button>
            )}
            <CreditsDisplay
              initialCredits={userCredits}
              onCreditsUpdate={setUserCredits}
            />
            <button
              onClick={handleDownloadLog}
              disabled={isSavingLog || !conversationId}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Download size={18} />
              {isSavingLog ? t('chat.saving') : t('chat.downloadLog')}
            </button>
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 overflow-hidden">
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            onSend={handleSend}
            userCredits={userCredits}
            externalFile={screenshotFile}
            showFunctionSelector={shouldShowFunction}
            showWorkloadSelector={shouldShowWorkload}
          />
        </div>
      </div>
    </>
  );
}
