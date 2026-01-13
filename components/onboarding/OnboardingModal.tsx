'use client';

import { useState, useEffect } from 'react';

interface OnboardingModalProps {
  onClose: () => void;
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '上傳檔案或輸入內容',
      description: '您可以上傳檔案（JPEG、PDF、WORD、TXT）或直接輸入文字、上傳圖片進行分析',
      icon: '📄',
    },
    {
      title: '選擇想調閱的功能',
      description: '根據您的需求選擇功能：檢驗報告分析、放射影像分析、病歷資料分析或藥物相關分析',
      icon: '🔧',
    },
    {
      title: '選擇工作量級別',
      description: '即時（0 Skills）、初級（1 Skill）、標準（2-3 Skills）或專業（4+ Skills），級別越高分析越深入',
      icon: '⚙️',
    },
    {
      title: '開始對話',
      description: '完成以上設置後，點擊發送開始與 AI 對話，獲得專業的臨床分析建議',
      icon: '💬',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">歡迎使用臨床助手 AI</h2>
          <button
            onClick={handleComplete}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">步驟 {currentStep + 1} / {steps.length}</span>
              <span className="text-sm text-gray-600">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{steps[currentStep].icon}</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {steps[currentStep].title}
            </h3>
            <p className="text-gray-600 text-lg">
              {steps[currentStep].description}
            </p>
          </div>

          {/* Step Cards Preview */}
          <div className="grid grid-cols-4 gap-2 mb-8">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`
                  p-3 rounded-lg border-2 text-center transition
                  ${index === currentStep
                    ? 'border-blue-600 bg-blue-50'
                    : index < currentStep
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                  }
                `}
              >
                <div className="text-2xl mb-1">{step.icon}</div>
                <div className="text-xs font-medium">
                  {index < currentStep ? '✓' : index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一步
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {currentStep < steps.length - 1 ? '下一步' : '開始使用'}
          </button>
        </div>
      </div>
    </div>
  );
}
