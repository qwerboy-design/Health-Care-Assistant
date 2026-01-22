import { Message, Conversation } from '@/types';

/**
 * Generate a markdown log from conversation messages
 */
export function generateMarkdownLog(
  conversation: Conversation,
  messages: Message[]
): string {
  const date = new Date(conversation.created_at);
  const formattedDate = date.toLocaleString('zh-TW');

  let markdown = `# 對話記錄\n\n`;
  markdown += `**對話標題:** ${conversation.title}\n`;
  markdown += `**建立時間:** ${formattedDate}\n`;
  markdown += `**工作量級別:** ${conversation.workload_level}\n`;

  if (conversation.selected_function) {
    markdown += `**選擇功能:** ${conversation.selected_function}\n`;
  }

  markdown += `\n---\n\n`;

  // Add messages
  messages.forEach((message, index) => {
    const messageDate = new Date(message.created_at);
    const messageTime = messageDate.toLocaleTimeString('zh-TW');

    if (message.role === 'user') {
      markdown += `## 使用者 (${messageTime})\n\n`;
    } else {
      markdown += `## 助手 (${messageTime})\n\n`;
    }

    markdown += `${message.content}\n\n`;
  });

  return markdown;
}

/**
 * Generate log filename with date and serial number
 * Format: YYYYMMDD_XXX.md (where XXX is serial number)
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
 * Generate R2 storage path for logs
 * Format: logs/{customerId}/{filename}
 */
export function generateLogStoragePath(customerId: string, filename: string): string {
  return `logs/${customerId}/${filename}`;
}
