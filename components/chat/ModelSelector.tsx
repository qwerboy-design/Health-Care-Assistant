'use client';

import { useEffect, useState, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { supabase } from '@/lib/supabase/client';
import {
  saveModelVersion,
  removeModelVersion,
  mergeWithStoredVersions,
  updateStoredVersions,
  type ModelOption,
} from '@/lib/storage/model-versions';

interface ModelSelectorProps {
  value: string;
  onChange: (modelName: string) => void;
  userCredits?: number;
}

export function ModelSelector({ value, onChange, userCredits = 0 }: ModelSelectorProps) {
  const { t } = useLocale();
  const [models, setModels] = useState<ModelOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const lastRealtimeUpdateRef = useRef<number>(0);
  const hasAutoSelectedRef = useRef<boolean>(false);

  // 保護期常數（10 分鐘，為可能的延遲預留更多緩衝）
  const PROTECTION_PERIOD_MS = 600000;

  // 從 API 獲取可用模型列表
  const fetchModels = async (silent = false, source = 'init') => {
    // 若剛收到 Realtime 更新（10分鐘內），避免被可能的舊資料覆蓋
    // 注意：source === 'init' 時不跳過，但會使用版本合併機制
    const now = Date.now();
    const timeSinceRealtimeUpdate = now - lastRealtimeUpdateRef.current;
    if (source !== 'init' && lastRealtimeUpdateRef.current > 0 && timeSinceRealtimeUpdate <= PROTECTION_PERIOD_MS) {
      console.log(`[ModelSelector] ⏭️ Skip fetchModels (${source}) - Realtime active (last update ${Math.round(timeSinceRealtimeUpdate / 1000)}s ago)`);
      return;
    }
    
    if (!silent) setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/models?_t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();

      if (data.success) {
        let fetchedModels: ModelOption[] = data.data.models || [];
        console.log(`[ModelSelector] 📥 Fetched ${fetchedModels.length} models from API (${source})`);
        
        // 關鍵：與 localStorage 版本合併，確保使用最新版本
        // 這解決了重新登入後 API 返回舊數據的問題
        if (source === 'init') {
          fetchedModels = mergeWithStoredVersions(fetchedModels);
        }
        
        setModels(fetchedModels);
        
        // 更新 localStorage 中的版本記錄（僅當 API 數據較新時）
        updateStoredVersions(fetchedModels);
      } else {
        setError(data.error || '無法獲取模型列表');
      }
    } catch (err: unknown) {
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
          console.log('[ModelSelector] 🎯 Realtime event received:', payload.eventType);
          const eventType = ((payload as { eventType?: string }).eventType ?? (payload as { event_type?: string }).event_type ?? (payload as { type?: string }).type ?? '') as string;
          const rawPayload = payload as unknown as { new?: ModelOption; old?: { model_name?: string }; record?: ModelOption; old_record?: { model_name?: string } };
          const newRow = rawPayload.new ?? rawPayload.record;
          const oldRow = rawPayload.old ?? rawPayload.old_record;
          
          // 直接以 Realtime payload 更新本地 state 和 localStorage
          if (eventType.toUpperCase() === 'UPDATE' && newRow) {
            const updated = newRow;
            lastRealtimeUpdateRef.current = Date.now();
            console.log(`[ModelSelector] ♻️ UPDATE: ${updated.model_name}, is_active=${updated.is_active}, credits_cost=${updated.credits_cost}`);
            
            if (updated.is_active === false) {
              // 模型被停用，從列表中移除並清除 localStorage 記錄
              setModels((prev) => prev.filter((m) => m.model_name !== updated.model_name));
              removeModelVersion(updated.model_name);
            } else {
              // 模型被更新，更新列表並持久化到 localStorage
              setModels((prev) => {
                const found = prev.some(m => m.model_name === updated.model_name);
                return found
                  ? prev.map((m) => m.model_name === updated.model_name ? { ...m, ...updated } : m)
                  : [...prev, updated].sort((a, b) => a.credits_cost - b.credits_cost);
              });
              // 關鍵：持久化到 localStorage，確保重新登入後能獲取最新數據
              saveModelVersion(updated);
            }
          } else if (eventType.toUpperCase() === 'INSERT' && newRow) {
            const inserted = newRow;
            lastRealtimeUpdateRef.current = Date.now();
            console.log(`[ModelSelector] ➕ INSERT: ${inserted.model_name}, is_active=${inserted.is_active}`);
            
            if (inserted.is_active) {
              setModels((prev) =>
                prev.some((m) => m.model_name === inserted.model_name)
                  ? prev.map((m) =>
                      m.model_name === inserted.model_name ? { ...m, ...inserted } : m
                    )
                  : [...prev, inserted].sort((a, b) => a.credits_cost - b.credits_cost)
              );
              // 持久化到 localStorage
              saveModelVersion(inserted);
            }
          } else if (eventType.toUpperCase() === 'DELETE' && oldRow) {
            const removed = oldRow;
            console.log(`[ModelSelector] 🗑️ DELETE: ${removed.model_name}`);
            
            if (removed.model_name) {
              setModels((prev) => prev.filter((m) => m.model_name !== removed.model_name));
              // 從 localStorage 移除
              removeModelVersion(removed.model_name);
            }
          } else {
            // 未知事件類型，僅記錄日誌，不觸發 API fetch
            // 這避免了舊數據覆蓋 Realtime 更新的問題
            console.warn(`[ModelSelector] ⚠️ Unknown Realtime event type: ${eventType}`, payload);
          }
        }
      )
      .subscribe();

    // 補強機制：僅在 Realtime 連線中斷時作為備援
    // 完全依賴 Realtime 更新，輪詢間隔與保護期一致（10 分鐘）
    // 僅作為 Realtime 失敗時的最後防線
    const pollInterval = setInterval(() => {
      fetchModels(true, 'poll');
    }, PROTECTION_PERIOD_MS); // 每 10 分鐘（與保護期一致）

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
          {t('chat.aiModel')}
        </label>
        <div className="text-sm text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {t('chat.aiModel')}
        </label>
        <div className="text-sm text-red-600">{error}</div>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {t('chat.aiModel')}
        </label>
        <div className="text-sm text-gray-500">{t('chat.noModels')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        {t('chat.aiModel')}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      >
        {models.map((model) => {
          const affordable = canAffordModel(model.credits_cost);
          const textOnlyLabel = !model.supports_vision ? ` ${t('chat.textOnly')}` : '';
          return (
            <option
              key={model.id}
              value={model.model_name}
              disabled={!affordable}
            >
              {model.display_name}{textOnlyLabel} - {model.credits_cost} {t('chat.credits')}
              {!affordable && ` (${t('chat.creditsInsufficient')})`}
            </option>
          );
        })}
      </select>

      {selectedModel && (
        <div className="text-xs text-gray-600 flex items-center justify-between px-2">
          <span>{t('chat.consumeCredits')}: {selectedModel.credits_cost} {t('chat.credits')}</span>
          {!canAffordModel(selectedModel.credits_cost) && (
            <span className="text-red-600 font-medium">{t('chat.creditsInsufficient')}</span>
          )}
        </div>
      )}
    </div>
  );
}
