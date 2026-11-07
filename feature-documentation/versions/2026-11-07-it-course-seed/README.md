# IT course seed and conversation completion, 7 November 2026

The existing instructor workspace contains **288 official-directory enrollments in nine blocks** and **96 saved draft items**: 93 new items and three preserved Networking items. Programming has a complete proposed 18-week outline, retains its earlier version, and returns to Drafted. Networking's active syllabus and approval bytes are unchanged.

The owner chose actual activity only and delegated the year decision. First-year BSIT is assigned to Programming and second-year BSIT to Networking using the existing catalog. The conflicting year label and older academic year in the retained PDF are recorded in [Manual 18](../../system-manual/18-it-course-seed/README.md).

The seed uses the existing revision-save RPC, authenticated instructor database role and projection triggers in one transaction. A rollback preflight passed before application. No accounts, passwords, student activity, scores, approvals or publications are seeded. No application frontend source changed in this task. The separate committed landing changes are included in the requested push and retain their own release record.

The [review pack](../../session-generated/2026-11-07-it-course-seed/teaching-pack.md) contains original AI-authored teaching text, exercises and questions. This is real saved content, not connected-provider inference or student completion. New items require instructor review; Programming requires the existing offline approval process.

The unfinished hosted role check exposed the cloud-save failure. An additive private-function migration fixes roster-summary updates rejected by the hosted database safety extension. Six temporary signed accounts then passed the production publication, access, scoring and role-boundary flow and were cleaned up. Registered students and their activity were preserved. No application frontend source changed.

See [validation and task disposition](validation/results.md). Source `bd82d2e` is pushed and production is Ready; local and Vercel verification passed 206 tests. The post-deployment signed role check passed and cleaned up. GitHub Actions could not start because the account is locked for billing. The linked deployment receipt identifies the exact release and limits.
