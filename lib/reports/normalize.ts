const SMALL_FORM_PUNCTUATION: Record<string, string> = {
  '﹒': '.',
  '．': '.',
  '｡': '.',
  '﹣': '-',
  '－': '-',
  '−': '-',
  '–': '-',
  '—': '-',
  '﹕': ':',
  '：': ':',
  '︰': ':',
  '，': ',',
  '﹐': ',',
  '﹔': ';',
  '；': ';',
  '﹖': '?',
  '？': '?',
  '﹗': '!',
  '！': '!',
  '～': '~',
  '﹏': '_',
  '﹍': '_',
  '／': '/',
  '﹨': '\\',
  '（': '(',
  '）': ')',
  '﹙': '(',
  '﹚': ')',
  '［': '[',
  '］': ']',
};

const COMPATIBILITY_PUNCTUATION = /[﹒．｡﹣－−–—﹕：︰，﹐﹔；﹖？﹗！～﹏﹍／﹨（）﹙﹚［］]/gu;
const CJK_SPACE = /(\p{Script=Han})[^\S\r\n]+(?=\p{Script=Han})/gu;

const PHI_LABEL = '(?:\\b(?:subject|patient|name|dob|date\\s+of\\s+birth|record\\s*no|chart(?:\\s+no)?|mrn|id)\\b|姓名|病患|受檢者|病歷號|身分證(?:字號|號)?|出生日期)';
const PHI_LINE_PATTERNS = [
  new RegExp(`${PHI_LABEL}\\s*[:#]?\\s*[^\\s]`, 'iu'),
];

/** Normalize OCR/PDF text before any report header, junk, or PHI detection. */
export function normalizeReportText(value: string): string {
  let normalized = value
    .normalize('NFKC')
    .replace(COMPATIBILITY_PUNCTUATION, (character) => SMALL_FORM_PUNCTUATION[character] ?? character)
    .replace(/μ/g, 'µ')
    .replace(/[\u00a0\u3000]/gu, ' ')
    .replace(/[^\S\r\n]+/gu, ' ');

  let previous = '';
  while (normalized !== previous) {
    previous = normalized;
    normalized = normalized.replace(CJK_SPACE, '$1');
  }
  return normalized.replace(/[ \t]+([,.;:)\]])/gu, '$1').trim();
}

export function isReportPhiLikeLine(value: string): boolean {
  const normalized = normalizeReportText(value);
  return PHI_LINE_PATTERNS.some((pattern) => pattern.test(normalized));
}

/** Return a safe display/persistence line; null means the complete line is PHI. */
export function redactReportTextLine(value: string): string | null {
  const normalized = normalizeReportText(value);
  if (!normalized) return '';
  if (isReportPhiLikeLine(normalized)) return null;
  return normalized
    .replace(new RegExp(`${PHI_LABEL}\\s*[:#]?\\s*[^,，;；\\n]+`, 'giu'), '[redacted]')
    .replace(/\b\d{8,}\b/gu, '[redacted]');
}

export function normalizeReportLabel(value: string): string {
  return normalizeReportText(value)
    .toLocaleLowerCase()
    .replace(/[\s()[\]{}:：,，.'’'"`_-]+/g, '')
    .replace(/μ/g, 'µ');
}

export type NormalizedReportUnit = { value: string; corrected: boolean };

const KNOWN_UNIT_ALIASES: Array<{ value: string; aliases: string[] }> = [
  { value: 'mg/dL', aliases: ['mg/dl', 'mgdl'] },
  { value: 'g/dL', aliases: ['g/dl', 'gdl'] },
  { value: '%', aliases: ['%'] },
  { value: 'U/L', aliases: ['u/l', 'ul'] },
  { value: 'IU/L', aliases: ['iu/l', 'iul'] },
  { value: 'mL/min/1.73m2', aliases: ['ml/min/1.73m2', 'mlmin/1.73m2', 'mlmin173m2'] },
  { value: '10^3/uL', aliases: ['10^3/ul', '10^3ul', '10^3/uµl', '1053ul'] },
  { value: 'x10^3/µL', aliases: ['x10^3/ul', 'x10^3uµl', 'x10^3ul'] },
  { value: '10^6/uL', aliases: ['10^6/ul', '10^6ul'] },
  { value: 'mmol/L', aliases: ['mmol/l', 'mmoll'] },
  { value: 'umol/L', aliases: ['umol/l', 'µmol/l', 'umoll', 'µmoll'] },
  { value: 'mg/L', aliases: ['mg/l', 'mgl'] },
  { value: 'ng/mL', aliases: ['ng/ml', 'ngml'] },
  { value: 'mEq/L', aliases: ['meq/l', 'meql'] },
  { value: 'fL', aliases: ['fl'] },
  { value: 'pg', aliases: ['pg'] },
];

function unitKey(value: string): string {
  return normalizeReportText(value)
    .replace(/\s+/g, '')
    .replace(/μ/g, 'µ')
    .toLocaleLowerCase()
    .replace(/µ/g, 'u');
}

/** Normalize common report units and flag fuzzy OCR repairs for human review. */
export function normalizeReportUnit(value: string): NormalizedReportUnit {
  const normalized = normalizeReportText(value);
  if (!normalized) return { value: '', corrected: false };
  const key = unitKey(normalized);
  const known = KNOWN_UNIT_ALIASES.find((entry) => entry.aliases.some((alias) => unitKey(alias) === key));
  if (known) return { value: known.value, corrected: known.value !== normalized };

  const compact = normalized.replace(/\s+/gu, '');
  if (/^l(?:人|八|rn)$/iu.test(compact)) {
    return { value: 'U/L', corrected: true };
  }
  if (/^u\/?(?:人|八|rn)$/iu.test(compact)) {
    return { value: 'U/L', corrected: true };
  }
  if (/^iu\/?(?:人|八|rn)$/iu.test(compact)) {
    return { value: 'IU/L', corrected: true };
  }
  if (/^mlmin\/?1\.?73m2$/iu.test(key)) {
    return { value: 'mL/min/1.73m2', corrected: true };
  }
  if (/^(?:1053|10\^3)(?:\/)?u?l$/iu.test(key)) {
    return { value: '10^3/uL', corrected: true };
  }
  return { value: normalized, corrected: false };
}
