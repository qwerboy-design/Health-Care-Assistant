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
          max-w-3xl rounded-2xl px-5 py-3.5
          ${isUser
            ? 'bg-gradient-to-br from-terracotta to-terracotta-soft text-white shadow-terracotta/15 shadow-md'
            : 'bg-paper border border-paper-gray100 text-paper-gray900 shadow-card'
          }
        `}
      >
        {fileUrl && fileName && (
          <div className={`mb-2 text-sm ${isUser ? 'text-white/90' : 'text-paper-gray700'}`}>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-80 transition-opacity"
            >
              📎 {fileName}
            </a>
          </div>
        )}
        <div className="whitespace-pre-wrap break-words leading-relaxed">{content}</div>
        {timestamp && (
          <div className={`text-xs mt-2 ${isUser ? 'text-white/80' : 'text-paper-gray700'}`}>
            {timestamp.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}
