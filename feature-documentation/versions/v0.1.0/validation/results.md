# Validation evidence

Validated on 2026-09-13 and 2026-09-14. Release configuration: Node 24, React 19, Vite 8, Ollama 0.23.1, `qwen2.5:3b`, `all-minilm`, PGlite/pgvector, Supabase and Vercel.

| Check | Evidence |
| --- | --- |
| Lint | `npm run lint` passes. Existing prototype warnings remain; no lint errors. |
| Typecheck | `npm run typecheck` passes; strict TypeScript on new API/server/client/tests, existing permissive JavaScript check on legacy UI. |
| Automated tests | 16 passing: graph branching and bounded retry, no-evidence behavior, cancellation, citations, input validation, authorization, safe errors, delayed-generation preservation, real SQL/RLS isolation and transactional ingestion. |
| Build | Production Vite build passes. Lazy document parsing and minification reduce the main compressed asset from about 707 KB to about 373 KB. A large-chunk warning remains. |
| Deployment contract | Built assets, SPA/API separation, hosted health and public source search pass. |
| Dependency audit | `npm audit --audit-level=high`: zero vulnerabilities. |
| Browser workflows | Six passing Playwright tests across desktop Chromium and an iPhone-sized Chromium viewport: actual API health/source chat, responsive assistant, profile persistence, document editing/download, assessment edits and draft reset. No AI responses are mocked in the chat browser check; the test server uses labeled retrieval mode. |
| Local live AI | Actual HTTP API health, synthetic document ingestion, semantic retrieval of its unique fact, model-generated cited answer, fixture deletion, and structured material/activity/assessment generation all pass with the default model. |
| Supabase | Connectivity HTTP 200; migration `20260913112259_connected_ai.sql` applied to EduPulse System. Live queries verify ownership RLS and caller-permission RPCs. Security advisors returned no findings. Isolated SQL tests verify another account cannot read, search or delete an owner's chunks. |
| Hosted preview | Vercel preview `dpl_A7sRdPxuc6XSH3qJR7nShR7DC2FC` reached Ready. Actual health and POST chat return JSON, with public references and explicit retrieval mode. Final production commit status is appended after push. |

Screenshots and Playwright traces are generated under ignored `edupulse-app/test-results/`; they are reproducible with `npm run test:browser` and are not release data. The in-app browser runtime was unavailable in this session; standalone Playwright Chromium supplied browser verification.

## Issues resolved during validation

- Mobile header exceeded viewport width and prevented reliable assistant taps.
- Provider timeouts and invalid output were mistaken by the old UI for working generation.
- The full JSON wire schema crashed the installed model runner; bounded structural schema plus full server validation succeeded.
- Metadata-only preview courseware entries were incorrectly treated as saved generated documents.
- Document editing dropped sections; assessment save callbacks were missing.
- A delayed generation could overwrite a newly checked or published item.

## Limits of the evidence

No real institutional login credential or Gemini key was available, so a real-account sign-in and hosted Gemini generation are not claimed as live passes. The deployed default provides public source search; free model generation and semantic indexing were verified locally. Hosted private ingestion additionally requires a configured reachable embedding endpoint. SQL tests establish RLS behavior, not a completed multi-user LMS migration. Citation and output-shape checks do not certify subject correctness.
