'use client';

import { useCallback, useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';

interface CreditsDisplayProps {
  initialCredits?: number;
  onCreditsUpdate?: (credits: number) => void;
}

export function CreditsDisplay({ initialCredits = 0, onCreditsUpdate }: CreditsDisplayProps) {
  const { t } = useLocale();
  const [credits, setCredits] = useState<number>(initialCredits);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/credits');
      const data = await res.json();

      if (data.success) {
        const newCredits = data.data.credits;
        setCredits(newCredits);
        onCreditsUpdate?.(newCredits);
      } else {
        setError(data.error || t('common.error'));
      }
    } catch (err: any) {
      console.error('Credits fetch error:', err);
      setError(t('common.errorNetwork'));
    } finally {
      setIsLoading(false);
    }
  }, [onCreditsUpdate, t]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const getCreditsColor = () => {
    if (credits === 0) return 'text-red-600';
    if (credits < 50) return 'text-orange-600';
    if (credits < 100) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
      <Coins className={`w-5 h-5 ${getCreditsColor()}`} />
      <div className="flex flex-col">
        <span className="text-xs text-gray-500">{t('chat.availableCredits')}</span>
        {isLoading ? (
          <span className="text-sm font-semibold text-gray-400">{t('common.loading')}</span>
        ) : error ? (
          <span className="text-sm font-semibold text-red-600" title={error}>
            {t('common.error')}
          </span>
        ) : (
          <span className={`text-sm font-semibold ${getCreditsColor()}`}>
            {credits.toLocaleString()}
          </span>
        )}
      </div>
      <button
        onClick={fetchCredits}
        disabled={isLoading}
        className="ml-2 text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400"
        title={t('chat.refresh')}
      >
        Refresh
      </button>
    </div>
  );
}
