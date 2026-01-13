'use client';

interface FunctionSelectorProps {
  value?: string;
  onChange: (value: string) => void;
}

const FUNCTIONS = [
  { value: 'lab', label: '檢驗', description: '檢驗報告分析' },
  { value: 'radiology', label: '放射', description: '放射影像分析' },
  { value: 'medical_record', label: '病歷', description: '病歷資料分析' },
  { value: 'medication', label: '藥物', description: '藥物相關分析' },
];

export function FunctionSelector({ value, onChange }: FunctionSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        選擇功能
      </label>
      <div className="grid grid-cols-2 gap-2">
        {FUNCTIONS.map((func) => (
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
            <div className="font-medium">{func.label}</div>
            <div className="text-xs text-gray-500 mt-1">{func.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
