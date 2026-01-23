'use client';

import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';

interface CreditsDisplayProps {
  initialCredits?: number;
  onCreditsUpdate?: (credits: number) => void;
}

export function CreditsDisplay({ initialCredits = 0, onCreditsUpdate }: CreditsDisplayProps) {
  const [credits, setCredits] = useState<number>(initialCredits);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 從 API 獲取 Credits
  const fetchCredits = async () => {
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
        setError(data.error || '無法獲取 Credits');
      }
    } catch (err: any) {
      console.error('獲取 Credits 錯誤:', err);
      setError('網路錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  // 初始載入
  useEffect(() => {
    fetchCredits();
  }, []);

  // 根據 Credits 數量決定顏色
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
        <span className="text-xs text-gray-500">可用 Credits</span>
        {isLoading ? (
          <span className="text-sm font-semibold text-gray-400">載入中...</span>
        ) : error ? (
          <span className="text-sm font-semibold text-red-600" title={error}>
            錯誤
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
        title="重新整理"
      >
        ↻
      </button>
    </div>
  );
}
