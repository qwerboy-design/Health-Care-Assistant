'use client';

import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  fileUrl?: string;
  fileName?: string;
  createdAt?: Date;
}

interface ChatWindowProps {
  messages: Message[];
  isLoading?: boolean;
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
  externalFile?: File | null;
  showFunctionSelector?: boolean;
  showWorkloadSelector?: boolean;
}

export function ChatWindow({ 
  messages, 
  isLoading, 
  onSend, 
  disabled, 
  userCredits = 0, 
  externalFile = null,
  showFunctionSelector = true,
  showWorkloadSelector = true,
}: ChatWindowProps) {
  // 計算對話輪次（每一輪包含一個用戶訊息和一個助手回覆）
  const conversationRounds = Math.floor(messages.length / 2);
  // 空白狀態：對話輪次 <= 2
  const isEmptyState = conversationRounds <= 2;

  return (
    <div className="flex flex-col h-full bg-white transition-all duration-300 ease-in-out">
      {/* 訊息列表 - 動態 flex 比例 */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isEmptyState ? 'flex-[2]' : 'flex-1'
      }`}>
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      {/* 輸入區域 - 動態 flex 比例 */}
      <div className={`flex-shrink-0 transition-all duration-300 ease-in-out ${
        isEmptyState ? 'flex-[3]' : ''
      }`}>
        <ChatInput 
          onSend={onSend} 
          disabled={disabled || isLoading} 
          userCredits={userCredits}
          isEmptyState={isEmptyState}
          externalFile={externalFile}
          showFunctionSelector={showFunctionSelector}
          showWorkloadSelector={showWorkloadSelector}
        />
      </div>
    </div>
  );
}
