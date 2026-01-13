// 工作量級別對應 Skills 數量邏輯

export type WorkloadLevel = 'instant' | 'basic' | 'standard' | 'professional';

export interface WorkloadConfig {
  skillsCount: number;
  description: string;
}

export const WORKLOAD_CONFIGS: Record<WorkloadLevel, WorkloadConfig> = {
  instant: {
    skillsCount: 0,
    description: '即時回應，不調用任何 Skills',
  },
  basic: {
    skillsCount: 1,
    description: '基礎分析，調用 1 個 Skill',
  },
  standard: {
    skillsCount: 3,
    description: '標準分析，調用 2-3 個 Skills',
  },
  professional: {
    skillsCount: 5,
    description: '專業分析，調用 4+ 個 Skills',
  },
};

export function getSkillsCountForWorkload(level: WorkloadLevel): number {
  return WORKLOAD_CONFIGS[level].skillsCount;
}
