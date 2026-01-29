'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface ModelOption {
  id: string;
  model_name: string;
  display_name: string;
  credits_cost: number;
  is_active: boolean;
}

interface ModelSelectorProps {
  value: string;
  onChange: (modelName: string) => void;
  userCredits?: number;
}

export function ModelSelector({ value, onChange, userCredits = 0 }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 從 API 獲取可用模型列表
  const fetchModels = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/models', { cache: 'no-store' });
      const data = await res.json();

      if (data.success) {
        const fetchedModels = data.data.models || [];
        setModels(fetchedModels);

        // 如果沒有選擇模型，或者當前選擇的模型已不再可用清單中
        const isCurrentModelAvailable = fetchedModels.some((m: ModelOption) => m.model_name === value);

        if (fetchedModels.length > 0 && (!value || !isCurrentModelAvailable)) {
          // 預設選擇第一個模型
          onChange(fetchedModels[0].model_name);
        }
      } else {
        setError(data.error || '無法獲取模型列表');
      }
    } catch (err: any) {
      console.error('獲取模型列表錯誤:', err);
      if (!silent) setError('網路錯誤');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();

    // 設置即時同步
    // 加入 retry 邏輯或確認訂閱狀態
    const channel = supabase
      .channel('model_pricing_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'model_pricing'
        },
        (payload) => {
          console.log('模型資料實時變動:', payload);
          // 使用 silent 模式更新，避免選單閃爍
          fetchModels(true);
        }
      )
      .subscribe((status) => {
        console.log('Supabase Realtime 訂閱狀態:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [value]); // 加入 value 作為依賴，確保 fallback 邏輯正確執行

  // 檢查用戶是否有足夠的 Credits
  const canAffordModel = (creditsCost: number) => {
    return userCredits >= creditsCost;
  };

  // 獲取選中模型的資訊
  const selectedModel = models.find(m => m.model_name === value);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          AI 模型
        </label>
        <div className="text-sm text-gray-500">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          AI 模型
        </label>
        <div className="text-sm text-red-600">{error}</div>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          AI 模型
        </label>
        <div className="text-sm text-gray-500">暫無可用模型</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        AI 模型
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      >
        {models.map((model) => {
          const affordable = canAffordModel(model.credits_cost);
          return (
            <option
              key={model.id}
              value={model.model_name}
              disabled={!affordable}
            >
              {model.display_name} - {model.credits_cost} Credits
              {!affordable && ' (Credits 不足)'}
            </option>
          );
        })}
      </select>

      {/* 顯示選中模型的詳細資訊 */}
      {selectedModel && (
        <div className="text-xs text-gray-600 flex items-center justify-between px-2">
          <span>消耗: {selectedModel.credits_cost} Credits</span>
          {!canAffordModel(selectedModel.credits_cost) && (
            <span className="text-red-600 font-medium">Credits 不足</span>
          )}
        </div>
      )}
    </div>
  );
}
