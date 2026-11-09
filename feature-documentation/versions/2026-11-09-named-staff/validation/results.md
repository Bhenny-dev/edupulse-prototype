# Validation

- Actual hosted provisioning: 9 new confirmed Auth identities were created in EduPulse System (`xyziepdkdvvuhgkymooo`): 1 Dean, 1 Associate Dean and 7 instructors. Names and role metadata were read back through the Auth admin API.
- All 9 signed in with their unique private temporary passwords, returned their expected full name and trusted app-metadata role, and received HTTP 200 from the production academic endpoint. Sessions were signed out afterward. Dean and Associate Dean responses list all 7 named instructors plus the retained placeholder; Myriell is not classified as an instructor.
- A read-only, rolled-back transaction used the actual owner account's claims with the existing Google-owner checks and authenticated role. Each of 9 exact login searches returned exactly one matching named account through the real support-picker RPC. This is a database authorization check, not an owner Google browser sign-in claim.
- Actual hosted rerun: all 9 accounts were unchanged. Existing passwords, IDs and roles were not reset.
- Before/after snapshots match: 7 courses, 288 enrollments, 0 publications, 0 assessment attempts, 0 material-access rows, and both existing workspace owners/revisions/timestamps unchanged. No student progress or course assignment is fabricated.
- Modern credential diagnosis: the CLI list's secret value was rejected with HTTP 401. Retrieving the existing secret through the documented Management API `reveal=true` path succeeded. No legacy key was used and no project key was rotated or created. Secret values and temporary passwords were never logged or committed.
- Native provisioning tests: 4 passed (dry run/correct roles, private unique credentials and idempotency, conflict/file-overwrite prevention, and recovery after ambiguous creation).
- Documentation captures: 2 cases passed, 5 images opened and reviewed; controlled staff-picker transports use the current manifest and synthetic IDs. These images do not claim live Auth, private Google access or actual course enrollment.

- Browser role-picker checks: 2 passed (desktop and mobile), verifying the surname search and the corrected Instructor, Associate Dean and Dean mappings.
- Final release gate: `npm run verify` passed with `VERCEL=1`, including all 243 native tests, lint, frontend/server typechecks, pinned models, production build and serverless deployment checks. `npm run docs:check` separately passed before the hosted-mode run.
- [Capture receipt](../../../capture-runs/2026-11-08T23-59-19-617Z-08f9da14.json) records the 2 successful capture cases and 5 reviewed image hashes. The capture source stayed unchanged during the run.

Staff Auth and academic API checks were performed against the existing production application; this change adds operational tooling, records and documentation without changing frontend application code.
