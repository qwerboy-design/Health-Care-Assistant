import { compareReportItems } from './comparison';
import { getKnowledgeForItem, REPORT_KNOWLEDGE_VERSION } from './knowledge';
import type { ReportInput } from './types';

export const REPORT_GUIDANCE_VERSION = 'hca-guidance-0.2.0';
export const REPORT_PROMPT_VERSION = 'hca-prompt-0.2.0';

export function buildReportPrompt(input: ReportInput): string {
  const rows = input.items.map((item) => `${item.id}|${item.label}|${item.value}|${item.unit}|${item.referenceRange}|${item.originalFlag}`).join('\n');
  return [
    '你是報告整理助手，不是診斷或治療工具。只可使用已確認的原報告資料與已核准來源。',
    '不得改寫數值、單位、範圍或旗標；不得猜測缺漏；輸出需含摘要、數值表、項目說明、引用、一般方向、醫師問題與限制。',
    `guidance=${REPORT_GUIDANCE_VERSION}; knowledge=${REPORT_KNOWLEDGE_VERSION}; retrieval=not_performed`,
    `reportId=${input.reportId}; applicability=${input.applicability}`,
    rows,
  ].join('\n').slice(0, 2500);
}

export function createDraftAnalysis(input: ReportInput) {
  const facts = compareReportItems(input.items);
  const meanings = input.items.map((item) => ({ id: item.id, text: getKnowledgeForItem(item.id, item.label)?.meaning ?? '此項目未有本地說明。' }));
  const references = input.items.flatMap((item) => {
    const knowledge = getKnowledgeForItem(item.id, item.label);
    return knowledge ? [{ id: knowledge.id, title: knowledge.source.title, url: knowledge.source.url }] : [];
  }).filter((ref, i, all) => all.findIndex((x) => x.id === ref.id) === i);
  return {
    summary: input.applicability === 'out_of_scope'
      ? '此報告情境超出成人一般健檢範圍；僅保留使用者確認的原始資料整理與限制說明。'
      : '已依使用者確認的原報告資料整理；這不是診斷，草稿知識條目尚未啟用健康建議。',
    facts: facts.map(({ itemId, status, reason }) => ({ itemId, status, reason })),
    meanings,
    references,
    generalGuidance: [],
    doctorQuestions: ['請由醫療專業人員依完整病史、檢驗條件與原始報告確認意義。'],
    limitations: ['本次使用本地草稿來源，未進行外部檢索。', '本系統不提供診斷、治療、用藥、分流或急迫性判斷。', '正式健康建議需醫療專業審閱。', ...(input.applicability === 'out_of_scope' ? ['孕婦、兒童、透析、住院或急性情境不在本版適用範圍。'] : [])],
  };
}

export function validateAnalysisAgainstInput(raw: unknown, input: ReportInput) {
  const analysis = raw as { facts?: Array<{ itemId: string; status: string; reason: string }> };
  const ids = new Set(input.items.map((item) => item.id));
  if (!analysis || !Array.isArray(analysis.facts) || analysis.facts.some((fact) => !ids.has(fact.itemId))) throw new Error('Analysis contains an unknown report item');
  return analysis;
}
