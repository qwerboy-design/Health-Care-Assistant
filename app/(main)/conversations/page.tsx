'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Conversation {
  id: string;
  title: string;
  workload_level: string;
  selected_function?: string;
  created_at: string;
  updated_at: string;
}

export default function ConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();

      if (data.success) {
        setConversations(data.data.conversations || []);
      }
    } catch (error) {
      console.error('載入對話列表錯誤:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFunctionLabel = (func?: string) => {
    const labels: Record<string, string> = {
      lab: '檢驗',
      radiology: '放射',
      medical_record: '病歷',
      medication: '藥物',
    };
    return labels[func || ''] || '未指定';
  };

  const getWorkloadLabel = (level: string) => {
    const labels: Record<string, string> = {
      instant: '即時',
      basic: '初級',
      standard: '標準',
      professional: '專業',
    };
    return labels[level] || level;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">對話記錄</h1>
        <a
          href="/chat"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          新對話
        </a>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-4">還沒有對話記錄</p>
          <a
            href="/chat"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            開始新對話
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => router.push(`/chat?conversationId=${conversation.id}`)}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-2">
                    {conversation.title}
                  </h3>
                  <div className="flex gap-4 text-sm text-gray-600">
                    {conversation.selected_function && (
                      <span className="flex items-center gap-1">
                        <span className="text-gray-400">功能:</span>
                        {getFunctionLabel(conversation.selected_function)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <span className="text-gray-400">級別:</span>
                      {getWorkloadLabel(conversation.workload_level)}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-500 ml-4">
                  {new Date(conversation.updated_at).toLocaleDateString('zh-TW', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
