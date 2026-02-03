'use client';

import { useEffect, useState, useRef } from 'react';
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
  const lastRealtimeUpdateRef = useRef<number>(0);
  const hasAutoSelectedRef = useRef<boolean>(false);

  // 從 API 獲取可用模型列表
  const fetchModels = async (silent = false, source = 'init') => {
    // 若剛收到 Realtime 更新（5分鐘內），避免被 replica lag 的舊資料覆蓋
    // Supabase Read Replica 延遲可能達 2-3 分鐘，設定更保守的保護期
    const now = Date.now();
    const timeSinceRealtimeUpdate = now - lastRealtimeUpdateRef.current;
    if (source !== 'init' && lastRealtimeUpdateRef.current > 0 && timeSinceRealtimeUpdate < 300000) {
      console.log(`[ModelSelector] ⏭️ Skip fetchModels (${source}) - Realtime active (last update ${Math.round(timeSinceRealtimeUpdate / 1000)}s ago)`);
      return;
    }
    
    if (!silent) setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/models?_t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();

      if (data.success) {
        const fetchedModels = data.data.models || [];
        console.log(`[ModelSelector] Fetched ${fetchedModels.length} models (${source})`);
        setModels(fetchedModels);
        // 不在這裡處理 value fallback，改由獨立的 useEffect 處理
      } else {
        setError(data.error || '無法獲取模型列表');
      }
    } catch (err: any) {
      console.error('[ModelSelector] Fetch error:', err);
      if (!silent) setError('網路錯誤');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // 初始化：僅在 mount 時執行一次
  useEffect(() => {
    fetchModels(false, 'init');

    // 設置即時同步
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
          console.log('[ModelSelector] Realtime event received:', payload.eventType);
          const eventType = ((payload as { eventType?: string }).eventType ?? (payload as { event_type?: string }).event_type ?? (payload as { type?: string }).type ?? '') as string;
          const rawPayload = payload as unknown as { new?: ModelOption; old?: { model_name?: string }; record?: ModelOption; old_record?: { model_name?: string } };
          const newRow = rawPayload.new ?? rawPayload.record;
          const oldRow = rawPayload.old ?? rawPayload.old_record;
          // 直接以 Realtime payload 更新本地 state
          if (eventType.toUpperCase() === 'UPDATE' && newRow) {
            const updated = newRow;
            lastRealtimeUpdateRef.current = Date.now();
            if (updated.is_active === false) {
              setModels((prev) => prev.filter((m) => m.model_name !== updated.model_name));
            } else {
              setModels((prev) => {
                const found = prev.some(m => m.model_name === updated.model_name);
                return found
                  ? prev.map((m) => m.model_name === updated.model_name ? { ...m, ...updated } : m)
                  : [...prev, updated].sort((a, b) => a.credits_cost - b.credits_cost);
              });
            }
          } else if (eventType.toUpperCase() === 'INSERT' && newRow) {
            const inserted = newRow;
            lastRealtimeUpdateRef.current = Date.now();
            if (inserted.is_active) {
              setModels((prev) =>
                prev.some((m) => m.model_name === inserted.model_name)
                  ? prev.map((m) =>
                      m.model_name === inserted.model_name ? { ...m, ...inserted } : m
                    )
                  : [...prev, inserted].sort((a, b) => a.credits_cost - b.credits_cost)
              );
            }
          } else if (eventType.toUpperCase() === 'DELETE' && oldRow) {
            const removed = oldRow;
            if (removed.model_name) {
              setModels((prev) => prev.filter((m) => m.model_name !== removed.model_name));
            }
          } else {
            fetchModels(true, 'realtime');
          }
        }
      )
      .subscribe();

    // 補強機制：僅在 Realtime 連線中斷時作為備援
    // 由於 Supabase Read Replica 延遲可能超過 2-3 分鐘，完全依賴 Realtime 更新
    // 僅保留極長間隔的輪詢作為 Realtime 失敗時的最後防線
    const pollInterval = setInterval(() => {
      fetchModels(true, 'poll');
    }, 300000); // 每 5 分鐘（僅作為 Realtime 失敗的備援）

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, []); // 移除 value 依賴，僅在 mount 時執行一次

  // 獨立處理：當模型列表載入完成且當前選擇的模型不可用時，自動選擇第一個
  useEffect(() => {
    if (models.length === 0 || isLoading) return;

    const isCurrentModelAvailable = models.some((m) => m.model_name === value);
    
    // 只在初次載入或當前選擇真的不可用時才自動選擇
    if ((!value || !isCurrentModelAvailable) && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      onChange(models[0].model_name);
    }
    
    // 如果當前選擇的模型變成可用了，重置 flag
    if (value && isCurrentModelAvailable) {
      hasAutoSelectedRef.current = false;
    }
  }, [models, value, isLoading, onChange]);

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
