-- Migration: Add LLM runtime settings
-- Description: Adds a singleton runtime switch for Anthropic vs local Ollama plus metadata-only audit logs.

CREATE TABLE IF NOT EXISTS llm_runtime_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  active_provider TEXT NOT NULL DEFAULT 'anthropic',
  ollama_base_url TEXT NOT NULL DEFAULT 'http://127.0.0.1:11434/api',
  ollama_model TEXT NOT NULL DEFAULT 'llama3.1:8b',
  ollama_vision_model TEXT,
  timeout_ms INTEGER NOT NULL DEFAULT 30000,
  keep_alive TEXT NOT NULL DEFAULT '5m',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT llm_runtime_settings_singleton CHECK (id = 'default'),
  CONSTRAINT llm_runtime_settings_provider CHECK (active_provider IN ('anthropic', 'ollama')),
  CONSTRAINT llm_runtime_settings_timeout CHECK (timeout_ms BETWEEN 1000 AND 120000)
);

CREATE TABLE IF NOT EXISTS llm_runtime_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  old_provider TEXT,
  new_provider TEXT,
  old_host TEXT,
  new_host TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_runtime_audit_logs_created_at
  ON llm_runtime_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_runtime_audit_logs_actor
  ON llm_runtime_audit_logs(actor_customer_id);

CREATE OR REPLACE FUNCTION update_llm_runtime_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_llm_runtime_settings_updated_at ON llm_runtime_settings;
CREATE TRIGGER trigger_update_llm_runtime_settings_updated_at
  BEFORE UPDATE ON llm_runtime_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_llm_runtime_settings_updated_at();

INSERT INTO llm_runtime_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE llm_runtime_settings IS 'Singleton runtime switch for external Anthropic or local Ollama LLM calls';
COMMENT ON TABLE llm_runtime_audit_logs IS 'Metadata-only audit log for LLM runtime setting changes; must not contain PHI/PII or prompts';
