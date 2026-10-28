# Detailed feature-loss register

Reviewed 27 October 2026 against the frontend baseline `bd54add`, the pre-backend application `4486468`, the academic-backend change `5afbd0c`, and current working source based on `87bea6b`. This expands the earlier high-level audit into individual screens, controls and behavior. No feature below is considered restored merely because its source file still exists.

The [reproducible source scan](scan-ui.mjs) inventories **56 page/component JSX/TSX files** and includes all **186 functional requirements** from `REQUIREMENTS.md` for cross-reference. Its [complete inventory](ui-control-inventory.md) and [machine-readable evidence](ui-control-inventory.json) record chart types, headings, labels, buttons, line locations and authenticated replacement conditions. Dynamic JSX, indirect handlers and data authorization require manual inspection; this is not a runtime certification of all 186 requirements.

## Main regression and affected roles

Commit `5afbd0c` introduced early returns to `AcademicPortal` in eight pages. Most old components remain below those returns. Signed-in users therefore receive a much smaller interface than preview users. Re-enabling the old branch without replacing its sample data would display fabricated academic results.

| Page | Roles affected | Current replacement | Evidence |
| --- | --- | --- | --- |
| Dashboard | Instructor, Student, Dean, Associate Dean; owner in academic views | Generic academic counters, courses and publications | `Dashboard.jsx:692` |
| Performance | Instructor, Student, Dean | Attempts and material-access tables | `Performance.jsx:580` |
| Student Monitoring / scoring-sheet alias | Instructor | Attempts, access and enrollment tables | `StudentMonitoring.jsx:121`, `App.jsx:79` |
| Monitor | Dean, Associate Dean | Generic courses, publications and class lists | `MonitorProgress.jsx:441` |
| Records | Dean, Associate Dean | Read-only projection tables | `Records.jsx:474` |
| Course Loading | Dean, Associate Dean | Read-only authorized courses | `CourseLoading.jsx:496` |
| Assessments | Student | One form containing all objective questions | `Assessment.jsx:148` |
| Courseware | Student and authorized academic readers; Instructor authoring remains | Generic published-content viewer | `Courseware.jsx:765` |

Paths in this register refer to `edupulse-app/src/pages/` unless otherwise stated. The replacement is [`AcademicPortal.jsx`](../../../edupulse-app/src/components/academic/AcademicPortal.jsx).

## Dashboard losses

| ID | Feature unavailable in signed-in UI | Current behavior / evidence |
| --- | --- | --- |
| DASH-01 | Distinct Instructor and Student dashboards | Both render the common Academic Dashboard instead of `InstructorDashboard` / `StudentDashboard`. |
| DASH-02 | Distinct Dean / Associate Dean landing content | The common portal does not preserve the earlier responsibility-specific dashboard sections. FR-AUTH-12. |
| DASH-03 | Getting Started task cards and progress | The four onboarding actions and saved-work progress are below the authenticated return. |
| DASH-04 | Instructor quick actions | Syllabus Builder, Generate Courseware and Student Monitoring cards are bypassed. Top navigation still permits these routes. |
| DASH-05 | My Block Sections cards | Replaced by generic counts; no adviser/block summary cards on the signed-in dashboard. |
| DASH-06 | Instructor Score Snapshot chart | `BarChart` in the preview dashboard is unreachable for signed-in instructors. |
| DASH-07 | My Courses — Syllabus Stations | The course-by-course lifecycle strip and next-step presentation are absent from the replacement dashboard. The Syllabus page retains lifecycle actions. |
| DASH-08 | Courseware Review Queue | The ordered actionable draft queue is absent from the replacement dashboard; drafts remain in Instructor Courseware. |
| DASH-09 | Recent Activity | Role-specific activity list is bypassed. |
| DASH-10 | Student Pulse Reminders / upcoming activities | The student reminder cards, deadlines and Upcoming Activities section are absent from the replacement. |
| DASH-11 | Student My Block / Learning Material Sources | The detailed block and source panels are replaced by general publications. |
| DASH-12 | Student My Score Trend | The dashboard `LineChart` is bypassed. |
| DASH-13 | Dean Syllabus Stations / Delivery Progress | Dashboard lifecycle and delivery visualizations are bypassed. |
| DASH-14 | Faculty Overview / Syllabus Status by Course | Faculty cards and course-status presentation are absent from the generic portal. |

## Performance losses

| ID | Feature unavailable in signed-in UI | Current behavior / evidence |
| --- | --- | --- |
| PERF-01 | Topic Mastery Radar | `StudentRadarChart` still exists (`Performance.jsx:57`) and is used by the student topic view and student dialog, but the authenticated return prevents those views. |
| PERF-02 | Student drill-down dialog | Clicking a student to see their course, scores and mastery radar is absent from the portal tables. |
| PERF-03 | Overview / By Topic / Learning Materials / Assessment Scores / Alerts tabs | `ALL_TABS` exists, but the portal has none of these tabs. |
| PERF-04 | Student course selector | Course-specific topic and score sheets are bypassed. |
| PERF-05 | Topics Mastered / Need Review counters | Only general record counts remain; no topic mastery mapping. FR-PERF-01/02. |
| PERF-06 | Score Trend (Historical) | The `LineChart` and its history view are unreachable. FR-PERF-14. |
| PERF-07 | Per-Topic Status | Mastered / needs-review rows are absent from signed-in performance. |
| PERF-08 | Instructor topic mastery heatmap | Student-by-topic colored matrix is unreachable. |
| PERF-09 | Topic Mastery Overview bars | The per-topic score chart is replaced by raw attempts. |
| PERF-10 | Pass/Fail Rate by Topic | The grouped topic chart is unreachable. |
| PERF-11 | Adjustable Student Threshold Alerts | Threshold input and matching student cards are bypassed. No risk prediction should be inferred from raw scores. |
| PERF-12 | Topic Mastery Alerts / acknowledge controls | Alerts tab is unreachable; old acknowledgment was component state, not a persistent event workflow. |
| PERF-13 | Learning-material progress against teaching weeks | The replacement shows opens, without the earlier topic/week completion sheet. |
| PERF-14 | Assessment score sheet grouped by course/category | The replacement lists raw attempts instead of the earlier organized sheet. |
| PERF-15 | Performance CSV export | The page's CSV report action is bypassed; portal offers authorized-record JSON instead. FR-PERF-09 remains only partially met. |
| PERF-16 | Section/course/date filters | The portal provides none. The old UI also did not establish a complete date-filtered persistent history, so this includes an incomplete requirement, not proven removal of a working backend feature. FR-PERF-10. |

The backend projection has courses, publications, enrollments, attempts and material opens. It does **not** expose a complete assessed-item-to-syllabus-topic mapping or historical topic mastery series. A correct radar restoration needs that mapping; dividing raw scores among guessed topics would recreate fabricated data.

## Student monitoring and delivery oversight losses

| ID | Feature unavailable in signed-in UI | Current behavior / evidence |
| --- | --- | --- |
| MON-01 | Assessment Scores / Learning Material Access tabs | `StudentMonitoring.jsx` tabs are below the early return. |
| MON-02 | Course selector and student-by-assessment scoring matrix | Raw attempt rows replace the matrix and course controls. |
| MON-03 | Completed / Missed presentation | The portal does not classify scheduled or expected assessments against enrollment; it lists attempts only. |
| MON-04 | Class Average per Assessment chart | `BarChart` is bypassed. |
| MON-05 | Completion Rate per Assessment chart | `BarChart` is bypassed. |
| MON-06 | Student-by-material open/unopened matrix | Access rows replace the richer matrix. |
| MON-07 | Access Rate per Material chart | `BarChart` is bypassed. |
| MON-08 | Monitoring CSV export and reminder actions | Earlier controls are unavailable in signed-in monitoring. Reminder delivery was not established in the earlier backend. |
| MON-09 | Standalone ScoringSheet component | `ScoringSheet.jsx` remains, but `/scoring-sheet` renders `StudentMonitoring`, whose signed-in branch renders the portal. Not a deleted file. |
| MON-10 | Syllabus Status / Delivery Progress / Student Oversight / Alerts tabs | All four Monitor views are bypassed for Dean and Associate Dean. |
| MON-11 | Syllabus status by instructor chart | `MonitorProgress.jsx` vertical `BarChart` and expandable faculty rows are unreachable. |
| MON-12 | Instructor/course syllabus lifecycle details | Generic Active / Not active courses replace the detailed routed/approved/extracted status overview. |
| MON-13 | Per-course delivery progress and published/draft counts | The portal lists published items, without the older syllabus-week delivery view. |
| MON-14 | Student oversight by block and expanded details | Generic class-list rows replace the block summaries. |
| MON-15 | Delivery-gap / not-routed alerts | The old status-driven alerts are unavailable; persistent scheduled delivery-gap derivation is not implemented. |

## Records and course-loading losses

| ID | Feature unavailable in signed-in UI | Current behavior / evidence |
| --- | --- | --- |
| DATA-01 | Import EduSuite Files / Blocks & Class Lists / Course Catalog tabs | All three Records tabs are bypassed. |
| DATA-02 | Course Records / Course Loads / Student Class Lists import subtabs | Signed-in Dean and Associate Dean cannot reach these upload panels. |
| DATA-03 | Parsed-row preview with accepted/rejected counts | Generic portal has no import preview/confirmation flow. Old Records imports stored component history and toasts, not a complete shared institutional import. |
| DATA-04 | Downloadable import templates | Real CSV template downloads in Records are bypassed. |
| DATA-05 | Import History | The earlier timestamp/file/count presentation is absent. Old history was not established as durable institutional history. |
| DATA-06 | Block cards with student count/capacity and schedules | Replaced by flat confirmed enrollment rows. |
| DATA-07 | Block student list / enlisted courses drill-down | Dedicated Students / Courses views and Back to Blocks controls are bypassed. |
| DATA-08 | Course Catalog year/semester filters and details | Fixed curriculum lookup still exists in Syllabus, but the Records presentation is bypassed. A standalone curriculum compliance dashboard remains outside the agreed scope. |
| DATA-09 | Course Loading Monitor table and expandable assignment detail | Replaced by generic authorized courses with no instructor-loading detail. |
| DATA-10 | Loading status KPIs | Syllabus readiness/loading-specific counters are bypassed. |
| DATA-11 | Instructors tab / Instructor Class List cards | Instructor roster and course-load cards are bypassed. |
| DATA-12 | Instructor qualifications / specialization detail dialog | `InstructorPopover` remains in CourseLoading but signed-in users cannot reach it. |
| DATA-13 | Assist / Auto course-assignment proposals | Not present in the authenticated API/UI. Current `executeAcademic` supports sync/open/submit only. Older read-only monitoring is not proof that persistent assignment ever worked. FLOW_SPEC Phase 1 remains incomplete. |

Instructor class-list intake in **Syllabus → My Courses** remains available and persistent. It does not replace the Dean/Associate Dean's institutional intake and course-load workflow.

## Assessment and published-content losses

| ID | Feature unavailable or reduced | Current behavior / evidence |
| --- | --- | --- |
| ASM-01 | Timed assessment countdown | `Assessment.jsx` timer exists only in the bypassed preview flow. The portal has no duration control or server-enforced timing. |
| ASM-02 | One-question-at-a-time navigation | Previous/Next and numbered question navigator replaced by one long form. |
| ASM-03 | Retry / attempt allowance | Portal allows one idempotent attempt per published version, replacing preview retry controls. A working multi-attempt policy was not migrated. |
| ASM-04 | Detailed results/review screen | Portal shows the saved raw score, without the old per-question visual review. Answer-key release must remain instructor-controlled. |
| ASM-05 | True/false and short-answer assessment UI | The authenticated path supports bounded four-option objective questions only. Open-response marking remains missing. |
| ASM-06 | Due-date and time-limit cards | Portal shows publication course/week/type but no assessment scheduling metadata. |
| ASM-07 | Student score adjustment / appeal workflow | Not implemented in the authenticated command contract; the old frontend does not establish a previously working persistent workflow. FR-ASM-03/12. |
| CW-01 | Student specialized document / presentation / course-outline viewers | Signed-in students receive generic content sections, bypassing the dedicated readers retained in Courseware. |
| CW-02 | Student course/week content navigation | Generic publications replace the richer My Courses sheets. |
| CW-03 | Student courseware downloads | No common download action appears in the portal viewer; Instructor exports remain in specialized viewers. |
| CW-04 | Scheduling / scheduled publication state | Workspace publication and portal visibility do not implement a complete schedule-based release workflow. FR-CW-06/07. |
| CW-05 | Syllabus-edit downstream misalignment flags | No complete persistent re-flagging workflow is established by the current projection. Generation-time checks remain; these are different features. FR-SYL-10 / FR-CW-08/20. |

## Cross-cutting losses and pre-existing inactive affordances

| ID | Finding | Current evidence / classification |
| --- | --- | --- |
| SHARED-01 | Signed-in notification feed suppressed | `src/data/notifications.js` explicitly uses an empty list for authenticated users. Bell/page remain; reminders, publication and generation events are not connected to a persistent notification feed. |
| SHARED-02 | Notification preferences do not control event delivery | Settings stores device preferences and explicitly says email/digests are not connected. This is a missing implementation, not a functioning backend service removed by the theme work. |
| SHARED-03 | Full historical syllabus comparison / restore | `Syllabus.jsx` history stores status/version/time/author, not full content snapshots. Both History and Review recorded changes open the same timeline. `VersionCompare` has no UI setter to open it and is passed the same record on both sides. The reusable `VersionHistory.jsx` is unmounted. Earlier restore/export controls were toast-only. |
| SHARED-04 | Full syllabus AI Auto replaced by curriculum copy | `autoGenerateDraft` / `s5AutoGenerate` copied available curriculum rows and did not generate new content. The Pulse drafting fix in this working change introduces reviewed course-aware generation; **Load curriculum outline** still loads a reference. |
| SHARED-05 | Syllabus upload does not automatically persist research knowledge | Temporary editor/chat source context exists; explicit knowledge-library indexing exists. A complete automatic lifecycle-indexing pipeline remains absent. |
| SHARED-06 | Fallback ContentEditor Save / Check buttons | The standalone fallback editor still has toast-only controls (`ContentEditor.jsx:176–177`). Saved real courseware uses the separate editor path. This is an inactive fallback affordance, not proof of a real record mutation. |
| SHARED-07 | Email / flag actions in preview Performance | Several buttons have no handler; others speak a success-like message or keep state locally. These actions were not working persisted features before the bypass. |
| SHARED-08 | Export My Data is profile-only | Settings exports name/email/role/department; no complete activity export or account deletion request backend exists. The page discloses this. |
| SHARED-09 | Help links | Several resource/portal links in Help use `href="#"`. FAQ and Help route remain, but those links have no real destination. |
| SHARED-10 | Old `/login` bookmark | `Login.jsx` was deleted in `05c88ce` when sign-in moved to Landing. Authentication remains; `/login` itself has no redirect. This predates the academic backend makeover. |

## Dark-mode audit

No global-theme or ThemeContext diff occurs in `4486468..5afbd0c`. The underlying dark surface problem is older than that academic-backend commit. This finding does not negate the visible inconsistency.

| Finding | Source | Effect |
| --- | --- | --- |
| Page background is a gradient in both modes | `src/index.css:75`; dark mode changes its input colors but does not replace `background-image` | Large blue/dark bands remain behind otherwise solid cards. |
| Dark onboarding panel explicitly defines a gradient | `src/index.css:1201`; introduced in `72cf820` | Violates a solid-surface theme preference independently of backend routing. |
| Accent controls and avatars also contain gradients | `index.css`, `Layout.jsx`, CourseLoading, Dashboard, MonitorProgress | Theme preference is inconsistently applied across shared and page-specific components. |
| Hard-coded light assessment result/error backgrounds | `Assessment.jsx`, e.g. `#ECFDF5` / `#FEF2F2` | Preview assessment result cards do not derive every surface from dark tokens. |
| Semantic shade tokens are incomplete | Dark theme overrides `--green-100` / `--green-500` etc., but components use `--green-600/700`, `--amber-50/200/700` with light fallbacks | Some badges/banners keep light colors or use unsuitable contrast. |
| Shared header override is too broad | `.dark-mode header` in `index.css` | Also targets component headers, not just the app bar. |
| Muted text is too dim for some dark surfaces | Dark `--gray-400` and `--gray-500` both use `#64748b` | Small helper text needs a contrast review against its actual surfaces. |
| Chart colors/tooltips are partly hard-coded | Performance and other chart definitions | Reintroducing charts must include dark axes, grid and tooltip review, not only page-background changes. |

This audit records theme defects; it does not claim a completed theme restoration.

## Retained capabilities checked during the scan

- Syllabus course selection, locked curriculum fields, editable seven-section form, real PDF/DOCX import, OCR, source preview, resources, confirmed draft save, checked/downloaded/approved-file/extracted lifecycle, approved-file retention, archive/copy and PDF export remain in source.
- Instructor courseware generation by week/batch, draft review/edit/check/publish controls, source evidence, document/presentation/assessment editors, item regeneration and exports remain reachable for instructors. Whether each hosted flow succeeds still depends on its authorized data and provider.
- Published enrolled-student access, recorded material opens and server-scored objective attempts remain in the authenticated projection. Restoring rich UI must use these authorized results.
- Account/theme/font-scale settings, top/mobile route navigation, search shell, Help/FAQ/legal pages, provider connections, knowledge-library indexing, Pulse guides, file/roster tools, private conversation/memory and workspace buddies remain.
- System Admin health, role/account controls, audit and agent-run activity remain separate. Ordinary users cannot acquire those capabilities through restored academic UI.

## Restoration dependencies

1. Restore role-specific presentation against authorized records: dashboards, course/section filters, scoring/access matrices, charts derivable from actual attempts and enrollments, specialized student readers and CSV exports.
2. Add missing data where necessary: topic-to-assessment mapping and historical snapshots for mastery/radar/trends; deadlines and expected activities for missed-work/delivery charts; notification events and read states; institutional import/assignment records.
3. Restore durable mutations only with their real backend operations: bulk imports, assignment proposals, score adjustments, open-response marking, historical syllabus restoration and scheduled releases. A success toast or sample-data screen does not complete these workflows.
4. Apply solid dark surface tokens consistently, then inspect every route, chart, dialog, uploader and Pulse in light/dark at desktop/mobile widths.

The latest request asked for a comprehensive scan. This register and inventory provide that scan; the omitted academic interfaces above remain restoration work, and are not silently marked complete by the Pulse fix.

## 28 October restoration follow-up

This register preserves the original findings. [Restoration disposition](restoration-status.md) now records implemented account sections and remaining data/backend gaps for every ID. The [current role guide](../../system-walkthrough/09-restored-role-pages/README.md) supersedes the original generic-portal descriptions for restored interfaces.

The 28 October inventory rerun covers 62 JSX/TSX files and 186 requirement references. The original 56-file scan and 80 findings remain historical evidence; new account components explain the increased file count.
