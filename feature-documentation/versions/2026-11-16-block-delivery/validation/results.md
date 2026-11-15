# Instructor extracted topics and block delivery

Status: released and verified. Runtime source commit `3647b051513e8715909399b8e24baecd761c07bf` is deployed to production.

The course contains Weeks and topics plus Block sections. Per-block weekly dates/openings and optional closings use Philippine time. Review/check/revision stays in topics. Student availability is enforced in the API and database without changing assessment hashes or scores.

Native checks: `tests/block-delivery.test.ts` covers timezone/week mapping, optional/invalid close, live role/load/outline/revision checks, direct RLS/file denial, student metadata-only future/closed windows, material opens, sequential reading, scored assessment, denied late submission, support actor reads/saves and score/version preservation. Both tests passed locally; the combined affected native suites passed 18 tests. Tests use isolated PGlite fixtures, never real learner activity.

Browser checks and private desktop/phone captures exercise the real interface with controlled authenticated transport. They do not establish hosted login, independent student achievement or an actual teaching calendar. Broad documentation image recapture remains paused in doc-map.json; the capture pipeline gains the new tab/block/calendar scenes.

## Local browser and static checks

Thirty distinct desktop/phone checks passed across `instructor-courses.spec.ts`, `block-delivery.spec.ts`, `student-block-delivery.spec.ts` and `student-learning.spec.ts`. The first schedule run had two ambiguous test selectors; those selectors were scoped to the weekly table and both reruns passed. Covered mandatory openings, optional close, Friday pattern/gapped weeks, saved timezone values, no-write reload, conflict retention, legacy review redirect, protected revisions, checked-only scheduled publishing, fresh explicit student open, closed score-only reader, all-question assessment layout, practice and Admin attribution. Desktop/phone calendar images were opened and reviewed privately. Private logs/screenshots remain under ignored `.data/block-delivery-*`; they are controlled transport evidence, not independent learner records.

`npm run typecheck` passed. Lint passed with existing repository warnings. `git diff --check` passed. `npm run docs:check` reports the owner's existing pause; it was not disabled by this change.

## Linked database

The CLI dry run listed only `20261115220621_block_week_delivery_schedule.sql`; it was applied successfully to the linked EduPulse project. Before-state function/policy definitions and a non-destructive restore script were retained privately. Before/after fingerprints matched for all seven inspected record sets: nine workspaces, 48 projected courses, 4,029 enrollments, 606 institutional records, zero publications, zero attempts and zero material accesses. The new schedule table remains empty until an instructor explicitly saves it; no dates, publications, approval or learner activity were seeded.

A read/denial canary used existing confirmed, unbanned Instructor, Student, Dean and Program Coordinator accounts inside a rolled-back transaction. It verified fresh roles, scoped schedule reads, the student publication DTO and rejection of an unassigned syllabus/block schedule for every role. Positive save/version/time-window/file/scoring/support flows were verified independently in the isolated native database. No claim of a signed-in hosted teaching session is made.


## Database diagnostics and limits

Live guards confirmed RLS enabled, no anon SELECT, no direct authenticated INSERT, empty search paths and zero seeded schedule rows. Warning-level SQL lint was run with `--fail-on error` and exited nonzero for the existing unmodified `edupulse_private.academic_action` legacy submission path: `42P10`, no unique/exclusion constraint matching its ON CONFLICT target. The migration did not change that private function or the attempt constraints. The current UI uses the separately tested timed `edupulse_assessment_command` submission path. The two new public PL/pgSQL functions produced warnings about implicit text-to-jsonb initializers (`[]`); native execution and hosted role/read canaries passed. No new function error was reported. This SQL diagnostic is not represented as a passing check.

## Production release

Git push updated main from `dc026645` to runtime `3647b051`. Vercel's automatic production deployment `dpl_6yqfrt3gY66TNmJD6i2xxj15b4t7` reached READY. The canonical [EduPulse production site](https://edupulse-prototype.vercel.app) resolved to that exact deployment when checked. The Git build ran the unchanged full `npm run verify` gate: lint/typecheck, model assets, **399 tests passed, zero failures/cancellations/skips**, production build, and built-asset/API-routing/serverless-health/public-retrieval checks. Existing chunk/dynamic-import warnings remained advisory.

The new Instructor and student block-window suites then ran against the canonical deployed interface: **12 desktop/phone checks passed**. These used controlled authenticated API transport and did not write to live learner accounts. Live database evidence is the separate linked migration/role canary above; this does not claim an actual Instructor login, live class delivery, paid generation or independent student completion. Source and database permission evidence are kept distinct. The primary local main checkout was fast-forwarded while preserving the unrelated existing `.anchor/session-state.md` and `.gitignore` edits.

Private evidence: `.data/block-delivery-vercel-build.log`, `.data/block-delivery-deployment.json`, `.data/block-delivery-alias.json`, `.data/block-delivery-production-browser.log`, `.data/block-delivery-production-results`, `.data/block-delivery-live/{schema-before,canary,guards,before,after,lint-summary}.json`. Sensitive definitions remain ignored; no tokens or learner records are committed in this report.
