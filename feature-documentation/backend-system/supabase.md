# Supabase configuration

## Private Pulse history and memory — 25 October 2026

Migration `20261024163740_pulse_conversations.sql` adds `edupulse_pulse_threads`, `edupulse_pulse_messages`, `edupulse_pulse_memories`, and `edupulse_pulse_preferences`. All use owner RLS with `(select auth.uid())`; anonymous grants are revoked. Messages are immutable (select/insert/delete only), idempotent by UUID, ordered by a database sequence, and linked to the owner/thread with a composite foreign key. Source-derived memories use a matching owner/message foreign key and cascade when the message or account is deleted.

Follow-up migration `20261024213422_pulse_history_privileges.sql` explicitly revokes Supabase default table privileges before granting only the supported operations. Hosted validation exposed that an additive GRANT alone left UPDATE available; the correction was applied and immutable transcript checks then passed.

Indexes cover owner/thread ordering and full-text transcript search. `edupulse_recall_pulse` is security-invoker, restricts the caller and optionally excludes the active thread, ranks bounded topic matches and returns at most five excerpts. A security-invoker trigger serializes account capacity checks: 100 threads, 500 messages per thread, 100 memories. The local PGlite counterpart uses matching owner filters and limits. Latest-chat reads return at most 100 messages; stored older messages remain available to recall. History does not bypass academic role/course RLS. A full 500-message thread returns `CONVERSATION_FULL`; the client retains the unsaved batch and starts a continuation thread. Account-wide capacity errors remain visible until old history is deleted.

The migration was applied through the explicitly linked CLI after local PostgreSQL RLS, quota, provenance and immutability tests passed. The connector still rejects advisor access for this project; this is not an advisor pass. See the [agent-tools release validation](../versions/2026-10-25-pulse-agent-tools/validation/results.md) for hosted verification.

## October 24 compatible academic projection

The owner accepted the written role scope in [ADR-001](decisions/001-role-and-approval-boundaries.md). Four additive migrations introduce `edupulse_courses`, `edupulse_enrollments`, `edupulse_publications`, `edupulse_attempts`, `edupulse_material_access`, private assessment keys and shared AI request leases. The migrations were applied to the existing EduPulse project through the explicitly linked CLI after local SQL/RLS regression tests; the connector lacked permission for this project.

The owner-scoped JSONB workspace and its revision check remain the authoring source. A narrow trigger projects instructor/admin-owned confirmed data; clean legacy instructor workspaces reconcile automatically once per account session; normal saves already project their confirmed contents. There is no mass backfill or replacement of historical evidence. Active approved syllabi and a previously saved checked draft with unchanged content/type/week/syllabus are required for publication. Unpublishing revokes student publication access; attempts/material-open evidence remains retained. The original workspace still supports export, and the authenticated view can **Export authorized records** as JSON.

Database RLS allows instructors to read owned courses/results, students to read their matching-email enrollments and active published material plus their own attempts, Dean to read college academic records, and Associate Dean to read course/delivery/roster data without scores. This project represents one institution/college; no cross-project or tenant-sharing policy is inferred. Academic role checks read current trusted `auth.users.raw_app_meta_data`, so deletion or role reassignment cannot preserve academic privileges through an old JWT. Editable user metadata does not grant access.

Published assessment content strips correct answers and explanations. Keys are in `edupulse_private.assessment_keys` with no authenticated table read. A private, bounded grading command checks actual identity, enrollment, publication state and source version, accepts only objective responses, computes raw points, and saves one attempt per student/publication/version. A repeated submission returns the same saved attempt. No institutional grade formula is calculated. Material-open commands are similarly scoped and idempotent.

Public academic tables grant SELECT only; writes go through the compatible workspace projection or the narrow command. The private definer functions have an empty search path, explicit identity/resource checks and restricted EXECUTE. Raw insert/update attempts are denied. `tests/academic.test.ts` covers direct Data API-equivalent RLS, answer-key secrecy, stale-role revocation, publication guards, duplicate submission and shared leases. Six real temporary accounts were also used against cloud Auth/API/database; their records are synthetic, not institutional evidence.

Authenticated hosted AI requests use an atomic account lease: one active operation, 20 starts/minute, 130-second lease expiry, and token-matched release. A failed shared limiter fails closed; guests/local preview retain the existing per-instance safeguards. This is a per-account guard, not a global paid-provider spend guarantee.

The shared-record API currently bounds each table response to 1,000 authorized rows; this is a limited pilot view, not an institution-scale analytics claim. The Supabase security advisor reported no errors after migration, with one pre-existing warning: leaked-password protection is disabled. Enabling that Auth setting is separate from the RLS/code changes and may depend on project plan. [Supabase password protection documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

**Project:** EduPulse System (`xyziepdkdvvuhgkymooo`) · **Verified live:** 2026-10-04 through the Supabase connector and hosted application.

## Migrations applied

| Version | Name | Adds |
| --- | --- | --- |
| 20260913112259 | `connected_ai` | Private AI library: `edupulse_ai_documents`, `edupulse_ai_chunks`, pgvector, owner policies, ingest and match functions |
| 20260915042129 | `persistent_workspace` | `edupulse_workspaces` with revision-checked saves (`edupulse_save_workspace`) |
| 20260915100411 | `workspace_policy_initplan` | Rewrites workspace policies so `auth.uid()` is evaluated once per query |
| 20261001090000 | `agentic_rag` | 384-d MiniLM embeddings, generated full-text column `fts` with a GIN index, `edupulse_ingest_document_v2` (pages, sections, extraction metadata) and `edupulse_hybrid_chunks` (vector + keyword search for the Researchers) |
| 20261004054136 | `system_admin_audit_roles` | Five distinct roles, academic workspace access, admin-only account and audit overview, activity audit table |
| 20261004073000 | `agent_runs_tracking` | Agent run records: `edupulse_agent_runs`, the gated `edupulse_admin_agent_activity` and the helper `edupulse_private.is_system_admin()` |
| 20261024064532 | `academic_projection` | Courses, confirmed enrollments, sanitized publications, private assessment keys, attempts/material opens, current-role RLS and bounded commands |
| 20261024065254 | `request_leases` | Atomic authenticated AI concurrency/rate leases across hosted instances |
| 20261024071459 | `academic_record_labels` | Retained student email labels for authorized result views |
| 20261024073036 | `academic_lint_cleanup` | Remove a redundant grading loop variable; linked SQL lint passes |

The SQL files are in `edupulse-app/supabase/migrations/`. Apply new ones in order with `supabase db push` or the SQL Editor, then run both advisors.

## Tables (schema `public`)

| Table | Row-level security | Policies | Notes |
| --- | --- | --- | --- |
| `edupulse_ai_documents` | enabled | `documents_owner` (ALL, `authenticated`, own rows only) | Unique per owner and content hash, so the same file is not indexed twice |
| `edupulse_ai_chunks` | enabled | `chunks_owner` (ALL, `authenticated`, own rows only) | `embedding vector(384)`, generated `fts` column |
| `edupulse_workspaces` | enabled | `workspace_read`, `workspace_insert`, `workspace_update` (`authenticated`) | One row per owner; there is no delete policy |
| `edupulse_audit_events` | enabled | `audit_self_insert` (`authenticated`) | Signed-in users can append their own activity; only the system admin overview can read it |
| `edupulse_agent_runs` | enabled | `agent_runs_self_insert` (`authenticated`, own rows under the assigned role) | One row per Pulse or courseware run by a signed-in account: workflow, task, outcome, rule, provider, model, duration, counts and per-agent goal results (OpenTelemetry names). No prompt, answer or document text. No one can read rows directly; only the admin function aggregates them. |

The document and workspace tables held 0 rows at the earlier verification, which is also why the performance advisor reported the search indexes as unused. Audit rows appear as people use the updated application.

## Indexes

| Index | Type | Used for |
| --- | --- | --- |
| `edupulse_chunks_vector_idx` | HNSW, `vector_cosine_ops` | Semantic (vector) search |
| `edupulse_chunks_fts_idx` | GIN on `fts` | Keyword (full-text) search |
| `edupulse_chunks_document_idx` | B-tree on `document_id` | Scoping a search to selected documents; cascading deletes |
| `edupulse_ai_documents_owner_id_content_hash_key` | B-tree, unique | Duplicate upload detection |

## Database functions

| Function | Security | `search_path` | `anon` can run | `authenticated` can run |
| --- | --- | --- | --- | --- |
| `edupulse_hybrid_chunks` | INVOKER | empty | no | yes |
| `edupulse_ingest_document_v2` | INVOKER | empty | no | yes |
| `edupulse_ingest_document` (v0.1, kept for compatibility) | INVOKER | empty | no | yes |
| `edupulse_match_chunks` (v0.1) | INVOKER | empty | no | yes |
| `edupulse_save_workspace` | INVOKER | empty | no | yes |
| `edupulse_admin_overview` | INVOKER wrapper around a gated private function | empty | no | yes, but only the verified Google system admin receives data |
| `edupulse_admin_agent_activity` | INVOKER wrapper around a gated private function | empty | no | yes, but only the verified Google system admin receives data: totals, results per agent, declines by rule and the 30 latest runs by role (never by person) |

AI functions and academic read wrappers run with the caller's rights, so row-level security decides which rows each account can read. The baseline academic command RPCs listed below use SECURITY DEFINER with explicit live-role, ownership and enrollment checks and restricted execute grants. The admin overview uses a private elevated function that checks the live Auth identity, one of the two designated addresses, confirmation/ban status, a linked Google identity and the live admin role before returning a limited account roster and audit records. It does not return either admin's email.

## Extensions in use

`vector` 0.8.2 (pgvector, schema `extensions`), `pgcrypto` 1.3, `uuid-ossp` 1.1, `pg_stat_statements` 1.11, `supabase_vault` 0.3.1.

## Advisors (2026-10-04)

* **Security:** leaked-password protection is disabled in the Auth project settings. The new admin migration introduced no other advisor findings.
* **Performance:** the audit actor foreign key has its own index. Existing informational unused-index notices remain for the empty document search tables.

## Authentication and keys

* Users sign in with Supabase Auth: email and password for provisioned Dean, Associate Dean, Instructor and Student accounts; Google for the system admin. The five roles (`admin`, `dean`, `associate_dean`, `instructor`, `student`) are read from `app_metadata.role`, which users cannot edit themselves.
* An account with no role, or any other value, is refused (`403 ROLE_NOT_ASSIGNED`), both by the API and at sign-in.
* `admin` is accepted only for the two explicitly designated accounts with a linked Google identity. Either account can switch among all five views while retaining admin identity and a persistent Admin control. Other accounts cannot switch views.
* The initial 2026-10-04 setup created one email account per academic role (Dean, Associate Dean, Instructor, Student), each using a role-named login ID and a password the owner chose. Each was verified by signing in to the live API under its own role. The login IDs and passwords are held by the owner and are never stored in this repository. `edupulse-app/scripts/provision-roles.mjs` only creates new accounts with random passwords; it does not reset existing ones.
* The browser uses the **publishable** key (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). The AI API verifies the user's JWT and queries the database **as that user**, so row-level security applies. The `admin-accounts` Edge Function uses server-only admin credentials after verifying the caller's live Google admin identity to create email users and change their roles. No secret key is sent to the browser.
* The system console probes Supabase identity, Google provider configuration, the admin audit query and the Pulse API. EduPulse activity events record success or failure for instrumented app actions. Supabase Auth audit database storage is enabled for Auth events, though native Auth rows may arrive with a delay. Client-recorded events are operational signals rather than a tamper-proof security log.

## Workspace save repair, 7 November 2026

Migration `20261107050829_safe_workspace_roster_refresh` replaces only the existing private roster-refresh function. A signed hosted canary reproduced HTTP 503/`WORKSPACE_UNAVAILABLE`; direct RPCs using both publishable and owner-authorized legacy compatibility keys returned SQLSTATE `21000`, "UPDATE requires a WHERE clause". The `authenticator` role preloads `safeupdate`, while earlier Management-API seed transactions did not run through that connection configuration. The offending block-summary update had no outer condition.

The replacement computes ordered block summaries and updates matched course IDs only when the stored summary differs. It preserves shared imported assignment behavior, instructor-selected enrollments, empty-block cleanup, role checks and existing private execution restrictions. No safety extension is disabled, and no new elevated endpoint or grant is introduced. A regression checks reassignment, withdrawn students, stale summaries, unchanged-row avoidance and denied direct authenticated execution.

After application, the production API passed checked-save, publication, enrolled-material access, private-key exclusion, scored submission, retry idempotency and role isolation with six synthetic Auth accounts. Cleanup removes their notices/events first and students before instructors, respecting retained foreign keys; all six accounts and synthetic activity were deleted. The follow-up aggregate read still reports 288 real enrollments, 96 instructor items, 2,286 official profiles and zero publications, attempts or opens. The owner explicitly authorized the temporary legacy-key audit because CLI modern-secret output was redacted. No production credential was replaced. [Validation](../versions/2026-11-07-it-course-seed/validation/results.md#hosted-role-check-status) separates this signed test from UI fixtures and actual student work.

## Dashboard pages to capture for the report

The connector cannot take screenshots of the Supabase dashboard. If the report needs them, capture these pages manually:

1. *Database → Migrations* (the versions above).
2. *Database → Tables* with RLS shown as enabled.
3. *Authentication → Policies* for the four tables.
4. *Database → Functions* (academic invoker functions and the gated admin overview).
5. *Authentication → Audit Logs* (database storage enabled).
6. *Advisors → Security Advisor* (leaked-password protection setting).

The fourth migration, `20261024073036_academic_lint_cleanup.sql`, removes a redundant outer loop variable found by the hosted PL/pgSQL linter. It preserves scoring and permissions.

## Applied baseline workflow migrations (28 October 2026)

Applied `20261028130000_baseline_workflows.sql`, `20261028130100_assessment_workflows.sql`, `20261028130200_delivery_notices.sql` and `20261028130300_offline_review_requests.sql`, in order, to EduPulse System (`xyziepdkdvvuhgkymooo`) on 28 October 2026 before the matching code push. Linked migration history confirms all four versions. Live catalog checks confirm RLS on all four new tables, no anonymous reads or direct authenticated writes, empty function search paths and inaccessible private helpers. The security advisor reports six intentionally authenticated, role-checked SECURITY DEFINER RPCs and the existing leaked-password-protection warning. These elevated commands enforce live account roles, ownership and enrollment internally; their execute grants are deliberate. No advisor ERROR was reported. Record counts remained unchanged: two workspaces, three courses and zero publications, enrollments, attempts or access rows. No real-data conversion or automatic promotion of earlier private intake is performed. See [workflow contracts](README.md#baseline-workflows-28-october-2026), [ADR-002](decisions/002-feature-preservation-baseline.md) and the [release validation](../versions/2026-10-28-baseline-workflows/validation/results.md).

The first baseline migration also backfills the new read-model metadata from existing saved syllabi. No instructor resave is needed for the saved station, outline and reference links to appear. Private import history is not automatically promoted to shared intake; workspace revisions, approval files and assessment marks are preserved.

The 28 October performance advisor reports three `auth_rls_initplan` WARN findings on the course, enrollment and publication read policies, with no ERROR. Repeated Auth-function evaluation remains a documented scaling optimization.


## Component actions and workspace controls, 28 October 2026

Selected-field and section proposals are clipped against the captured editor baseline before preview and application, then use the existing validated workspace save path. No database schema, API action, RLS policy, provider credential or deployment configuration changes are required. File drops use the existing bounded reader; a drop only attaches. The healthy workspace strip is removed; recovery remains visible on save/conflict errors and backup is in Settings Data & Privacy. See [the local implementation record](../versions/2026-10-28-component-actions/README.md) for scope and validation limits.

## Backend content harness, 29 October 2026

This local change retains the existing database schema, owner RLS, workspace revision protocol and hosted request budget. No migration, credential setup, environment change or deployment was performed. Live generation/save validation uses an isolated local database; it does not certify hosted sessions. See the [audit and validation record](../versions/2026-10-29-backend-harness/validation/results.md).


## Official student directory, 2 November 2026

The additive `20261102074226_student_directory` migration stores official identity and grouping independently from course enrollment. `GET /api/ai?action=students` returns 50 authorized profiles per page, with bounded name/student-number search and exact year, department and program filters. Authenticated instructors and academic management can read the directory; students can read only their own profile. Anonymous reads and direct authenticated writes are denied. Trusted administrative provisioning creates confirmed student Auth accounts and matching directory rows; service keys stay outside the browser and repository.

Instructors use **Student Monitoring → Students → Choose students**, then confirm a course/block roster through the existing revision-checked workspace save. An account alone grants no published-material access. Enrollment matches the verified account email; syllabus approval, publication review, release timing and course ownership checks remain in force. Profile display metadata is not authorization data. See [the manual](../system-manual/16-student-directory/README.md) and [release validation](../versions/2026-11-02-student-directory/validation/results.md).

## Dashboard and Pulse completion, 3 November 2026

The pending account dashboards use the original role components with authorized academic records and the owner workspace. Sample/orphaned courseware is excluded from instructor counts; released activities and unanswered assessments with future deadlines populate student upcoming work. Empty records remain empty.

Named dashboard requests retain their target role. Either designated, Google-verified admin can switch views; a conversational correction uses preceding navigation history and does not invoke a model. AcademicSession is keyed by account and assigned base role. Its records are masked and reloaded when the selected view changes, so the surrounding owner chat survives. A real account or assigned-role change still resets the session. Backend identity, RLS, course ownership and confirmation remain authoritative.

The direct Anthropic Messages adapter returns bounded error categories for API credits, model access, context size and output limits. Anthropic HTTP 400 credit-balance errors no longer become a generic text/JSON incompatibility warning. Private provider bodies and saved keys are not returned. No database migration, provider credential replacement or billing change is included. See [the completion release](../versions/2026-11-03-claude-completion/README.md) and [Manual 17](../system-manual/17-pulse-navigation-and-provider-recovery/README.md).

Claude workspace selection uses the existing encrypted account-bound connection cookie and fixed Anthropic endpoints. Workspace discovery is read-only and never selects a billing workspace automatically; no database migration, shared provider secret or environment change is required. See the [completion release](../versions/2026-11-03-claude-completion/README.md).

## Account provider storage, 7 November 2026

Migration `20261107073514_account_provider_connections.sql` adds `edupulse_provider_connections`: owner FK, provider, authenticated ciphertext, connection revision, active flag and timestamp. Owner RLS applies to all authenticated operations; anon has no privileges. The invoker RPC serializes per-account selection, preserves inactive providers and uses a unique active-provider index. Disconnect clears ciphertext and retains only a non-secret inactive marker; revision-matched verification cannot recreate a disconnected key. The existing server encryption secret must remain stable. A synthetic hosted transaction confirmed owner isolation/selection/disconnect and rolled back all test records. No student, enrollment, publication, attempt or score table is changed. [ADR-004](decisions/004-account-provider-retention.md) gives the contract.

Follow-up migration `20261107084843_atomic_provider_cookie_import.sql` adds invoker import/disconnect RPCs using the same per-account advisory lock as selection. Import checks for connection history inside the transaction; a request that began before a disconnect cannot overwrite its marker. Local storage uses the equivalent transaction boundary.

## Voice and limit recovery, 7 November 2026

This update changes no schema or role policy. Final voice text is sent through the existing authenticated chat/tool and conversation-storage paths. Raw microphone audio is handled by the browser speech service, not uploaded to Supabase. Language/mode/playback preferences are non-sensitive device settings scoped to the account/view; listening is never resumed automatically on reload. Existing encrypted provider retention and explicit disconnect behavior are preserved. [Release validation](../versions/2026-11-07-voice-and-quota/validation/results.md).

## Instructor membership decisions ? 7 November 2026

The owner-authorized **Student Monitoring → Students** workflow saves additions, block changes and removals through the existing owner workspace revision check. `enrollmentOverrides` records per-course/email removal or block decisions. Migration `20261107131810_instructor_roster_overrides.sql` adds private workspace/enrollment triggers so confirmed removals survive both projection and direct institutional imports. It changes neither official profiles nor retained attempts. The capacity guard serializes with the existing institutional-import lock and enforces 35 members per course block. The follow-up validation migration bounds and validates decisions before any workspace projection, including direct workspace RPC callers. Private trigger functions have fixed empty search paths and no direct authenticated/anonymous execution grants. No raw enrollment-write privilege is introduced.

Academic cache invalidation contains no records or credentials. Server identity/RLS still supplies each read; student scope, management read-only score boundaries and instructor course ownership are retained. The automatic scheduler never repeats business commands. See [Manual 21](../system-manual/21-automatic-records-and-course-rosters/README.md) and the [release evidence](../versions/2026-11-07-automatic-records-and-course-rosters/validation/results.md).

## Conditional workspace read, 8 November 2026

The workspace read can name the revision a client already holds. The server then selects only `revision,updated_at` from `edupulse_workspaces` (under the same owner RLS as a full read) and answers `unchanged` without the JSONB document when they match. No migration, policy or grant changes, and the revision-checked save is untouched. A stale or missing `known` simply returns the document. The shortcut is only for the signed-in owner's own workspace: when the system admin has selected an account, the workspace is always read in full through the audited `edupulse_support_action` function, never from the admin's own row.

## Account support and shared agent handoffs (8 November 2026)

Migration `20261108055904_pulse_support_context.sql` adds `edupulse_support_events`, `edupulse_agent_memory`, a private live-owner/account validator, and the public **security invoker** RPC `edupulse_support_action`. Every operation rechecks the actual admin's live role, designated address and Google identity and the subject's current role, confirmation, active directory state and ban status. Search uses bound parameters and paginated literal matching, not dynamic SQL.

`X-EduPulse-Subject` is a selection hint, not authorization. The application still authenticates the real admin Bearer token. Only explicit academic/workspace/context paths adopt a selected subject. The RPC temporarily installs claims from the stored account, runs ordinary RLS reads and existing business functions, and restores claims on success and exception. It is deliberately not a security-definer data gateway. Auth sessions, passwords, refresh tokens and private provider credentials are never minted or transferred. Enter, leave and academic/workspace changes record the real actor and subject. The browser uses a separate support workspace journal and invalidates stale responses when selection changes. Ordinary navigation audits retain the real admin actor.

Student **open** in support mode verifies the same released publication but does not insert a material-access event. Assessment starts, submissions and appeals are denied in support mode; the frontend offers read-only questions. Other confirmed changes retain their existing role and ownership rules. The selected account cannot silently elevate permissions or expose Associate Dean scores. Account credential/profile changes require returning to the real admin account.

Agent memory contains a concise completed reply/outcome, executed agent/stage status labels and source IDs/titles/links, never hidden reasoning. Owner/thread foreign keys and RLS isolate it; a subject ID further isolates account support contexts. All agents share the existing LangGraph run state and receive relevant saved handoffs as untrusted, possibly stale data, not authority. Automatic memory disables read/write; deleting the conversation cascades; recall uses at most three recent handoffs from 30 days, and writes prune recent history per thread/subject. Private user preferences and transcript recall use their existing account-owned tables. Nothing creates a shared pool of private student data.

`authorizedAccountContext` loads accessible academic records and relevant workspace syllabus status as cited evidence. Account read failures are explicit and never become invented zeroes. Ordinary academic reads use stable primary-key pagination in 500-row pages, failing rather than silently reporting partial data at the capacity boundary. Public factual questions can browse without a keyword; explicit source-only scope and no-web instructions still apply. Private account identifiers and rosters are not sent to public search. Memory and account context remain separate from model/provider authorization.

The native support/delivery test and rolled-back hosted canary verify draft hiding, actual publication notices, student RLS, private answer keys, persisted student access/attempts, instructor readback, support audit attribution and claim restoration. Hosted memory rows persist for the owner and stay hidden from the selected learner. No real enrollment, grade, approval, release or student attempt was altered by the canary. The application plugin did not have access to this project; linked Supabase CLI validation was used. Security advisors remain at the same seven pre-existing warnings.


Named-person questions first check registered profiles under existing directory permissions. Replies include only accessible name, student number, year, department and program, with bounded matching lists; they do not publish account credentials or search the Internet using retrieved private record content. Course-context replies include the recorded instructor name. A public-person question with no authorized directory match can continue to public research without claiming an EduPulse account exists.

Explicit source-only requests skip live account/directory enrichment, preserving the user-selected evidence boundary. Reusable preferences remain untrusted conversation context and cannot authorize an operation.

The server and on-device paths call the same `prepareChatContext` and `contextualDeps` helpers. On-device preflight uses `chat-context` with the verified principal/subject, then local inference receives the same authorized account evidence, memory and public-search guard. `chat-memory` stores bounded, explicitly client-reported outcomes under owner/thread/subject RLS; it cannot change academic records or approve an action. Offline local conversation continues with a clear online-context limitation. Account evidence has its own source origin and is not labelled as an uploaded library document or assigned an invented reranker score.

## System Search, 9 November 2026

`server/systemLookup.ts` handles simple `chat` and on-device `chat-context` requests before loading a provider. Role policy runs first. It reuses authorized academic, workspace and directory helpers; no service-role client, new schema or grant is added. The admin keeps their own private library while selected-account academic reads retain the existing invoker RPC and RLS.

`server/rag/keyword.ts` uses the existing chunk full-text index and parent-document RLS through the authenticated client. Local PGlite queries bind owner and selected document IDs. Candidates are bounded to 100 and reranked with deterministic keyword/edit matching; neither indexing-model refresh nor embedding/generation runs during lookup. Directory queries progressively try the supplied name, useful tokens and short prefixes, return at most eight sufficiently close profiles, and state candidate truncation. Numeric identifiers stay exact. Failures do not mean zero records.

Directory and private-keyword fetches compose caller cancellation with the existing per-read deadline. Simple requests have a bounded 60-per-minute in-process read budget and a 25-second signal; this is not a new durable distributed rate-limit claim. Completed server replies retain existing scoped handoffs and agent-run logging. Lookup does not publish materials, record student activity or change enrollment. Generation and detailed reasoning keep provider behavior and confirmation.

The inference graph now searches before its optional web stage. Keyless web fallback uses Wikipedia only and never sends retrieved private content. Explicit broader/current web requests can fall through to the existing provider research path after no relevant local match, preserving its native search capabilities and billing behavior. PageImages metadata supplies freely licensed thumbnails from verified `thumb.wikimedia.org` or `upload.wikimedia.org` origins, plus a file-attribution URL. React validates the same origins for saved responses, lazy-loads reserved-size images and retains source links on failure. A missing image is not synthesized. Public results remain suggestions distinct from authorized account records.

When both searches miss a general public explanation, the existing connected model remains available; a no-provider session retains the deterministic missing-result reply. Private failures, name uncertainty and source-only misses do not authorize invented facts. On-device preflight returns the same fallback separately so a loaded local model can continue while an unloaded one can still display the search result. The Node HTTP adapter retains and forwards the hosted operator deadline through its request controller until cleanup, preserving cancellation across asynchronous Request handling. Native socket tests cover dispatched work and incomplete body intake.

## Named staff test accounts, 9 November 2026

Nine confirmed named Auth accounts supplement the retained role-only logins: Ginard S. Guaki (Dean), Myriell Nginsayan (Associate Dean), Marielle Angela Fianza-Buya and six recovered staff members (Instructors). Their app-only surname login IDs are listed in [Manual 25](../system-manual/25-staff-test-accounts/README.md). Roles use trusted `app_metadata.role`; display names use `user_metadata.full_name`. No qualification, course load or ownership is inferred from prototype sample data.

`node scripts/provision-staff.mjs` is a read-only preflight by default. Supply the exact EduPulse `SUPABASE_URL` and a revealed `SUPABASE_SECRET_KEY` beginning `sb_secret_`. `--apply --credentials-file <absolute-private-path-outside-repository>` creates missing accounts only. The journal is opened exclusively with restrictive permissions, flushed before requests, and retained on ambiguous failures. Reruns never reset existing passwords; name/role/confirmation conflicts stop before writes. Existing workspaces, legacy staff identities and student records are preserved.

The CLI API-key listing can provide a redacted secret that receives HTTP 401. Authorized tooling must retrieve the actual existing value using the [Management API key endpoint with `reveal=true`](https://supabase.com/docs/reference/api/v1-get-project-api-key), requiring secret-read access. Keep the value in process memory or private environment configuration. Do not log raw key-list responses or substitute a legacy key. This operation used the existing modern secret without rotation. See the [hosted validation](../versions/2026-11-09-named-staff/validation/results.md).

## Outline-driven courseware save contract (9 November 2026)

No schema or RLS change is required. The AI endpoint returns one validated planned part identified by `stepKey`; it does not mutate workspace records. The existing revision-checked workspace commit receives the complete assembled week once, rejects stale syllabus/drafts and preserves manual, checked and published content. Admin support retains owner-bound credentials/library retrieval and effective-subject authoring authorization. Student publication, access, attempts and score rules remain unchanged. The native API/database test proves failed later generation does not increment the saved revision and completed content survives a new read; it does not claim a hosted paid-model run. See [validation](../versions/2026-11-09-outline-driven-courseware/validation/results.md).

## Manual cache refresh (9 November 2026)

No database or RLS migration is introduced. Initial identity reads and local confirmed-mutation readbacks still use the existing authorized API. Focus, reconnect and timers do not replace client snapshots; other-tab invalidation is only a notice. Manual refresh retains revision checks and never replays a business command. New account/support identities cannot inherit the prior view cache. [Validation](../versions/2026-11-09-cached-workspaces/validation/results.md) distinguishes controlled browser evidence from hosted database results.

## Oversight presentation and coverage (9 November 2026)

No migration, RPC, RLS or write operation changes. The combined view consumes the same authorized course, enrollment and publication projection; course identity remains the database ID rather than a deduplicated course code. Client teaching-week coverage counts released publications only within planned teaching rows. Native aggregation tests cover duplicate codes, inactive/future publications and unplanned weeks. Browser role tests retain Dean read-only performance, Dean-only offline correction review and Associate Dean score/access exclusion. [Validation](../versions/2026-11-09-combined-oversight/validation/results.md) does not claim a new hosted account canary.

## Private retained source archive, 9 November 2026

Applied `20261109100000_retained_syllabus_sources.sql` and `20261109101500_source_archive_grants.sql` to the linked EduPulse project. The new `edupulse_source_archives` table stores original base64 bytes, extraction, bibliographic association, final URL, SHA-256, saved time and truncation warnings. Owner/reference/hash uniqueness deduplicates unchanged copies; author/year/edition metadata changes create a new citation association. Owner/reference/time indexing serves manifest reads without transferring document text or bytes. Local development has the equivalent isolated PGlite store.

RLS requires `auth.uid() = owner_id` and trusted instructor/admin app metadata. Authenticated privileges are explicitly limited to SELECT, INSERT and DELETE: UPDATE and TRUNCATE defaults are revoked; anon has no privileges. There is no update policy. A per-owner transaction lock in the insert trigger enforces 200 versions, with 2 MB originals and 150,000 searchable characters per version. No existing student, enrollment, publication, grade or workspace table is changed. The application uses its existing publishable-key/user-JWT client; no service-role credential is added.

The hosted SQL canary inserted a synthetic source through authenticated RLS, verified owner access, other-account and student denial, update/truncate/anon denial, then rolled back. It left no source or learner activity behind. CLI security advisors reported no source-archive finding. Native tests independently cover PDF read/hash/version reuse, scoped HTTP access and immutable database policies. [Validation](../versions/2026-11-09-retained-syllabus-sources/validation/results.md) distinguishes these checks from controlled UI captures.

## Learner publication metadata guard

`20261110033603_protect_learner_publication_metadata.sql` enforces the learner DTO at insert/update and cleans earlier rows without recomputing source versions. The private trigger is security-invoker, has an empty search path and no direct authenticated/anonymous execute grant. Teacher review metadata remains in the original workspace; private assessment keys and learner attempts are unchanged. The hosted project applied this migration before seeded releases. See [validation](../versions/2026-11-10-learner-publication-metadata/validation/results.md).

## Timed assessment roster labels

`20261111093735_assessment_student_labels.sql` restores missing attempt email labels using authoritative account IDs. The private insert trigger has an empty search path, no public/anonymous/authenticated execute privilege and no new table-write grant. Only display metadata is backfilled; answers, scores, marking state, publication versions and pipeline provenance remain intact. Existing student/instructor/Dean/Associate Dean RLS continues to govern reads. See [radar validation](../versions/2026-11-11-assessment-radar/validation/results.md).

## Two designated Google admins, 11 November 2026

Migration `20261111114904_second_google_admin.sql` replaces the single-address private gate with the two owner-designated addresses and routes the private admin overview/support lookup through it. A live assigned admin role, confirmed email, non-banned account and linked Google identity are all required. Existing invoker wrappers, resource RLS, support audit attribution and prohibition on student activity in support mode remain intact. No new table, public elevated function or write grant is added. Admin emails remain masked in the account overview.

The institutional admin was pre-registered through Auth with no password and no email notification, using the owner's explicit one-account compatibility-key authorization. It remains unable to use privileged RPCs until Google links its verified identity on first sign-in. This registration does not alter the matching registered learner's separate account, submissions or enrollment. The two protected accounts use distinct UUIDs; caches, provider credentials and navigation hints stay bound to those UUIDs.

## Instructor syllabus sharing · 12 November 2026

Applied migration `20261111201348_instructor_syllabus_sharing`. The participant table is RLS-enabled with SELECT only for actual sender/recipient instructors or admins; recipient-hidden rows remain visible only to their sender. Direct writes are denied. A public SECURITY INVOKER wrapper calls the private delivery command, which verifies the live role, owned saved workspace revision and exact confirmed/unbanned instructor recipient. The snapshot whitelists syllabus fields and public bibliography/weekly links, excluding approved bytes, private source copies, history and courseware. Limits are 100 outgoing shares and 250 KB per snapshot. Lists transfer summaries, fetch snapshots on authorized open and reject more than 1,000 visible rows explicitly.

The existing audited support gateway handles target-RLS list/open/command operations and restores the actual actor's claims. `scripts/check-syllabus-sharing.sql` passed on the linked database and rolled back synthetic Auth users, workspace, deliveries and audits. Native checks cover stale revisions, wrong owners/roles, recipient hiding, sender withdrawal and safe fields. Workspace deletion reuses the projector's withdrawal behavior and retains attempts. These checks do not claim a signed-in production HTTP flow or email delivery.

## Combined instructor monitoring · 12 November 2026

Applied `20261111222305_instructor_monitoring_progress.sql` and `20261112025514_instructor_monitoring_session_policy.sql`. Enrollment suspension and bounded roster-year overrides flow through the existing revision-checked workspace projector and serialized import guard. A set-based guard requires saved suspension before membership removal. Student publication/course policies and action functions require active membership. Retained attempts, accounts and progress survive membership removal.

Material progress is keyed by publication, student and source version. The invoker wrapper calls a private sequential/idempotent command that verifies the real student, current released material, enrollment, explicit open and server-derived section bounds. Direct writes are denied. Reads retain owner/self/Dean RLS, and selected-account support cannot fabricate student activity. Assessment-session student labels are backfilled from account IDs; historical provenance remains unknown rather than invented. One SELECT policy preserves student-self, owning instructor/admin and Dean session reads without overlapping permissive policies.

The hosted rollback canary passed after both migrations; separate checks found zero remaining canary users/courses. Warning-level advisors across all categories changed from 13 to 11 with no new finding keys or errors. Existing warnings remain. See [release validation](../versions/2026-11-12-instructor-monitoring/validation/results.md) for application, browser and visual-review evidence and its limits.

## Student assigned-course labels · 12 November 2026

Migration `20261112035656_student_assigned_course_metadata.sql` adds a bounded student-self whitelist for assigned course labels, including units and curriculum period. It uses a private empty-search-path helper with a real student-role check and account/enrollment join, plus an invoker public wrapper. Direct draft/courseware policies are unchanged. The existing selected-subject support gateway reuses this lookup. Owner-authorized population uses revision saves and academic import RPCs, with aggregate audit attribution and private before-state backups. [Validation](../versions/2026-11-12-curriculum-population/validation/results.md).
