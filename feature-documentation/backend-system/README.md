# Backend System

## October 24 audit integration and completion

The [initial audit record](../session-generated/2026-10-24-engineering-audit/README.md) is followed by the [completion record](../session-generated/2026-10-24-release-completion/README.md). [ADR-001](decisions/001-role-and-approval-boundaries.md) records the accepted role and offline approval boundaries. `src/lib/access.js` supplies the shared Performance and courseware-author role predicates; the API enforces the latter against the verified Supabase identity. Existing ownership and RLS remain in the workspace/document services. The additive projection uses the existing database and framework.

Performance samples are labelled and restricted to preview personas. The completion pass connects signed-in academic views to the compatible, RLS-protected projection described in [Supabase configuration](supabase.md). Instructor, enrolled student and Dean results are authorized separately; Associate Dean has no score reads. Missing data yields a truthful empty/error state. The owner admin retains its identity and provider connection during view switching.

The documentation gate checks each commit in a push, including the complete range without a 200-commit cutoff. Build/dependency/specification/CI changes now map to technical/release documentation. The [capture reporter](../capture-runs/README.md) records desktop/mobile/task execution provenance and screenshot hashes. These are local evidence, separate from authenticated production checks.

## October 8 fixes and pending-work completion

Personal provider cookies remain encrypted, HTTP-only, expiring and bound to the verified Supabase account ID. Admin role previews retain that account ID and can reuse its connection; changing accounts or opening a guest session cannot read the admin connection. Hosted requests never borrow server-wide provider credentials.

Pulse routes greetings, situational advice and conversational follow-ups to general assistance with recent history. These requests do not inherit unrelated attachments or library passages. Explicit document tasks and source-only requests keep retrieval and verification. A generation failure without evidence returns a provider error rather than a misleading missing-evidence response.

Syllabus import accepts DOCX and PDF up to 2 MB. PDF text extraction preserves lines and table columns; scanned pages use the existing on-device OCR worker. Approved-file intake also accepts PDF, with the existing 500 KB retained-file limit, matching course-code validation and outline validation. Both flows require human review; OCR does not validate signatures or infer unrecognized week ranges.

Local Ollama draft calls use JSON mode over an internal NDJSON stream. Tokens are assembled until a valid final completion marker arrives; partial content never reaches the editor or courseware save. Provider errors and incomplete responses are reported without exposing raw exceptions. The courseware graph checks the schema and limits generation to two attempts; the transport adds no hidden retries.

What runs behind the EduPulse interface in v0.4.0: the API, the agents, the data stores and the security boundaries. The two hosted services are documented separately because their configuration lives in dashboards, not in the interface:

* [Supabase configuration](supabase.md) — database, five-role authentication, system audit, row-level security and vector search (verified live on 2026-10-04).
* [Vercel configuration](vercel.md) — build, function limits, headers, environment variables and the production health check.

## Runtime layout

### Authenticated academic API

`GET /api/ai?action=academic` reads the caller's RLS-filtered projection; Associate Dean responses omit attempts/access records. `POST` validates a Zod discriminated command: `sync` refreshes the caller's own workspace projection; `open` and `submit` require an enrolled student and the exact published version. Client role/student/score fields cannot substitute for the verified identity. Named recoverable errors distinguish unavailable records, invalid responses and forbidden operations. See [Supabase configuration](supabase.md) for table policies, publication checks and shared request limits.

The API/domain boundary lives in `server/domains/academic.ts`; shared hosted AI leases live in `server/requestLimits.ts`. Existing `/api/ai?action=...` compatibility is preserved. Authenticated academic screens use one reusable record-view component; authoring remains in the existing syllabus/courseware components. Preview academic pages and sample notifications remain available only in preview; signed-in views have truthful empty/error states.

| Part | Local app (`npm run dev`) | Hosted (Vercel) |
| --- | --- | --- |
| Web app | Vite dev server, `127.0.0.1:5173` | Static build from `dist/`, SPA rewrite to `index.html` |
| API | Node server `server/dev.ts` on `127.0.0.1:3001`, proxied at `/api/ai` | One Fluid Compute function `api/ai.ts` (120 s limit) |
| Generation model | Ollama on the same machine (no key), an on-device browser model, or a connected provider | The provider the signed-in account connected (free tiers or its own key); otherwise *retrieval only* |
| Embeddings and reranker | ONNX models in-process (WebAssembly), free, no key | Same models, bundled into the function |
| Vector database | PGlite (embedded Postgres) + pgvector in `.data/` | Supabase Postgres + pgvector |
| Workspace (syllabi, courseware) | PGlite table `ep_workspaces` | Supabase table `edupulse_workspaces` |
| Sign-in | Five preview personas (local workspace identity; also in the documentation capture build) | Supabase Auth: email and password for Dean, Associate Dean, Instructor and Student; Google for the system admin. The API verifies the JWT and requires an assigned role. |

## API: one endpoint, sixteen actions

All requests go to `/api/ai?action=<name>`. Every request is checked for origin (same-origin only), size (per-action body limits) and identity; AI actions are limited to **20 requests per minute and one at a time** per user and connection.

Request intake (`server/node-adapter.ts`, shared by the local server and the Vercel function) is bounded before authentication or model work starts: a body that stops arriving receives `408 REQUEST_TIMEOUT` after 30 seconds, a declared or streamed oversize body `413 BODY_TOO_LARGE`, a method the action does not accept `405` with an `Allow` header, and an unknown action (including inherited object-property names) `404`. Node and Fetch handlers read the same action/method table. A client that disconnects aborts the signal passed to downstream work, and an unexpected transport or handler failure returns structured JSON with a request ID and `Cache-Control: no-store`, never the exception text. The intake deadline does not extend the hosted function's duration limit or the model budget.

| Action | Methods | Who | Purpose |
| --- | --- | --- | --- |
| `health` | GET | anyone | Version, provider and model, pipeline status (embeddings, reranker, vector store, sandbox, agents), limits including the request time budget |
| `providers` | GET, POST, DELETE | signed-in users | List, connect (key encrypted into an `HttpOnly` cookie) and disconnect a personal AI provider |
| `chat` | POST | anyone (guests: product guide only) | Run the agent graph for a question, revision or comparison |
| `courseware` | POST | instructor or admin accounts; guests with their own provider | Draft a week's material, activity and assessment from an outline row |
| `context`, `similarity` | POST | used by the in-browser model; `similarity` also by Pulse actions | Retrieval and embedding similarity for on-device generation; `similarity` also re-ranks which course an attached material belongs to |
| `web-search` | POST | verified session/local workspace, with appropriate-use checks | Bounded public research; optional catalog metadata for syllabus drafts |
| `references` | POST | signed-in users | Librarian search of open catalogs |
| `extract` | POST (raw bytes) | anyone (guests cannot index) | Sandboxed extraction with a quality report |
| `documents` | GET, POST, DELETE | signed-in users | List, index (after review) and delete library documents. An optional `course` (for example `IT 102`) files a document under a course; it is kept in the document's `quality` record, so no migration is needed |
| `workspace` | GET, PUT | signed-in users (PUT: system admin, Dean, Associate Dean or Instructor) | Load and save the academic workspace with revision checks |
| `academic` | GET, POST | assigned academic accounts; commands further restricted by operation | Read authorized projection; instructor workspace sync, enrolled student material opens and versioned objective submissions |
| `provider-oauth` | POST | assigned accounts or the local workspace | Begin OpenRouter PKCE authorization or complete the account/origin/state-bound code exchange |
| `provider-test` | POST | callers with a saved personal connection; local server connection also supported | Send a fixed, bounded generation probe through the selected provider/model; return public metadata and record successful inference |
| `operator` | POST | verified accounts/local workspace; authoring restricted to instructor view | Produce a validated tool plan or reviewable patch; never execute model-generated code or claim a save |
| `conversations` | GET, POST | account owner/local workspace | List/read/recall private chats; create, append immutable messages, archive/delete; save/forget preferences and change automatic-memory setting |

### Pulse tools and context (25 October 2026)

`src/agents/skills.ts` declares the supported tools and schemas. `toolPlanner.ts` validates model proposals for both provider and on-device execution; `server/domains/operator.ts` supplies the authenticated provider transport. Familiar navigation and file intents retain deterministic routing. Editor adapters register an instance and exact snapshot; a stale or unmounted target cannot be modified. Allowed fields exclude course identity, fixed curriculum description, approval, publication, role and enrollment permissions. Unknown fields, invalid URLs and duplicate outline weeks fail validation. Files and prior messages are untrusted source data.

Confirmed mutations use `WorkspaceContext.commit` and the existing revision-checked workspace API. It waits for the persisted response, reconciles a lost response by reading the exact next revision, and preserves later local edits. JSON comparisons ignore object-key ordering while preserving array order and values. Week generation preserves reviewed/published items and rejects a changed syllabus or draft. Model replies cannot assert completion; receipts describe form-only, preview-device or verified database saves.

`server/domains/conversations.ts` stores private chat text and attachment names, not raw uploaded files, executable action payloads or credentials. Explicit recall searches the caller's indexed transcripts and returns source IDs, roles and dates. User response preferences are extracted conservatively from user statements; files/model text cannot create memory. Owner RLS, cascade deletion and quotas are described in [Supabase](supabase.md). Writer prompts contain at most 12 recent turns and 30,000 total characters including instructions; older history is retrieved separately. Operator targets retain complete selected arrays; over-budget edits are rejected instead of silently truncating replacements. On-device planning applies a 6,000-character input limit.

Provider settings and pipeline status share `AIContext` health; outdated requests cannot overwrite a newer refresh. Saved credentials display a masked indicator/expiry without exposing the secret. Failed replacements retain editable input and preserve the existing cookie. Model refresh preserves an available selected model; first-time OpenAI selection prefers an available small modern model instead of alphabetically defaulting to GPT-3.5. Discovery excludes announced expired OpenAI models and specialized audio/image/search models.

Modern OpenAI models use `/v1/responses` with `max_output_tokens`, `store: false` and output-message text parsing; legacy GPT-3.5/GPT-4 chat models use Chat Completions with `max_tokens`. JSON drafts request JSON-object output and still pass the courseware schema checks. Other providers keep their fixed, provider-specific endpoints. [OpenAI's text-generation guide](https://developers.openai.com/api/docs/guides/text) describes the Responses protocol.

Catalog health is explicitly distinct from successful inference. `provider-test` accepts only an empty object and probes the saved model with a fixed short prompt and a 2,048-token output ceiling, under the existing identity/origin/time/rate limits. A successful text response sets `testedAt` in the encrypted connection cookie. Successful generated chat/courseware also records inference. Selecting another model or replacing a key clears verification; refreshing the same credential/model preserves it. Model-access, incompatible-request, authentication, credit/quota and empty-output errors clear verification while retaining the credential. Error responses expose bounded categories, never raw provider bodies. The Writer propagates these actionable errors even with retrieved evidence; unrelated provider failures can still fall back to source excerpts.

`server/domains/providerOAuth.ts` implements OpenRouter's fixed-host S256 flow. The random verifier/state are sealed in a ten-minute HttpOnly cookie using authenticated encryption. Completion requires the same verified EduPulse owner, origin, unexpired state and PKCE verifier; provider codes are one-use. The dedicated SPA return address `/auth/provider/openrouter` is detected before Supabase initialization, so an external provider code is not consumed as an EduPulse sign-in code. Legacy query-marker returns remain supported; a short-lived state-only session-storage marker also recognizes a return with a stripped query marker. The dedicated path does not depend on browser storage. The UI waits for EduPulse authentication to settle, removes callback parameters and opens AI settings, or shows session-recovery guidance.

The server returns only public connection metadata. Failed code exchanges preserve the previous connection. After a verified exchange, a model-catalog outage saves the newly authorized credential with no selected model, so **Refresh models** can finish setup without exchanging a consumed code again. Existing hosted account leases also bound these commands. No OAuth password, key or token is written to local/session storage or returned in JSON; the optional browser marker contains only state and expiry.

OpenRouter authorization is available; direct hosted ChatGPT sign-in requires provider approval that this project does not currently have. Claude API connections use workspace-scoped keys; the form does not configure the `anthropic-workspace-id` header required for unscoped personal/service keys. The [manual](../system-manual/08-ai-connections/README.md) documents provider capabilities and the distinction between synthetic authorization regressions and live consent. Callback exchange failures remain visible as alerts even without a saved connection; starting another settings operation clears stale callback notices.

The system admin dashboard calls the gated `edupulse_admin_overview` database RPC for account coverage and recent activity. The separate `admin-accounts` Supabase Edge Function creates role accounts and assigns roles after verifying the live Google admin identity. The admin view also checks authentication, Google sign-in, the audit query and the Pulse API. Each account connects its own AI provider in Settings; a role switch never shares an AI key or another user's workspace.

## The agent graph

Built with LangGraph (`src/lib/rag/agents.ts`); the same graph runs on the server and, for the on-device model, in the browser.

| Agent | Role |
| --- | --- |
| **Guardian** | Checks appropriate use before any other agent works (`src/lib/rag/policy.ts`). It declines learners’ requests for assessment answers, excluded features (plagiarism or AI-authorship detection, integrity scoring, at-risk prediction, proctoring) and official grade computation, and cites the rule it enforces. The rules are deterministic and run before any model. |
| **Planner** | Classifies the request (answer, compare, references, draft) and splits it into focused search queries |
| **Researcher** (one per query, in parallel) | Hybrid search: pgvector cosine + Postgres full-text, fused with reciprocal rank fusion |
| **Ranker** | Cross-encoder reranking, relevance floor, near-duplicate removal, at most three passages per document; for comparisons both documents must contribute and reference-list passages are skipped |
| **Comparator** | Aligns statements from two documents (shared, related, only-in-one) and reports coverage; never judges authorship |
| **Writer** | Generates the answer with numbered citations, using only the ranked passages |
| **Verifier** | Checks every sentence against its cited passage (0.55 × semantic + 0.45 × lexical support) with consistency gates for numbers, names and absolute words; counts corroborating documents |
| **Corrector** | Fixes wrong or missing citation numbers deterministically, asks the Writer for one revision if statements are unsupported, and falls back to quoting sources |
| **Librarian** | Finds real references in Open Library, OpenAlex and Wikipedia (allowlisted, no key) |

Every step is returned to the interface as the *How Pulse worked on this* timeline.

**Agent registry and tracking.** `src/lib/rag/registry.ts` holds each agent’s job title, task and measurable goal, and judges after every run whether each agent met its goal. The API records each signed-in hosted run in `edupulse_agent_runs` (`server/agentRuns.ts`): workflow, task, outcome, rule, provider and model, duration, counts, and per-agent goal results named after the OpenTelemetry GenAI agent conventions (`gen_ai.operation.name` = `invoke_agent`, `gen_ai.agent.name`). Records never contain prompt, answer or document text. The System Admin console reads them through `edupulse_admin_agent_activity`.

Not recorded:
* local-workspace runs;
* guest runs;
* runs of the on-device model, which execute in the browser.

The Guardian still applies to all of them. Open-source integrations that were considered are listed in [integrations.md](integrations.md).

## Document ingestion pipeline

`upload → type sniffing → sandboxed extraction → quality report → (OCR of scanned pages, on the device) → human review → split → embed → store`

* **Sandbox:** each file is parsed in a separate worker thread with a 256 MB heap, a 30-second limit, an empty environment (no secrets) and at most two at a time. If the worker cannot start, the upload fails; untrusted files are never parsed in the API process.
* **Checks before parsing:** the real file type must match the name; Office files are inspected through the ZIP central directory and refused if they would expand to an unsafe size; legacy and password-protected formats are refused with a reason.
* **Excel workbooks (`.xlsx`):** read in the same sandbox with the same ZIP checks. Each visible sheet becomes a `## Sheet name` heading followed by comma-separated rows of the values Excel last saved; formulas are never evaluated, hidden sheets are skipped, and a workbook is limited to 20 visible sheets and 5,000 rows. An indexed workbook is stored with source type `csv`, which the database's existing `source_type` check accepts.
* **OCR for scanned PDFs:** runs in the browser, never on the server. A PDF with no text layer is refused by the sandbox with code `NO_READABLE_TEXT`; for it, and for PDF pages with fewer than 20 characters of text, the Knowledge library offers OCR. PDF.js (the eval-free build the sandbox uses) renders each such page at about 300 dpi, and Tesseract 7 (English LSTM model, `4.0.0_best_int`) reads it in a Web Worker. Page images never leave the device. The text is placed under its `[[Page n]]` marker, then sent as plain text through the same sandboxed cleaning, quality and instruction checks, and the instructor reviews it before indexing. Up to 60 scanned pages per run; pages below 70% confidence and pages with no text are named in the review.
* **Prompt-injection defence:** instruction-like text is flagged in the review and neutralised before it reaches a model; the model is told that document text is data.
* **Splitting and embedding:** LangChain recursive splitter; all-MiniLM-L6-v2 (384-d, int8 ONNX) embeddings; pages and slides are kept so answers can cite them.

## Pulse actions (in the browser)

Pulse's Operator (`src/agents/operator.js`) plans app actions from a message and its attachments with fixed rules; model output never selects or runs an action. Actions that change data run only after the user confirms them in the Pulse panel, and each uses an existing path: a class list is read by `src/utils/rosterParser.js` (the same reader as Syllabus → My Courses) and saved with the workspace (`workspace` PUT, revision-checked); a material is indexed through `documents` POST with its `course`; a week of courseware is generated through `courseware` POST and saved as drafts. Searches read the workspace and `documents` GET only. That 25 October action release added no endpoint, table or migration; the 28 October baseline extension below adds the saved academic contracts. Details and screenshots: [System Manual 9](../system-manual/09-pulse-actions/README.md).

## Security summary

* Provider keys and the Supabase secret never reach the browser. Personal provider keys are encrypted with AES-256-GCM (`AI_CONNECTION_SECRET`) into a `__Host-` cookie that expires within seven days.
* Database access from the API uses the signed-in user's JWT, so Supabase row-level security applies to every query; public RPC entrypoints run with the caller's rights. Narrow private definer functions enforce current trusted roles, ownership/enrollment, review state and bounded scoring/lease mutations; projection tables grant no direct authenticated writes.
* Content-Security-Policy and related headers are set for every route (see [vercel.md](vercel.md)).
* Model files are pinned to a Hugging Face revision and verified by SHA-256 before use.

## Time budgets

| Limit | Value |
| --- | --- |
| One AI request, hosted | 110 s (inside Vercel's 120 s function limit) |
| One AI request, local app | 300 s by default, configurable up to 600 s with `AI_TIMEOUT_MS` (CPU-only models need it) |
| Browser wait for `chat`, `courseware`, `references` | 610 s, so the server's own answer or timeout message always arrives first |
| Document extraction | 30 s per file in the sandbox |

*Changed in v0.4.0:* the local budget was raised from 110 s after courseware generation with a CPU-only 1.5B model was measured timing out at exactly 110 s; the hosted limit is unchanged.

## Workspace buddies and latency paths

`quickReplies.ts` recognizes only exact low-risk greetings/thanks locally. `literalEdit` performs explicit quoted replacements in schema-approved editable fields and still requires preview/confirmation. General model answers receive a smaller history/context and output budget; archive recall is queried on explicit recall intent. Ollama stays warm for five minutes when used. No third-party model latency guarantee is implied.

The six profiles in `buddies.ts` map application capabilities to fictional characters. `useOffice` records at most 50 in-session request/proposal events. Statuses are working, review, done, error or stopped; preparation and response completion are distinct from persistence. Confirmed mutations await real save receipts. Conversations archive text, not executable tool objects or the transient animation state.

The optional `WorkspaceOffice` and Three.js scene are dynamically imported after the user opens the office. GPU resources, animation loops and observers are released on unmount. Rendering is capped at 30 fps and pixel ratio 1.5; hidden documents pause rendering, and pause/reduced-motion states use static poses. DOM desk controls and a fallback message preserve operation if WebGL fails. The scene renders ordinary 3D animated over time, not literal 4D. See [the office manual](../system-manual/11-workspace-buddies/README.md).

## 26 October: source context and PDF fidelity

`pdfSyllabus` reads real PDF.js text geometry and ruled cell bounds. `pdfTableLayout` retains wrapped lines, page continuations, duplicate week entries and explicit shared week ranges. Column-specific policy extraction preserves the grading fraction only when the PDF's fraction rule and denominator establish it. Source page mappings accompany parsed rows. OCR still runs in the bounded device worker for pages without readable text; ambiguous scans/layouts require review, not claims of universal extraction accuracy.

The mounted editor registry exposes temporary source references separately from its mutation snapshot. Pulse passes the selected section to the proposal router, retains chat sources for follow-ups, and supplies current editor values distinctly. No raw PDF is silently stored as reusable memory. New chats, owner changes and explicit file removal clear chat source references; page source lifetime follows the mounted editor. Existing owner authorization, exact snapshot comparison and confirmation remain required for writes.

The chat contract accepts an allowlisted buddy identifier. The writer resolves its persona from the application registry, with recent history and recorded session events as data. Academic requests with supplied sources exclude unrelated public help pages; a source correction uses the typed import/edit flow. Source evidence has an expanded bounded prompt allowance; oversized requests fail explicitly rather than silently shrinking every source to 500 characters.

PDF exports use lazy-loaded pdfmake with bundled fonts. Only application-built text definitions are rendered; no model-generated HTML, remote assets or executable document definitions are accepted. Syllabus DOCX and PDF share the same content-block builder. PDF download does not grant approval, persist a draft or publish content. This release needs no database migration.

Ruled institutional tables are read by column and across page continuations. Only mapped, nonempty institutional fields override a syllabus after its import preview is accepted. The allowed editor patch now includes bounded institutional context fields, with a deep merge preserving other institution fields. New-draft CIT defaults use the user-provided IT-202 source; existing saved snapshots are unchanged.

## Interface consistency and feature audit, 27 October 2026

Shared dialog portals isolate nested scroll/positioning contexts and reserve space for Pulse. Page tabs own secondary navigation; duplicate left sidebars are removed. Loading visuals distinguish pending record reads, short actions and file scans, with reduced-motion support and explicit failure recovery. Current academic-record screenshots use synthetic UI transport; the capture report labels this separately from hosted authentication evidence. The [feature-presence audit](../session-generated/2026-10-27-feature-presence-audit/README.md) identifies older preview features that are bypassed in authenticated views and records outstanding gaps without restoring simulated data.

Application commit `c70eb6b` is deployed as `dpl_AAtT1iTgWD65WuD9o1XamsriQYFp`. Its staged production build passed 126 tests and native API startup checks before promotion. Public desktop/mobile health and rendering checks passed; current authenticated UI screenshots remain synthetic transport evidence. [Release validation](../versions/2026-10-27-interface-consistency/validation/results.md) records the GitHub billing lock separately from the passing local/Vercel gates.

## Course-aware drafting and public research, 27 October 2026

The working change distinguishes new educational drafting, general assistance, public research and source-only questions. Draft intent takes precedence over incidental reference words. The editor's serialized state is task context, not citable evidence; it no longer becomes a JSON excerpt with perfect grounding badges. The selected course identity is retained even when only one section is sent for revision. Whole-form requests override incidental component focus.

`server/external/web.ts` uses fixed OpenRouter/OpenAI search endpoints and parses source annotations into bounded public passages. The OpenRouter server tool works across model providers where supported; search may be separately billed even with a free model. Unsupported models/accounts fall back to the fixed Wikipedia API, with an explicit coverage warning. Syllabus research also queries the existing Open Library/OpenAlex catalogs for exact bibliographic metadata. On-device planning calls the same rate-limited `web-search` endpoint. Source-only requests do not invoke public research. Syllabus-edit research sends the selected course title; general public search sends the requested topic. Private editor arrays, attachments and transcripts are not sent to the search APIs.

External responses have time and byte limits, refuse redirects, validate response structure and keep source URLs as links rather than arbitrary fetch destinations. Returned content is untrusted data. Research failure does not prevent original teaching content; it produces an explicit unverified-draft note. The endpoint uses the existing origin/session/request limits and checks appropriate use against the verified identity before searching, including direct endpoint calls. It does not expose provider keys. Unsupported provider search errors are summarized without leaking provider response bodies.

The edit planner returns a schema-checked patch, research links and notes. Whole-syllabus generation checks the existing week set and the learning outcome/topic/activity/assessment/material/type fields, repairs an incomplete response once, and rejects a still-incomplete patch. Output truncation is reported before application. Generated URLs must occur in the supplied context/research, and book metadata must be present in the sources. Unknown institutional grading rules remain pending; educational proposals do not establish approvals. Mounted-editor snapshot checks, role checks, confirmation and persistence receipts remain in force. No database migration is required.

Provider request formats were checked against the [OpenRouter web-search server-tool documentation](https://openrouter.ai/docs/guides/features/server-tools/web-search) and [OpenAI web-search documentation](https://developers.openai.com/api/docs/guides/tools-web-search). This working change is not a hosted deployment or a live test of the user's saved provider connection.

The expanded [feature-loss register](../session-generated/2026-10-27-feature-presence-audit/feature-loss-register.md) documents UI omitted by authenticated branches, inactive older controls and theme defects. It does not mark those interfaces restored by the drafting fix.

## Restored account sections, 28 October 2026

AcademicProvider now owns one cancellable, account/role-scoped projection load, shared by page sections and record-derived notifications. Changing account or role remounts its state and aborts old requests. AcademicPortal retains loading/error/export/sync/open/submit behavior and delegates role presentation to dashboard, performance, management, records and reader components. No sample fallback or RLS widening is introduced. Current radar/matrix summaries exclude earlier assessment versions; history retains them. Date and block/course filters apply to recorded events, and missing events are not classified as overdue.

The existing workspace schema accepts optional bounded `intake` arrays (`courses`, `loads`, `rosters`, `history`). Dean/Associate Dean confirmations use the existing compare-and-save API, owner RLS and 3 MB total limit. Each data array is limited to 1,000 string-cell rows; history to 50 records. Legacy snapshots remain unchanged. That first UI-only restoration required no SQL migration. It is now a legacy private archive: the baseline workflow restoration below adds shared imports and confirmed loading through four migrations. Existing private rows are never silently promoted. CSV previews validate expected columns, quoted fields, required values, emails and duplicate keys, then show accepted/rejected rows before saving. CSV exports neutralize spreadsheet formula prefixes.

Authenticated notices derive from current authorized publications, unanswered assessments, missing readiness records and owned courseware drafts. Read IDs are bounded and stored by account/role on the device; the baseline restoration below adds persisted event notices/read receipts; email remains outside the implemented delivery. The [restored role guide](../system-walkthrough/09-restored-role-pages/README.md), [task steps](../system-manual/13-restored-account-sections/README.md) and [audit dispositions](../session-generated/2026-10-27-feature-presence-audit/restoration-status.md) describe the current baseline workflows and remaining deployment limits.

## Baseline workflows, 28 October 2026

[ADR-002](decisions/002-feature-preservation-baseline.md) adopts the owner-confirmed pre-makeover feature contract. Four migrations (`20261028130000` through `20261028130300`) add shared institutional records, events/notices, metadata projection, assessment sessions/topic marks and offline review requests. All four were applied in order to EduPulse System on 28 October 2026 before the matching code push. Linked history, live RLS/grant checks, unchanged record counts and advisor findings are recorded in [Supabase operations](supabase.md#applied-baseline-workflow-migrations-28-october-2026).

- Shared imports are atomic RPCs restricted to Dean/Associate Dean/owner-admin. Courses precede loads; loads require a provisioned instructor and imported course. Roster rows match block and verified account email. A global advisory transaction lock serializes imports/projection refresh. A block permits at most 35 active imported students. Course/block/semester identifies a load, so reassignment replaces that load and removes the stale projected enrollment. Private instructor workspaces are not reassigned.
- Courses project saved syllabus station, outline, instructor display name, source links, delivery counts and block metadata. The projection retains instructor authoring ownership. Students still read only active enrolled courses; Associate Dean never receives score rows or assessment-review events. The faculty RPC exposes only the instructor directory to academic management.
- Published content has optional UTC release/deadline. Student RLS and submission commands enforce release time; metadata changes cannot skip saved checked-content review. Publication notices are created with the release time, rescheduled idempotently, and remain hidden if the publication is withdrawn. No background job is needed to make the saved release visible. Workspace edits run projection triggers immediately.
- Each assessment has 3-5 questions, optional 0-120 minute duration and 1-3 attempts. A server-recorded session controls the timer. Start/submit serialize per student/publication. Repeated submission of a session returns its saved result. Objective keys remain in the private schema; direct calls to the legacy private scoring function are revoked. The public compatibility wrapper routes submissions through the same session checks.
- An instructor can map each question to an exact approved outline topic. Objective marks are computed by the database. Written responses stay pending; only the owning instructor/owner-admin can confirm per-question marks with a reason. Dean is read-only; student/Associate Dean cannot grade. Topic scores are computed from reviewed per-question marks, with no inferred mapping. Current mastery uses the latest attempt per current publication version and excludes pending marking. History retains recorded topic results. Appeals and review reasons produce account notices.
- Notice reads are owner-only. Mark-read receipts are persisted; instructor reminders target enrolled, provisioned learners without a current attempt/open and are throttled to once per publication/recipient/day. Derived reminders still use bounded device read IDs. Email/push and direct EduSuite integration are not implemented.
- Syllabus edits retain up to ten editable snapshots without recursively nesting history or duplicating approved-file bytes. Restoring creates a new draft, clears approval and returns publications to review. Changed outline weeks are flagged out of alignment. Topic-alert acknowledgments are bounded private workspace data; they never change marks.

AcademicProvider shares cancellable initial loads and periodic visible-tab refresh. Loaded forms remain mounted while refreshing; saves and appeals retain their local messages/fields. Table CSV exports neutralize formula prefixes. Toast identifiers use UUIDs so two saves in the same millisecond cannot collide.

See [Manual 13](../system-manual/13-restored-account-sections/README.md) and [validation](../versions/2026-10-28-baseline-workflows/validation/results.md). Local SQL tests exercise real role/RLS/command behavior; UI fixtures prove presentation separately and do not certify hosted authentication.

Reminder commands serialize by publication and deduplicate only reminder-kind notices. A publication or marking notice does not suppress the first instructor reminder. SQL tests cover this distinction and the daily duplicate exclusion.

Objective scoring includes fixed True/False choices, encoded as indexes 0/1. Publication validates their two fixed labels and private correct index; submission rejects out-of-range choices. The active student reader shows one question at a time with Previous/Next and numbered navigation; saved-result review shows all submitted responses without private keys.

Pulse account guidance no longer injects a prototype/sample disclaimer for authenticated academic pages. Authored steps describe shared confirmation, release/enrollment visibility and role-limited follow-up; preview personas retain sample disclosures. Records and Course Loading expose their guidance zones. This changes contextual guidance only, without adding model tools or granting new autonomous writes.

The first baseline migration backfills course station, outline, instructor name, delivery counts and safe reference URLs from existing owner snapshots, then refreshes block summaries. Object references (`title`/`url`) and older URL strings are normalized to HTTP(S) links. This does not change workspace revisions, approval attachments, marks or publication visibility, and does not promote legacy private CSV intake into shared institutional records. SQL tests create a pre-migration active syllabus and assert these fields survive without an instructor resave.

Archiving an owned syllabus withdraws its shared publications even when the retained workspace items still have their former published status. The projector skips those archived items instead of rejecting the entire save, and metadata validation ignores inactive publications. A second save remains valid; students lose access through the normal RLS conditions. SQL tests cover this existing archive action. Drafted/inactive syllabi still cannot newly publish.


## Component actions and workspace controls, 28 October 2026

Selected-field and section proposals are clipped against the captured editor baseline before preview and application, then use the existing validated workspace save path. No database schema, API action, RLS policy, provider credential or deployment configuration changes are required. File drops use the existing bounded reader; a drop only attaches. The healthy workspace strip is removed; recovery remains visible on save/conflict errors and backup is in Settings Data & Privacy. See [the local implementation record](../versions/2026-10-28-component-actions/README.md) for scope and validation limits.

## Backend content harness, 29–30 October 2026

The [backend audit](../versions/2026-10-29-backend-harness/validation/results.md) traces intent, generation, validation and saved delivery. Whole-syllabus intent overrides incidental focus; editor drafts receive one bounded schema/completeness/source repair, without appending an unbounded previous output. Outline replacements retain every existing week and exam label. Only whitelisted whole-field model envelopes are normalized; arbitrary paths/operations remain invalid. Confirmation and exact-editor snapshot checks still precede revision-checked saves.

Whole-syllabus generation uses bounded stages: general teaching sections, up to four teaching weeks per call, and references when supplied research exists. Stages share course identity, program outcomes and preceding topics, then assemble one validated proposal. No partial stage is applied. Existing exam rows and grading rules are retained; missing official grading stays pending and new policies/requirements are explicitly proposed. Courseware receives the bounded original Pulse request, including language/example preferences, through retries. Material must contain at least 120 words outside references and no placeholder bodies; this is a minimum completeness check, not a factual-accuracy guarantee.

The courseware graph rechecks no-web instructions even when a caller omits the research flag. Syllabus-only requests skip private and public retrieval. The week endpoint has no attachment input and returns `SOURCE_REQUIRED` for file-only requests; editor requests instead ask for a missing file and constrain writing to supplied source text. These errors reach the existing action card. Hosted requests retain their 110-second server budget; a slow model can time out before a complete whole-syllabus proposal, without applying partial stages.

The courseware writer now receives every supported topic and requests usable explanations, examples and activities rather than two tiny sections. If no private academic passage is available, public research can supplement the outline; `research: sources` disables that external step. Only the course title and topics go to public search. Returned references distinguish public research from library passages. Source links require matching origins and path boundaries. Provider/model quality remains subject to instructor review.

Operator and connection-test requests use the same long browser budget as generation. Truncated local/browser responses are rejected. Operator inference updates provider-test status only when a model actually answered; model/account failures invalidate it. The direct courseware service and HTTP route share instructor/admin authoring checks. No database schema, role-page layout or approval workflow changes are required. See [Manual 15](../system-manual/15-backend-content-delivery/README.md) for generated proposal, save receipt and reload evidence.

Local JSON drafts use an internal NDJSON stream to receive tokens during long Ollama generations. Only the assembled response with a final completion marker enters draft validation; cancellation, malformed frames, output limits and missing completion markers fail without applying partial content. This does not expose partial drafts in the interface. See [Ollama streaming](https://docs.ollama.com/api/streaming).
