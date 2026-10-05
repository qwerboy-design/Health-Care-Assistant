import { z } from 'zod';
import { redactReportTextLine } from './normalize';

export const REPORT_INPUT_MAX_BYTES = 128 * 1024;
export const REPORT_ITEMS_MAX = 200;

export type ReportValidationCode = 'too_large' | 'schema' | 'empty';

export class ReportInputValidationError extends Error {
  constructor(message: string, public readonly code: ReportValidationCode = 'schema') {
    super(message);
    this.name = 'ReportInputValidationError';
  }
}

export const REPORT_ITEM_IDS = [
  'glucose', 'hba1c', 'total_cholesterol', 'ldl_c', 'hdl_c', 'triglycerides',
  'ast', 'alt', 'creatinine', 'egfr', 'bun', 'hemoglobin', 'wbc', 'platelets',
  'urine_protein', 'urine_occult_blood',
] as const;

export type ReportItemId = (typeof REPORT_ITEM_IDS)[number];

const boundedText = (max: number) => z.string().trim().max(max);

export const ReportItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]{1,48}$/),
  label: boundedText(120),
  value: boundedText(80),
  unit: boundedText(40),
  referenceRange: boundedText(160),
  originalFlag: boundedText(40),
  page: z.number().int().min(1).max(10).optional(),
  position: boundedText(100).optional(),
  extractionMethod: z.enum(['pdf_text', 'ocr', 'manual', 'fhir']).optional(),
  confirmed: z.literal(true),
}).strict();

export const ReportInputSchema = z.object({
  reportId: z.string().uuid(),
  reportType: z.literal('adult_health_check'),
  sourceKind: z.enum(['pdf', 'image', 'manual', 'fhir']),
  applicability: z.enum(['general_adult', 'out_of_scope']),
  items: z.array(ReportItemSchema).max(REPORT_ITEMS_MAX),
  conclusions: z.array(boundedText(1000)).max(20).optional(),
}).strict();

export type ReportItem = z.infer<typeof ReportItemSchema>;
export type ReportInput = z.infer<typeof ReportInputSchema>;

export const AnalysisMetadataSchema = z.object({
  kind: z.literal('health_report_analysis'),
  schemaVersion: z.literal('0.2'),
  reportId: z.string().uuid(),
  guidanceVersion: z.string().max(64),
  promptVersion: z.string().max(64),
  provider: z.string().max(64),
  model: z.string().max(160),
  inputMessageId: z.string().uuid().optional(),
  selectedReferences: z.array(z.string().max(120)).max(32),
  generatedAt: z.string().datetime(),
  reviewStatus: z.literal('pending_review'),
  retrievalStatus: z.literal('retrieval_not_performed'),
  confirmedItems: z.array(ReportItemSchema).max(200),
  analysis: z.object({
    summary: z.string().max(6000),
    facts: z.array(z.object({
      itemId: z.string().max(48),
      status: z.enum(['high', 'low', 'within', 'unknown']),
      reason: z.string().max(400),
    })).max(200),
    // Keep meanings aligned with the 200-row report contract. Every confirmed
    // row gets a deterministic local meaning, including unknown items.
    meanings: z.array(z.object({ id: z.string().max(48), text: z.string().max(1000) })).max(REPORT_ITEMS_MAX),
    references: z.array(z.object({ id: z.string().max(120), title: z.string().max(300), url: z.string().url() })).max(32),
    generalGuidance: z.array(z.string().max(1200)).max(20),
    doctorQuestions: z.array(z.string().max(800)).max(20),
    limitations: z.array(z.string().max(1200)).max(20),
  }),
}).strict();

export type AnalysisMetadata = z.infer<typeof AnalysisMetadataSchema>;

export function serializeReportInput(input: ReportInput): string {
  return JSON.stringify(input);
}

export function validateReportInput(value: unknown): ReportInput {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new ReportInputValidationError('報告資料格式不正確', 'schema');
  }
  if (!serialized || Buffer.byteLength(serialized, 'utf8') > REPORT_INPUT_MAX_BYTES) {
    throw new ReportInputValidationError('報告內容超過 128 KB 上限', 'too_large');
  }
  let parsed: ReportInput;
  try {
    parsed = ReportInputSchema.parse(value);
  } catch (error) {
    const issues = error instanceof z.ZodError ? error.issues : [];
    if (issues.some((issue) => issue.path.length === 1 && issue.path[0] === 'items' && issue.code === 'too_big')) {
      throw new ReportInputValidationError('報告項目最多 200 列', 'schema');
    }
    if (issues.some((issue) => issue.path.includes('label') && issue.code === 'too_big')) {
      throw new ReportInputValidationError('項目名稱最多 120 個字', 'schema');
    }
    throw new ReportInputValidationError('報告資料格式不正確', 'schema');
  }
  if (parsed.items.length === 0) throw new ReportInputValidationError('至少需要一列已確認的報告項目', 'empty');
  return parsed;
}

export function redactReportInput(input: ReportInput): ReportInput {
  const scrub = (text: string) => text
    .split(/\r?\n/)
    .map(redactReportTextLine)
    .filter((line): line is string => line !== null)
    .join(' ');
  return {
    ...input,
    conclusions: input.conclusions?.map(scrub),
    items: input.items.map((item) => ({ ...item, label: scrub(item.label), value: scrub(item.value), unit: scrub(item.unit), referenceRange: scrub(item.referenceRange), originalFlag: scrub(item.originalFlag), position: item.position ? scrub(item.position) : undefined })),
  };
}
