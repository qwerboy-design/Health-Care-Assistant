# Deployment notes — v1.3.1

**Date:** 2026-03-29  

## Summary

- **Chat UI:** Desktop two-column layout (input left, messages right); compact file upload; mobile keeps messages-on-top; `max-w-7xl` chat container.
- **FHIR:** Multi-file import (max 20), `mergeFhirImportsForLLM`, single closing disclaimer block for merged LLM text.
- **Docs:** `README.md`, `docs/FHIR-ARCHITECTURE.md`, `docs/FHIR-IMPLEMENTATION-SUMMARY.md` updated.

## GitHub

```bash
git add -A
git commit -m "release: v1.3.1 chat layout, FHIR multi-import, docs"
git push origin main
```

## Vercel

If the Vercel project is linked to this GitHub repo, pushing `main` triggers a production build automatically. Confirm success in the Vercel dashboard (Deployments). Ensure all environment variables from `Reference documents/ENV_VARIABLES.md` are set for Production.

## Ollama local LLM note

- `/admin/llm-settings` can switch the runtime provider from Anthropic to local Ollama.
- Ollama mode expects the Next.js server to reach `http://127.0.0.1:11434/api` or a host explicitly allowed by `LOCAL_LLM_ALLOWED_HOSTS`.
- On Vercel, `localhost` points to the Vercel runtime, not the user's computer. Use Ollama only for local deployment or a trusted private network deployment.
- Ollama mode localizes LLM inference only. Supabase, R2 uploads, authentication, and saved conversation logs still follow the existing deployment configuration.

## Security update — LLM runtime

- 2026-05-07 security verification fixed LLM runtime settings to fail closed on ordinary Supabase/client read errors. Only explicit missing-table bootstrap cases may fall back to default settings.
- This prevents an Ollama-configured deployment from silently routing PHI/PII to Anthropic when runtime settings cannot be loaded.
- `GET /api/llm-runtime` now requires a valid `session` cookie and returns only sanitized UI state: active provider and whether Ollama vision is enabled.
- Keep `007_add_llm_runtime_settings.sql` applied before enabling Ollama in production or trusted private-network deployments.
- Regression checks used for this update: focused LLM/runtime security tests, `npm run build`, `npm run check:env`, and full `npm run test -- --run` with only the known FHIR redaction baseline failures remaining.
