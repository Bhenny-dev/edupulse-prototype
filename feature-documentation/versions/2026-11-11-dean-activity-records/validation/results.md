# Validation - Dean activity records

The isolated worktree preserves concurrent provider/library changes for their author. This release includes only Dean activity pages and their documentation.

- Native model, guidance and view-state checks cover deduplication, explicit/conflicting years, current-version activity, withdrawn memberships and scoped bounded hints. The year-enrichment test checks 401 visible addresses in bounded 200/200/1 batches, omitted records and failed directory reads.
- Desktop/phone browser regression: **70 passed**, across `dean-records`, `role-restoration`, `baseline-workflows` and `admin-reload`. Coverage includes card navigation, read-only tabs, full CSV/formula protection, mobile table values, restored/withdrawn dialogs, legacy aliases, Associate Dean intake and support-subject access changes. These use controlled account/API transports. A full unrelated browser-suite run did not complete locally because of resource limits; it is not reported as a pass.
- Targeted desktop/phone captures passed. The new manual contains 34 reviewed images; affected existing Dean, Associate Dean, oversight and shared component scenes were recaptured. Exact image hashes, source digests, agent-review attestations and run results are in `capture-runs/`.
- A read-only authenticated Dean preflight used the existing saved academic projection and the new directory-year helper against the hosted database: **23 course offerings, 15 course codes, 9 faculty, 417 students, 1,677 course memberships, 23 blocks and recorded years 1–4**. This is predeployment evidence, not a claim that the new API was already deployed. The aggregate receipt is [authorized-read-preflight.json](authorized-read-preflight.json).

`npm run verify` passed: **304 native tests passed, zero failed/cancelled**, documentation integrity, lint, frontend/server type checks, pinned model checks, production build and deployment packaging/API smoke. The stale Dean course-loading assertion was updated to the new tab, with Associate Dean and new page destinations checked separately. An initial deadline test timeout passed both in isolation and in the complete rerun. Existing bundle-size/dynamic-import warnings remain.

Production publication and authenticated browser checks follow the feature commit; this record makes no predeployment production claim.

Screenshots use synthetic records with example.invalid addresses or explicit preview samples. They do not prove hosted authentication, real assessment completion or new publication. No student account, enrollment, score or provider credential is changed by this feature.
