const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const ENV_FILES = ['.env', '.env.local', '.env.production', '.env.production.local'];
const MIN_SECRET_LENGTHS = {
  JWT_SECRET: 32,
  SUPABASE_SERVICE_ROLE_KEY: 20,
  R2_SECRET_ACCESS_KEY: 40,
};

const SECRET_NAME_PATTERN = /(SECRET|TOKEN|KEY|PASSWORD|PRIVATE)/i;
const PLACEHOLDER_PATTERN = /(changeme|change-me|placeholder|example|your_|test-|dummy)/i;
const PUBLIC_ALLOWLIST = new Set(['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

function parseEnv(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      if (index === -1) return null;
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
      return { key, value };
    })
    .filter(Boolean);
}

function checkFile(fileName) {
  const filePath = path.join(ROOT, fileName);
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const findings = [];
  const entries = parseEnv(fs.readFileSync(filePath, 'utf8'));

  for (const { key, value } of entries) {
    if (
      key.startsWith('NEXT_PUBLIC_') &&
      SECRET_NAME_PATTERN.test(key) &&
      !PUBLIC_ALLOWLIST.has(key)
    ) {
      findings.push(`${fileName}: ${key} is public but looks like a secret`);
    }

    if (SECRET_NAME_PATTERN.test(key) && PLACEHOLDER_PATTERN.test(value)) {
      findings.push(`${fileName}: ${key} appears to use a placeholder value`);
    }

    const minLength = MIN_SECRET_LENGTHS[key];
    if (minLength && value.length < minLength) {
      findings.push(`${fileName}: ${key} must be at least ${minLength} characters`);
    }
  }

  return findings;
}

const findings = ENV_FILES.flatMap(checkFile);

if (findings.length > 0) {
  console.error('Environment safety check failed:');
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log('Environment safety check passed.');
