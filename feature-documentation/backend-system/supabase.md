# Supabase configuration

**Project:** EduPulse System (`xyziepdkdvvuhgkymooo`) · **Verified live:** 2026-10-02 through the Supabase connector (read-only queries; nothing was changed). Values below are the database's actual state, not the intended state.

## Migrations applied

| Version | Name | Adds |
| --- | --- | --- |
| 20260913112259 | `connected_ai` | Private AI library: `edupulse_ai_documents`, `edupulse_ai_chunks`, pgvector, owner policies, ingest and match functions |
| 20260915042129 | `persistent_workspace` | `edupulse_workspaces` with revision-checked saves (`edupulse_save_workspace`) |
| 20260915100411 | `workspace_policy_initplan` | Rewrites workspace policies so `auth.uid()` is evaluated once per query |
| 20261001090000 | `agentic_rag` | 384-d MiniLM embeddings, generated full-text column `fts` with a GIN index, `edupulse_ingest_document_v2` (pages, sections, extraction metadata) and `edupulse_hybrid_chunks` (vector + keyword search for the Researchers) |

The SQL files are in `edupulse-app/supabase/migrations/`. Apply new ones in order with `supabase db push` or the SQL Editor, then run both advisors.

## Tables (schema `public`)

| Table | Row-level security | Policies | Notes |
| --- | --- | --- | --- |
| `edupulse_ai_documents` | enabled | `documents_owner` (ALL, `authenticated`, own rows only) | Unique per owner and content hash, so the same file is not indexed twice |
| `edupulse_ai_chunks` | enabled | `chunks_owner` (ALL, `authenticated`, own rows only) | `embedding vector(384)`, generated `fts` column |
| `edupulse_workspaces` | enabled | `workspace_read`, `workspace_insert`, `workspace_update` (`authenticated`) | One row per owner; there is no delete policy |

All three tables held 0 rows at verification: no one had used the hosted private library yet, which is also why the performance advisor reports the search indexes as unused.

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

Because every function runs with the caller's rights, row-level security still decides which rows a user can read or write; the empty `search_path` prevents schema-shadowing attacks.

## Extensions in use

`vector` 0.8.2 (pgvector, schema `extensions`), `pgcrypto` 1.3, `uuid-ossp` 1.1, `pg_stat_statements` 1.11, `supabase_vault` 0.3.1.

## Advisors (2026-10-02)

* **Security:** no findings.
* **Performance:** three *informational* “unused index” notices for the chunk indexes, expected while the tables are empty. Keep them; they serve every hosted search.

## Authentication and keys

* Users sign in with Supabase Auth: email and password for provisioned accounts, Google for the owner admin. The role (`admin`, `instructor` or `student`) is read from the user's `app_metadata.role`, which only an administrator can set.
* An account with no role, or any other value, is refused (`403 ROLE_NOT_ASSIGNED`), both by the API and at sign-in.
* `admin` is accepted only for the owner account signed in through Google. That account can switch its view between admin, instructor and student while keeping its admin identity.
* Prototype accounts are provisioned with `edupulse-app/scripts/provision-roles.mjs`. Their passwords are given to the owner and never stored in the repository.
* The browser uses the **publishable** key (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). The API verifies the user's JWT and queries the database **as that user**, so row-level security applies. The secret key is not used by the application at run time.

## Dashboard pages to capture for the report

The connector cannot take screenshots of the Supabase dashboard. If the report needs them, capture these pages manually:

1. *Database → Migrations* (the four versions above).
2. *Database → Tables* with RLS shown as enabled.
3. *Authentication → Policies* for the three tables.
4. *Database → Functions* (security invoker).
5. *Advisors → Security Advisor* (no issues).
