# Supabase configuration

## Private Pulse history and memory — 25 October 2026

Migration `20261024163740_pulse_conversations.sql` adds `edupulse_pulse_threads`, `edupulse_pulse_messages`, `edupulse_pulse_memories`, and `edupulse_pulse_preferences`. All use owner RLS with `(select auth.uid())`; anonymous grants are revoked. Messages are immutable (select/insert/delete only), idempotent by UUID, ordered by a database sequence, and linked to the owner/thread with a composite foreign key. Source-derived memories use a matching owner/message foreign key and cascade when the message or account is deleted.

Follow-up migration `20261024213422_pulse_history_privileges.sql` explicitly revokes Supabase default table privileges before granting only the supported operations. Hosted validation exposed that an additive GRANT alone left UPDATE available; the correction was applied and immutable transcript checks then passed.

Indexes cover owner/thread ordering and full-text transcript search. `edupulse_recall_pulse` is security-invoker, restricts the caller and optionally excludes the active thread, ranks bounded topic matches and returns at most five excerpts. A security-invoker trigger serializes account capacity checks: 100 threads, 500 messages per thread, 100 memories. The local PGlite counterpart uses matching owner filters and limits. Latest-chat reads return at most 100 messages; stored older messages remain available to recall. History does not bypass academic role/course RLS. A full 500-message thread returns `CONVERSATION_FULL`; the client retains the unsaved batch and starts a continuation thread. Account-wide capacity errors remain visible until old history is deleted.

The migration was applied through the explicitly linked CLI after local PostgreSQL RLS, quota, provenance and immutability tests passed. The connector still rejects advisor access for this project; this is not an advisor pass. See the [agent-tools release validation](../versions/2026-10-25-pulse-agent-tools/validation/results.md) for hosted verification.

## October 24 compatible academic projection

The owner accepted the written role scope in [ADR-001](decisions/001-role-and-approval-boundaries.md). Four additive migrations introduce `edupulse_courses`, `edupulse_enrollments`, `edupulse_publications`, `edupulse_attempts`, `edupulse_material_access`, private assessment keys and shared AI request leases. The migrations were applied to the existing EduPulse project through the explicitly linked CLI after local SQL/RLS regression tests; the connector lacked permission for this project.

The owner-scoped JSONB workspace and its revision check remain the authoring source. A narrow trigger projects instructor/admin-owned confirmed data; existing workspaces can explicitly run **Sync my workspace**. There is no mass backfill or replacement of historical evidence. Active approved syllabi and a previously saved checked draft with unchanged content/type/week/syllabus are required for publication. Unpublishing revokes student publication access; attempts/material-open evidence remains retained. The original workspace still supports export, and the authenticated view can **Export authorized records** as JSON.

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

AI functions and academic read wrappers run with the caller's rights, so row-level security decides which rows each account can read. The baseline academic command RPCs listed below use SECURITY DEFINER with explicit live-role, ownership and enrollment checks and restricted execute grants. The admin overview uses a private elevated function that checks the live Auth identity, the owner address, the Google identity and the admin role before returning a limited account roster and audit records. It does not return the owner's email.

## Extensions in use

`vector` 0.8.2 (pgvector, schema `extensions`), `pgcrypto` 1.3, `uuid-ossp` 1.1, `pg_stat_statements` 1.11, `supabase_vault` 0.3.1.

## Advisors (2026-10-04)

* **Security:** leaked-password protection is disabled in the Auth project settings. The new admin migration introduced no other advisor findings.
* **Performance:** the audit actor foreign key has its own index. Existing informational unused-index notices remain for the empty document search tables.

## Authentication and keys

* Users sign in with Supabase Auth: email and password for provisioned Dean, Associate Dean, Instructor and Student accounts; Google for the system admin. The five roles (`admin`, `dean`, `associate_dean`, `instructor`, `student`) are read from `app_metadata.role`, which users cannot edit themselves.
* An account with no role, or any other value, is refused (`403 ROLE_NOT_ASSIGNED`), both by the API and at sign-in.
* `admin` is accepted only for the owner account with a linked Google identity. That account can switch among all five views while retaining admin identity and a persistent Admin control. Other accounts cannot switch views.
* Since 2026-10-04 there is one email account per academic role (Dean, Associate Dean, Instructor, Student), each using a role-named login ID and a password the owner chose. Each was verified by signing in to the live API under its own role. The login IDs and passwords are held by the owner and are never stored in this repository. `edupulse-app/scripts/provision-roles.mjs` only creates new accounts with random passwords; it does not reset existing ones.
* The browser uses the **publishable** key (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). The AI API verifies the user's JWT and queries the database **as that user**, so row-level security applies. The `admin-accounts` Edge Function uses server-only admin credentials after verifying the caller's live Google admin identity to create email users and change their roles. No secret key is sent to the browser.
* The system console probes Supabase identity, Google provider configuration, the admin audit query and the Pulse API. EduPulse activity events record success or failure for instrumented app actions. Supabase Auth audit database storage is enabled for Auth events, though native Auth rows may arrive with a delay. Client-recorded events are operational signals rather than a tamper-proof security log.

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
