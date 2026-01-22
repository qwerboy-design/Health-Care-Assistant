'use client';

import { useState, useEffect } from 'react';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { Download } from 'lucide-react';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  fileUrl?: string;
  fileName?: string;
  createdAt?: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isSavingLog, setIsSavingLog] = useState(false);

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
    }
  ) => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/page.tsx:handleSend',message:'handleSend called',data:{hasMessage:!!message,hasFileUrl:!!options.fileUrl,fileName:options.fileName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion

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
        if (!conversationId) {
          setConversationId(data.data.conversationId);
          // 更新 URL（不重新載入頁面）
          window.history.pushState(
            {},
            '',
            `/chat?conversationId=${data.data.conversationId}`
          );
        }

        // 添加 AI 回應
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.data.message.content,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // 錯誤處理
        alert(data.error || '發送失敗，請稍後再試');
        // 移除剛才添加的使用者訊息
        setMessages((prev) => prev.slice(0, -1));
      }
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6d2429d6-80c8-40d7-a840-5b2ce679569d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/page.tsx:handleSend',message:'Error caught in handleSend',data:{errorMessage:error?.message,errorName:error?.name,errorString:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      console.error('發送訊息錯誤:', error);
      alert('網路錯誤，請稍後再試');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadLog = async () => {
    if (!conversationId) {
      alert('請先開始對話');
      return;
    }

    setIsSavingLog(true);
    try {
      const res = await fetch('/api/chat/save-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          serialNumber: 1,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Download the file
        const downloadUrl = data.data.url;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = data.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert('對話記錄已下載');
      } else {
        alert(data.error || '下載失敗，請稍後再試');
      }
    } catch (error) {
      console.error('下載日誌錯誤:', error);
      alert('網路錯誤，請稍後再試');
    } finally {
      setIsSavingLog(false);
    }
  };

  return (
    <>
      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}
      <div className="h-[calc(100vh-4rem)] max-w-6xl mx-auto flex flex-col">
        {/* Header with download button */}
        <div className="flex justify-between items-center p-4 border-b">
          <h1 className="text-xl font-semibold">對話</h1>
          <button
            onClick={handleDownloadLog}
            disabled={isSavingLog || !conversationId}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Download size={18} />
            {isSavingLog ? '保存中...' : '下載記錄'}
          </button>
        </div>

        {/* Chat window */}
        <div className="flex-1 overflow-hidden">
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            onSend={handleSend}
          />
        </div>
      </div>
    </>
  );
}
