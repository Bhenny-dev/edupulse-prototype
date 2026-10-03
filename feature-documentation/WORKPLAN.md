# Execution plan

## v0.4.0 — Agentic RAG, real documents and accurate Pulse guidance (2026-10-01)

User request: LangChain/LangGraph agentic workflow with named agents; real document upload and extraction (no mock data); free APIs/open-source models; vector database; RAG covering uploading, extracting, evaluating, ranking, generating, comparing, referencing, correcting, collaborating, corroborating and planning; stronger sandboxing; accurate Pulse drag-and-drop assistance and walkthroughs; image snapshots with Markdown guides for the capstone results and discussion. Includes the unreleased v0.3.0 work in the same verification gate.

Constraints found: 8 GB RAM, ~2 GB free disk, Ollama installed but optional, Vercel has no generation key or Ollama. FR-CW-18/NFR-AI-08 forbid plagiarism/integrity scoring, so comparison means alignment and coverage, never authorship detection. NFR-USE-03 still forbids user-facing retrieval tuning. CHED's site blocks automated download; evaluation uses openly licensed Wikipedia PDFs (CC BY-SA 4.0) and the project's own specifications.

- [x] Free in-process models: all-MiniLM-L6-v2 embeddings and ms-marco-MiniLM cross-encoder via onnxruntime-web (WASM), pinned revisions with SHA-256 checks; no API key, works locally and on Vercel.
- [x] Ingestion pipeline as a LangChain runnable sequence: type sniffing, sandboxed extraction (PDF, DOCX, PPTX, HTML, TXT/MD/CSV) in a resource-limited worker with an empty environment, zip-bomb and page caps, cleaning, quality and prompt-injection evaluation, structure-aware chunking with page/section metadata.
- [x] Vector database: pgvector HNSW + Postgres full-text index (local PGlite and an additive Supabase migration), hybrid search fused with reciprocal rank fusion, cross-encoder reranking and diversity selection.
- [x] LangGraph multi-agent workflow with named agents (Planner, Researcher ×N in parallel, Ranker, Writer, Verifier, Corrector, Comparator, Librarian) and a visible agent trace.
- [x] Claim-level verification and corroboration, citation correction, automatic courseware–syllabus alignment check (NFR-AI-06), human revision requests.
- [x] Librarian: real references from free APIs (Open Library, OpenAlex, Wikipedia) behind fixed hosts, timeouts and schema validation.
- [x] Pulse: visible drop rejection, perch beside the target, panel placement away from the target, DOM-derived component brief and component tour, verified walkthrough targets.
- [x] Security headers/CSP, untrusted-content spotlighting, output sanitization.
- [x] Retrieval/extraction/verification evaluation on real documents (`session-generated/2026-10-02-agentic-rag/`); UI screenshots with Markdown guides in `system-manual/` and `system-walkthrough/`; backend configuration in `backend-system/`; v0.4.0 release record and results-and-discussion write-up.
- [x] Release gate: lint, typecheck, tests, build, deployment checks, browser tests; additive migration applied, pushed to `main`, and production verified. GitHub Actions could not start because of the account billing lock; see `versions/v0.4.0/validation/results.md`.

### Ultimate goals — definition of done

Each goal counts only when it works in the running app, has automated evidence, and is documented with real UI screenshots and a Markdown guide in the standard folders: `system-manual/<task>/` (how to do it) and `system-walkthrough/<role>/` (what is on each screen). Generated charts and figures go in `session-generated/`, not in the screenshot folders (user instruction, 2026-10-02).

1. **Real documents in, real knowledge out.** Upload a real PDF/DOCX/PPTX/HTML/TXT/MD/CSV; see sandboxed extraction, cleaning, a quality score and injection flags; review or correct the text; index it with page/section metadata.
2. **Free vector RAG everywhere.** In-process MiniLM embeddings + cross-encoder reranking (no key, no fee), hybrid pgvector + full-text search with RRF, locally and on Supabase.
3. **Named agents that visibly collaborate.** Planner, parallel Researchers, Ranker, Comparator, Writer, Verifier, Corrector, Librarian; each answer shows the agent timeline.
4. **Answers that can be trusted and corrected.** Claim-level verification, corroboration across documents, automatic citation repair, bounded revision, honest extractive fallback, user revision requests.
5. **Compare and reference.** Two-document alignment comparison (never plagiarism detection); real references from Open Library, OpenAlex and Wikipedia.
6. **Courseware consistency check.** Each generated draft shows outline coverage per topic/outcome and statement verification (NFR-AI-06).
7. **Accurate Pulse guidance.** Drag/touch/keyboard targeting with a DOM-derived component description, a tour of the component's real controls, visible drop rejection, perching beside the target, panel placement away from it, verified walkthrough targets.
8. **Hardened sandbox.** Worker isolation with heap/time limits and no secrets, type sniffing, archive-bomb/encryption rejection, untrusted-content neutralization, output sanitization, security headers.
9. **Measured results.** Retrieval, extraction and verification evaluated on real openly licensed documents, with the numbers in the capstone results and discussion.
10. **Shipped.** Verified gate, migration applied, pushed, production checked.

## v0.3.0 — Restore the intended Pulse experience (2026-09-16)

The user's correction takes precedence over earlier restrictions on provider/model selection. Retrieval is one assistant capability, not the assistant's entire purpose. Do not substitute persistence work or a static chat launcher for the requested ambient guide.

- [x] Restore FR-GUIDE-02–06 and 13–26: mouse/touch drag, component targeting, focused task choice, role-scoped walkthroughs, keyboard alternatives, exit/recovery, cursor-following eyes and responsive character motion.
- [x] Connect walkthrough steps to visible controls and actual completion signals. Correct stale agent instructions; never claim unsupported prototype actions completed.
- [x] Add real provider connection and API-discovered model selection in Settings; protect credentials and isolate connections by session/account.
- [x] Retain local Ollama and integrate an optional downloadable browser model with device checks, progress, cancellation, cache reuse and general generation.
- [x] Use one bounded assistant/generation contract across server and browser inference: conversational help, drafting, document analysis and grounded answers; retain citations for source-based claims.
- [x] Replace hard-coded connection branding with actual assistant state; connect selected inference to Pulse and courseware.
- [x] Test drag/click distinction, touch/keyboard/reduced motion, guided completion, provider isolation/model discovery, general generation without retrieved sources, cancellation and failures.
- [x] Run lint, typecheck, meaningful tests, browser checks, build, deployment checks and live inference; publish a versioned requirement-to-evidence snapshot, push and verify production. Shipped as part of v0.4.0 (no separate v0.3.0 release); see the v0.4.0 validation record for the GitHub Actions billing lock.

No new administrative workflows are part of this correction. Existing offline approval and instructor review requirements remain. Hosted APIs require the user's own eligible provider key; browser/local inference provides the no-API-fee option. Model capabilities and hardware limits must be stated accurately.

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
- [x] Write the version snapshot, validate preview deployment, push, and verify production. Application commit `60972ea`; production desktop/mobile checks passed. GitHub's account billing lock still prevents its runner from starting; the Vercel verification gate passed all 21 tests.

Compatibility: retain React/Vite, the existing AI API, local PGlite, Supabase authentication, and offline institutional approval. Hosted guests keep device-only preview data; authenticated instructors get a private cloud workspace. Approved DOCX attachments are bounded to 500 KB and the workspace to 3 MB. Signatures are attested by the instructor, not verified automatically. Curriculum and student analytics remain sample data until their own integrations are implemented.

## v0.1.1 verification correction

The first Vercel verification build excluded tests through the app ignore file and reported zero tests. Include test sources in the build context and make the test runner reject an empty suite. Inspect the remote test count as well as deployment readiness. The versioned correction and its validation live in `versions/v0.1.1`.
