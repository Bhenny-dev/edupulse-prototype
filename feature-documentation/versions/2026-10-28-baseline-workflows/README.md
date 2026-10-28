# Restore the approved pre-makeover feature contract

Released as `e976ae3` on 28 October 2026 (Asia/Manila), based on committed role restoration `5072b49` and the separately committed landing/motion change `952107c`. The owner accepted `5e7d956` as the preservation baseline with later permission, offline-approval, navigation and solid-dark corrections retained. [ADR-002](../../backend-system/decisions/002-feature-preservation-baseline.md) records the scope.

This change connects confirmed shared course/load/roster imports, loading proposals, topic-mapped scores, mastery radar/heatmap/history, written-response marking, timed/retake policies, appeals, scheduled release, in-app reminders/read receipts, offline correction requests, dashboard detail and editable syllabus versions to saved operations. Existing provider/RAG services remain; no runtime dependency is added.

The four additive migrations in `edupulse-app/supabase/migrations/20261028130000_baseline_workflows.sql` through `20261028130300_offline_review_requests.sql` were applied in order to EduPulse System on 28 October 2026, before the source push. Linked history, RLS, grants, counts and advisors were verified separately from synthetic screenshots. Local SQL tests execute the real migrations and role policies. Real institutional-data conversion is not claimed.

- [Task guide](../../system-manual/13-restored-account-sections/README.md)
- [Role screenshots](../../system-walkthrough/09-restored-role-pages/README.md)
- [Updated audit disposition](../../session-generated/2026-10-27-feature-presence-audit/restoration-status.md)
- [Validation](validation/results.md)

Combined release validation passed 139 unit/integration and 135 full desktop/mobile browser tests (13 intentional skips). The final browser run completed in 9.2 minutes without retries. The separate landing/motion change and its documentation follow-up are preserved; the earlier isolated restoration run is retained as historical evidence. Fifty illustrated account scenes and exact-hash image reviews accompany this change. See the validation record for scope, earlier failure corrections and hosted deployment prerequisites.

Pushed to `main` and verified Ready at [EduPulse production](https://edupulse-prototype.vercel.app). The remote build also passed all 139 tests and deployment checks. GitHub Actions is blocked by account billing; hosted authenticated role canaries remain unverified. See [validation](validation/results.md#production-release) for evidence and limits.
