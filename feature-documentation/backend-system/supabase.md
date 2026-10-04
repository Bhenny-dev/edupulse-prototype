# Supabase configuration

**Project:** EduPulse System (`xyziepdkdvvuhgkymooo`) · **Verified live:** 2026-10-04 through the Supabase connector and hosted application.

## Migrations applied

| Version | Name | Adds |
| --- | --- | --- |
| 20260913112259 | `connected_ai` | Private AI library: `edupulse_ai_documents`, `edupulse_ai_chunks`, pgvector, owner policies, ingest and match functions |
| 20260915042129 | `persistent_workspace` | `edupulse_workspaces` with revision-checked saves (`edupulse_save_workspace`) |
| 20260915100411 | `workspace_policy_initplan` | Rewrites workspace policies so `auth.uid()` is evaluated once per query |
| 20261001090000 | `agentic_rag` | 384-d MiniLM embeddings, generated full-text column `fts` with a GIN index, `edupulse_ingest_document_v2` (pages, sections, extraction metadata) and `edupulse_hybrid_chunks` (vector + keyword search for the Researchers) |
| 20261004054136 | `system_admin_audit_roles` | Five distinct roles, academic workspace access, admin-only account and audit overview, activity audit table |
| 20261004073000 | `agent_runs_tracking` | **Written, not yet applied** (needs the owner’s approval; run `npx supabase db push --linked` in `edupulse-app`). Adds `edupulse_agent_runs`, the gated `edupulse_admin_agent_activity` and the helper `edupulse_private.is_system_admin()` |

The SQL files are in `edupulse-app/supabase/migrations/`. Apply new ones in order with `supabase db push` or the SQL Editor, then run both advisors.

## Tables (schema `public`)

| Table | Row-level security | Policies | Notes |
| --- | --- | --- | --- |
| `edupulse_ai_documents` | enabled | `documents_owner` (ALL, `authenticated`, own rows only) | Unique per owner and content hash, so the same file is not indexed twice |
| `edupulse_ai_chunks` | enabled | `chunks_owner` (ALL, `authenticated`, own rows only) | `embedding vector(384)`, generated `fts` column |
| `edupulse_workspaces` | enabled | `workspace_read`, `workspace_insert`, `workspace_update` (`authenticated`) | One row per owner; there is no delete policy |
| `edupulse_audit_events` | enabled | `audit_self_insert` (`authenticated`) | Signed-in users can append their own activity; only the system admin overview can read it |
| `edupulse_agent_runs` (pending migration) | enabled | `agent_runs_self_insert` (`authenticated`, own rows under the assigned role) | One row per Pulse or courseware run by a signed-in account: workflow, task, outcome, rule, provider, model, duration, counts and per-agent goal results (OpenTelemetry names). No prompt, answer or document text. No one can read rows directly; only the admin function aggregates them. |

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
| `edupulse_admin_agent_activity` (pending migration) | INVOKER wrapper around a gated private function | empty | no | yes, but only the verified Google system admin receives data: totals, results per agent, declines by rule and the 30 latest runs by role (never by person) |

The academic and AI functions run with the caller's rights, so row-level security decides which rows each account can read or write. The admin overview uses a private elevated function that checks the live Auth identity, the owner address, the Google identity and the admin role before returning a limited account roster and audit records. It does not return the owner's email.

## Extensions in use

`vector` 0.8.2 (pgvector, schema `extensions`), `pgcrypto` 1.3, `uuid-ossp` 1.1, `pg_stat_statements` 1.11, `supabase_vault` 0.3.1.

## Advisors (2026-10-04)

* **Security:** leaked-password protection is disabled in the Auth project settings. The new admin migration introduced no other advisor findings.
* **Performance:** the audit actor foreign key has its own index. Existing informational unused-index notices remain for the empty document search tables.

## Authentication and keys

* Users sign in with Supabase Auth: email and password for provisioned Dean, Associate Dean, Instructor and Student accounts; Google for the system admin. The five roles (`admin`, `dean`, `associate_dean`, `instructor`, `student`) are read from `app_metadata.role`, which users cannot edit themselves.
* An account with no role, or any other value, is refused (`403 ROLE_NOT_ASSIGNED`), both by the API and at sign-in.
* `admin` is accepted only for the owner account with a linked Google identity. That account can switch among all five views while retaining admin identity and a persistent Admin control. Other accounts cannot switch views.
* Prototype accounts are provisioned with `edupulse-app/scripts/provision-roles.mjs`. Their passwords are given to the owner and never stored in the repository.
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
