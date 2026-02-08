'use client';

import { useLocale } from '@/components/providers/LocaleProvider';

interface FunctionSelectorProps {
  value?: string;
  onChange: (value: string) => void;
}

const FUNCTION_KEYS = [
  { value: 'lab', labelKey: 'chat.lab', descKey: 'chat.labDesc' },
  { value: 'radiology', labelKey: 'chat.radiology', descKey: 'chat.radiologyDesc' },
  { value: 'medical_record', labelKey: 'chat.medicalRecord', descKey: 'chat.medicalRecordDesc' },
  { value: 'medication', labelKey: 'chat.medication', descKey: 'chat.medicationDesc' },
];

export function FunctionSelector({ value, onChange }: FunctionSelectorProps) {
  const { t } = useLocale();
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {t('chat.selectFunction')}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {FUNCTION_KEYS.map((func) => (
          <button
            key={func.value}
            type="button"
            onClick={() => onChange(func.value)}
            className={`
              p-3 rounded-lg border-2 text-left transition
              ${value === func.value
                ? 'border-blue-600 bg-blue-50 text-blue-900'
                : 'border-gray-200 hover:border-gray-300 bg-white'
              }
            `}
          >
            <div className="font-medium">{t(func.labelKey)}</div>
            <div className="text-xs text-gray-500 mt-1">{t(func.descKey)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
