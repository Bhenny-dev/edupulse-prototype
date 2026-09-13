# Execution plan

## Compatibility findings

- Existing stack: React 19 / Vite 8, JavaScript, Supabase, Vercel Git integration, Node 24 CI.
- Pulse uses authored responses and fabricated similarity labels. Settings simulates provider validation. Courseware generation uses templates. Auth is a local preview persona.
- Keep the existing academic workflow: approval/signatures outside EduPulse, generated content stays draft until instructor review; no autonomous publishing or grading.
- Supabase project confirmed as EduPulse System (`xyziepdkdvvuhgkymooo`). Use additive migrations and ownership-based RLS.
- Local Ollama is reachable and has local models. Default generation will use Ollama without API fees. Vercel cannot reach a developer's localhost; hosted generation requires an explicitly configured reachable provider. Public retrieval remains usable without a hosted model and must be labeled as retrieval, never simulated AI.

## v0.1.0 work packages

- [x] Inspect existing workflows, credentials presence, repository and deployment conventions.
- [x] Research official LangChain/LangGraph, Ollama, Supabase vector and embedding documentation.
- [x] Add validated server API with bounded requests, verified authentication, provider health and cancellation.
- [x] Add LangChain documents/splitting/embeddings, Supabase pgvector, document ingestion and ownership isolation.
- [x] Add LangGraph retrieve/generate/validate/retry flow with explicit termination and source references.
- [x] Replace simulated Pulse and Settings behavior; connect generation to real API, preserve review workflow.
- [x] Wire actual sign-in and separate preview access from private knowledge.
- [x] Run lint, meaningful typechecks, automated tests, production build, API and browser validations.
- [x] Apply and verify additive database migration; inspect security advisors.
- [ ] Validate Vercel deployment, commit and push; inspect CI and deployed API.
- [x] Organize versioned feature/architecture/operations/validation snapshots; append remote release evidence after push.

## Release gate

Run `npm run verify` in `edupulse-app`. Record external validation separately; credentials or infrastructure blockers must be explicit and cannot be reported as passes. Push only reviewed task files; never force-push. Check the commit's CI and deployment after pushing and correct failures through the same gate.
