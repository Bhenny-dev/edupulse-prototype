# Validation — curriculum allocation

## Persisted records

Owner-authorized allocation now contains **417 active CIT students**, **14 blocks**, **60 curriculum courses**, **239 instructor/course/block load rows** and **7,375 course memberships**. The maximum block size is **35**; no active student lacks a course load. All seven active instructors have assigned blocks. Both semesters and the recorded summer terms are included; all-period units are not a single-semester workload. Existing approval files and courseware were retained. Missing syllabi remain drafts.

A second rollback-validated correction reconciled **1,389 legacy `-TEST` block overrides** with the actual directory allocation, retaining suspension/exclusion decisions and historical activity provenance. Its committed readback confirms exactly 14 displayed block labels. The earlier initial readback exposed 28 labels and was not treated as final success.

The allocation uses existing revision-checked workspace saves and course/roster/load import RPCs. Original snapshots, plans, SQL and diagnostic logs stay in ignored private storage. A first oversized Management API request was rejected before writing; the script now appends new syllabus data inside the database instead of retransmitting approved-file bytes. A bounded audit-detail correction was rollback-tested before the actual allocation. Metadata and syllabus prerequisites follow the existing recorded curriculum; the operation does not claim new verified faculty qualifications or a new EduSuite export.

## Access and UI

Migration `20261112035656_student_assigned_course_metadata.sql` is applied. A native PGlite migration-chain check verifies the student-self whitelist, instructor denial and existing roster/progress boundaries. A separate hosted rollback-only role read checked all **417 active students** and **seven active instructors**, plus Dean, Associate Dean and admin boundaries. Every student has units in their assigned-course metadata, another student's enrollment remains hidden, each instructor sees owned classes, and Associate Dean score/progress restrictions remain. These are database role checks, not a claim that every person signed into production.

`npm run verify` passed: documentation, lint, both TypeScript checks, pinned model checks, **332 native tests**, production build and deployment/API asset checks. Existing lint and chunk-composition warnings remain. The targeted browser run passed **36 desktop/phone checks**, including assigned units/pending release, course/roster views, reload preservation, combined monitoring and student reading commands. These use fictional controlled transports rather than real learner actions.

The Dean desktop/phone capture suites and student reader suite passed. All **24 changed PNGs** were opened and reviewed by **Codex agent** at their current hashes. This is not human approval. Native overflow remains for genuinely wide phone tables. System Manual, Walkthrough, backend docs, capture aliases and fixtures were updated together. All-category warning-level database advisors remain at **11 existing warnings**, with no added finding keys or errors.

## Remaining delivery and activity work

The population alone does not complete Weeks 1–5 generation/release. Sixteen active instructor syllabi have written first-five-week scopes; 46 additional owned syllabi remain drafts. Those drafts need authoring, readable references, instructor review and genuine offline signatories before activation. Only the admin has a stored connected provider; instructor accounts do not inherit private credentials. Local Ollama was unavailable. A production-browser attempt could not load its browser request-header policy, so no live browser generation is claimed.

The final readback has **zero learner opens, assessment attempts and reading confirmations**. No values were invented to populate monitoring graphs. Actual students must read and answer for those representations to become genuine activity. Approved-file attestations and human review were not fabricated. See [aggregate evidence](evidence.json).

## First production release

Commit `d1cb7fe2` is READY on the intended production project. Real password sign-in and production academic reads passed for all **nine named staff accounts** across instructor, Dean and Associate Dean roles. Each probe signed out its own session. No academic write or inference ran. This validates the deployed API and actual staff rosters separately from fictional UI captures. [Production receipt](production.json).

The follow-up dashboard correction includes pending assignments in enrolled totals and shows explicit pending/suspended statuses and curriculum units. `npm run verify` passed again with **333/333 native tests**, both type checks, build and deployment checks; the role browser rerun passed **16/16**. The desktop/phone capture cases passed and all three final dashboard images were opened and hash-reviewed as Codex agent. One overly anchored capture selection matched no tests; the corrected selections passed. A phone reminder-header wrap correction was recaptured after review.

Final consistency read: maximum **one block per student**, **zero wrong-year memberships** and **zero `-TEST` block memberships**. The prepared private Weeks 1–5 queue contains **80 course-weeks / 605 planned generation steps** for active syllabi, plus the **46 draft-syllabus approval blockers**. Preparing inputs did not invoke a model, verify reference contents or publish anything. The requested admin browser connection remains pending.
