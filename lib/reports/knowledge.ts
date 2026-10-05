import type { ReportItemId } from './types';
import { normalizeReportLabel } from './normalize';

export type KnowledgeStatus = 'draft' | 'active' | 'expired';
export type KnowledgeEntry = {
  id: string; itemId: ReportItemId; aliases: string[]; meaning: string; limits: string[];
  generalGuidance: string[]; doctorQuestions: string[]; source: { title: string; url: string; accessedAt: string; version: string };
  status: KnowledgeStatus; reviewedBy?: string; reviewedAt?: string;
};

const source = { title: 'MedlinePlus: How to Understand Your Lab Results', url: 'https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/', accessedAt: '2026-10-02', version: 'public-page' };
const names: Record<ReportItemId, [string, string, string[]]> = {
  glucose: ['血糖（Glucose）', '反映抽血時的血糖測量；解讀需保留檢驗條件與原報告範圍。', ['glucose', 'blood glucose', '血糖']],
  hba1c: ['糖化血色素（HbA1c）', '反映一段期間的血糖相關測量；不可脫離原報告與個人情境解讀。', ['hba1c', '糖化血色素']],
  total_cholesterol: ['總膽固醇', '血脂檢驗的一項數值；結果會受方法、單位與情境影響。', ['total cholesterol', '總膽固醇']],
  ldl_c: ['低密度脂蛋白膽固醇（LDL-C）', '血脂檢驗的一項數值；需使用報告自己的參考範圍。', ['ldl', 'ldl-c', '低密度脂蛋白']],
  hdl_c: ['高密度脂蛋白膽固醇（HDL-C）', '血脂檢驗的一項數值；不能單獨代表整體健康狀態。', ['hdl', 'hdl-c', '高密度脂蛋白']],
  triglycerides: ['三酸甘油脂', '血脂檢驗的一項數值；需連同檢驗條件及其他資料理解。', ['triglyceride', 'triglycerides', '三酸甘油脂']],
  ast: ['天門冬胺酸轉胺酶（AST）', '肝膽相關常見檢驗項目之一；單一結果不能建立診斷。', ['ast', 'got', '天門冬胺酸轉胺酶']],
  alt: ['丙胺酸轉胺酶（ALT）', '肝膽相關常見檢驗項目之一；需對照原報告與臨床資訊。', ['alt', 'gpt', '丙胺酸轉胺酶']],
  creatinine: ['肌酸酐', '腎功能相關常見檢驗項目；解讀受年齡、肌肉量與情境影響。', ['creatinine', '肌酸酐']],
  egfr: ['估算腎絲球過濾率（eGFR）', '報告提供的估算值；本系統不重新計算或替代臨床判讀。', ['egfr', 'estimated glomerular filtration rate', '估算腎絲球過濾率', '腎絲球過濾率']],
  bun: ['血中尿素氮（BUN）', '腎功能與代謝相關常見檢驗項目；需連同其他資料解讀。', ['bun', 'blood urea nitrogen', '血中尿素氮']],
  hemoglobin: ['血紅素', '全血球計數的一項數值；需依報告範圍與個人情境理解。', ['hemoglobin', 'hgb', '血紅素']],
  wbc: ['白血球', '全血球計數的一項數值；單一數值不等同感染或其他診斷。', ['wbc', 'white blood cell', 'white blood cell count', '白血球', '白血球計數']],
  platelets: ['血小板', '全血球計數的一項數值；需由專業人員結合其他資料判讀。', ['platelet', 'platelets', '血小板']],
  urine_protein: ['尿蛋白', '尿液檢驗的一項結果；需保留原報告的定性或定量方式。', ['urine protein', '尿蛋白']],
  urine_occult_blood: ['尿液潛血', '尿液檢驗的一項結果；本系統不將旗標直接轉成疾病結論。', ['urine occult blood', 'occult blood', '尿液潛血']],
};

export const REPORT_KNOWLEDGE_VERSION = 'hca-report-knowledge-0.2.0-draft';
export const REPORT_KNOWLEDGE: KnowledgeEntry[] = Object.entries(names).map(([itemId, [title, meaning, aliases]]) => ({
  id: `lab-${itemId}-draft`, itemId: itemId as ReportItemId, aliases: [title, ...aliases], meaning,
  limits: ['參考範圍、單位與檢驗條件以原報告為準。', '草稿條目尚未通過醫療專業審閱，不能產生健康建議。'],
  generalGuidance: [], doctorQuestions: [`可請醫療專業人員說明 ${title} 在本次報告中的意義嗎？`], source,
  status: 'draft',
}));

export function getKnowledgeKeyForLabel(label: string): ReportItemId | undefined {
  const normalized = normalizeReportLabel(label);
  return REPORT_KNOWLEDGE.find((entry) => entry.aliases.some((alias) => normalizeReportLabel(alias) === normalized))?.itemId;
}

export function getKnowledgeForItem(itemId: string, label?: string): KnowledgeEntry | undefined {
  return REPORT_KNOWLEDGE.find((entry) => entry.itemId === itemId)
    ?? (label ? REPORT_KNOWLEDGE.find((entry) => entry.aliases.some((alias) => normalizeReportLabel(alias) === normalizeReportLabel(label))) : undefined);
}
