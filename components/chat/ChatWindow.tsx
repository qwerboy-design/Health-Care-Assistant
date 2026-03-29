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
  externalMessage?: string | null;
  onExternalMessageConsumed?: () => void;
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
  externalMessage = null,
  onExternalMessageConsumed,
  showFunctionSelector = true,
  showWorkloadSelector = true,
}: ChatWindowProps) {
  // 計算對話輪次（每一輪包含一個用戶訊息和一個助手回覆）
  const conversationRounds = Math.floor(messages.length / 2);
  // 空白狀態：對話輪次 <= 2
  const isEmptyState = conversationRounds <= 2;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white transition-all duration-300 ease-in-out lg:flex-row-reverse">
      {/* 訊息列表：手機在上；桌面 row-reverse 時在右欄 */}
      <div
        className={`min-h-0 overflow-hidden transition-all duration-300 ease-in-out lg:min-w-0 lg:flex-1 ${
          isEmptyState ? 'flex-[3] lg:flex-1' : 'flex-1 lg:flex-1'
        }`}
      >
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      {/* 輸入區：手機在下；桌面為左欄 */}
      <div
        className={`flex min-h-0 flex-col transition-all duration-300 ease-in-out lg:h-full lg:w-full lg:max-w-sm lg:flex-shrink-0 lg:border-r lg:border-gray-200 xl:max-w-md ${
          isEmptyState ? 'flex-[2] flex-shrink-0' : 'flex-shrink-0 lg:flex-shrink-0'
        }`}
      >
        <ChatInput
          onSend={onSend}
          disabled={disabled || isLoading}
          userCredits={userCredits}
          isEmptyState={isEmptyState}
          externalFile={externalFile}
          externalMessage={externalMessage}
          onExternalMessageConsumed={onExternalMessageConsumed}
          showFunctionSelector={showFunctionSelector}
          showWorkloadSelector={showWorkloadSelector}
        />
      </div>
    </div>
  );
}
