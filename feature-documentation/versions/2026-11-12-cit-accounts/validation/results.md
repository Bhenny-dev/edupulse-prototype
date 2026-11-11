# Validation

Hosted retirement preserved the student/profile records, marked non-CIT profiles inactive, banned those accounts and the four exact legacy emails, and revoked their sessions. Readback confirms 417 active CIT profiles, zero active other-department profiles and zero active legacy accounts. The receipt contains aggregate counts only. A private backup is outside Git.

Migration 20261111214500 excludes banned accounts from admin overview and active management totals. Its dry run included only this migration; it was applied through the linked CLI. A separate already-applied syllabus-sharing migration was supplied to the temporary CLI history directory only and was not modified or republished.

The final targeted browser run passed all 58 desktop/phone checks for account support, selected-account reload restoration, stale subjectless hint retirement, Pulse role navigation, roster editing, cached reads and explicit refresh. The earlier run still used the superseded own-role assertion; the replacement test confirms that this hint returns to System Admin without entering any account.

Nine affected screenshot scenarios passed. Every changed image was opened and its current hash recorded in the visual review ledger. Documentation links, route coverage, capture provenance and freshness passed `npm run docs:check`. These use controlled synthetic UI transports rather than claiming a new live Google-admin sign-in.

A fresh linked SQL read confirmed 417 active CIT students, zero active other-department students, zero active legacy placeholders, and the installed admin-overview ban filter. No test accounts, submissions or enrollments were created.

`npm run verify` passed: documentation, lint, both type checks, verified local model files, all 304 native tests, production build and deployment asset/API checks. Build warnings concern existing chunk composition; the gate completed successfully.

Production deployment for `adb6278` is READY. A real registered instructor signed in with the existing password and modern publishable key. The production student endpoint returned 417 total CIT profiles (50 paginated rows); explicitly requesting another department still returned the same CIT-only scope. The probe signed out its own session and performed no academic writes or inference. See [aggregate production receipt](production.json).
