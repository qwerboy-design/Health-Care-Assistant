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
    description: '分析實驗室檢驗報告、血液檢查、生化檢驗、分子診斷等',
    suggestedSkills: [
      // 臨床決策支援
      'clinical-decision-support',
      
      // 統計分析
      'statistical-analysis',
      'scientific-critical-thinking',
      
      // 資料庫查詢
      'clinvar-database',
      'ncbi-gene-database',
      'pubmed-database',
      
      // 基因組學相關
      'biopython',
      'pysam',
      
      // 數據分析與視覺化
      'exploratory-data-analysis',
      'scientific-visualization',
      'matplotlib',
      'seaborn',
      
      // 報告撰寫
      'clinical-reports',
    ],
  },
  
  radiology: {
    name: '放射影像分析',
    description: '分析 X光、CT、MRI、PET 等醫學影像報告與 DICOM 檔案',
    suggestedSkills: [
      // DICOM 處理
      'pydicom',
      
      // 影像生成與編輯
      'generate-image',
      
      // 臨床決策支援
      'clinical-decision-support',
      
      // 數位病理
      'histolab',
      'pathml',
      
      // 深度學習
      'transformers',
      'pytorch-lightning',
      
      // 數據視覺化
      'scientific-visualization',
      'matplotlib',
      'plotly',
      
      // 批判性思考
      'scientific-critical-thinking',
      
      // 報告撰寫
      'clinical-reports',
    ],
  },
  
  medical_record: {
    name: '病歷資料分析',
    description: '分析電子病歷、診斷報告、治療計畫、病程記錄',
    suggestedSkills: [
      // 臨床文件
      'clinical-reports',
      'treatment-plans',
      
      // 臨床決策支援
      'clinical-decision-support',
      
      // 醫療 AI
      'pyhealth',
      
      // 自然語言處理
      'transformers',
      
      // 資料分析
      'exploratory-data-analysis',
      'statistical-analysis',
      
      // 資料庫查詢
      'clinicaltrials-gov-database',
      'pubmed-database',
      
      // 文獻回顧
      'literature-review',
      
      // 批判性思考
      'scientific-critical-thinking',
      
      // 文件處理
      'markitdown',
    ],
  },
  
  medication: {
    name: '藥物相關分析',
    description: '藥物交互作用、藥物基因組學、劑量計算、用藥建議、藥物安全性評估',
    suggestedSkills: [
      // 藥物資料庫
      'drugbank-database',
      'chembl-database',
      'pubchem-database',
      'fda-databases',
      
      // 藥物基因組學
      'clinpgx-database',
      
      // 臨床決策支援
      'clinical-decision-support',
      
      // 化學資訊學
      'rdkit',
      'datamol',
      'molfeat',
      
      // ADMET 預測
      'medchem',
      'pytdc',
      'deepchem',
      
      // 藥物發現
      'diffdock',
      'rowan',
      
      // 分子特徵化
      'torchdrg',
      
      // 統計分析
      'statistical-analysis',
      
      // 文獻查詢
      'pubmed-database',
      'openalex-database',
      
      // 報告撰寫
      'clinical-reports',
    ],
  },
};

export function getSuggestedSkills(functionType?: FunctionType): string[] {
  if (!functionType) {
    return [];
  }
  return FUNCTION_MAPPINGS[functionType].suggestedSkills;
}

// 額外的輔助函數：獲取所有技能的詳細資訊
export interface SkillDetail {
  id: string;
  category: string;
  description: string;
}

export const SKILL_DETAILS: Record<string, SkillDetail> = {
  // === 臨床決策與報告 ===
  'clinical-decision-support': {
    id: 'clinical-decision-support',
    category: 'Clinical Documentation & Decision Support',
    description: '生成專業臨床決策支援文件，包含患者群組分析、治療建議報告',
  },
  'clinical-reports': {
    id: 'clinical-reports',
    category: 'Clinical Documentation & Decision Support',
    description: '撰寫綜合臨床報告（病例報告、診斷報告、臨床試驗報告）',
  },
  'treatment-plans': {
    id: 'treatment-plans',
    category: 'Clinical Documentation & Decision Support',
    description: '生成醫療治療計畫（一般醫療、復健、心理健康、慢性病管理）',
  },
  
  // === 資料庫 - 臨床與基因組 ===
  'clinvar-database': {
    id: 'clinvar-database',
    category: 'Scientific Databases',
    description: 'NCBI 基因變異臨床意義資料庫',
  },
  'clinpgx-database': {
    id: 'clinpgx-database',
    category: 'Scientific Databases',
    description: '臨床藥物基因組學資料庫（基因-藥物交互作用）',
  },
  'clinicaltrials-gov-database': {
    id: 'clinicaltrials-gov-database',
    category: 'Scientific Databases',
    description: '全球臨床試驗註冊資料庫',
  },
  'ncbi-gene-database': {
    id: 'ncbi-gene-database',
    category: 'Scientific Databases',
    description: 'NCBI 基因資料庫（500+ 物種基因資訊）',
  },
  
  // === 資料庫 - 藥物與化學 ===
  'drugbank-database': {
    id: 'drugbank-database',
    category: 'Scientific Databases',
    description: '綜合藥物與藥物標靶資訊資料庫',
  },
  'chembl-database': {
    id: 'chembl-database',
    category: 'Scientific Databases',
    description: '生物活性分子與藥物樣化合物資料庫',
  },
  'pubchem-database': {
    id: 'pubchem-database',
    category: 'Scientific Databases',
    description: '全球最大免費化學資訊資料庫',
  },
  'fda-databases': {
    id: 'fda-databases',
    category: 'Scientific Databases',
    description: 'FDA 監管資料庫（藥物不良事件、標籤、召回）',
  },
  
  // === 資料庫 - 文獻 ===
  'pubmed-database': {
    id: 'pubmed-database',
    category: 'Scientific Databases',
    description: 'NCBI 生物醫學文獻資料庫（35M+ 文獻）',
  },
  'openalex-database': {
    id: 'openalex-database',
    category: 'Scientific Databases',
    description: '開放學術文獻目錄（240M+ 學術作品）',
  },
  
  // === 醫學影像 ===
  'pydicom': {
    id: 'pydicom',
    category: 'Medical Imaging & Digital Pathology',
    description: 'DICOM 醫學影像檔案處理（CT, MRI, X光）',
  },
  'histolab': {
    id: 'histolab',
    category: 'Medical Imaging & Digital Pathology',
    description: '數位病理全玻片影像處理',
  },
  'pathml': {
    id: 'pathml',
    category: 'Medical Imaging & Digital Pathology',
    description: '計算病理學工具包',
  },
  
  // === 醫療 AI ===
  'pyhealth': {
    id: 'pyhealth',
    category: 'Healthcare AI & Clinical Machine Learning',
    description: '醫療 AI 工具包（EHR、臨床預測、疾病診斷）',
  },
  'neurokit2': {
    id: 'neurokit2',
    category: 'Healthcare AI & Clinical Machine Learning',
    description: '生理訊號處理（ECG, EEG, EDA, RSP）',
  },
  
  // === 基因組學 ===
  'biopython': {
    id: 'biopython',
    category: 'Bioinformatics & Genomics',
    description: '計算生物學與生物資訊學綜合工具',
  },
  'pysam': {
    id: 'pysam',
    category: 'Bioinformatics & Genomics',
    description: '基因組資料檔案處理（SAM/BAM/VCF）',
  },
  
  // === 化學資訊學與藥物發現 ===
  'rdkit': {
    id: 'rdkit',
    category: 'Cheminformatics & Drug Discovery',
    description: '開源化學資訊學工具包',
  },
  'datamol': {
    id: 'datamol',
    category: 'Cheminformatics & Drug Discovery',
    description: '分子操作與特徵化（基於 RDKit）',
  },
  'molfeat': {
    id: 'molfeat',
    category: 'Cheminformatics & Drug Discovery',
    description: '100+ 分子特徵化器',
  },
  'medchem': {
    id: 'medchem',
    category: 'Cheminformatics & Drug Discovery',
    description: '藥物化學分析與成藥性評估',
  },
  'pytdc': {
    id: 'pytdc',
    category: 'Cheminformatics & Drug Discovery',
    description: '治療資料共享平台（ADMET 預測）',
  },
  'deepchem': {
    id: 'deepchem',
    category: 'Cheminformatics & Drug Discovery',
    description: '分子機器學習與藥物發現',
  },
  'diffdock': {
    id: 'diffdock',
    category: 'Cheminformatics & Drug Discovery',
    description: '擴散模型分子對接',
  },
  'rowan': {
    id: 'rowan',
    category: 'Cheminformatics & Drug Discovery',
    description: '雲端量子化學平台',
  },
  'torchdrug': {
    id: 'torchdrug',
    category: 'Cheminformatics & Drug Discovery',
    description: '藥物發現機器學習平台',
  },
  
  // === 機器學習與深度學習 ===
  'transformers': {
    id: 'transformers',
    category: 'Machine Learning & Deep Learning',
    description: 'NLP、視覺、音訊的最先進模型',
  },
  'pytorch-lightning': {
    id: 'pytorch-lightning',
    category: 'Machine Learning & Deep Learning',
    description: 'PyTorch 深度學習框架',
  },
  
  // === 數據分析與視覺化 ===
  'exploratory-data-analysis': {
    id: 'exploratory-data-analysis',
    category: 'Analysis & Methodology',
    description: '探索性資料分析工具包',
  },
  'statistical-analysis': {
    id: 'statistical-analysis',
    category: 'Analysis & Methodology',
    description: '統計檢定、功效分析、實驗設計',
  },
  'scientific-critical-thinking': {
    id: 'scientific-critical-thinking',
    category: 'Analysis & Methodology',
    description: '嚴謹科學推理與評估工具',
  },
  'scientific-visualization': {
    id: 'scientific-visualization',
    category: 'Data Analysis & Visualization',
    description: '出版品質科學圖表最佳實踐',
  },
  'matplotlib': {
    id: 'matplotlib',
    category: 'Data Analysis & Visualization',
    description: 'Python 繪圖函式庫',
  },
  'seaborn': {
    id: 'seaborn',
    category: 'Data Analysis & Visualization',
    description: '統計資料視覺化',
  },
  'plotly': {
    id: 'plotly',
    category: 'Data Analysis & Visualization',
    description: '互動式科學資料視覺化',
  },
  
  // === 文獻與文件 ===
  'literature-review': {
    id: 'literature-review',
    category: 'Analysis & Methodology',
    description: '系統性文獻搜尋與回顧工具包',
  },
  'markitdown': {
    id: 'markitdown',
    category: 'Document Processing & Conversion',
    description: '20+ 檔案格式轉 Markdown（PDF, DOCX, 影像 OCR）',
  },
  
  // === 影像生成 ===
  'generate-image': {
    id: 'generate-image',
    category: 'Scientific Communication & Publishing',
    description: 'AI 圖像生成與編輯（科學插圖、示意圖）',
  },
};

// 根據功能類型獲取技能詳細資訊
export function getSkillDetails(functionType: FunctionType): SkillDetail[] {
  const skillIds = FUNCTION_MAPPINGS[functionType].suggestedSkills;
  return skillIds
    .map(id => SKILL_DETAILS[id])
    .filter(detail => detail !== undefined);
}

// 獲取所有功能類型
export function getAllFunctionTypes(): FunctionType[] {
  return Object.keys(FUNCTION_MAPPINGS) as FunctionType[];
}

// 根據關鍵字搜尋相關技能
export function searchSkills(keyword: string): SkillDetail[] {
  const lowerKeyword = keyword.toLowerCase();
  return Object.values(SKILL_DETAILS).filter(
    skill =>
      skill.id.toLowerCase().includes(lowerKeyword) ||
      skill.category.toLowerCase().includes(lowerKeyword) ||
      skill.description.toLowerCase().includes(lowerKeyword)
  );
}