import { redactFileName, redactFreeText } from '@/lib/privacy/redaction';
import { LLMRuntimeSettings } from './settings';

export const LOCAL_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const LOCAL_ATTACHMENT_MAX_TEXT_CHARS = 24000;
export const LOCAL_ATTACHMENT_MAX_IMAGES = 4;

export interface LocalAttachment {
  fileName: string;
  fileType: string;
  buffer: Buffer;
}

export interface PreparedOllamaAttachment {
  text: string;
  images: string[];
  modelOverride?: string;
}

function isImage(type: string): boolean {
  return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(type);
}

function isText(type: string): boolean {
  return type === 'text/plain';
}

function isPdf(type: string): boolean {
  return type === 'application/pdf';
}

function isWord(type: string): boolean {
  return type === 'application/msword' || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

function limitText(text: string): string {
  if (text.length <= LOCAL_ATTACHMENT_MAX_TEXT_CHARS) {
    return text;
  }

  return `${text.slice(0, LOCAL_ATTACHMENT_MAX_TEXT_CHARS)}\n\n[TRUNCATED_LOCAL_ATTACHMENT_TEXT]`;
}

function extractTextFromPdf(buffer: Buffer): string {
  const raw = buffer.toString('latin1');
  const matches = Array.from(raw.matchAll(/\(([^()\r\n]{3,})\)/g))
    .map((match) => match[1])
    .filter((text) => /[A-Za-z0-9\u0080-\uffff]/.test(text));

  return matches.join('\n').replace(/\\([()\\])/g, '$1').trim();
}

export function validateLocalAttachment(attachment: LocalAttachment): void {
  if (attachment.buffer.byteLength > LOCAL_ATTACHMENT_MAX_BYTES) {
    throw new Error('Local attachment is too large for Ollama analysis');
  }

  if (!attachment.fileName || !attachment.fileType) {
    throw new Error('Local attachment metadata is incomplete');
  }
}

export async function prepareAttachmentForOllama(
  attachment: LocalAttachment,
  settings: LLMRuntimeSettings
): Promise<PreparedOllamaAttachment> {
  validateLocalAttachment(attachment);

  const safeFileName = redactFileName(attachment.fileName);
  const header = `[Local attachment: ${safeFileName}]\n`;

  if (isText(attachment.fileType)) {
    const text = attachment.buffer.toString('utf8');
    return {
      text: `${header}${limitText(redactFreeText(text).content)}`,
      images: [],
    };
  }

  if (isPdf(attachment.fileType)) {
    const text = extractTextFromPdf(attachment.buffer);
    if (!text) {
      if (!settings.ollama_vision_model) {
        throw new Error('Scanned PDF requires an Ollama vision model or local OCR configuration');
      }

      throw new Error('Scanned PDF image conversion is not available in this runtime');
    }

    return {
      text: `${header}${limitText(redactFreeText(text).content)}`,
      images: [],
    };
  }

  if (isImage(attachment.fileType)) {
    if (!settings.ollama_vision_model) {
      throw new Error('Image analysis requires an Ollama vision model');
    }

    return {
      text: `${header}Analyze this image as clinical supporting material. Do not treat AI output as a final diagnosis.`,
      images: [attachment.buffer.toString('base64')].slice(0, LOCAL_ATTACHMENT_MAX_IMAGES),
      modelOverride: settings.ollama_vision_model,
    };
  }

  if (isWord(attachment.fileType)) {
    throw new Error('Word document extraction is not available without a local document parser');
  }

  throw new Error('Unsupported local attachment type');
}
