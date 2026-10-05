export type OllamaUrlValidationResult =
  | { valid: true; url: URL }
  | { valid: false; error: string };

const DEFAULT_ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1']);
const BLOCKED_HOSTS = new Set([
  '0.0.0.0',
  '::',
  '::1',
  '169.254.169.254',
  'metadata.google.internal',
]);

function getAllowedHosts(): Set<string> {
  const configured = process.env.LOCAL_LLM_ALLOWED_HOSTS || process.env.OLLAMA_ALLOWED_HOSTS || '';
  const hosts = configured
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  return new Set([...DEFAULT_ALLOWED_HOSTS, ...hosts]);
}

function isBlockedIp(hostname: string): boolean {
  if (hostname.startsWith('169.254.')) {
    return true;
  }

  if (hostname.startsWith('224.') || hostname.startsWith('255.')) {
    return true;
  }

  return false;
}

export function validateOllamaBaseUrl(input: string): OllamaUrlValidationResult {
  if (typeof input !== 'string' || input.trim().length === 0) {
    return { valid: false, error: 'Ollama URL is required' };
  }

  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { valid: false, error: 'Ollama URL is invalid' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { valid: false, error: 'Ollama URL must use http or https' };
  }

  if (url.username || url.password) {
    return { valid: false, error: 'Ollama URL must not contain credentials' };
  }

  const hostname = url.hostname.toLowerCase();
  const allowedHosts = getAllowedHosts();

  if (BLOCKED_HOSTS.has(hostname) || isBlockedIp(hostname)) {
    return { valid: false, error: 'Ollama URL host is blocked' };
  }

  if (!allowedHosts.has(hostname)) {
    return { valid: false, error: 'Ollama URL host is not allowed' };
  }

  return { valid: true, url };
}

export function normalizeOllamaBaseUrl(input: string): string {
  const result = validateOllamaBaseUrl(input);
  if (!result.valid) {
    throw new Error(result.error);
  }

  return result.url.toString().replace(/\/$/, '');
}

export function getOllamaHost(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }

  try {
    return new URL(input).host;
  } catch {
    return null;
  }
}
