'use client';

import { useState } from 'react';
import { useLocale } from '@/components/providers/LocaleProvider';

interface OnboardingModalProps {
  onClose: () => void;
}

const STEP_KEYS = [
  { titleKey: 'onboarding.step1Title', descKey: 'onboarding.step1Desc', icon: '📄' },
  { titleKey: 'onboarding.step2Title', descKey: 'onboarding.step2Desc', icon: '🔧' },
  { titleKey: 'onboarding.step3Title', descKey: 'onboarding.step3Desc', icon: '⚙️' },
  { titleKey: 'onboarding.step4Title', descKey: 'onboarding.step4Desc', icon: '💬' },
];

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const { t } = useLocale();
  const [currentStep, setCurrentStep] = useState(0);
  const steps = STEP_KEYS.map((s) => ({ title: t(s.titleKey), description: t(s.descKey), icon: s.icon }));

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
          <h2 className="text-2xl font-bold text-gray-900">{t('onboarding.welcome')}</h2>
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
              <span className="text-sm text-gray-600">{t('onboarding.step')} {currentStep + 1} {t('onboarding.of')} {steps.length}</span>
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
            {t('onboarding.prev')}
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {currentStep < steps.length - 1 ? t('onboarding.next') : t('onboarding.start')}
          </button>
        </div>
      </div>
    </div>
  );
}
