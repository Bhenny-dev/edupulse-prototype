# Instructor extracted topics and block delivery

Status: implementation and release checks in progress. Runtime commit/deployment evidence will be appended after the source is pushed.

The course contains Weeks and topics plus Block sections. Per-block weekly dates/openings and optional closings use Philippine time. Review/check/revision stays in topics. Student availability is enforced in the API and database without changing assessment hashes or scores.

Native checks: `tests/block-delivery.test.ts` covers timezone/week mapping, optional/invalid close, live role/load/outline/revision checks, direct RLS/file denial, student metadata-only future/closed windows, material opens, sequential reading, scored assessment, denied late submission, support actor reads/saves and score/version preservation. Both tests passed locally; the combined affected native suites passed 18 tests. Tests use isolated PGlite fixtures, never real learner activity.

Browser checks and private desktop/phone captures exercise the real interface with controlled authenticated transport. They do not establish hosted login, independent student achievement or an actual teaching calendar. Broad documentation image recapture remains paused in doc-map.json; the capture pipeline gains the new tab/block/calendar scenes.

## Local browser and static checks

Thirty distinct desktop/phone checks passed across `instructor-courses.spec.ts`, `block-delivery.spec.ts`, `student-block-delivery.spec.ts` and `student-learning.spec.ts`. The first schedule run had two ambiguous test selectors; those selectors were scoped to the weekly table and both reruns passed. Covered mandatory openings, optional close, Friday pattern/gapped weeks, saved timezone values, no-write reload, conflict retention, legacy review redirect, protected revisions, checked-only scheduled publishing, fresh explicit student open, closed score-only reader, all-question assessment layout, practice and Admin attribution. Desktop/phone calendar images were opened and reviewed privately. Private logs/screenshots remain under ignored `.data/block-delivery-*`; they are controlled transport evidence, not independent learner records.

`npm run typecheck` passed. Lint passed with existing repository warnings. `git diff --check` passed. `npm run docs:check` reports the owner's existing pause; it was not disabled by this change.

## Linked database

The CLI dry run listed only `20261115220621_block_week_delivery_schedule.sql`; it was applied successfully to the linked EduPulse project. Before-state function/policy definitions and a non-destructive restore script were retained privately. Before/after fingerprints matched for all seven inspected record sets: nine workspaces, 48 projected courses, 4,029 enrollments, 606 institutional records, zero publications, zero attempts and zero material accesses. The new schedule table remains empty until an instructor explicitly saves it; no dates, publications, approval or learner activity were seeded.

A read/denial canary used existing confirmed, unbanned Instructor, Student, Dean and Program Coordinator accounts inside a rolled-back transaction. It verified fresh roles, scoped schedule reads, the student publication DTO and rejection of an unassigned syllabus/block schedule for every role. Positive save/version/time-window/file/scoring/support flows were verified independently in the isolated native database. No claim of a signed-in hosted teaching session is made.
