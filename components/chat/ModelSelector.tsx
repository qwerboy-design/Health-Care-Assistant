'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';

interface ModelPickerOption {
  id: string;
  model_name: string;
  display_name: string;
  supports_vision: boolean;
  /** Credits deducted per use (same value the server charges). No other pricing data is client-visible. */
  credits_per_use: number;
}

interface ModelSelectorProps {
  value: string;
  onChange: (modelName: string) => void;
  userCredits?: number;
}

export function ModelSelector({ value, onChange, userCredits = 0 }: ModelSelectorProps) {
  const { t } = useLocale();
  const [models, setModels] = useState<ModelPickerOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const hasAutoSelectedRef = useRef<boolean>(false);

  const fetchModels = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/models', { cache: 'no-store' });
      const body = await response.json();

      if (!response.ok || !body.success) {
        setError(body.error || '無法獲取模型列表');
        return;
      }

      setModels((body.data?.models || []) as ModelPickerOption[]);
    } catch (fetchError: unknown) {
      console.error('[ModelSelector] Fetch error:', fetchError);
      if (!silent) setError('網路錯誤');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchModels();

    const handleWindowFocus = () => {
      void fetchModels(true);
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [fetchModels]);

  useEffect(() => {
    if (models.length === 0 || isLoading) return;

    const isCurrentModelAvailable = models.some((model) => model.model_name === value);

    if ((!value || !isCurrentModelAvailable) && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      // 優先自動選擇第一個負擔得起的模型；若皆不足則退回第一個（下方會顯示 Credits 不足）
      const firstAffordable = models.find((model) => userCredits >= model.credits_per_use);
      onChange((firstAffordable ?? models[0]).model_name);
    }

    if (value && isCurrentModelAvailable) {
      hasAutoSelectedRef.current = false;
    }
  }, [models, value, isLoading, onChange, userCredits]);

  // 檢查用戶是否有足夠的 Credits
  const canAffordModel = (creditsPerUse: number) => userCredits >= creditsPerUse;

  // 獲取選中模型的資訊
  const selectedModel = models.find((model) => model.model_name === value);

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
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      >
        {models.map((model) => {
          const affordable = canAffordModel(model.credits_per_use);
          const textOnlyLabel = !model.supports_vision ? ` ${t('chat.textOnly')}` : '';

          return (
            <option
              key={model.id}
              value={model.model_name}
              disabled={!affordable}
            >
              {model.display_name}{textOnlyLabel} - {model.credits_per_use} {t('chat.credits')}
              {!affordable && ` (${t('chat.creditsInsufficient')})`}
            </option>
          );
        })}
      </select>

      {selectedModel && (
        <div className="text-xs text-gray-600 flex items-center justify-between px-2">
          <span>{t('chat.consumeCredits')}: {selectedModel.credits_per_use} {t('chat.credits')}</span>
          {!canAffordModel(selectedModel.credits_per_use) && (
            <span className="text-red-600 font-medium">{t('chat.creditsInsufficient')}</span>
          )}
        </div>
      )}
    </div>
  );
}
