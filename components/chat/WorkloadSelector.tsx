'use client';

import { useLocale } from '@/components/providers/LocaleProvider';

interface WorkloadSelectorProps {
  value: string;
  onChange: (value: 'instant' | 'basic' | 'standard' | 'professional') => void;
}

const WORKLOAD_KEYS = [
  { value: 'instant' as const, labelKey: 'chat.instant', descKey: 'chat.instantDesc', activeClass: 'border-green-600 bg-green-50 text-green-900', inactiveClass: 'border-gray-200 hover:border-gray-300 bg-white' },
  { value: 'basic' as const, labelKey: 'chat.basic', descKey: 'chat.basicDesc', activeClass: 'border-blue-600 bg-blue-50 text-blue-900', inactiveClass: 'border-gray-200 hover:border-gray-300 bg-white' },
  { value: 'standard' as const, labelKey: 'chat.standard', descKey: 'chat.standardDesc', activeClass: 'border-purple-600 bg-purple-50 text-purple-900', inactiveClass: 'border-gray-200 hover:border-gray-300 bg-white' },
  { value: 'professional' as const, labelKey: 'chat.professional', descKey: 'chat.professionalDesc', activeClass: 'border-indigo-600 bg-indigo-50 text-indigo-900', inactiveClass: 'border-gray-200 hover:border-gray-300 bg-white' },
];

export function WorkloadSelector({ value, onChange }: WorkloadSelectorProps) {
  const { t } = useLocale();
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {t('chat.workloadLevel')}
      </label>
      <div className="grid grid-cols-4 gap-2">
        {WORKLOAD_KEYS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`
              p-3 rounded-lg border-2 text-center transition
              ${value === option.value ? option.activeClass : option.inactiveClass}
            `}
          >
            <div className="font-medium text-sm">{t(option.labelKey)}</div>
            <div className="text-xs text-gray-500 mt-1">{t(option.descKey)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
