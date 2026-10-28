# Restoration disposition — 28 October 2026

The [80-item loss register](feature-loss-register.md) describes the state found on 27 October. This follow-up records the implemented account UI restoration. A retained preview screen or success toast is not counted as a persistent backend workflow. See the [35 illustrated account scenes](../../system-walkthrough/09-restored-role-pages/README.md) and [task guide](../../system-manual/13-restored-account-sections/README.md).

| Audit IDs | Current disposition |
| --- | --- |
| DASH-01, DASH-02, DASH-04 | Restored role-specific dashboards and real navigation actions for Instructor, Student, Dean and Associate Dean. System Admin retains its separate console. |
| DASH-03, DASH-07, DASH-08 | Saved-work lifecycle/review sections and task links restored. No fake onboarding completion metric. Private instructor syllabi/drafts come from the owner workspace. |
| DASH-05, DASH-11 | Block/student course summaries and enrolled publication navigation restored. Unavailable schedules and external material sources are not invented. |
| DASH-06, DASH-12 | Raw assessment radar and dated attempt history restored, with explicit sample-free insufficient-data states. |
| DASH-09, DASH-10 | Recent publications and actual unopened/unanswered learning cards restored. General event history and due-date reminders need event/scheduling data. |
| DASH-13, DASH-14 | Course readiness, delivery counts and faculty account summaries restored. Shared projection exposes active status, not private signatory lifecycle history. |
| PERF-01, PERF-02, PERF-06 | Assessment radar, student detail dialog and saved-attempt history restored. Radar is labelled by assessment; historical topic mastery is unavailable. |
| PERF-03, PERF-04, PERF-14, PERF-15, PERF-16 | Performance tabs, course/block/date filters, raw score sheet and table CSV exports restored. Student sees only own results; Dean read-only results; Associate Dean denied. |
| PERF-05, PERF-07, PERF-08, PERF-09, PERF-10 | Topic-to-question mapping remains absent. By Topic discloses the gap and shows assessment/week coverage; colored scoring matrix shows actual raw scores. Mastered/pass/fail topic classifications are not claimed. |
| PERF-11, PERF-12 | Adjustable raw-score review threshold and unanswered assessment gaps restored. Persistent event acknowledgment and topic mastery alerts remain unavailable. |
| PERF-13 | Material/week status and first-open tables restored. An open does not prove completion of the reading or every teaching week. |
| MON-01, MON-02, MON-04, MON-05, MON-06, MON-09 | Monitoring tabs, course/section/date filtering, scoring/access matrices, class average/submission charts and working scoring-sheet alias restored. |
| MON-03 | Saved attempt versus No attempt is explicit. Missed/overdue classification requires due dates and remains unavailable. |
| MON-07, MON-08 | Material-open chart and table CSV restored. Counts do not claim engagement/time-on-task; outbound reminder delivery is not implemented. |
| MON-10, MON-13, MON-14 | Four oversight views, publication counts/week coverage, block summaries and confirmed class lists restored. Private draft counts remain instructor-only. |
| MON-11, MON-12 | Expandable instructor/course delivery/readiness details restored; shared records do not expose the full private status timeline or qualifications. |
| MON-15 | Actual inactive-syllabus/missing-roster/no-publication notices restored. Scheduled late delivery and expected-but-unpublished week detection remain unavailable. |
| DATA-01, DATA-02, DATA-03, DATA-04, DATA-05 | Records tabs, three CSV previews, valid/rejected rows, confirmation, real templates and durable private import history restored. Imports save to the existing owner workspace with revision checks; they are not shared institutional assignment/enrollment writes. |
| DATA-06, DATA-07 | Block cards, deduplicated counts, selected-block roster and course counts restored. No capacity/schedule facts are fabricated. |
| DATA-08 | Authorized course identity/status/revision and imported curriculum rows are accessible. A fixed curriculum lookup still exists in the syllabus builder; no college compliance dashboard is claimed. |
| DATA-09, DATA-10, DATA-11, DATA-12 | Course readiness KPIs/table/CSV, course expanders and Instructors view restored. Missing qualifications/specializations are disclosed; matching confirmed imports may supply names. |
| DATA-13 | Assist/Auto assignment is still outside the authenticated command contract. EduSuite owns assignments under the accepted role-boundary decision; old preview proposals were not a working shared assignment service. |
| ASM-01, ASM-02, ASM-04 | Numbered question navigation, answered count, local elapsed timer and saved-result display restored. No deadline/countdown is inferred, and answer keys remain private. |
| ASM-03, ASM-05, ASM-06, ASM-07 | Multi-attempt policy, open-response marking, scheduling/time enforcement and appeals need new backend contracts. Existing one-attempt objective scoring remains enforced. |
| CW-01, CW-02, CW-03 | Student course/week navigation, document and presentation viewers, PDF/print controls restored using existing components. Access is recorded before material display. |
| CW-04, CW-05 | Scheduled publication and complete downstream syllabus-edit invalidation remain missing backend workflows, not silently simulated by restored readers. |
| SHARED-01 | Authenticated feed suppression removed. Notices derive from current authorized records and owned draft status. Read state is keyed by account and role on the device; no scheduled push/email service is claimed. |
| SHARED-02 | Device notification preferences do not imply external delivery. Server notification scheduling remains unavailable. |
| SHARED-03 | Full historical syllabus snapshots/restore remain unavailable; existing recorded status history is retained. Old toast-only restore is not reintroduced. |
| SHARED-04 | Course-aware, researched, reviewed full/section Pulse drafting is implemented in the companion working change. Curriculum reference loading stays separately labelled. |
| SHARED-05 | Explicit knowledge indexing and source context remain; automatic indexing of every lifecycle upload is not implemented. |
| SHARED-06, SHARED-07, SHARED-08, SHARED-09, SHARED-10 | Pre-existing inactive fallback editor/actions, profile-only data export, placeholder help links and old login bookmark are recorded as such. They are not caused by the authenticated page replacements and are not counted as restored services. |

Dark mode now uses a solid body, onboarding surface and primary controls; semantic backgrounds/text shades are defined, muted text is lighter, the top-bar override is scoped, and account charts/tooltips follow theme tokens. Presentation surfaces and preview assessment result/error surfaces also use the corrected palette. Laptop navigation compacts without removing route access. Preview art, animated skeleton feedback and the optional office retain their separate purposes.

No production deployment, real institutional-data migration or hosted authenticated canary rerun is claimed. Existing RLS boundaries remain unchanged. The code restoration uses authorized projection records and adds only bounded private intake to the saved owner workspace.
