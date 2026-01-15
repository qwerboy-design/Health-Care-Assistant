'use client';

import { useState, useEffect } from 'react';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';

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
      file?: File;
    }
  ) => {
    // 添加使用者訊息到 UI
    const userMessage: Message = {
      role: 'user',
      content: message,
      fileName: options.file?.name,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // 準備 FormData
      const formData = new FormData();
      formData.append('message', message);
      formData.append('workloadLevel', options.workloadLevel);
      if (options.selectedFunction) {
        formData.append('selectedFunction', options.selectedFunction);
      }
      if (conversationId) {
        formData.append('conversationId', conversationId);
      }
      if (options.file) {
        formData.append('file', options.file);
      }

      // 發送請求
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

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
    } catch (error) {
      console.error('發送訊息錯誤:', error);
      alert('網路錯誤，請稍後再試');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}
      <div className="h-[calc(100vh-4rem)] max-w-6xl mx-auto">
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          onSend={handleSend}
        />
      </div>
    </>
  );
}
