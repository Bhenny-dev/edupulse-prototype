# Validation — 12 November 2026

Completed in EduPulse on `main`, based on `937a1233`. Earlier course-outline and instructor syllabus/sharing changes remain present.

## Application checks

- `npm run verify` passed: documentation gate, lint, frontend/server TypeScript checks, pinned model assets, **322/322 native tests**, production build and deployment checks. Existing lint, chunk-size and ineffective dynamic-import warnings remain; no compilation/test failures remain.
- The initial full verification stopped at two implicit-any diagnostics in the new browser test helper. Giving the helper its Playwright `Page` type corrected these; the complete verification rerun passed.
- The broad controlled browser run selected 146 desktop/phone cases: 136 passed and 10 failed. The failures exposed a denied-role navigation label change, stale Dean/pipeline test locators and two transient mobile renderer failures. The navigation ordering and locators were corrected. The final selected regression rerun passed **62/62**, including all ten prior failures, monitoring, sharing, role restoration, pipeline provenance and responsive layout.
- After the final narrow table-header wrapping adjustment, all **12/12 monitoring desktop/phone cases** passed again. These exercise course/block scoping, true zero scores, current-version averages, reading breakdowns, roster save failure/retry, suspend-before-remove, class-locked registration, nested reload, no replayed reading/open writes, keyboard exit and 320/768/1440-pixel layout.
- The final SQL policy consolidation then passed both monitoring native tests against the migration chain, including one session SELECT policy, student-self reads, owner reads and outsider denial. This database-only correction did not change the captured UI.

## Hosted database

Linked Supabase CLI 2.105.0 applied `20261111222305_instructor_monitoring_progress.sql` and the follow-up `20261112025514_instructor_monitoring_session_policy.sql`. The application connector did not expose this project, so the linked CLI was used.

`scripts/check-instructor-monitoring.sql` passed after both migrations. The transaction creates fictional accounts/course/publications, verifies persisted section confirmations, rejects skipping sections, keeps duplicate confirmations idempotent, checks assessment-session labels, rejects active removal and same-payload suspension/removal, blocks suspended activity, isolates another instructor, applies selected-subject support RLS, denies support-generated learner progress, and retains scores/progress after membership removal. Its transaction rolls back all test accounts, academic records and audits. A separate query confirmed both migration records and the progress table exist, with **zero canary users and zero canary courses remaining**.

All-category warning-level database advisors changed from **13 to 11 WARN findings**, with **no new finding keys and no ERROR findings**. The two removed findings concern auth initialization in course/publication read policies. The intermediate overlapping-session-policy warning was corrected by combining equivalent read conditions into one policy. Remaining pre-existing warnings are recorded in [evidence.json](evidence.json); no clean-database claim is made. An initial parallel CLI read hit a Windows telemetry-file rename error; serial execution succeeded without changing telemetry settings.

## Visual evidence

The affected capture suites passed. Final major run: [14 passed](../../../capture-runs/2026-11-12T02-30-13-877Z-9cc5fc80.json); final phone table refresh: [1 passed](../../../capture-runs/2026-11-12T02-40-12-140Z-e193dae6.json). Other targeted walkthrough/shared-interface runs are retained under `capture-runs/`, including failed attempts and subsequent successful corrections.

All 74 changed/new PNGs were opened and reviewed by **Codex agent** at their final SHA256 hashes in [image-review.json](../../../capture-runs/image-review.json). This is agent visual review, not human approval. The manual, walkthrough, backend documentation and reproducible capture scenarios were updated together. Removed instructor Performance screenshots were deleted.

Browser fixtures and screenshots use fictional accounts and controlled transports. Local SQL and the hosted rollback test separately verify persistence/security behavior. These checks do not assert a signed-in production HTTP journey, independent student achievement, paid inference or comprehension. Reading completion is the student's explicit sequential acknowledgment, not a measurement of comprehension or time spent.
