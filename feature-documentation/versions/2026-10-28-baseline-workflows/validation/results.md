# Validation

Local restoration based on `5072b49`, 28 October 2026 (Asia/Manila). **139 unit/integration tests passed; the full desktop/mobile browser suite passed 131 tests with 13 intentional skips.** Documentation and build gates passed. The release preparation additionally applied all four migrations to EduPulse System and checked the combined source with the separate landing commit `952107c`; hosted evidence is recorded below.

## Final gates and scope

| Check | Result |
| --- | --- |
| `npm run verify` | Passed: documentation integrity/freshness and image provenance, lint (warnings only), both TypeScript projects, model assets, 139 unit/integration tests, production build and deployment configuration checks. |
| Full browser suite against captured restoration build | **131 passed, 13 intentionally skipped**, 8.7 minutes. All 144 cases were considered; no retries or weakened role assertions. |
| `npm run docs:check` | Passed after screenshot review; links, screenshots, capture runs, route coverage and freshness. |
| `git diff --check` | Passed. |

The browser run used the full browser test directory, existing desktop/mobile projects and real local API. An ignored temporary Playwright configuration changed the web server to `scripts/serve-preview.mjs`, serving the completed `dist-capture` build from **14:28:19**. Build source digest: `c638e522d866e95b798d39bcf0680ca73412934a5c7afc5cacb75676d2855fe3`. All **33 captured assets** matched their saved SHA-256 manifest after the run.

The owner confirmed another task was changing the public landing page. An intervening default dev-server run encountered that task's temporary missing `landing.css` import and was stopped. Its `Landing.jsx`/`src/components/landing/` edits were preserved. The successful captured-build run certifies this restoration separately; it does not certify the other task's in-progress public-page changes. Build output retains the existing chunk-size/dynamic-import warnings.

## Behavioral and SQL evidence

Real PGlite execution of the additive migrations uses Supabase-style roles and RLS. It creates an active pre-migration workspace and verifies metadata/reference backfill without changing its revision, then checks archival withdrawal without a save failure, shared enrollment, atomic block-cap rejection, scheduled visibility, private answer keys, fixed True/False choices, written marking, mapped topic scores, appeals, duration and attempt limits, legacy bypass denial, offline correction requests and reminder-kind deduplication. The frontend unit checks also cover version withdrawal, missing-versus-zero results, topic aggregation and account-versus-preview guidance.

Browser coverage includes every academic role, the separate admin console, shared intake/loading/block corrections, topic radar/history/heatmap/status, marking and appeals, Previous/Next answer retention, True/False authoring, saved mappings/delivery settings, version restoration, notices/read receipts, Pulse account scope, and existing PDF/provider/conversational workflows. UI transport fixtures are synthetic, not hosted authentication. Academic SQL persistence is tested separately from those fixtures.

Earlier diagnostic runs are retained in local ignored `.data/`: the initial full dev run had 127 passes, 13 skips and two failures; the save-outage assertion now waits for the existing verification read, and profile reload waits for DOM readiness before checking the saved field. A focused 30-pass/two-failure run exposed unstable implicit textarea naming; question-specific accessible names fixed it. The final assessment/mapping/guidance checks passed all six desktop/mobile cases, followed by the complete captured-build pass above. A broad guidance-warning assertion was narrowed to the actual sample-data warning, preserving unrelated session/history warnings.

## Screenshot evidence

The role guide has **50 illustrated account scenes**. Every changed image was opened and checked. Exact path/SHA-256 agent attestations are in [image-review.json](../../../capture-runs/image-review.json); this is agent inspection, not human acceptance.

- [Role/baseline/full-walkthrough capture](../../../capture-runs/2026-10-28T05-37-34-280Z-dede8395.json): 21 passed.
- [Syllabus lifecycle](../../../capture-runs/2026-10-28T05-40-23-643Z-5657a85b.json): 1 passed.
- [Role/baseline polish](../../../capture-runs/2026-10-28T05-42-05-519Z-540369b2.json): 14 passed.
- [Student/mapping recapture](../../../capture-runs/2026-10-28T06-10-31-092Z-d24080f0.json): 4 passed.
- [Final written/True-False/account-guidance scenes](../../../capture-runs/2026-10-28T06-25-46-334Z-13e1c187.json): 3 passed.
- [Final named page target](../../../capture-runs/2026-10-28T06-28-22-136Z-22fc145a.json): 1 passed.

Every listed run passed with unchanged capture source and no reported page/CSP errors. Captures distinguish synthetic account transport from preview personas and real local document input; no synthetic session warning was hidden.

## Deployment limits

All four additive migrations are now applied and the security advisor was rerun. No live provider inference or real institutional-data conversion is certified. Hosted authenticated checks and production deployment results are recorded separately below. Notices are in-app; email/push is not implemented. Loading suggestions use the degree/specialization rule, not a model-accuracy claim. Historical unmapped attempts receive no invented topic scores. Outstanding pre-existing obligations remain in the [audit disposition](../../../session-generated/2026-10-27-feature-presence-audit/restoration-status.md).

A final SQL-only compatibility amendment adds existing-workspace metadata backfill, normalizes object/string reference URLs, and permits archival withdrawal without a failed workspace save. The SQL scenario passed after that amendment; type checks and the complete unit/integration suite were rerun afterward. The captured browser assets are unchanged by this migration-only amendment.

## Hosted migration and combined release preparation

On 28 October 2026, the existing authenticated Supabase CLI verified project **EduPulse System**, ref `xyziepdkdvvuhgkymooo`. The connector was scoped to other projects, so linked CLI operations were used. A dry run listed exactly the four intended migrations; `supabase db push --linked --yes` applied all four successfully and linked migration history matched afterward.

Before/after aggregate counts were identical: **2 workspaces, 3 courses, 0 publications, 0 enrollments, 0 attempts, 0 material-access rows**. Live catalog assertions passed for four RLS-enabled tables, no anonymous reads or direct authenticated writes, six deliberately exposed authenticated RPCs, six inaccessible private helpers and empty function search paths. The security advisor reported six intentional `authenticated_security_definer_function_executable` warnings for role-checked command/directory RPCs and the pre-existing `auth_leaked_password_protection` warning; no ERROR. These are recorded findings, not an assertion of a warning-free advisor.

A synthetic hosted-auth canary was attempted using the existing CLI key lookup. That CLI returns a masked secret key and temporary account creation returned **401**. No canary accounts or academic rows were created; no usable local admin secret was available. Hosted authenticated role execution therefore remains **unverified** for this release. No existing account credentials were changed, and no secrets were written to tracked files.

The isolated combined release worktree is based on the separate landing/motion commit `952107c`. Its full `npm run verify` passed, including **139 unit/integration tests**, documentation, both TypeScript projects, model checks, production build and serverless deployment checks. Build warnings remain non-failing. The final complete combined desktop/mobile browser run passed **135 tests with 13 intentional skips**, all 148 cases considered, in **9.2 minutes**, without retries or source changes. Earlier screenshots remain the reviewed restoration capture evidence; the separate landing commit contains its own affected-scene captures and motion checks.

The performance advisor also reported three `auth_rls_initplan` WARN findings on `course_read`, `enrollment_read` and `publication_read`: repeated Auth-function evaluation can be optimized at larger scale. No performance ERROR was reported. These remain documented optimization work.

The first combined browser run considered all 148 cases: **134 passed, 13 intentional skips, one mobile grading failure**. Trace inspection showed scrolling/element stability and sticky-header interception before the click; no save request was issued. The unchanged grading test then passed **three consecutive mobile repetitions** (including saved-score reload assertions), without forced clicks, reduced-motion overrides or relaxed assertions. The final complete combined rerun passed **135 tests with 13 intentional skips** in **9.2 minutes**, without retries or source changes.

The separate landing documentation follow-up `26679c2` changes documentation only and is preserved ahead of this restoration. GitHub Actions for the landing commit could not start because the account is locked by a billing issue; local gates provide the execution evidence, and the restoration production build is checked after push.
