'use client';
import { useLocale } from '@/components/providers/LocaleProvider';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  fileName?: string;
  fileUrl?: string;
  timestamp?: Date;
  analysisMetadata?: { reviewStatus?: string; retrievalStatus?: string } | null;
}

export function MessageBubble({ role, content, fileName, fileUrl, timestamp, analysisMetadata }: MessageBubbleProps) {
  const isUser = role === 'user';
  const { t } = useLocale();

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
        {analysisMetadata?.reviewStatus === 'pending_review' && (
          <div className="mb-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800" role="status">
            {t('chat.reportPendingReview')}
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
