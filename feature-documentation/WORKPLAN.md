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
- [x] Validate Vercel deployment, commit and push; inspect CI and deployed API. GitHub runner cannot start because of an account billing lock; Vercel and local verification provide the execution gate.
- [x] Finalize versioned feature/architecture/operations/validation snapshots with remote release evidence.

## Release gate

Run `npm run verify` in `edupulse-app`. Record external validation separately; credentials or infrastructure blockers must be explicit and cannot be reported as passes. Push only reviewed task files; never force-push. Check the commit's CI and deployment after pushing and correct failures through the same gate.

## v0.2.0 persistent academic workspace

- [x] Trace syllabus saving, approval upload, parsing, courseware storage, and stale template generation.
- [x] Implement a shared workspace API with private ownership, bounded snapshots, and revision conflict detection.
- [x] Connect syllabus builder saves, edits, copies, archives, and real DOCX download/upload.
- [x] Parse only document evidence; require instructor confirmation before activation; remove simulated AI outline generation.
- [x] Share active syllabi and courseware through the same persistent workspace, with pending-edit recovery and backup export.
- [x] Test ownership, concurrent saves, parser accuracy, and the complete browser lifecycle.
- [x] Apply the additive Supabase migration after local SQL validation; inspect advisors.
- [x] Run lint, typecheck, tests, build, deployment checks, browser validation, and dependency audit.
- [ ] Write the version snapshot, validate preview deployment, push, and verify production.

Compatibility: retain React/Vite, the existing AI API, local PGlite, Supabase authentication, and offline institutional approval. Hosted guests keep device-only preview data; authenticated instructors get a private cloud workspace. Approved DOCX attachments are bounded to 500 KB and the workspace to 3 MB. Signatures are attested by the instructor, not verified automatically. Curriculum and student analytics remain sample data until their own integrations are implemented.

## v0.1.1 verification correction

The first Vercel verification build excluded tests through the app ignore file and reported zero tests. Include test sources in the build context and make the test runner reject an empty suite. Inspect the remote test count as well as deployment readiness. The versioned correction and its validation live in `versions/v0.1.1`.
