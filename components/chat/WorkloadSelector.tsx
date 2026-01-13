'use client';

interface WorkloadSelectorProps {
  value: string;
  onChange: (value: 'instant' | 'basic' | 'standard' | 'professional') => void;
}

const WORKLOAD_OPTIONS = [
  { 
    value: 'instant' as const, 
    label: '即時', 
    description: '不調用任何 Skills（0 Skills）',
    activeClass: 'border-green-600 bg-green-50 text-green-900',
    inactiveClass: 'border-gray-200 hover:border-gray-300 bg-white'
  },
  { 
    value: 'basic' as const, 
    label: '初級', 
    description: '調用 1 個 Skill',
    activeClass: 'border-blue-600 bg-blue-50 text-blue-900',
    inactiveClass: 'border-gray-200 hover:border-gray-300 bg-white'
  },
  { 
    value: 'standard' as const, 
    label: '標準', 
    description: '調用 2-3 個 Skills',
    activeClass: 'border-purple-600 bg-purple-50 text-purple-900',
    inactiveClass: 'border-gray-200 hover:border-gray-300 bg-white'
  },
  { 
    value: 'professional' as const, 
    label: '專業', 
    description: '調用 4+ 個 Skills',
    activeClass: 'border-indigo-600 bg-indigo-50 text-indigo-900',
    inactiveClass: 'border-gray-200 hover:border-gray-300 bg-white'
  },
];

export function WorkloadSelector({ value, onChange }: WorkloadSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        工作量級別
      </label>
      <div className="grid grid-cols-4 gap-2">
        {WORKLOAD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`
              p-3 rounded-lg border-2 text-center transition
              ${value === option.value ? option.activeClass : option.inactiveClass}
            `}
          >
            <div className="font-medium text-sm">{option.label}</div>
            <div className="text-xs text-gray-500 mt-1">{option.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
