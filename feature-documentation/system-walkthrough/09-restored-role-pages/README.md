# Restored account pages — 28 October 2026

These screenshots exercise the authenticated components with synthetic account, API and workspace responses. Names, email addresses and scores are fixtures. They verify presentation and interactions, not hosted authentication, production RLS, real grading or model quality. The earlier preview screens remain demonstrations; this guide describes the restored account interface.

## Role dashboards

Accounts see the same role dashboards as the preview personas: the [instructor](../04-instructor/README.md#1-instructor-dashboard), [student](../05-student/README.md#1-student-dashboard) and [management](../03-dean-and-associate-dean/README.md#1-dean-dashboard) components, filled from the account's authorized records and, for an instructor, the owner workspace. The header shows automatic refresh status and **Export** (authorized records as JSON). Clean instructor workspaces reconcile automatically; errors expose **Retry connection**. Sample names, scores and activity never appear in an account; a value with no record stays empty.

| Role | Capture | Sections |
| --- | --- | --- |
| Instructor | ![Instructor Dashboard](01-instructor-dashboard.png) | **Getting Started with EduPulse**; summary cards from the owner workspace (all zero in this fixture); **Quick actions**; **My Block Sections** BSIT-1A and BSIT-1B with one student each; **Score Snapshot** with 2 students, a 67% average and one learner below 75 (only the learner with marked attempts is averaged) and topic averages for IT 102; **Recent Activity**, the course syllabus stations and **Courseware Review Queue** showing their empty-state lines. |
| Student | ![Student Dashboard](02-student-dashboard.png) | Summary cards: 1 enrolled course, 67% average score, 1 topic mastered, 1 pending activity. **Pulse Reminders** lists the unopened *Variables lesson*. **My Block** shows BSIT-1A with year level, size and adviser *Not recorded*. The IT 102 card shows its latest recorded score; **Learning Material Sources** has no published source; **My Score Trend** plots weeks 1–3; **Upcoming Activities** has no recorded deadline. |
| Dean | ![Dean Dashboard](03-dean-dashboard.png) | One released, loaded and approved course; **Quick actions**; **Syllabus Stations**; **Delivery Progress (Active Courses)** with published materials and assessments for IT 102; **Faculty Overview** (*Synthetic instructor*, *On track*); **Recent Activity** with no recorded event; **Syllabus Status by Course**. |
| Associate Dean | ![Associate Dean Dashboard](04-associate_dean-dashboard.png) | The same management dashboard under **Associate Dean Dashboard**. The navigation has no **Performance** tab and the dashboard has no score panel. |

## Combined instructor monitoring

Choose **Student Monitoring**, then a course/block under its recorded year level. The full-page class dialog restricts every participant and denominator to that course/block. Its Students, Assessment Scores and Learning Material Access tabs each start with summary cards. [Manual 37](../../system-manual/37-instructor-monitoring/README.md) shows the class hub, suspension rules and honest sequential reading progress.

| View | Capture | Behavior |
| --- | --- | --- |
| Assessment summary | ![Radar and history](05-performance-radar-and-history.png) | **Assessment score radar**, saved **Assessment history**, class averages and submission rate. Three scored assessments are needed for the radar. |
| Topic mastery and follow-up | ![Topic coverage](06-assessment-coverage.png) | Mapped topic radar and history remain in the assessment tab; the separate topic heatmap example below shows per-learner status. |
| Learning Material Access | ![Material access](07-material-access.png) | Access radar/history and per-material charts. An open alone never proves completed reading. |
| Student assessment rows | ![Scores](08-assessment-scores.png) | Accessed/submitted counts, raw marked average and submission progress. **Download CSV** exports displayed rows. |
| Review threshold | ![Threshold review](09-threshold-review.png) | Scores below the local mastery cutoff. This is review guidance rather than an institutional pass mark. |
| Student detail | ![Assessment breakdown](10-student-drilldown.png) | Each assessment's status, raw score and percentage, with the final raw average. **Escape** returns to the class dialog. |
| Assessment charts | ![Monitoring assessment charts](11-monitoring-scoring-matrix.png) | Assessment charts in the same selected class. Old instructor Performance and Scoring Sheet links lead into monitoring. |
| Material rows | ![Monitoring material rows](12-monitoring-material-matrix.png) | Accesses, confirmed reading completion, reading average and progress for this class only. |

Dates constrain recorded events; student search/progress filters affect the list. Marked current-version results determine raw averages; real zeros remain zero, while missing/unmarked work is excluded. Student Performance retains only the learner's own data. Dean Performance remains read-only. Associate Dean Performance links return to Dashboard and its backend projection excludes performance records.

## Oversight and course loading

| View | Capture | Sections |
| --- | --- | --- |
| **Syllabus & Delivery** | ![Combined syllabus and delivery](13-monitor-syllabus-status.png) | One set of saved stations and released courseware charts, consistent filtered counters, a combined readiness/coverage table with CSV, course details and an optional released-title list. Distinct course instances remain separate; approval stays offline. |
| **Student Oversight** | ![Student oversight](15-monitor-students.png) | Block/enrollment summary and **Confirmed class lists**, with CSV export and role scope. |
| **Alerts** | ![Readiness alerts](16-monitor-alerts.png) | Actual inactive-syllabus, missing-roster or missing-publication gaps; no scheduled deadline is assumed. |
| **Course loads** | ![Course loads](17-course-loading.png) | Dean read-only assignments, blocks, registered students and activity, with the shared clickable summary cards. |
| **Instructors** | ![Instructor records](18-instructor-delivery.png) | Dean instructor cards and search; selecting a card opens saved course and activity details. |

## Dean records and Associate Dean confirmed file intake

| View | Capture | Behavior |
| --- | --- | --- |
| **Students** | ![Blocks](19-record-blocks.png) | Dean summary cards and year-grouped blocks. Select a block for its registered student dialog and complete CSV download. |
| **Course records** | ![Courses](20-record-courses.png) | Read-only Dean catalog, instructor/student memberships and recorded activity. |
| CSV preview | ![Intake preview](21-course-intake-preview.png) | Expected headers, valid/rejected counts, first ten accepted rows and rejection reasons. **Confirm Import (1 records)** saves only the valid row. |
| Saved intake | ![Saved intake](22-course-intake-saved.png) | Persistence receipt and **Shared academic records** table with CSV download. This fixture simulates the shared import command. |
| **Course Loads** | ![Load intake](23-load-intake.png) | Separate load CSV preview/save panel and saved rows. |
| **Student Class Lists** | ![Roster intake](24-roster-intake.png) | Separate roster CSV preview/save panel and saved rows. |
| **Templates** | ![Templates](25-intake-templates.png) | Three real CSV header-template downloads. |
| **History** | ![Import history](26-intake-history.png) | Confirmed filename/result/time from the saved shared event history. |

The import, Templates and History images above now show the Associate Dean; those controls are removed from Dean pages. Associate Dean file intake accepts CSV up to 1 MB and 1,000 rows per request. Quoted commas/newlines and optional qualification/adviser columns are supported. Invalid/duplicate rows are reported; confirmation saves valid shared course, load or roster rows atomically. Courses precede loads; loads use provisioned instructor IDs; matching blocks and verified student emails feed enrollment. Earlier private intake stays in the owner backup for explicit re-import. No direct EduSuite synchronization is claimed.

## Student readers and assessment results

| View | Capture | Behavior |
| --- | --- | --- |
| Course/week navigation | ![Student course weeks](27-student-course-weeks.png) | Course/title search and expandable weeks for enrolled published materials. |
| **Document** | ![Student document](28-student-document.png) | Read-only synthetic networking lesson with bold, italic, lists, table and literal code examples; **Download PDF**, print and back controls use the existing document viewer. Opening records access before displaying the material. Instructor draft evaluation is hidden. |
| **Presentation** | ![Student presentation](29-student-presentation.png) | Synthetic key-point slide with formatted emphasis, previous/next, slide selector and fullscreen controls. Leading bold markers render as bold text. |
| Assessment result | ![Student result](30-student-assessment-result.png) | Numbered question navigation, disabled question controls and raw score receipt. This fixture has a saved objective result. Configured duration, deadline and 1-3 attempts are enforced by the server; written responses await instructor marking. No answer key is released. |
| Account notices | ![Account notices](31-account-notices.png) | Record-derived notices and account/device-scoped **Mark All Read**. The fixture explicitly removes its last saved attempt and refreshes the account data to show **Unanswered assessment: Arrays quiz**. Persisted academic notices use account read receipts; derived reminders retain device read state. No email/push service is claimed. |

## Dark and mobile views

| View | Capture | Behavior |
| --- | --- | --- |
| Dark monitoring | ![Dark performance](32-dark-performance.png) | Solid body/cards/controls, readable muted and semantic text, themed chart grid/axes/tooltips. |
| Mobile assessment charts | ![Mobile charts](33-mobile-performance.png) | Charts stack inside the selected class; genuinely wide content retains native overflow. |
| Mobile monitoring | ![Mobile material access](34-mobile-materials.png) | Selected course/block material summaries and charts fit the phone dialog. |
| Mobile dark dashboard | ![Mobile dark dashboard](35-mobile-dark-dashboard.png) | The instructor account dashboard on a phone in dark mode: automatic record status and **Export**, then **Getting Started with EduPulse**, one summary card per row, **Quick actions**, **My Block Sections**, **Score Snapshot** with its topic chart and the remaining sections, all on solid dark surfaces. |

The System Admin console remains separate: account/role management, health, audit and agent activity were retained. The verified owner's view switching preserves the original account identity; restored academic screens do not grant ordinary users that capability.

## Baseline workflows restored after owner confirmation

The following scenes use the additional synthetic baseline fixture. SQL integration tests separately exercise the real migrations and role policies; these screenshots do not certify hosted authentication.

| View | Capture | Visible behavior |
| --- | --- | --- |
| Topic mastery | ![Topic radar and heatmap](36-topic-mastery-heatmap.png) | The selected course/block heatmap shows mapped topic results. The other graphs and mastery counts remain in Topic mastery and follow-up; an unassessed result is never invented. |
| Instructor marking | ![Review responses](37-instructor-response-marking.png) | Select a saved attempt, review each response and 0/1 mark, enter a reason and confirm. |
| In-app reminder | ![Saved reminder](38-confirmed-in-app-reminder.png) | Reviewed marks receipt and one saved reminder receipt; duplicate/day and completed-work exclusions are stated. |
| Associate Dean loading proposals | ![Loading and qualifications](39-loading-proposals.png) | Imported course, block/semester, provisioned instructor list, degree/specialization records, preview/auto proposals and confirmation. |
| Associate Dean block correction | ![Block correction](40-block-correction.png) | Select imported student and confirmed block, then confirm the shared correction. |
| Timed written assessment | ![Timed response](42-timed-written-assessment.png) | Server-started session, remaining time, topic names, one visible written question, Previous/Next and numbered navigation. |
| Saved result and appeal | ![Pending marking and appeal](43-assessment-pending-review-and-appeal.png) | Objective subtotal, pending written-response marking and appeal form. |
| Persisted notices | ![Academic notices](44-persisted-academic-notices.png) | Persisted publication notice plus derived current-work reminders; account and device receipt behavior is disclosed. |
| Saved versions | ![Saved syllabus versions](45-saved-syllabus-versions.png) | Historical editable version can be viewed or restored as a new draft; approval must be repeated. |
| Question topic mapping | ![Assessment mapping](46-assessment-topic-mapping.png) | Each question maps to an approved outline topic and selects multiple choice, True/False or instructor-marked response type. |
| Delivery settings | ![Delivery settings](47-publication-delivery-settings.png) | Opened from an item's three-dot menu in the combined Courseware workspace. Release/deadline, duration and allowed attempts are saved before review/publication; **Close delivery settings** closes the panel. This fixture has no AI connection, so the course also says **Pulse AI is not set up yet** with **Set up Pulse AI**; saved drafts stay as they are. |
| Mobile topics | ![Mobile topic mastery](48-mobile-topic-mastery.png) | Stacked topic charts/status and scrollable matrices. |
| Associate Dean mobile loading | ![Mobile loading](49-mobile-loading-proposal.png) | Responsive proposal controls and qualification/load tables. |

See [Manual 13](../../system-manual/13-restored-account-sections/README.md), [ADR-002](../../backend-system/decisions/002-feature-preservation-baseline.md) and the [baseline release record](../../versions/2026-10-28-baseline-workflows/README.md). The four new migrations were applied to EduPulse System on 28 October 2026; other installations must apply them before serving this version.

## Pulse account guidance

![Pulse confirms shared-record scope](50-account-pulse-guidance.png)

Authenticated Records and Course Loading again expose their page guidance targets. Pulse distinguishes saved account records from preview samples, describes confirmed shared imports and enrolled publication, and keeps the Dean guidance read-only. The displayed Associate Dean import instruction explains the saved receipt; it does not claim that an import occurred. Preview personas keep their sample-data disclosure.

The Pulse capture uses a synthetic account transport, so the separate conversation service shows a session-verification warning. Authored page guidance remains available; this image does not establish a successful hosted session or saved conversation. Authored page guidance remains available; this image is not a successful hosted session or a saved conversation. The page target is named Academic Records rather than concatenating dropdown options into its heading.


Shared navigation now places **Help & Support** and **Keyboard Shortcuts** in Settings. Pulse guidance is under **Pulse options**. [Manual 14](../../system-manual/14-pulse-and-outline-workspace/README.md) shows the current controls; the academic pages and role boundaries above are preserved.

Academic assignment, reviewed-mark, offline-review, delivery, student-response and appeal actions now show spinners while their existing requests are pending. The restored pages and authorized data boundaries remain. [Manual 19](../../system-manual/19-loading-and-saved-connections/README.md) records the loading audit.

### Outline-driven authoring and student readers

[Manual 26](../../system-manual/26-outline-driven-courseware/README.md) records the current variable-item authoring contract. Student document and presentation captures 28?29 remain controlled publication/formatting examples: formatted emphasis, tables and literal code are retained, and instructor-only draft evaluation is absent. These images do not prove hosted delivery or substantial generated content; the separate delivery audit remains the evidence for access boundaries.

### Retained readers and deliberate refresh

Academic records remain loaded across navigation and browser focus. Another-tab changes announce **Updates available** and offer a deliberate refresh; own confirmed commands still receive authorized readbacks. Student document/presentation return restores the selected publication without another open event, while assessment sessions/submissions are not replayed. See [Manual 27](../../system-manual/27-cached-workspaces/README.md).

### Combined oversight and teaching-week accuracy

The two former syllabus/delivery tabs now share one **Syllabus & Delivery** view. [Manual 29](../../system-manual/29-combined-oversight/README.md) explains released/planned coverage, filters, distinct course identities and retained role controls. Current monitor and Course Loading captures use controlled records. The refreshed offline-review image preserves its original sample correction; no request was sent or approved.

### Radar coverage and roster labels

The assessment radar retains its three-distinct-assessment minimum and leaves margin for narrow-screen labels. Multiple attempts on one quiz do not create extra axes. [Manual 33](../../system-manual/33-pipeline-progress/README.md#three-distinct-scored-assessments) shows two versus three scored quizzes and records the separate live labelled integration exercise. Timed-assessment labels now join saved scores to the verified learner's roster and block without changing grade values.

## Dean course, instructor and student navigation

Dean navigation is now **Dashboard**, **Course**, **Instructors** and **Students**. Its summaries share the clickable dashboard card component. Course records/loads/class lists are read-only; Students groups blocks by recorded year and opens downloadable student lists. Old Dean sections/loading addresses redirect to these pages. Screens 21-26, 39-40, 49 and 50 retain the Associate Dean intake/proposal/guidance workflow under that role. Dean offline review and read-only Performance remain accessible. See [Manual 36](../../system-manual/36-dean-activity-records/README.md).

## Combined instructor class monitoring

The refreshed instructor account captures now show Student Monitoring inside a selected course/block. The former Performance content is retained as assessment radar/history, topic follow-up and material charts in that workspace. The standalone instructor Performance page is removed. Student and Dean performance remain separate under their existing permissions. [Manual 37](../../system-manual/37-instructor-monitoring/README.md) supersedes the earlier instructor navigation descriptions and records explicit reading confirmations and suspend-before-remove.

Topic, marking and reminder component crops use a taller desktop browser viewport to fit the complete selected panel inside the class dialog. They retain the actual layout and controls.
