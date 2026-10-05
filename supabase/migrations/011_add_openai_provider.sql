-- HCA: allow OpenAI as a server-side LLM runtime provider.
-- The OPENAI_API_KEY remains a deployment secret and is never stored in Supabase.

ALTER TABLE IF EXISTS public.llm_runtime_settings
  DROP CONSTRAINT IF EXISTS llm_runtime_settings_provider;

ALTER TABLE IF EXISTS public.llm_runtime_settings
  ADD CONSTRAINT llm_runtime_settings_provider
  CHECK (active_provider IN ('anthropic', 'openai', 'ollama'));

COMMENT ON TABLE public.llm_runtime_settings IS
  'Singleton runtime switch for external Anthropic/OpenAI or local Ollama LLM calls';
