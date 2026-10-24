# EduPulse — Documentation-First Second Audit and Corrected Engineering Plan

**Audit date:** 24 October 2026
**Repository:** [Bhenny-dev/edupulse-prototype](https://github.com/Bhenny-dev/edupulse-prototype)
**Source revision inspected:** `main` at [`5e7d95638c7abf8f74e85ec96cbf90ae491ed674`](https://github.com/Bhenny-dev/edupulse-prototype/commit/5e7d95638c7abf8f74e85ec96cbf90ae491ed674)
**Scope:** Full documentation directory/tree inventory, selected documentation contents, documentation automation, governing specifications, related source implementation, repository history, and available deployment metadata.
**Status:** Read-only audit and engineering specification. **No repository files, production database records, deployments, or screenshot assets were changed.** Local regression tests, a complete screenshot recapture, and production authenticated browser validation were **not** run as part of this audit.

> **Principal correction to the first audit:** EduPulse already has a deliberately structured and enforced documentation/evidence system. `feature-documentation/` is not optional collateral or a repository of obsolete static pictures. Any proposed application change must be designed, implemented, tested, captured, documented, and verified **in the same commit**, consistent with the owner's explicit documentation policy. The first audit did not account for this contract and proposed changes that would have conflicted with the established syllabus workflow. This document supersedes that audit as an implementation-planning reference; it does **not** supersede the product requirements, user corrections, or historical release evidence.

---

## 1. What the second scan actually covered

GitHub's complete, non-truncated `main` tree response contained **494 repository entries**. Under `feature-documentation/` it contained **249 entries**, including **56 Markdown documents** and **136 PNGs**. The PNGs comprise **70 system-walkthrough captures**, **60 system-manual captures**, and **6 generated evaluation/architecture images** in `session-generated/`. These figures are repository-tree counts at the inspected commit, not guarantees of completeness or visual correctness.

The walkthrough capture manifest lists **64 desktop/role scenes**, all marked `ok: true`, with `problems: []`; the additional **6 mobile PNGs** are produced by a separate mobile spec and are **not represented as scenes in that 64-scene manifest**. The manual capture log lists `problems: []`, but is produced by a particular capture spec, not a consolidated report for every task-capture spec. Their recorded capture times are 7 October 2026 at 17:08:07.990 UTC (walkthrough) and 17:11:26.380 UTC (manual). The latest commits changed code, documentation, screenshots, and both capture metadata files; capture timestamps precede commit times, which is expected when captures are created before committing.

This audit read the top-level agent instructions, policy, maps, release records, key backend documentation, sampled role/task guides, screenshot scripts, and relevant source files. It **did not visually inspect all 130 UI PNGs one by one** and therefore does not certify their pixel-level accuracy or visual design quality. Its findings about screenshot purposes and coverage come from the Markdown guides, manifest, code, and filenames. For an actual release, the owner's policy requires visually opening each *changed or new* image.

### Documentary sources of evidence

| Category | Inspected examples |
|---|---|
| Mandatory contributor rules | [`AGENTS.md`](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/AGENTS.md), [`CLAUDE.md`](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/CLAUDE.md), [`DOCUMENTATION-POLICY.md`](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/feature-documentation/DOCUMENTATION-POLICY.md) |
| Change mapping and enforcement | [`doc-map.json`](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/feature-documentation/doc-map.json), [`docs-check.mjs`](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/edupulse-app/scripts/docs-check.mjs), [commit hook](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/.githooks/commit-msg), [CI workflow](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/.github/workflows/deploy.yml) |
| Business/functional boundaries | [`FLOW_SPEC.md`](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/edupulse-app/docs/FLOW_SPEC.md), [`REQUIREMENTS.md`](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/edupulse-app/docs/REQUIREMENTS.md), [`SYSTEM_SPEC.md`](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/edupulse-app/docs/SYSTEM_SPEC.md), [`SYLLABUS_INGESTION_SPEC.md`](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/edupulse-app/docs/SYLLABUS_INGESTION_SPEC.md) |
| Screens and tasks | [`system-walkthrough/`](https://github.com/Bhenny-dev/edupulse-prototype/tree/main/feature-documentation/system-walkthrough), [`system-manual/`](https://github.com/Bhenny-dev/edupulse-prototype/tree/main/feature-documentation/system-manual) |
| Implementation, hosting, research | [`backend-system/`](https://github.com/Bhenny-dev/edupulse-prototype/tree/main/feature-documentation/backend-system), [`session-generated/`](https://github.com/Bhenny-dev/edupulse-prototype/tree/main/feature-documentation/session-generated), [`versions/`](https://github.com/Bhenny-dev/edupulse-prototype/tree/main/feature-documentation/versions), [`WORKPLAN.md`](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/feature-documentation/WORKPLAN.md) |
| Capture pipeline | [`playwright.snapshots.config.ts`](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/edupulse-app/playwright.snapshots.config.ts), [`walkthrough.spec.ts`](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/edupulse-app/tests/snapshots/walkthrough.spec.ts), [`walkthrough.mobile.spec.ts`](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/edupulse-app/tests/snapshots/walkthrough.mobile.spec.ts), [`manual.spec.ts`](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/edupulse-app/tests/snapshots/manual.spec.ts), [`capture.spec.ts`](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/edupulse-app/tests/snapshots/capture.spec.ts) |

---

## 2. What `feature-documentation/` is actually for

This directory is the project's **living specification, user evidence, technical history, and release-validation record**. It is designed to accompany feature engineering. Its folders have **different, non-interchangeable roles**:

| Location | Purpose | Correct use | What it cannot prove alone |
|---|---|---|---|
| `system-walkthrough/<role>/` | **What users see** on pages, tabs, popovers, modals and role-specific views | Screenshots captured from the application capture build, accompanied by role-based Markdown explaining exact controls | Production persistence, permissions enforced at the database, complete functional correctness |
| `system-manual/<task>/` | **How to complete a task** from start to finish | Ordered screenshots and instructions for syllabus activation, courseware, knowledge upload, Pulse, OCR, navigation and actions | That every authenticated hosted account successfully completed the same task |
| `backend-system/` | **What implements the application** | APIs, agents, authentication, database, security, deployments, integration decisions | UI behavior without corroborating captures/tests; current cloud state without fresh verification |
| `session-generated/<session>/` | **Measured experiment artifacts and engineering figures**, not UI captures | Evaluation JSON, charts, architecture diagrams and capstone results/discussion, with methods and limitations | A general claim of high accuracy beyond the evaluation corpus |
| `versions/<version>/` | **Historical release record** | Release features, design, operations, validation, deployment state and known limitations | Present-day production state after subsequent commits or deployments |
| `WORKPLAN.md` | **Requirements-to-execution tracking** | Definition of done, delivery history, open work and verification references | A current, independent successful test result |
| `DOCUMENTATION-POLICY.md` and `doc-map.json` | **Binding change-management contract** | Map source changes to the appropriate guides/captures and block undocumented commits | Semantic correctness of every sentence or visual comparison of screenshots |

**Important distinction:** The screenshot pipeline opens a **documentation capture build** (`npm run build:capture` / `dist-capture`) that includes preview personas *not present in the public hosted build*. The guides explicitly say this. Most screen walkthroughs contain **sample academic data**, while AI task captures can use **real input documents, local Ollama inference, real extraction, and local database operations**. Neither category should be misrepresented as a live institution-wide production result.

### Capture coverage that must remain intact

**Walkthrough: 70 PNGs.** Public site 8; shared interface 17; Dean/Associate Dean 12; Instructor 13; Student 9; Mobile 6; System Admin 5. The desktop manifest reports 64 scenes, and the six mobile captures come from a separate test. The System Admin screenshots intentionally show a preview state with disabled account management; live account operations require authenticated Google administration.

**System Manual: 60 PNGs across nine tasks.** Syllabus lifecycle 14; courseware 6; knowledge library 13; ask Pulse 5; compare/references 4; Pulse guidance 7; AI connections 3; Pulse actions 8; getting started 0. These are task evidence, not decorative image assets.

**Session-generated: 6 PNGs.** Two architecture figures and four charts for the October 2 RAG evaluation, separate from UI screenshots. JSON and analysis documents also preserve the benchmark and its limitations.

**Rule:** Do not purge, flatten, rename, or move these folders to a generic `docs/images`, nor replace authentic captures with conceptual/generated illustrations. Replace existing screenshots **only if the corresponding feature changed or the image was invalid**, and update the relevant Markdown accordingly. Preserve release history instead of rewriting prior results.

---

## 3. The existing documentation contract: mandatory, not optional

The owner explicitly established the strict policy on **4 October 2026**. `AGENTS.md` and `CLAUDE.md` both direct every coding agent to obey it. Specifically:

1. **Feature and documentation changes must occur in the same commit.** Update the screenshot(s), narrative guide(s), relevant capture tests, and any backend/release notes when required.
2. **Update in the proper place.** New/changed pages and components → role walkthrough; task steps → system manual; API/database/deployment → backend-system and version record; generated charts → session-generated.
3. **Capture authentic behavior** using the existing Playwright pipeline. Do not invent image states or use unrelated UI mockups as system evidence. Open changed/new images for visual review.
4. **Run `npm run docs:check`.** This checks Markdown link targets, referenced UI screenshots, manifest scene status, route coverage, capture logs, and time-based source/document freshness.
5. **Use the versioned commit hook and GitHub CI gate**; never bypass the hook merely to skip documentation. A truly no-impact change may use the reasoned `Docs-Impact: none — <reason>` commit trailer (at least 15 characters explaining why).
6. **Keep sample/real data distinctions explicit** and never put passwords, provider keys, real student records, or personal mailboxes into screenshots.

### Current execution path

```text
Feature source edit
    -> affected rule(s) in feature-documentation/doc-map.json
    -> related capture spec(s) in edupulse-app/tests/snapshots/
    -> npm run build:capture + targeted/complete Playwright capture
    -> new/updated screenshots AND guide prose
    -> update Backend System and version record when applicable
    -> npm run docs:check
    -> tests, build, browser verification
    -> commit feature + guides + captures + evidence together
    -> CI documentation gate and release verification
    -> preview/live deployment checks
```

The root `.vercelignore` excludes `feature-documentation`; `docs-check.mjs` intentionally **skips checks when `VERCEL` is set**, because those files are not included in Vercel's build context. Thus **the local hook and GitHub Actions documentation gate are essential**. Do **not** claim that the Vercel build alone enforces documentation completeness. The CI workflow does have a documentation step, but prior release notes report a **GitHub Actions billing lock** that prevented some jobs from running; verify its present state before treating CI as passed.

### Required improvement to the documentation checker (without discarding it)

The existing checker is valuable and should be extended, not replaced:

- `--range` currently unions changed files across all commits in a push, so a feature-only commit followed by a documentation-only commit **may collectively satisfy** the impact test even though policy says *same commit*. Check impact **per non-exempt commit SHA** as well as for the full range.
- `doc-map.json` focuses on `src`, `server`, `api`, `supabase`, and snapshots. Explicitly map changes to `edupulse-app/docs/*.md`, `.github/workflows/**`, dependency/build configuration, `package.json`, `package-lock.json`, and product guidance to corresponding technical/release documentation.
- The desktop `capture-manifest.json` has 64 scenes. Introduce or aggregate metadata for the **6 mobile captures** so mobile failures are not invisible to the central manifest check.
- `system-manual/capture-log.json` is written by `capture.spec.ts` rather than all nine task-capture flows. Aggregate **every capture spec's execution status**, including manual, upload, Pulse actions, and conversation, into one per-run result with the completed/failed/skipped counts.
- Record `commitSha`/`sourceRevision`, `captureBuildMode`, browser/viewport, test suite name, fixture category (sample versus real input), and execution result in a machine-readable run manifest. Capture IDs must refer to a real run, not hand-authored success flags.
- Existing checks verify file presence and references; add a validation step ensuring changed screenshots **were actually recaptured**, corresponding guide controls still match tested UI names, and screenshots underwent human review. Optional image diff is a supplement, not a substitute for accessibility/task assertions.
- Require evidence for the **authenticated production path** separately; never use a local preview screenshot as proof of cloud RLS, sign-in, or publication behavior.
- Keep documentation checks deterministic/offline-capable. Do not force an Ollama model inference or mass screenshot regeneration on every small backend-only change that does not affect visible behavior.

---

## 4. Governing requirements: correct precedence and contradictory documents

A professional refactor must **interpret the product's existing specifications first**, not impose a generic school-management architecture. Use this working hierarchy for decisions, subject to explicit owner confirmation for material contradictions:

1. Most recent explicit **owner correction** recorded in `REQUIREMENTS.md`, `WORKPLAN.md`, and the release history.
2. **`FLOW_SPEC.md` confirmed business process**, particularly the offline signatory chain, EduSuite system-of-record boundary, and no grade computations.
3. Specific current functional/nonfunctional requirements and approved feature constraints, including explicit exclusions.
4. Current Manual/Walkthrough for **observed implemented UI behavior**; these are evidence, not independent authorization to change policy.
5. Current code/test/deployment as implementation facts, which may violate the above and therefore must be investigated.
6. Historical `SYSTEM_SPEC.md`, `SYLLABUS_INGESTION_SPEC.md`, old release records and experiments as context **unless superseded**.

**Do not silently resolve genuine requirements conflicts by choosing whichever text simplifies implementation.** Open a small architectural decision record (ADR) stating the conflicting text, proposal, owner decision, change impact, and tests.

### Confirmed conflict register

| ID | Sources that disagree or require interpretation | Correct treatment |
|---|---|---|
| DOC-01 | `FLOW_SPEC.md` says Dean and Associate Dean share academic screens/permissions; `REQUIREMENTS.md` FR-AUTH-10/11/12 and FR-PERF-13 distinguish approval authority, score visibility and dashboards; current walkthrough calls the academic screens shared. | **Open a role-permission ADR.** Do not unilaterally forbid or grant sensitive information based on a generic screen label. Apply the stricter explicit score-protection requirement in backend reads in the interim; distinguish shared navigation from data-level permissions. |
| DOC-02 | `REQUIREMENTS.md` FR-SYL-08/09 describe submission and Dean approval; `FLOW_SPEC.md`, Manual 2, and walkthrough explicitly specify **offline** Dean review → CAO approval → EVP noting on the downloaded syllabus, followed by approved-file upload. | **Preserve the existing five-stage offline lifecycle** until an explicit approved product change authorizes in-system approval. Reconcile requirement wording with the offline operation instead of inventing a new electronic approval engine. |
| DOC-03 | `SYSTEM_SPEC.md` uses the old `admin` academic role and three-role model; `SYLLABUS_INGESTION_SPEC.md` states four roles/no System Admin; October 4 `REQUIREMENTS.md` supersedes that with **five roles** and a separate Google System Admin. | Add clear supersession notices/correct stale role tables without deleting useful field/mapping details. Keep historical version records intact. |
| DOC-04 | `SYLLABUS_INGESTION_SPEC.md` treats OCR as deferred/out-of-guaranteed scope; current backend docs, Manual 2/4 and October 8 implementation describe browser OCR (PDF.js + Tesseract). | Mark OCR requirement as an adopted post-spec enhancement; distinguish working features from guarantees and from measured OCR quality. Maintain English/60-page and low-confidence limitations. |
| DOC-05 | Several guides say the academic screens show *sample* rosters/scores; the RAG evaluation uses real files; the System Manual describes real local-model tests. | Keep these data categories distinct in screenshots, application labels, test fixtures, and reports. **Do not delete sample personas or sample performance simply to make screenshots appear production-like.** Restrict samples to preview/demo surfaces and ensure authenticated production cannot treat them as institutional evidence. |
| DOC-06 | Version record says v0.4.0 shipped with verified production in early October; most recent 8 October commits passed documented **local** gates but their associated Vercel production builds were marked `ERROR`. | Keep historical release evidence; add a new **deployment reconciliation addendum** or next release record. Report local pass, deployed commit and live verification separately. Never retrospectively label the October 8 features “successfully deployed.” |
| DOC-07 | Release README reports a specific RAG evaluation; subsequent courseware/OCR evaluation reports lower model completion and limited corpus. | Preserve all results with dates/model/corpus. Avoid general claims of universal correctness or improved courseware accuracy. |

### Inviolable business boundaries

- **EduSuite** remains the authoritative system for curriculum/course loads/student rosters. EduPulse imports authorized export files; direct integration is **out of current scope**.
- The public curriculum is fixed; EduPulse does not edit it. Official UI terminology is **Course**, not Subject.
- Students are organized in EduSuite into blocks; recorded block capacity is 35. EduPulse consumes this structure.
- The syllabus has the **KCP seven-section** structure. Course Outline/ILOs drive generation.
- **Syllabus progression:** `drafted → checked → downloaded_for_approval → approved_uploaded → active`. Approval signatures are **offline**, human verified/attested, never model-authorized; the extracted approved outline is human-confirmed before activation. Preserve version history and file-checksum checks.
- AI-generated courseware remains **draft content until instructor review and explicit publication**. No implicit publishing, scoring-to-official-grade conversion, plagiarism detector, proctoring, authorship score, or learner assessment-answer agent.
- **Five actual account roles** after October 4: System Admin (separate operations role), Dean, Associate Dean, Instructor, Student. Admin role-view switching preserves owner identity; it is not account impersonation.
- **Pulse navigation, component guidance and confirmed actions** are existing intentionally implemented features. Do not replace them with a generic FAQ chatbot or unrestricted AI-browser executor.

---

## 5. Second-scan implementation findings (evidence versus inference)

| ID | Severity | Observed source or documentation | Recommendation and caveat |
|---|---|---|---|
| REL-01 | **P0** | Vercel production deployment for October 8 commits `4486468` and `5e7d956` is `ERROR`, `BUILD_UTILS_SPAWN_1`, `npm ci` exited 1; previous `be04af8` deployed `READY`. | Obtain full npm build log, reproduce at exact commit/Node/npm version; do **not** assert lockfile inconsistency without the log. Fix and deploy only after full gate plus docs. |
| AUTH-01 | **P0** | `src/agents/operator.js` includes Associate Dean for `/performance`; `src/App.jsx` renders `/performance` without a role wrapper; `FR-AUTH-11` disallows Associate Dean score access. | Reconcile DOC-01; centrally enforce API/RLS permission and align route/menu/Pulse rules. Avoid relying on route guard as the only boundary. |
| AUTH-02 | **P0 / needs scope decision** | `server/http.ts` accepts Dean, Associate Dean and Instructor for courseware generation; `FLOW_SPEC` assigns generation/review to instructor. | Separate **read/review** capability from **generate/publish** mutations; protect each on server. Allow controlled admin preview per explicit owner requirements. Obtain ADR for exceptional roles before changing production behavior. |
| DATA-01 | **P1** | `server/workspace.ts` uses one owner-scoped JSONB snapshot with revision-checked writes; `WorkspaceContext.jsx` caches and autosaves it. | It is a **working prototype persistence mechanism**, not a bug by itself; retain backward compatibility. For cross-account verified institutional collaboration, introduce normalized, RLS-scoped domain records incrementally with deterministic backfill and rollback. |
| DATA-02 | **P1** | `Performance.jsx` and `performanceAgent.js` explicitly rely on and label **sample** performance/score data. | This is expected in preview and capstone captures. Add explicit provenance/`demo` indicators and **separate real signed-in reads**, rather than blindly removing demo fixtures/screenshots. Never show samples as live verified student results. |
| AI-01 | **P1** | Pulse operator uses rule-based intent classification and confirmed action cards (`src/agents/operator.js`, `src/components/pulse/PulseActions.jsx`). | **Retain deterministic execution and confirmation.** Refactor toward typed commands, capability registry, backend revalidation, exact before/after previews, idempotency keys; test existing action semantics and Undo. |
| AI-02 | **P1** | LangGraph Guardian/Planner/Researcher/Ranker/Writer/Verifier/Corrector/Comparator/Librarian already exist, as do hybrid pgvector retrieval, reranking and claim-level citation checking. | Do not introduce parallel agent frameworks or duplicate vector DB. Improve grounding evaluation, tracing, source/version scoping and failure recovery only when measured. Faithfulness is not proof of truth. |
| SEC-01 | **P1** | Workspaces, document ownership and RLS exist; web API uses per-instance `Map`/`Set` for rate/concurrency limits; signed-in actions have roles but broader institutional workflow remains owner-scoped. | Retain current local safeguards; plan per-user distributed limits and domain-level authorization before sensitive cross-user features. Scope tenant, course, section, instructor and student in database policies. |
| UI-01 | **P1** | Pulse reads live DOM via `targets.js` and `guidance.js`, with active guide steps in `Pulse.jsx`. The manuals demonstrate real drag-and-drop, keyboard/touch access, live field status and rejection. | Preserve existing behavior and screen captures. Add stable IDs/role-scoped UI registry and event-based completion incrementally. Do not rewrite the mascot, controls, or tours without equivalence tests and recapture. |
| DOC-08 | **P1** | Documentation gate exists and correctly checks links, screenshots, route coverage and freshness, but lacks complete per-capture run aggregation, cross-doc semantic checks, and direct production proof. | Extend the original scripts rather than replacing them; define auditable provenance, commit-by-commit enforcement, and authentication-specific QA. |
| OPS-01 | **P1** | `server/http.ts` combines actions behind `/api/ai?action=...`; `server/graph.ts` and downstream modules already isolate meaningful logic. | Gradually extract domain controllers/services and typed contracts. Preserve endpoint compatibility. Do not adopt a new web server framework only to rearrange files. |

**A correction to the prior hotfix proposal:** The previously supplied `edupulse-role-access-hotfix.patch` was neither applied nor tested in the real project. It also did **not** constitute a compliant feature change package with affected captures and guide updates. **Do not apply it as-is to `main`.** First resolve DOC-01/AUTH-02, then implement an updated, documented, test-driven fix that includes its screenshot/guide impact and preserves admin view-switch semantics.

---

## 6. Recommended *minimal-change* architecture (Ponytail strategy)

**Do not rewrite EduPulse into Next.js, add an alternative agent harness, replace existing embeddings with a costly hosted service, or replace its entire UI state model in one PR.** The project is a React/Vite + Node/Vercel + Supabase/PGlite + LangGraph implementation with explicit academic rules, low-resource local model constraints, and existing test evidence. Professionalism here means one source of truth per concern, narrow modules, safe migrations, and demonstrable behavior.

### Target module responsibilities

```text
edupulse-app/
  src/
    features/                   # Existing screens, incrementally organized
    components/pulse/           # Mascot, conversation, action cards, DOM guidance UI
    contracts/                  # Typed frontend contracts from shared Zod schemas
    lib/access/                 # UI capability display, not sole authorization
    lib/api/                    # Typed transport and query caching
  server/
    http/                      # Request authentication, errors, limits, routing
    domains/
      records/                 # EduSuite import validation and retained snapshots
      course-loading/          # Assignment visibility and authoring rules
      syllabi/                 # 5-station offline-approval lifecycle and versions
      courseware/              # Plan-grounded drafts, checks, human publication
      assessments/             # Attempts and score read permissions
      documents/               # Existing sandbox/indexing, file provenance
      pulse/                   # Action proposals, controlled tools, context
    rag/                       # Existing LangGraph, hybrid retrieval, rerank, verify
    access/                    # Identity, role/capability/resource authorization
    observability/             # Correlated trace/event summaries, no sensitive text
    compatibility/             # Legacy /api/ai?action= and workspace adapters
  supabase/migrations/          # Additive RLS-verified migrations only when needed
  tests/                       # Unit, integration, browser, eval and snapshots
feature-documentation/
  DOCUMENTATION-POLICY.md
  doc-map.json
  system-walkthrough/          # Keep the existing 70 role/mobile captures
  system-manual/               # Keep the existing 60 task captures
  backend-system/
  session-generated/
  versions/
```

This is a **proposed responsibility map**, not permission to move hundreds of files. Begin by extracting service functions behind existing endpoints and applying authorization at both API and database levels. Keep `src/lib/rag/agents.ts` and its established graph; preserve existing contracts for browser inference, sources, OCR and action cards.

### Maintainability patterns appropriate now

- **Zod contracts (already installed)** as the stable request/response/action schema across frontend and backend, with error codes and examples in backend docs.
- **Capability matrix + resource predicates** for actual/preview role, owned syllabus, course assignment, enrollment and publication status. Render-level permissions must match backend/RLS checks.
- **Optimistic concurrency** from existing workspace revision checks; extend to per-record versions only during normalized migration.
- **Server-confirmed domain commands** for registration, indexing, generation and publication. Confirm action details and authorization at execution time; include idempotency and audit metadata.
- **Typed UI target registry** introduced alongside existing `data-pulse-*` and accessible labels; resolve step targets and wait for semantic events rather than arbitrary selector retries, but retain existing tours.
- **Document provenance/version fields**, consistent ingest status, source page/section, review flags, and conservative citation language.
- **Per-stage observability**, leveraging existing agent run summaries and avoiding full prompt/student text logs.
- **Evaluation-driven upgrades** before introducing GraphRAG, Neo4j, a new tour library, Langfuse stack or a separate durable orchestration system.

### Framework decisions

| Existing/proposed tool | Decision | Reason |
|---|---|---|
| React/Vite, React Router | **Retain** | No demonstrated need for a framework migration |
| LangGraph/LangChain | **Retain** | Already functional, traceable, browser/server compatible |
| Supabase Postgres/Auth/RLS/pgvector; local PGlite | **Retain** | Fits existing data/retrieval design and project constraints |
| ONNX WASM embeddings + cross-encoder | **Retain and benchmark** | Existing pinned/local/free inference pipeline |
| Tesseract.js/PDF.js browser OCR | **Retain and calibrate** | Already introduced; limited English/printed-text evaluation |
| Zod, Playwright, oxlint | **Expand use of existing tools** | Typed boundaries, real browser testing, regression control |
| TanStack Query | **Optional future evaluation** | Only if workspace synchronization complexity warrants it; not required now |
| XState or additional tour library | **Defer** | Existing DOM guidance and authored tours must be preserved first |
| Hosted tracing/extra graph DB | **Defer** | Existing evaluation and telemetry; resource/privacy constraints |

---

## 7. Required change-impact matrix: source, tests, screenshots, guides, backend evidence

The following matrix describes **the work items that must ship together**. Screenshot filenames are examples grounded in existing captures. For an internal backend-only change, document why screenshots are unchanged; do not re-render unrelated images merely to satisfy a checklist.

| Workstream | Source/test changes | Required evidence and documentation updates |
|---|---|---|
| **DEP-01: `npm ci` and release consistency** | `package.json`, lockfile, GitHub workflow, Vercel build settings, install diagnostics, immutable-commit build | `backend-system/vercel.md`, `versions/<new>/validation/results.md`, `versions/<new>/operations/runbook.md`; deployment log evidence. **No new UI capture** if no rendered change; use reasoned no-visual-impact documentation. |
| **AUTH-01: Role visibility/access** | `App.jsx`, `Layout.jsx`, `operator.js`, role policy, API auth/RLS, role matrix tests | Affected `system-walkthrough/03-dean-and-associate-dean`, `04-instructor`, `05-student`, `07-system-admin`; `system-manual/09-pulse-actions` for navigation/action guidance; `backend-system/supabase.md`, version validation. Capture changes only for impacted screens. |
| **SYL-01: Preserve offline approval, fix bugs** | `Syllabus.jsx`, syllabus import/approved-file components, server validation, lifecycle tests | `system-manual/02-syllabus-lifecycle` (especially stations 4–10 and import 12–14), `system-walkthrough/04-instructor`, `backend-system` if contracts changed, version record. **Never replace the five stations without an ADR.** |
| **CW-01: Grounded generation/draft review** | `Courseware.jsx`, `ContentEditor.jsx`, `server/graph.ts`, `rag/courseware.ts`, tests/evals | `system-manual/03-courseware-generation-and-review` (6 captures), `system-walkthrough/04-instructor`, evaluation data under new `session-generated/<session>` if claims about accuracy change; version validation. |
| **RAG-01: Extraction/OCR/indexing/verification** | `server/ingest/**`, `server/rag/**`, `src/lib/rag/**`, `KnowledgeLibrary.jsx`, OCR workers, evaluation tests | `system-manual/04-knowledge-library` (13 captures), `05-ask-pulse` (5), `06-compare-and-references` (4), `backend-system/README.md` and `integrations.md`, new eval artifacts only for genuinely new runs. |
| **PULSE-01: Component and modal guides** | `Pulse.jsx`, `targets.js`, `guidance.js`, zone agents, `PulseActions.jsx`, browser interaction tests | `system-manual/07-pulse-guidance` (7), `09-pulse-actions` (8), `system-walkthrough/02-shared-interface` and affected role/mobile folders, updates to capture tests/manifest. Keep drag, mouse, touch, keyboard and rejection assertions. |
| **DATA-01: Real institutional data pilot** | Additive schema/RLS, import adapters, domain read/write APIs, workspace compatibility, ownership/role tests | `backend-system/supabase.md`, backend API docs, new version design/validation, affected real-data UI sections. **Retain sample capture personas**, but mark demo/live provenance and recapture screens whose labels or behavior change. |
| **DOC-01: Documentation checker hardening** | `docs-check.mjs`, `doc-map.json`, capture specs, manifests, CI tests | `DOCUMENTATION-POLICY.md`, System Manual/Walkthrough root READMEs, release validation. No new UI captures if the UI remains identical; recapture and record capture evidence if pipeline behavior changes. |

**Suggested commit/PR rule:** one reviewable behavior change per PR, with the changed source, deterministic regression test, updated guide, authentic capture **if a UI state changed**, and validation evidence committed together. Do not accept an application-only hotfix to `main` merely because a screenshot is inconvenient to produce.

---

## 8. Concrete repair plan, ordered to minimize regressions

### Phase 0 — Release-state reconciliation (**P0**, no feature redesign)

**Goal:** Know exactly what is deployed and why the October 8 commits failed to install.

**Actions:**
1. Read full Vercel build logs at commits `4486468` and `5e7d956`. Available metadata establishes `npm ci` exit 1 but **not** the npm exception; avoid guessing root cause.
2. Pin/check Node and npm environment against the repo (`.github/workflows/deploy.yml` uses Node 24); compare lockfile, engines, registry, optional dependency and install-script behavior.
3. Reproduce `npm ci` from a clean checkout of the exact failure commit; do not disable lockfile verification or bypass lifecycle hooks as the “fix.”
4. Run `npm run docs:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run deployment:check`, and `npm run test:browser` at the same commit; verify the snapshots pipeline on its supported local hardware.
5. Deploy a preview and run real authenticated workflows against it. Only then promote an unchanged verified commit to the production alias; preserve the last known-good release until success.
6. Add release reconciliation to `backend-system/vercel.md` and a new version/addendum. Distinguish *source merged*, *local verified*, *preview verified*, *production ready*, and *authenticated live verified*.

**Exit gate:** Installation error has a captured root cause and regression fix; the committed build, documentation gate and documented smoke tests pass; production deployed SHA is recorded accurately.

### Phase 1 — Permission and workflow reconciliation (**P0**)

**Goal:** Zero sensitive-data leakage and zero undocumented workflow changes.

**Actions:**
1. Write `ADR-001-role-capabilities.md` resolving `FR-AUTH-10/11/12`, `FR-PERF-13` and shared Dean/Associate Dean UI language. Keep separate admin role-view behavior.
2. Centralize role/capability checks used by router/sidebar/Pulse **and independently enforced** in backend and RLS. Distinguish `can_view_delivery`, `can_view_student_scores`, `can_draft_courseware`, `can_publish_courseware`, `can_manage_records` and `can_operate_as_admin`.
3. Ensure list/search calls cannot return names, scores, filenames or metadata outside authorized relationships. `searchRecords()` currently scopes registrations differently by instructor versus other roles; add tests with forged browser inputs, not just normal UI usage.
4. Separate viewing a page from mutating its domain. Confirm that Dean/Associate Dean/admin *preview* cannot silently trigger instructor-only actions or operate on another identity's academic data.
5. Regression-test role matrix with route access, API calls, DB RLS policies and authenticated/live canary accounts. Record expected 403/empty responses and absence of data leakage.
6. Update the affected role walkthrough and Pulse-action documentation in the **same commit** as behavior changes.

**Exit gate:** All four academic role paths and admin role views have verified least-privilege data reads and write behavior, including malformed/forged calls.

### Phase 2 — Academic workflow correctness (**P1**)

**Goal:** Preserve the actual EduPulse process, not an invented electronic-approval system.

**Actions:**
1. Lock the five-station syllabus state machine to the confirmed offline signatory path. Validate course code, official format, approved upload, checksum, extracted outline, source version and instructor confirmation.
2. Keep DOCX/PDF import in a reviewable seven-section preview. Failed OCR or uncertain week extraction should require user correction; do not fabricate week ranges or official approvals.
3. Preserve courseware's active-syllabus prerequisite, planned-activity/assessment mapping, automatic outline checks, best-valid-draft fallback, and instructor review/publishing boundary.
4. Reproduce and fix specific user-reported issues with deterministic tests before refactoring modules. Confirm UI labels match manual screenshots and statuses match backend persistence.
5. Ensure the student side sees only published content for enrolled sections; keep scoring visualization separate from the external institutional grading process.
6. Update Manual 2, 3 and related instructor/student walkthrough sections, plus back-end documentation, with fresh screenshots only for changed states.

**Exit gate:** A real-document test walks Drafted → Checked → Out for Approval → Approved–Uploaded → Active → Draft Courseware → Instructor Review → Published → Student Visible with no AI-authored approvals or unreviewed publication.

### Phase 3 — Data integrity without destroying preview evidence (**P1**, gated pilot)

**Goal:** Support authenticated cross-user correctness while maintaining backward compatibility.

**Actions:**
1. Inspect whether a particular workflow truly needs shared institutional records rather than the existing per-owner workspace snapshot. Do not normalize for its own sake.
2. For confirmed needs, add minimum tables (offerings/assignments, syllabi and versions, section enrollments, publication and attempts) with RLS and explicit record provenance.
3. Keep EduSuite **the source of record** and preserve its import/confirmation flow. Do not implement direct EduSuite synchronization without a scope change.
4. Build a read-compatible adapter to the existing workspace; migrate a small cohort, reconcile IDs/revisions/counts, and keep export/rollback capability.
5. Ensure `demo` fixtures exist only in preview/capture; in authenticated views use real authorized queries or a truthful empty/not-yet-connected state.
6. Add account-pair tests (instructor and authorized academic administrator, instructor and enrolled student); do not infer cross-account correctness from a single preview persona.

**Exit gate:** No lost writes or cross-account leaks; consistent official-data provenance; no rewritten historical screenshots.

### Phase 4 — Pulse and RAG reliability (**P1**, evaluation led)

**Goal:** Improve task completion and answer quality without an AI-framework rewrite.

**Actions:**
1. Keep existing LangGraph agents, hybrid search, cross-encoder, Guardian, citations, revision loop, on-device OCR and provider isolation.
2. Formalize the deterministic Pulse Operator's action contracts. Generate a typed *proposal* (what changes, affected course, block, student count, target record, planned week, safeguards), verify user confirmation, then authorize and execute a single backend domain command. Retain Cancel/Undo where supported.
3. Preserve drag-and-drop Pulse and DOM-derived component briefs. Add stable semantic target IDs and workflow event confirmation. Do not make LLM output executable DOM selectors or give it unbounded control of browsers.
4. Use a small, labeled institutional retrieval set in addition to the existing six-document benchmark. Evaluate exact course IDs, mistaken policy revisions, contradictions, no-evidence abstention, OCR tables, comparison and ACL boundary cases.
5. Report *retrieval relevance*, *source faithfulness*, *factual correctness*, *task success* and *P50/P95 latency* separately. Evidence scores are not certified correctness or reliable authorship/plagiarism judgments.
6. Target weaknesses exposed in the records: courseware completion with small local models and injection-scanner held-out recall. Set gates only after representative sampling; do not declare improvements from a single successful week.
7. Update Pulse/Knowledge/AI Connection guides, screenshots and `session-generated` evaluation datasets together with the technical change.

**Exit gate:** End-to-end action and guide tests pass; controlled answer/evidence benchmarks improve or stay non-regressed, with model/hardware conditions documented.

### Phase 5 — Improve documentation as an executable contract (**P1/P2**)

**Goal:** Make the documentation policy enforce real behavior and auditable evidence.

**Actions:**
1. Add per-commit CI impact enforcement, source-to-spec mapping, capture suite aggregation, mobile scene capture records and release SHA metadata.
2. Convert key Manual tasks into executable acceptance test IDs, referenced from Markdown. Example: `SYL-LIFE-001` maps Manual 2 steps 1–11 to `manual.spec.ts` plus authenticated browser coverage; `PULSE-ACT-001` maps Manual 9 to `pulse-actions.spec.ts` and operator tests.
3. Add a generated audit matrix with fields `feature_id`, `requirement_ids`, `source_paths`, `test_ids`, `guide_paths`, `snapshot_paths`, `capture_build_sha`, `data_kind`, `last_run_status`, `deployment_sha`, and `production_check_status`.
4. Keep captures in existing folders. Require manual visual review for changed PNGs, deterministic screenshot environment (viewport, font/rendering setup, clock/fixture handling), and explicit exceptions for owner-admin live screens not capturable without credentials.
5. Create a documentation-conformity check that detects stale UI labels and version/role claims, with a human review for semantic contradictions such as DOC-01/DOC-02.
6. Append new versions/evaluation sessions without modifying historical results. Do not call an unpublished feature “shipped.”

**Exit gate:** Every modified feature has a requirement-to-code-to-test-to-capture-to-guide-to-release trace, with no unverified production claims.

---

## 9. Proposed acceptance matrix and evidence IDs

| Test ID | Scenario | Expected result | Documentary counterpart |
|---|---|---|---|
| `REL-001` | Exact latest SHA: clean install/build/deploy | `npm ci`, test gates and immutable preview pass; deployed SHA matches recorded release | `backend-system/vercel.md`, new `versions/<version>/validation/results.md` |
| `DOC-001` | PR changes visible courseware UI without screenshot/manual update | Commit/CI documentation gate fails with the implicated feature mapping | `DOCUMENTATION-POLICY.md`, `doc-map.json` |
| `DOC-002` | Changes to app route/role navigation | Correct capture exists or explicit exception; new scene/guide matches role | `system-walkthrough/<role>/`, manifest |
| `DOC-003` | Mobile guidance or menu changes | Mobile capture/test status represented in documentation execution metadata | `system-walkthrough/06-mobile/` |
| `AUTH-001` | Associate Dean requests restricted student-score API | Denied without sensitive response; rules match resolved ADR | `REQUIREMENTS.md` FR-AUTH-11/FR-PERF-13, backend-system/supabase.md |
| `AUTH-002` | Admin switches view | User/account identity and provider key stay bound to admin; restricted academic actions still require correct capability | `system-walkthrough/07-system-admin/` |
| `SYL-001` | Import approved syllabus DOCX/PDF and activate | Confirmed course code, approved-file attestation and reviewed outline; no invented signature | `system-manual/02-syllabus-lifecycle/` |
| `SYL-002` | Bad syllabus and OCR confidence | Visible error/retry, manual corrections, original data preserved | Manual 2 and Manual 4 |
| `CW-001` | Generate and review one outline week | Three correct content types as drafts; instructor review before publishing; failed generation does not destroy valid drafts | Manual 3, eval-courseware records |
| `RAG-001` | Upload real document, ask and inspect citations | Correct page provenance, safe extraction, meaningful abstention for absent evidence | Manual 4, 5, 6; new benchmark session |
| `PULSE-001` | Desktop/touch/keyboard component guidance | Highlights actual visible control, reads safe live state, waits for real completion | Manual 7; role/mobile walkthrough |
| `PULSE-002` | Confirm/Cancel/Undo class-list registration | No mutation before Confirm; action scoped and idempotent; Undo restores intended state | Manual 9; `tests/operator.test.ts`, browser tests |
| `DATA-001` | Preview and production data isolation | Samples remain available in capture mode; no sample presented as real student institutional record | Role walkthrough sample labels; backend data provenance |
| `OPS-001` | Runtime failure and retries | Named recoverable state, bounded retries, no duplicate publication or registration | Backend runbook and release validation |

---

## 10. Measured results: keep provenance and limitations

The release and session-generated material contains useful metrics, but they must remain tied to their own datasets and dates:

- RAG evaluation in v0.4.0 records **33 retrieval questions across six real documents**, with hybrid+cross-encoder Hit@1 of **87.9%**, compared with keyword 63.6%, vector 66.7%, hybrid 78.8%; Hit@5 100% in that dataset. This is **not** evidence of equivalent accuracy for all uploaded KCP documents.
- Claim Verifier evaluation records **95.8% on a labeled claim set** after consistency gates. The Verifier measures textual support and cannot guarantee factual truth or detect every inverted-meaning statement.
- Courseware baseline comparing `qwen2.5:1.5b` runs records **3/6** successfully completed before and **1/6** after. Its own documentation says these do **not** demonstrate a general reliability improvement, despite the completed after-week meeting its activity and assessment checks.
- OCR evaluation covers **11 rendered sample printed pages**, not handwriting and arbitrary scanned tables. Results should not be marketed as general syllabus-reading accuracy.
- Guardian prompt-injection scanner evaluation reports held-out recall rising from **3.3% to 18.3%** (and precision 1.0 on that set). This is a measurable improvement **but remains limited recall**; never describe the scanner as guaranteeing neutralization of arbitrary attacks.
- Release notes describe multiple live Vercel and local tests in early October, and also identify the inability to fully exercise some authenticated hosted flows. After the October 8 failed builds, rerun the relevant hosted tests against the actual promoted commit.

**Policy:** Never overwrite baseline result JSON to make a new improvement appear stronger. Add a new dated evaluation session with explicit `model`, `dataset`, `conditions`, `sample_count`, `failures`, `metric`, `confidence/limitation`, `commit_sha` and reproduction instructions.

---

## 11. Change-by-change implementation protocol (Superpowers-inspired)

Use the following disciplined, repository-compliant development cycle, without installing or duplicating runtime frameworks:

```text
1. Read AGENTS.md, DOCUMENTATION-POLICY.md, FLOW_SPEC.md, REQUIREMENTS.md.
2. Find the feature's current Manual/Walkthrough and its capture spec(s).
3. Reproduce an actual error and write its expected-versus-observed behavior.
4. Resolve requirements contradictions in an ADR before modifying business rules.
5. Write the smallest failing regression test (unit/integration/browser/SQL).
6. Trace root cause in the existing architecture and implement the minimal safe fix.
7. Run focused tests, then applicable whole-app/browser/evaluation checks.
8. Re-run affected real capture scenes; visually inspect changed PNGs.
9. Replace/edit/remove/add exactly the corresponding screenshot(s) and guide prose.
10. Update backend-system, WORKPLAN, version release/validation and eval artifacts as applicable.
11. Run docs:check and verify. Include evidence, limitations and deployment SHA.
12. Commit source, tests, capture scripts, screenshots and guides together.
13. Have changes reviewed; deploy immutable preview; promote only after verification.
```

**Ponytail constraint:** Prefer existing code/frameworks and small, testable changes. **Superpowers constraint:** Verify behavior and document evidence before claiming success. Neither strategy overrides the owner's documentation policy.

### Pull-request template (proposed)

```markdown
## Purpose
Requirement IDs: ...
Observed failure and reproduction: ...

## Scope and boundaries
Preserved features/statuses: ...
Business-flow/role ADR (if needed): ...
Data classification: preview/sample | local-real | hosted-real

## Implementation and regression tests
Changed modules: ...
Failing test before: ...
Passing test after: ...
RLS/API/role checks: ...

## Documentation impact (required)
Map rules triggered: ...
Capture specs updated: ...
Screenshots recaptured and visually reviewed: ...
Manual/Walkthrough guide sections changed: ...
Backend-System/version/evaluation entries changed: ...
No-visible-impact reason (only if applicable): ...

## Verification and deployment
npm ci: ...
npm run docs:check: ...
npm run verify: ...
npm run test:browser: ...
Preview SHA and URL: ...
Authenticated live check (or explicit not run): ...
Known limitations: ...
```

---

## 12. Final decisions

**Keep and improve:** the seven-section KCP syllabus, offline signature progression, role-based walkthroughs, all existing valid screenshots, the source-to-doc map and commit hook, the local/hosted RAG architecture, LangGraph named agents, OCR/ingestion review, interactive Pulse, document-backed evaluations, sample preview personas, revision-checked workspace persistence until migration, and historical release records.

**Fix first:** the blocked October 8 deployment; requirements/documentation contradictions; role/data access; unreliable production evidence; explicit demo-versus-real data provenance; and gaps in per-capture/per-commit documentation verification.

**Refactor incrementally:** backend domain responsibilities, shared permission definitions, source-of-truth boundaries, typed Pulse action proposals, repeatable extraction contracts, stable UI guide targets and meaningful performance tracing.

**Do not introduce without justification:** online syllabus approval, automatic final-grade computations, new plagiarism/AI-authorship/at-risk monitoring, direct EduSuite integration, a parallel multi-agent SDK, a new vector database, a graph database, a full frontend framework migration, or an unreviewed agent capable of mutating academic records.

### Current audit limitations and implementation status

The GitHub connection provided read access to the repository. Earlier direct branch creation returned GitHub `403 Resource not accessible by integration`; the deployment connector exposed deployment metadata but not complete build/runtime logs. Accordingly, **this audit supplies instructions and evidence-based findings but no repository modifications or claims of fixed running behavior**. Applying these recommendations requires an authenticated development environment, complete clean-checkout builds, browser capture tools, test fixtures, and a reviewed PR that updates documentation and source **together**.

**Primary authoritative documents:** [Documentation Policy](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/feature-documentation/DOCUMENTATION-POLICY.md) · [Requirements](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/edupulse-app/docs/REQUIREMENTS.md) · [Flow Spec](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/edupulse-app/docs/FLOW_SPEC.md) · [System Manual](https://github.com/Bhenny-dev/edupulse-prototype/tree/main/feature-documentation/system-manual) · [System Walkthrough](https://github.com/Bhenny-dev/edupulse-prototype/tree/main/feature-documentation/system-walkthrough) · [Backend System](https://github.com/Bhenny-dev/edupulse-prototype/tree/main/feature-documentation/backend-system) · [v0.4.0 Validation](https://github.com/Bhenny-dev/edupulse-prototype/blob/main/feature-documentation/versions/v0.4.0/validation/results.md).
