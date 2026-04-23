/**
 * 將多筆已解析的 FHIR 匯入合併為單一 chat 訊息與 raw JSON 字串。
 */

import {
  formatFHIRForLLM,
  stripFHIRLLMFooterBlockFromFormattedText,
  getFHIRLLMFooterClosingBlock,
} from '@/lib/fhir/formatter';
import type { FHIRResource, FHIRSummary } from '@/lib/fhir/types';
import { redactFileName, redactFhirResource } from '@/lib/privacy/redaction';

export type FhirParsedItem = {
  fileName: string;
  summary: FHIRSummary;
  resource: FHIRResource;
};

export type FhirMergeLocale = 'zh-TW' | 'en';

const LLM_BLOCK_SEPARATOR = '\n\n---\n\n';

/**
 * 合併多檔 LLM 文字（每檔保留 formatFHIRForLLM 完整輸出，含 FHIR 標頭）與 raw JSON（以註解分隔）。
 */
export function mergeFhirImportsForLLM(
  items: FhirParsedItem[],
  locale: FhirMergeLocale
): { llmText: string; rawJsonMerged: string } {
  if (items.length === 0) {
    return { llmText: '', rawJsonMerged: '' };
  }

  const fileHeading =
    locale === 'zh-TW'
      ? (name: string) => `## 檔案：${name}`
      : (name: string) => `## File: ${name}`;

  const llmParts = items.map((item) => {
    const safeFileName = redactFileName(item.fileName);
    const formatted = formatFHIRForLLM(redactFhirResource(item.resource), locale);
    const body = stripFHIRLLMFooterBlockFromFormattedText(formatted, locale);
    return `${fileHeading(safeFileName)}\n\n${body}`;
  });
  const llmText = llmParts.join(LLM_BLOCK_SEPARATOR) + getFHIRLLMFooterClosingBlock(locale);

  const rawParts = items.map(
    (item) => `// file: ${redactFileName(item.fileName)}\n${item.summary.rawJson}`
  );
  const rawJsonMerged = rawParts.join('\n\n');

  return { llmText, rawJsonMerged };
}
