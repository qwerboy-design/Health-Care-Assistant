import { Conversation, Message } from '@/types';
import { redactFreeText } from '@/lib/privacy/redaction';

/**
 * Generate a markdown log from conversation messages.
 */
export function generateMarkdownLog(conversation: Conversation, messages: Message[]): string {
  const date = new Date(conversation.created_at);
  const formattedDate = date.toLocaleString('zh-TW');
  const redactedTitle = redactFreeText(conversation.title).content;

  let markdown = '# 對話紀錄\n\n';
  markdown += `**對話標題:** ${redactedTitle}\n`;
  markdown += `**建立時間:** ${formattedDate}\n`;
  markdown += `**工作負載:** ${conversation.workload_level}\n`;

  if (conversation.selected_function) {
    markdown += `**分析功能:** ${conversation.selected_function}\n`;
  }

  const reportMetadata = messages.find((message) => message.analysis_metadata?.kind === 'health_report_analysis')?.analysis_metadata;
  if (reportMetadata) {
    markdown += `**報告分析狀態:** ${reportMetadata.reviewStatus}\n`;
    markdown += `**指引版本:** ${reportMetadata.guidanceVersion}\n`;
    markdown += `**Prompt 版本:** ${reportMetadata.promptVersion}\n`;
    markdown += `**資料檢索:** ${reportMetadata.retrievalStatus}\n`;
    markdown += `**產生時間:** ${reportMetadata.generatedAt}\n`;
  }

  markdown += '\n---\n\n';

  for (const message of messages) {
    const messageDate = new Date(message.created_at);
    const messageTime = messageDate.toLocaleTimeString('zh-TW');
    const redactedContent = redactFreeText(message.content).content;

    if (message.role === 'user') {
      markdown += `## 使用者 (${messageTime})\n\n`;
    } else {
      markdown += `## 助手 (${messageTime})\n\n`;
    }

    markdown += `${redactedContent}\n\n`;
  }

  return markdown;
}

/**
 * Generate log filename with date and serial number.
 * Format: YYYYMMDD_XXX.md
 */
export function generateLogFilename(serialNumber: number = 1): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const serial = String(serialNumber).padStart(3, '0');

  return `${year}${month}${day}_${serial}.md`;
}

/**
 * Generate R2 storage path for logs.
 * Format: logs/{customerId}/{YYYY-MM-DD}/{conversationId}.md
 */
export function generateLogStoragePath(customerId: string, conversationId: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateFolder = `${year}-${month}-${day}`;

  return `logs/${customerId}/${dateFolder}/${conversationId}.md`;
}
