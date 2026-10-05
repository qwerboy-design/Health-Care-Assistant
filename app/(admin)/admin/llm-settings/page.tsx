'use client';

import { useEffect, useState } from 'react';

type Provider = 'anthropic' | 'openai' | 'ollama';

interface LLMSettings {
  active_provider: Provider;
  ollama_base_url: string;
  ollama_model: string;
  ollama_vision_model: string | null;
  timeout_ms: number;
  keep_alive: string;
  is_enabled: boolean;
  updated_at: string;
}

interface LLMSettingsStatus {
  settingsTableAvailable: boolean;
  openaiKeyConfigured: boolean;
  openaiModel: string;
  warning?: string;
}

const DEFAULT_FORM: LLMSettings = {
  active_provider: 'anthropic',
  ollama_base_url: 'http://127.0.0.1:11434/api',
  ollama_model: 'llama3.1:8b',
  ollama_vision_model: '',
  timeout_ms: 30000,
  keep_alive: '5m',
  is_enabled: true,
  updated_at: '',
};

export default function LLMSettingsPage() {
  const [form, setForm] = useState<LLMSettings>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<LLMSettingsStatus>({
    settingsTableAvailable: true,
    openaiKeyConfigured: false,
    openaiModel: 'gpt-4o-mini',
  });

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/llm-settings', { cache: 'no-store' });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || '載入失敗');
      }
      setForm({ ...DEFAULT_FORM, ...data.data.settings });
      setStatus({
        settingsTableAvailable: Boolean(data.data.settingsTableAvailable),
        openaiKeyConfigured: Boolean(data.data.openaiKeyConfigured),
        openaiModel: data.data.openaiModel || 'gpt-4o-mini',
        warning: data.data.warning,
      });
    } catch (err: any) {
      setError(err?.message || '載入 LLM 設定失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/llm-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || '儲存失敗');
      }
      setForm({ ...DEFAULT_FORM, ...data.data.settings });
      setStatus({
        settingsTableAvailable: Boolean(data.data.settingsTableAvailable),
        openaiKeyConfigured: Boolean(data.data.openaiKeyConfigured),
        openaiModel: data.data.openaiModel || 'gpt-4o-mini',
        warning: data.data.warning,
      });
      setMessage('LLM 設定已儲存');
    } catch (err: any) {
      setError(err?.message || '儲存 LLM 設定失敗');
    } finally {
      setSaving(false);
    }
  };

  const testProvider = async () => {
    setTesting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/llm-settings/test', { method: 'POST' });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || '測試失敗');
      }
      setMessage(`${form.active_provider} 連線成功：${data.data.model}`);
    } catch (err: any) {
      setError(err?.message || 'LLM provider 連線測試失敗');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-8 text-gray-600">載入中...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">LLM 設定</h1>
        <p className="mt-2 text-sm text-gray-600">
          控制全站 LLM provider。Ollama 僅代表推論本地化，不代表 Supabase 或 R2 儲存本地化。
        </p>
      </div>

      {message && <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-green-700">{message}</div>}
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}
      {status.warning && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          {status.warning}
        </div>
      )}

      <form onSubmit={saveSettings} className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Provider</label>
          <select
            value={form.active_provider}
            onChange={(event) => setForm({ ...form, active_provider: event.target.value as Provider })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
            <option value="ollama">Ollama 本地模型</option>
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Ollama URL</label>
            <input
              type="url"
              value={form.ollama_base_url}
              onChange={(event) => setForm({ ...form, ollama_base_url: event.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">文字模型</label>
            <input
              value={form.ollama_model}
              onChange={(event) => setForm({ ...form, ollama_model: event.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Vision 模型</label>
            <input
              value={form.ollama_vision_model || ''}
              onChange={(event) => setForm({ ...form, ollama_vision_model: event.target.value })}
              placeholder="例如：llava 或 gemma3"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Timeout ms</label>
            <input
              type="number"
              min={1000}
              max={120000}
              value={form.timeout_ms}
              onChange={(event) => setForm({ ...form, timeout_ms: Number(event.target.value) })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Keep alive</label>
            <input
              value={form.keep_alive}
              onChange={(event) => setForm({ ...form, keep_alive: event.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          OpenAI API key 與預設模型請設定在 server-side 環境變數 <code>OPENAI_API_KEY</code> / <code>OPENAI_MODEL</code>，不會儲存或回傳到瀏覽器。若共用模型清單目前選到 Claude model ID，OpenAI 會改用 <code>OPENAI_MODEL</code>；正式使用時仍建議在模型管理加入對應的 OpenAI model pricing。Ollama URL 僅允許 localhost、127.0.0.1 或 server allowlist；provider 失敗時系統不會自動切回其他 provider。
        </div>

        <div className="grid gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 sm:grid-cols-3">
          <div>
            <span className="font-medium">Settings table：</span>{' '}
            {status.settingsTableAvailable ? '可用' : '不可用，請套用 migration 007/011'}
          </div>
          <div>
            <span className="font-medium">OpenAI API key：</span>{' '}
            {status.openaiKeyConfigured ? '已設定' : '未設定'}
          </div>
          <div>
            <span className="font-medium">OpenAI model：</span> {status.openaiModel}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '儲存中...' : '儲存設定'}
          </button>
          <button
            type="button"
            onClick={testProvider}
            disabled={testing || (form.active_provider !== 'ollama' && form.active_provider !== 'openai')}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {testing ? '測試中...' : `測試 ${form.active_provider}`}
          </button>
        </div>
      </form>
    </div>
  );
}
