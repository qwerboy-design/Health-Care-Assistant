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
}

export function ChatWindow({ messages, isLoading, onSend, disabled, userCredits = 0 }: ChatWindowProps) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* 訊息列表 */}
      <MessageList messages={messages} isLoading={isLoading} />

      {/* 輸入區域 */}
      <ChatInput onSend={onSend} disabled={disabled || isLoading} userCredits={userCredits} />
    </div>
  );
}
