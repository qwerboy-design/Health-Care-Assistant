'use client';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  fileName?: string;
  fileUrl?: string;
  timestamp?: Date;
}

export function MessageBubble({ role, content, fileName, fileUrl, timestamp }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`
          max-w-3xl rounded-2xl px-4 py-3
          ${isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900'
          }
        `}
      >
        {fileUrl && fileName && (
          <div className={`mb-2 text-sm ${isUser ? 'text-blue-100' : 'text-gray-600'}`}>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-80"
            >
              📎 {fileName}
            </a>
          </div>
        )}
        <div className="whitespace-pre-wrap break-words">{content}</div>
        {timestamp && (
          <div className={`text-xs mt-2 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
            {timestamp.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}
