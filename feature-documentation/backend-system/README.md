# Backend System

## October 24 audit integration and completion

The [initial audit record](../session-generated/2026-10-24-engineering-audit/README.md) is followed by the [completion record](../session-generated/2026-10-24-release-completion/README.md). [ADR-001](decisions/001-role-and-approval-boundaries.md) records the accepted role and offline approval boundaries. `src/lib/access.js` supplies the shared Performance and courseware-author role predicates; the API enforces the latter against the verified Supabase identity. Existing ownership and RLS remain in the workspace/document services. The additive projection uses the existing database and framework.

Performance samples are labelled and restricted to preview personas. The completion pass connects signed-in academic views to the compatible, RLS-protected projection described in [Supabase configuration](supabase.md). Instructor, enrolled student and Dean results are authorized separately; Associate Dean has no score reads. Missing data yields a truthful empty/error state. The owner admin retains its identity and provider connection during view switching.

The documentation gate checks each commit in a push, including the complete range without a 200-commit cutoff. Build/dependency/specification/CI changes now map to technical/release documentation. The [capture reporter](../capture-runs/README.md) records desktop/mobile/task execution provenance and screenshot hashes. These are local evidence, separate from authenticated production checks.

## October 8 fixes and pending-work completion

Personal provider cookies remain encrypted, HTTP-only, expiring and bound to the verified Supabase account ID. Admin role previews retain that account ID and can reuse its connection; changing accounts or opening a guest session cannot read the admin connection. Hosted requests never borrow server-wide provider credentials.

Pulse routes greetings, situational advice and conversational follow-ups to general assistance with recent history. These requests do not inherit unrelated attachments or library passages. Explicit document tasks and source-only requests keep retrieval and verification. A generation failure without evidence returns a provider error rather than a misleading missing-evidence response.

Syllabus import accepts DOCX and PDF up to 2 MB. PDF text extraction preserves lines and table columns; scanned pages use the existing on-device OCR worker. Approved-file intake also accepts PDF, with the existing 500 KB retained-file limit, matching course-code validation and outline validation. Both flows require human review; OCR does not validate signatures or infer unrecognized week ranges.

Local Ollama courseware calls use a non-streaming JSON-mode response instead of depending on an NDJSON completion marker. Provider errors and incomplete responses are reported without exposing raw exceptions. The courseware graph still checks the schema and limits generation to two attempts; this transport does not add hidden retries.

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

## API: one endpoint, fifteen actions

All requests go to `/api/ai?action=<name>`. Every request is checked for origin (same-origin only), size (per-action body limits) and identity; AI actions are limited to **20 requests per minute and one at a time** per user and connection.

| Action | Methods | Who | Purpose |
| --- | --- | --- | --- |
| `health` | GET | anyone | Version, provider and model, pipeline status (embeddings, reranker, vector store, sandbox, agents), limits including the request time budget |
| `providers` | GET, POST, DELETE | signed-in users | List, connect (key encrypted into an `HttpOnly` cookie) and disconnect a personal AI provider |
| `chat` | POST | anyone (guests: product guide only) | Run the agent graph for a question, revision or comparison |
| `courseware` | POST | instructor or admin accounts; guests with their own provider | Draft a week's material, activity and assessment from an outline row |
| `context`, `similarity` | POST | used by the in-browser model; `similarity` also by Pulse actions | Retrieval and embedding similarity for on-device generation; `similarity` also re-ranks which course an attached material belongs to |
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

Pulse's Operator (`src/agents/operator.js`) plans app actions from a message and its attachments with fixed rules; model output never selects or runs an action. Actions that change data run only after the user confirms them in the Pulse panel, and each uses an existing path: a class list is read by `src/utils/rosterParser.js` (the same reader as Syllabus → My Courses) and saved with the workspace (`workspace` PUT, revision-checked); a material is indexed through `documents` POST with its `course`; a week of courseware is generated through `courseware` POST and saved as drafts. Searches read the workspace and `documents` GET only. No new endpoint, table or migration was added. Details and screenshots: [System Manual 9](../system-manual/09-pulse-actions/README.md).

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
