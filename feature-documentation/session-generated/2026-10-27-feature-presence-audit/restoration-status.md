# Restoration disposition - 28 October 2026

The [80-item loss register](feature-loss-register.md) preserves the findings at scan time. The owner subsequently confirmed the pre-makeover `5e7d956` baseline with the later role, offline approval and solid-dark corrections. [ADR-002](../../backend-system/decisions/002-feature-preservation-baseline.md) records that decision. This follow-up describes the current local implementation; the four additive migrations have not been applied to the hosted database in this restoration pass.

See the [50 illustrated account scenes](../../system-walkthrough/09-restored-role-pages/README.md), [task guide](../../system-manual/13-restored-account-sections/README.md) and [validation record](../../versions/2026-10-28-baseline-workflows/validation/results.md). Screens use synthetic transport fixtures; real SQL tests separately exercise role and persistence contracts.

| Audit IDs | Current disposition |
| --- | --- |
| DASH-01, DASH-02, DASH-04 | Distinct Instructor, Student, Dean and Associate Dean dashboards with working role-scoped navigation. System Admin keeps its separate console. |
| DASH-03, DASH-07, DASH-08 | Four saved-work onboarding steps, per-course syllabus stations and instructor review queue. Completion derives from saved records. |
| DASH-05, DASH-11 | Block, schedule, adviser/year and enrollment summaries use confirmed shared imports; learning-material sources link to actual publications. Missing fields remain explicit. |
| DASH-06, DASH-12 | Assessment radar/history and mapped-topic charts derive from saved graded attempts. Insufficient data is shown rather than invented. |
| DASH-09, DASH-10 | Persisted academic activity, recent publications, release/deadline activities and unopened/unanswered reminders. No email/push claim. |
| DASH-13, DASH-14 | Shared syllabus stations, planned-versus-covered teaching weeks, course readiness and faculty summaries. Private draft contents stay with their author. |
| PERF-01, PERF-02, PERF-06 | Mapped-topic mastery radar/history, assessment radar/history and student drill-down. Unmapped historical attempts remain unavailable for topic analytics. |
| PERF-03, PERF-04, PERF-14, PERF-15, PERF-16 | Role-specific tabs, course/block/date filters, score sheets and CSV. Student sees own results, Dean read-only results, Associate Dean no scores. |
| PERF-05, PERF-07, PERF-08, PERF-09, PERF-10 | Explicit question-to-approved-topic mapping, mastered/needs-review counters and status, student/topic heatmap, overview bars and threshold counts. These describe raw assessment mastery, not institutional grades. |
| PERF-11, PERF-12 | Adjustable cutoff, unanswered gaps, topic alerts and account-workspace acknowledgment. Pending written responses and unmapped questions are excluded from graded topic aggregates. |
| PERF-13 | Published material/week status and recorded first opens. An open alone does not establish reading completion or time on task. |
| MON-01, MON-02, MON-04, MON-05, MON-06, MON-09 | Scoring/access tabs and matrices, course/section/date filters, class-average/submission charts and scoring-sheet alias. |
| MON-03 | Completed, pending marking, unanswered and missed-after-due states use saved results and delivery dates. |
| MON-07, MON-08 | Material-open rates and CSV; confirmed reminders create persistent in-app notices for incomplete/unopened recipients, deduplicated per publication/student/day. |
| MON-10, MON-13, MON-14 | Oversight tabs, syllabus readiness, teaching-week coverage, publication and block/roster details. |
| MON-11, MON-12 | Shared station counts by instructor and expandable course lifecycle/readiness details. Dean correction requests persist to the author notice feed; signatories still act offline. |
| MON-15 | Missing syllabus/roster/publication alerts use current shared records. Planned-versus-covered teaching weeks are shown separately; student missed-after-due states use saved dates in the scoring matrix. Calendar-driven not-routed/late-delivery events remain an outstanding requirement, not a completed service. |
| DATA-01, DATA-02, DATA-03, DATA-04, DATA-05 | Three CSV intake kinds with accepted/rejected preview, confirmation, templates and shared import event history. New confirmations persist shared records and project matching enrollments; old private intake remains exportable as legacy history. |
| DATA-06, DATA-07 | Block cards/rosters, course details, schedule/adviser fields and confirmed block corrections; shared imports enforce at most 35 active students per block. |
| DATA-08 | Shared imported course catalog and curriculum filters/details; identity fields in the syllabus builder retain the later locked-field correction. No automatic regulatory-compliance certification. |
| DATA-09, DATA-10, DATA-11, DATA-12 | Loading/readiness KPIs and detail, instructors and imported degree/specialization. Unknown qualifications remain labelled. |
| DATA-13 | Manual, highest-priority assist and semester-wide proposals; recorded master's degree ranks before specialization match. Each proposal can be overridden and must be confirmed before the shared load changes. Server requires released imported course and a provisioned instructor. |
| ASM-01, ASM-02, ASM-04 | Server-started duration/countdown, one-question Previous/Next and numbered navigation, answered progress and saved response/result review. Student reads never reveal private answer keys. |
| ASM-03, ASM-05, ASM-06, ASM-07 | Saved 1-3 attempt policy, multiple-choice, true/false and written questions, instructor per-question marks/reason, release/deadline enforcement, pending-marking state and persistent student appeals. Retakes require available policy and a completed review. |
| CW-01, CW-02, CW-03 | Student course/week navigation and existing document/presentation/PDF readers. Access records are saved before material display. |
| CW-04, CW-05 | Future-release visibility enforced in RLS and assessment commands; revising/restoring a syllabus withdraws published affected courseware and flags changed weeks for review. Approval must be obtained again before activation. |
| SHARED-01, SHARED-02 | Publication, marking, appeal, correction and instructor-reminder notices have account-owned read receipts. Release notices are hidden until released and while inactive. Current-record reminders additionally keep device read state. Preferences do not imply email/push delivery. |
| SHARED-03 | Up to ten editable syllabus snapshots, view and restore-as-draft; approval/file-derived state is cleared and changed courseware is invalidated. Original approved bytes remain only on the current record. |
| SHARED-04 | Course-aware researched full/section Pulse drafting from the earlier correction is preserved. Curriculum reference loading stays separately labelled. |
| SHARED-05 | Explicit indexing and retained page-source context remain; automatic vector indexing of every lifecycle upload is still not implemented. This is recorded as an outstanding requirement, not removed from scope. |
| SHARED-06, SHARED-07, SHARED-08, SHARED-09, SHARED-10 | Pre-existing inactive fallback editor/actions, profile-only export, placeholder help links and old login bookmark remain recorded obligations. They predate the authenticated page replacements; this pass does not claim those services complete. |

Dark mode retains solid app surfaces and primary controls, themed charts/tooltips and visible muted text. Page tabs and primary desktop/mobile navigation remain; duplicate sidebars stay removed. Optional office art and presentation content have their separate purposes.

The four additive migrations were applied to EduPulse System on 28 October 2026 before the matching source push; linked history, catalog permissions, record counts and advisors were checked. Local SQL/browser evidence and hosted release checks are reported separately in the baseline release validation. No live institutional-data conversion is claimed.
