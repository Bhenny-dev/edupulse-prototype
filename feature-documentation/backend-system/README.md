# Backend System

## October 8 fixes and pending-work completion

Personal provider cookies remain encrypted, HTTP-only, expiring and bound to the verified Supabase account ID. Admin role previews retain that account ID and can reuse its connection; changing accounts or opening a guest session cannot read the admin connection. Hosted requests never borrow server-wide provider credentials.

Pulse routes greetings, situational advice and conversational follow-ups to general assistance with recent history. These requests do not inherit unrelated attachments or library passages. Explicit document tasks and source-only requests keep retrieval and verification. A generation failure without evidence returns a provider error rather than a misleading missing-evidence response.

Syllabus import accepts DOCX and PDF up to 2 MB. PDF text extraction preserves lines and table columns; scanned pages use the existing on-device OCR worker. Approved-file intake also accepts PDF, with the existing 500 KB retained-file limit, matching course-code validation and outline validation. Both flows require human review; OCR does not validate signatures or infer unrecognized week ranges.

Local Ollama courseware calls use a non-streaming JSON-mode response instead of depending on an NDJSON completion marker. Provider errors and incomplete responses are reported without exposing raw exceptions. The courseware graph still checks the schema and limits generation to two attempts; this transport does not add hidden retries.

What runs behind the EduPulse interface in v0.4.0: the API, the agents, the data stores and the security boundaries. The two hosted services are documented separately because their configuration lives in dashboards, not in the interface:

* [Supabase configuration](supabase.md) — database, five-role authentication, system audit, row-level security and vector search (verified live on 2026-10-04).
* [Vercel configuration](vercel.md) — build, function limits, headers, environment variables and the production health check.

## Runtime layout

| Part | Local app (`npm run dev`) | Hosted (Vercel) |
| --- | --- | --- |
| Web app | Vite dev server, `127.0.0.1:5173` | Static build from `dist/`, SPA rewrite to `index.html` |
| API | Node server `server/dev.ts` on `127.0.0.1:3001`, proxied at `/api/ai` | One Fluid Compute function `api/ai.ts` (120 s limit) |
| Generation model | Ollama on the same machine (no key), an on-device browser model, or a connected provider | The provider the signed-in account connected (free tiers or its own key); otherwise *retrieval only* |
| Embeddings and reranker | ONNX models in-process (WebAssembly), free, no key | Same models, bundled into the function |
| Vector database | PGlite (embedded Postgres) + pgvector in `.data/` | Supabase Postgres + pgvector |
| Workspace (syllabi, courseware) | PGlite table `ep_workspaces` | Supabase table `edupulse_workspaces` |
| Sign-in | Five preview personas (local workspace identity; also in the documentation capture build) | Supabase Auth: email and password for Dean, Associate Dean, Instructor and Student; Google for the system admin. The API verifies the JWT and requires an assigned role. |

## API: one endpoint, ten actions

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
* Database access from the API uses the signed-in user's JWT, so Supabase row-level security applies to every query; database functions run with the caller's rights.
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
