import { supabaseAdmin } from '@/lib/supabase/client';
import { getOllamaHost, normalizeOllamaBaseUrl } from './url-security';
import { DEFAULT_OPENAI_MODEL } from './openai-client';

export type LLMProvider = 'anthropic' | 'openai' | 'ollama';

export interface LLMRuntimeSettings {
  id: 'default';
  active_provider: LLMProvider;
  ollama_base_url: string;
  ollama_model: string;
  ollama_vision_model: string | null;
  timeout_ms: number;
  keep_alive: string;
  is_enabled: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateLLMRuntimeSettingsInput {
  active_provider: LLMProvider;
  ollama_base_url: string;
  ollama_model: string;
  ollama_vision_model?: string | null;
  timeout_ms: number;
  keep_alive: string;
  is_enabled?: boolean;
}

export interface LLMRuntimeSettingsStatus {
  settings: LLMRuntimeSettings;
  settingsTableAvailable: boolean;
  openaiKeyConfigured: boolean;
  openaiModel: string;
}

export class LLMSettingsTableUnavailableError extends Error {
  public readonly code = 'LLM_SETTINGS_TABLE_MISSING';

  constructor() {
    super('LLM 設定資料表尚未套用 migration 007/011');
    this.name = 'LLMSettingsTableUnavailableError';
  }
}

export const DEFAULT_LLM_RUNTIME_SETTINGS: LLMRuntimeSettings = {
  id: 'default',
  active_provider: 'anthropic',
  ollama_base_url: 'http://127.0.0.1:11434/api',
  ollama_model: 'llama3.1:8b',
  ollama_vision_model: null,
  timeout_ms: 30000,
  keep_alive: '5m',
  is_enabled: true,
  updated_by: null,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

function isMissingSettingsTable(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === '42P01' ||
    (error?.code === 'PGRST205' && message.includes('llm_runtime_settings')) ||
    (message.includes('could not find the table') && message.includes('llm_runtime_settings')) ||
    (message.includes('relation') && message.includes('llm_runtime_settings') && message.includes('does not exist'))
  );
}

function normalizeModelName(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }

  return value.trim().slice(0, 255);
}

export function validateLLMRuntimeSettings(input: UpdateLLMRuntimeSettingsInput) {
  if (
    input.active_provider !== 'anthropic' &&
    input.active_provider !== 'openai' &&
    input.active_provider !== 'ollama'
  ) {
    throw new Error('Unsupported LLM provider');
  }

  const ollamaBaseUrl = normalizeOllamaBaseUrl(input.ollama_base_url);
  const timeoutMs = Number(input.timeout_ms);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) {
    throw new Error('Timeout must be between 1000 and 120000 ms');
  }

  return {
    active_provider: input.active_provider,
    ollama_base_url: ollamaBaseUrl,
    ollama_model: normalizeModelName(input.ollama_model, DEFAULT_LLM_RUNTIME_SETTINGS.ollama_model),
    ollama_vision_model:
      typeof input.ollama_vision_model === 'string' && input.ollama_vision_model.trim()
        ? input.ollama_vision_model.trim().slice(0, 255)
        : null,
    timeout_ms: timeoutMs,
    keep_alive:
      typeof input.keep_alive === 'string' && input.keep_alive.trim()
        ? input.keep_alive.trim().slice(0, 50)
        : DEFAULT_LLM_RUNTIME_SETTINGS.keep_alive,
    is_enabled: input.is_enabled !== false,
  };
}

async function loadLLMRuntimeSettings(): Promise<{
  settings: LLMRuntimeSettings;
  settingsTableAvailable: boolean;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('llm_runtime_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { settings: DEFAULT_LLM_RUNTIME_SETTINGS, settingsTableAvailable: true };
      if (isMissingSettingsTable(error)) {
        return { settings: DEFAULT_LLM_RUNTIME_SETTINGS, settingsTableAvailable: false };
      }
      throw new Error(error.message);
    }

    return {
      settings: { ...DEFAULT_LLM_RUNTIME_SETTINGS, ...(data as LLMRuntimeSettings) },
      settingsTableAvailable: true,
    };
  } catch (error: any) {
    if (isMissingSettingsTable(error)) {
      return { settings: DEFAULT_LLM_RUNTIME_SETTINGS, settingsTableAvailable: false };
    }

    throw error;
  }
}

export async function getLLMRuntimeSettings(): Promise<LLMRuntimeSettings> {
  const { settings } = await loadLLMRuntimeSettings();
  return settings;
}

export async function getLLMRuntimeSettingsStatus(): Promise<LLMRuntimeSettingsStatus> {
  const { settings, settingsTableAvailable } = await loadLLMRuntimeSettings();
  return {
    settings,
    settingsTableAvailable,
    openaiKeyConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    openaiModel: process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
  };
}

export async function updateLLMRuntimeSettings(
  input: UpdateLLMRuntimeSettingsInput,
  actorCustomerId: string
): Promise<LLMRuntimeSettings> {
  const currentStatus = await getLLMRuntimeSettingsStatus();
  if (!currentStatus.settingsTableAvailable) {
    throw new LLMSettingsTableUnavailableError();
  }

  const current = currentStatus.settings;
  const updateData = validateLLMRuntimeSettings(input);

  const { data, error } = await supabaseAdmin
    .from('llm_runtime_settings')
    .upsert({
      id: 'default',
      ...updateData,
      updated_by: actorCustomerId,
    })
    .select()
    .single();

  await writeLLMRuntimeAuditLog({
    actorCustomerId,
    action: 'update',
    oldProvider: current.active_provider,
    newProvider: updateData.active_provider,
    oldHost: getOllamaHost(current.ollama_base_url),
    newHost: getOllamaHost(updateData.ollama_base_url),
    success: !error,
    errorCode: error?.code,
  });

  if (error) {
    if (isMissingSettingsTable(error)) {
      throw new LLMSettingsTableUnavailableError();
    }
    throw new Error(error.message);
  }

  return {
    ...DEFAULT_LLM_RUNTIME_SETTINGS,
    ...(data as LLMRuntimeSettings),
  };
}

export async function writeLLMRuntimeAuditLog(input: {
  actorCustomerId: string | null;
  action: string;
  oldProvider?: string | null;
  newProvider?: string | null;
  oldHost?: string | null;
  newHost?: string | null;
  success: boolean;
  errorCode?: string | null;
}): Promise<void> {
  try {
    await supabaseAdmin.from('llm_runtime_audit_logs').insert({
      actor_customer_id: input.actorCustomerId,
      action: input.action,
      old_provider: input.oldProvider || null,
      new_provider: input.newProvider || null,
      old_host: input.oldHost || null,
      new_host: input.newHost || null,
      success: input.success,
      error_code: input.errorCode || null,
    });
  } catch (error) {
    console.warn('[LLM Runtime Audit] Failed to write audit metadata');
  }
}
