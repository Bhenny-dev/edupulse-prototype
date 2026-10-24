# Documentation-first engineering audit integration

Date: 24 October 2026 (Asia/Manila). Baseline: `5e7d95638c7abf8f74e85ec96cbf90ae491ed674`. Status: initial integration record, followed by the owner-approved completion pass. The [supplied audit](input-audit.md) is preserved with normalized whitespace as a planning reference; its embedded instructions were evaluated against owner requirements and source evidence.

Initial-pass evaluation: **106 unit/integration tests passed**, **53 browser tests passed / 13 skipped**, **10 capture tests passed / 18 images written and visually reviewed**, clean installation passed and npm audit reported zero vulnerabilities. See [structured results](verification.json) and the [validation record](../../versions/2026-10-24-audit-integration/validation/results.md). Existing lint/bundle warnings remain; authenticated production checks and deployment were not performed.

The [completion record](../2026-10-24-release-completion/README.md) supersedes the initial deferrals below: role scope was confirmed, shared academic records and server scoring were implemented, migrations were applied, and real cloud canaries passed. Final release outcomes are maintained in the validation record.

## Initial findings and disposition

| Finding | Evaluation and integrated change | Evidence / remaining scope |
| --- | --- | --- |
| REL-01 | Confirmed in Vercel build logs and local `npm ci`. Repaired canvas optional-dependency lock entries. Updated PDF.js to 6.4.299, Zod to 4.6.7, Vite and source-map-js within compatible versions after dependency scanning. | [Candidate validation](../../versions/2026-10-24-audit-integration/validation/results.md). Live promotion remains separate. |
| AUTH-01 | Confirmed route/Pulse mismatch. Shared Performance capability aligns route, navigation and Pulse. Associate Dean excluded; Dean keeps existing oversight screens pending a dedicated score-view design. | `AUTH-001`; [ADR-001](../../backend-system/decisions/001-role-and-approval-boundaries.md); denial capture. |
| AUTH-02 | Confirmed broad generation gate. Verified Dean/Associate Dean/student requests now return 403 before model execution, including forged client role fields. Instructor and owner-admin capabilities remain. | `AUTH-002`; no identity impersonation; personal-provider preview drafts retain existing behavior. |
| DATA-01 | Owner-scoped, revision-checked JSONB workspaces are valid prototype persistence. Preserved existing services and RLS. | Existing workspace regression suite. Shared institutional records require provenance, account-pair tests and a staged migration design; no speculative normalization was applied. |
| DATA-02 | Performance sample records were reachable by signed-in users. Isolated this screen to preview personas, labelled the sample source, and added a truthful signed-in unavailable state. | `DATA-001`; instructor/student recaptures. Other sample-backed dashboard/oversight surfaces still require a broader institutional data integration. |
| AI-01 | Confirmed deterministic proposals and Confirm/Cancel/Undo already exist. Preserved them and added access-boundary regression coverage. | `tests/operator.test.ts`, `tests/browser/pulse-actions.spec.ts`. Backend domain commands/idempotency for future shared records remain separate work. |
| AI-02 | Existing LangGraph agents, hybrid retrieval, reranking, citations, Guardian and correction are structured components. Preserved them. | Existing regression suites. No new quality/latency improvement claim; no replacement framework or vector store. |
| SEC-01 | Existing per-instance limits and owner RLS remain. No new cross-user storage was introduced. | Distributed quotas and authenticated account-pair/RLS canaries remain requirements for institutional expansion. |
| UI-01 | Preserved mascot, DOM guidance, keyboard/touch operation and confirmation semantics. | Full desktop/mobile browser suite. Stable target/event registry expansion is deferred until a measured failure or domain change justifies it. |
| DOC-08 | Added per-commit range enforcement, broader source mapping, shared error fixture, per-invocation desktop/mobile/task reports, build/source provenance and image hash/review validation. | `DOC-001`, `DOC-003`; [capture evidence](../../capture-runs/README.md). Unselected suites and production checks are explicitly recorded. |
| OPS-01 | Kept endpoint compatibility and existing service boundaries. Extracted reusable access and documentation-check responsibilities into focused modules. | No server framework migration, new agent harness or speculative table proliferation. Domain extraction should accompany a concrete domain feature. |

## Requirements consistency

DOC-01/02 are recorded in ADR-001. Shared academic navigation grants no score permission. The already confirmed offline signatory chain is now explicit in FR-SYL-08/09. DOC-03/04 are corrected by supersession notices and current five-role/OCR wording in the historical specifications. DOC-05 remains explicit in guides and capture metadata. DOC-06 is addressed by a new deployment reconciliation addendum, preserving earlier release observations. DOC-07 keeps all historical datasets/results unchanged and makes no universal accuracy claim.

The seven-section KCP syllabus, five lifecycle stations, EduSuite source-of-record boundary, no institutional grade calculation, instructor review/publication, owner identity and existing sample capture personas remain intact.

## Acceptance trace

| ID | Source boundary | Automated evidence | Guide / capture |
| --- | --- | --- | --- |
| REL-001 | `package.json`, lockfile, Vercel build logs | Clean install, dependency audit, full verification | Backend Vercel addendum; candidate validation |
| DOC-001 | `scripts/lib/docs-impact.mjs`, `docs-check.mjs`, `doc-map.json` | Temporary Git history proves split-commit failure; exemption and manual-run coverage | Documentation policy |
| DOC-003 | `tests/snapshots/fixtures.ts`, `reporter.ts`, `scripts/lib/docs-captures.mjs` | Page/CSP failure recording, actual mobile suite results, stale-hash rejection | Capture reports and exact-hash visual review |
| AUTH-001 | `src/lib/access.js`, route, layout, operator | Role-matrix unit and desktop/mobile browser tests | Dean/Associate Dean denial scene |
| AUTH-002 | `server/http.ts` | Forged API request matrix with verified-role lookup | ADR-001 and Backend System |
| DATA-001 | `Performance.jsx`, access predicate | Preview/authenticated-data predicate and browser label checks | Instructor/student Performance images |
| SYL-LIFE-001 | Existing syllabus lifecycle | Existing unit/browser suites; manual capture remains dated local evidence | Manual 2; offline process preserved |
| PULSE-ACT-001 | Existing operator/action cards | Unit/browser Confirm/Cancel/Undo coverage | Manual 9 |

This table records traceability, not a claim that every production acceptance gate passed. Latest capture/source IDs and executed suites are machine-recorded under `capture-runs`; deployment SHA and authenticated-production status are recorded separately in candidate validation. No new RAG, OCR corpus or model benchmark was produced by this engineering pass.
