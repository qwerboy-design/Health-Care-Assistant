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
