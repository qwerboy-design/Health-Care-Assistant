'use client';

import { useRef, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

export function OTPInput({ length = 6, value, onChange, error = false }: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // 只允許數字
    if (val && !/^\d$/.test(val)) {
      return;
    }

    const newValue = value.split('');
    newValue[index] = val;
    onChange(newValue.join(''));

    // 自動跳到下一個輸入框
    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Backspace: 刪除並跳到上一個
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // 左箭頭
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // 右箭頭
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, length);
    
    if (digits) {
      onChange(digits);
      // 聚焦到最後一個填充的輸入框
      const focusIndex = Math.min(digits.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={`
            w-12 h-14 text-center text-2xl font-bold rounded-lg border-2
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${error 
              ? 'border-red-500 bg-red-50' 
              : 'border-gray-300 bg-white'
            }
          `}
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
