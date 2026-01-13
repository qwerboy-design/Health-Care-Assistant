// 功能選擇到 Skills 映射表

export type FunctionType = 'lab' | 'radiology' | 'medical_record' | 'medication';

export interface FunctionConfig {
  name: string;
  description: string;
  suggestedSkills: string[];
}

export const FUNCTION_MAPPINGS: Record<FunctionType, FunctionConfig> = {
  lab: {
    name: '檢驗報告分析',
    description: '分析實驗室檢驗報告、血液檢查、生化檢驗等',
    suggestedSkills: [
      'clinical-decision-support',
      'scientific-critical-thinking',
      'statistical-analysis',
    ],
  },
  radiology: {
    name: '放射影像分析',
    description: '分析 X光、CT、MRI 等影像報告',
    suggestedSkills: [
      'generate-image',
      'clinical-decision-support',
      'scientific-critical-thinking',
    ],
  },
  medical_record: {
    name: '病歷資料分析',
    description: '分析病歷記錄、診斷報告、治療計畫',
    suggestedSkills: [
      'clinical-reports',
      'clinical-decision-support',
      'treatment-plans',
    ],
  },
  medication: {
    name: '藥物相關分析',
    description: '藥物交互作用、劑量計算、用藥建議',
    suggestedSkills: [
      'drugbank-database',
      'clinpgx-database',
      'clinical-decision-support',
    ],
  },
};

export function getSuggestedSkills(functionType?: FunctionType): string[] {
  if (!functionType) {
    return [];
  }
  return FUNCTION_MAPPINGS[functionType].suggestedSkills;
}
