-- Revert the OpenAI provider constraint. Run manually after confirming no rows use it.

DO $$
BEGIN
  IF to_regclass('public.llm_runtime_settings') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.llm_runtime_settings
    WHERE active_provider = 'openai'
  ) THEN
    RAISE EXCEPTION 'Cannot rollback OpenAI provider while it is active';
  END IF;

  ALTER TABLE public.llm_runtime_settings
    DROP CONSTRAINT IF EXISTS llm_runtime_settings_provider;

  ALTER TABLE public.llm_runtime_settings
    ADD CONSTRAINT llm_runtime_settings_provider
    CHECK (active_provider IN ('anthropic', 'ollama'));
END
$$;
