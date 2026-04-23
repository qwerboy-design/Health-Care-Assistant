export type RedactionCategory =
  | 'name'
  | 'tw_id'
  | 'phone'
  | 'email'
  | 'address'
  | 'dob'
  | 'mrn';

export type RedactionMatchSummary = {
  type: RedactionCategory;
  count: number;
};

export type TextRedactionResult = {
  content: string;
  matches: RedactionMatchSummary[];
};

const PLACEHOLDERS: Record<RedactionCategory, string> = {
  name: '[REDACTED_NAME]',
  tw_id: '[REDACTED_TW_ID]',
  phone: '[REDACTED_PHONE]',
  email: '[REDACTED_EMAIL]',
  address: '[REDACTED_ADDRESS]',
  dob: '[REDACTED_DOB]',
  mrn: '[REDACTED_MRN]',
};

const FILENAME_PLACEHOLDERS: Record<RedactionCategory, string> = {
  name: 'redacted-name',
  tw_id: 'redacted-tw-id',
  phone: 'redacted-phone',
  email: 'redacted-email',
  address: 'redacted-address',
  dob: 'redacted-dob',
  mrn: 'redacted-mrn',
};

const TW_ID_REGEX = /\b[A-Z][12]\d{8}\b/g;
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX =
  /(?<!\d)(?:\+886[- ]?9\d{2}[- ]?\d{3}[- ]?\d{3}|09\d{2}[- ]?\d{3}[- ]?\d{3}|0\d{1,2}[- ]?\d{6,8})(?!\d)/g;

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function labelAlternation(values: string[]): string {
  return values.map((value) => escapeRegexLiteral(value)).join('|');
}

const NAME_FIELD_LABELS = [
  '姓名',
  '病患姓名',
  '病人姓名',
  '憪?',
  '?憪?',
  '?犖憪?',
  'Patient Name',
  'Name',
];

const NAME_SUBJECT_LABELS = ['病患', '病人', '?', '?犖', 'Patient'];

const TW_ID_LABELS = [
  '身分證字號',
  '身份證字號',
  '身份證號',
  '頨怠?霅??頨思遢霅??頨怠?霅?',
  '頨思遢霅?',
  'National ID',
  'ID No.?',
];

const DOB_LABELS = ['DOB', 'Date of Birth', 'Birth Date', '生日', '出生日期', '?', '?箇??交?'];

const ADDRESS_LABELS = ['地址', '住址', '?啣?', 'Address'];

const MRN_LABELS = ['病歷號', '病歷號碼', '?風??風?Ⅳ', 'MRN', 'Chart No.?', 'Medical Record Number'];

const LABEL_PATTERNS: Array<{
  type: RedactionCategory;
  regex: RegExp;
  format: (label: string) => string;
}> = [
  {
    type: 'name',
    regex: new RegExp(`((?:${labelAlternation(NAME_FIELD_LABELS)}))\\s*[:：]\\s*[^\\n,;]+`, 'gi'),
    format: (label) => `${label}: ${PLACEHOLDERS.name}`,
  },
  {
    type: 'name',
    regex: new RegExp(
      `((?:${labelAlternation(NAME_SUBJECT_LABELS)}))\\s+([A-Za-z]+(?:\\s+[A-Za-z]+){0,2}|[\\u4e00-\\u9fff]{2,4})`,
      'g'
    ),
    format: (label) => `${label} ${PLACEHOLDERS.name}`,
  },
  {
    type: 'tw_id',
    regex: new RegExp(
      `((?:${labelAlternation(TW_ID_LABELS)}))\\s*[:：]?\\s*[A-Z][12]\\d{8}`,
      'gi'
    ),
    format: (label) => `${label}: ${PLACEHOLDERS.tw_id}`,
  },
  {
    type: 'dob',
    regex: new RegExp(
      `((?:${labelAlternation(DOB_LABELS)}))\\s*[:：]?\\s*(?:\\d{4}[/\\-年]\\d{1,2}[/\\-月]\\d{1,2}(?:日)?|\\d{4}-\\d{2}-\\d{2})`,
      'gi'
    ),
    format: (label) => `${label}: ${PLACEHOLDERS.dob}`,
  },
  {
    type: 'address',
    regex: new RegExp(`((?:${labelAlternation(ADDRESS_LABELS)}))\\s*[:：]\\s*[^\\n]+`, 'gi'),
    format: (label) => `${label}: ${PLACEHOLDERS.address}`,
  },
  {
    type: 'mrn',
    regex: new RegExp(
      `((?:${labelAlternation(MRN_LABELS)}))\\s*[:：]?\\s*[A-Za-z0-9-]+`,
      'gi'
    ),
    format: (label) => `${label}: ${PLACEHOLDERS.mrn}`,
  },
];

function clonePlain<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function incrementCount(counts: Map<RedactionCategory, number>, type: RedactionCategory, amount: number) {
  if (amount <= 0) {
    return;
  }

  counts.set(type, (counts.get(type) || 0) + amount);
}

function replaceWithCounter(
  input: string,
  regex: RegExp,
  replacement: string | ((...args: any[]) => string)
): { content: string; count: number } {
  let count = 0;
  const content = input.replace(regex, (...args) => {
    count += 1;
    return typeof replacement === 'function' ? replacement(...args) : replacement;
  });

  return { content, count };
}

function redactAddressNode(address: any) {
  return {
    ...address,
    text: PLACEHOLDERS.address,
    line: undefined,
    city: undefined,
    district: undefined,
    postalCode: undefined,
    country: undefined,
  };
}

function redactTelecomNode(telecom: any) {
  return {
    ...telecom,
    value: telecom?.system === 'email' ? PLACEHOLDERS.email : PLACEHOLDERS.phone,
  };
}

export function summarizeRedactions(counts: Map<RedactionCategory, number>): RedactionMatchSummary[] {
  return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
}

export function redactFreeText(input: string): TextRedactionResult {
  if (!input) {
    return { content: input, matches: [] };
  }

  let content = input;
  const counts = new Map<RedactionCategory, number>();

  for (const pattern of LABEL_PATTERNS) {
    const result = replaceWithCounter(content, pattern.regex, (_match: string, label: string) =>
      pattern.format(label)
    );
    content = result.content;
    incrementCount(counts, pattern.type, result.count);
  }

  const strictPatterns: Array<{
    type: RedactionCategory;
    regex: RegExp;
    replacement: string;
  }> = [
    { type: 'email', regex: EMAIL_REGEX, replacement: PLACEHOLDERS.email },
    { type: 'tw_id', regex: TW_ID_REGEX, replacement: PLACEHOLDERS.tw_id },
    { type: 'phone', regex: PHONE_REGEX, replacement: PLACEHOLDERS.phone },
  ];

  for (const pattern of strictPatterns) {
    const result = replaceWithCounter(content, pattern.regex, pattern.replacement);
    content = result.content;
    incrementCount(counts, pattern.type, result.count);
  }

  return {
    content,
    matches: summarizeRedactions(counts),
  };
}

export function redactFileName(input: string): string {
  const baseName = input.split(/[\\/]/).pop() || 'file';
  const dotIndex = baseName.lastIndexOf('.');
  const hasExtension = dotIndex > 0;
  const namePart = hasExtension ? baseName.slice(0, dotIndex) : baseName;
  const extension = hasExtension ? baseName.slice(dotIndex) : '';

  let redacted = namePart;
  let hasHighRiskIdentifier = false;

  const filenamePatterns: Array<{
    type: RedactionCategory;
    regex: RegExp;
  }> = [
    { type: 'email', regex: EMAIL_REGEX },
    { type: 'tw_id', regex: TW_ID_REGEX },
    { type: 'phone', regex: PHONE_REGEX },
  ];

  for (const pattern of filenamePatterns) {
    const result = replaceWithCounter(redacted, pattern.regex, FILENAME_PLACEHOLDERS[pattern.type]);
    if (result.count > 0) {
      hasHighRiskIdentifier = true;
      redacted = result.content;
    }
  }

  redacted = redacted
    .replace(
      /((?:姓名|病患姓名|病人姓名|patient[-_ ]?name|name))[-_ ]*([A-Za-z]+(?:[-_ ][A-Za-z]+){0,2}|[\u4e00-\u9fff]{2,4})/gi,
      '$1-redacted-name'
    )
    .replace(
      /((?:病歷號|病歷號碼|mrn|chart[-_ ]?no|medical[-_ ]record[-_ ]number))[-_ ]*([A-Za-z0-9-]+)/gi,
      '$1-redacted-mrn'
    );

  if (hasHighRiskIdentifier) {
    redacted = redacted.replace(/[\u4e00-\u9fff]{2,4}/g, FILENAME_PLACEHOLDERS.name);
  }

  const trimmed = redacted.trim().replace(/\s+/g, '_');
  return `${trimmed || 'file'}${extension}`;
}

export function redactUploadMetadata(metadata: {
  fileName?: string | null;
  fileUrl?: string | null;
  pathname?: string | null;
}) {
  return {
    fileName: metadata.fileName ? redactFileName(metadata.fileName) : metadata.fileName ?? undefined,
    fileUrl: metadata.fileUrl ? redactFreeText(metadata.fileUrl).content : metadata.fileUrl ?? undefined,
    pathname: metadata.pathname ? redactFileName(metadata.pathname) : metadata.pathname ?? undefined,
  };
}

export function redactConversationMessages<T extends { content: string }>(messages: T[]): T[] {
  return messages.map((message) => {
    const next = { ...message, content: redactFreeText(message.content).content } as T & {
      file_name?: string;
      fileName?: string;
    };

    if (typeof next.file_name === 'string') {
      next.file_name = redactFileName(next.file_name);
    }

    if (typeof next.fileName === 'string') {
      next.fileName = redactFileName(next.fileName);
    }

    return next;
  });
}

export function redactFhirResource<T>(resource: T): T {
  if (!resource || typeof resource !== 'object') {
    return resource;
  }

  const cloned = clonePlain(resource) as any;

  function walk(node: any, parentKey?: string): any {
    if (Array.isArray(node)) {
      return node.map((item) => walk(item, parentKey));
    }

    if (!node || typeof node !== 'object') {
      return node;
    }

    if (node.resourceType === 'Bundle' && Array.isArray(node.entry)) {
      node.entry = node.entry.map((entry: any) => ({
        ...entry,
        resource: entry.resource ? walk(entry.resource) : entry.resource,
      }));
      return node;
    }

    if (node.resourceType === 'Patient') {
      if (Array.isArray(node.name) && node.name.length > 0) {
        node.name = [{ text: PLACEHOLDERS.name }];
      }

      if (Array.isArray(node.identifier) && node.identifier.length > 0) {
        node.identifier = node.identifier.map((identifier: any) => ({
          ...identifier,
          value: PLACEHOLDERS.mrn,
        }));
      }

      if (Array.isArray(node.telecom) && node.telecom.length > 0) {
        node.telecom = node.telecom.map((telecom: any) => redactTelecomNode(telecom));
      }

      if (Array.isArray(node.address) && node.address.length > 0) {
        node.address = node.address.map((address: any) => redactAddressNode(address));
      }

      if (typeof node.birthDate === 'string') {
        node.birthDate = PLACEHOLDERS.dob;
      }

      if (Array.isArray(node.contact) && node.contact.length > 0) {
        node.contact = node.contact.map((contact: any) => ({
          ...contact,
          name: { text: PLACEHOLDERS.name },
          telecom: Array.isArray(contact.telecom)
            ? contact.telecom.map((telecom: any) => redactTelecomNode(telecom))
            : contact.telecom,
          address: Array.isArray(contact.address)
            ? contact.address.map((address: any) => redactAddressNode(address))
            : contact.address,
        }));
      }
    }

    for (const [key, value] of Object.entries(node)) {
      if (value && typeof value === 'object') {
        node[key] = walk(value, key);
        continue;
      }

      if (
        key === 'display' &&
        typeof value === 'string' &&
        ['subject', 'patient', 'individual', 'beneficiary', 'subscriber'].includes(parentKey || '')
      ) {
        node[key] = PLACEHOLDERS.name;
      }
    }

    return node;
  }

  return walk(cloned) as T;
}
