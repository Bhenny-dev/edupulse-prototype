# Restored account pages — 28 October 2026

These screenshots exercise the authenticated components with synthetic account, API and workspace responses. Names, email addresses and scores are fixtures. They verify presentation and interactions, not hosted authentication, production RLS, real grading or model quality. The earlier preview screens remain demonstrations; this guide describes the restored account interface.

## Role dashboards

| Role | Capture | Sections |
| --- | --- | --- |
| Instructor | ![Instructor Dashboard](01-instructor-dashboard.png) | **Your teaching workspace**, **Quick actions**, saved syllabus lifecycle, courseware review queue, assessment radar/history, **My Block Sections**, readiness, courses and recent publications. Empty private syllabus/draft lists are intentional in this fixture. |
| Student | ![Student Dashboard](02-student-dashboard.png) | **Your learning workspace**, enrolled course counts, **My blocks**, **Continue learning**, saved score charts, score snapshot and publications. No due dates are invented. |
| Dean | ![Dean Dashboard](03-dean-dashboard.png) | Management quick actions, **College Performance** link, college course/block readiness and **Faculty overview**. |
| Associate Dean | ![Associate Dean Dashboard](04-associate_dean-dashboard.png) | Records/loading/oversight links and readiness. No Performance link or score panel. |

## Performance and instructor monitoring

**Course**, **Block**, **From** and **Through** filter authorized records. Dates apply to attempts and first opens. A missing event in a filtered view does not establish a missed deadline. Empty states retain the sections and never substitute preview scores.

| View | Capture | Behavior |
| --- | --- | --- |
| **Overview** | ![Radar and history](05-performance-radar-and-history.png) | **Assessment score radar**, **Assessment history**, colored raw-score matrix and saved attempts. Radar requires three scored current assessments; unanswered assessments are excluded. It measures assessment results, not topic mastery. |
| **By Topic** | ![Assessment coverage](06-assessment-coverage.png) | Explicit missing topic-mapping explanation, assessment bars and week/title/attempt/roster table. No guessed topic scores. |
| **Learning Materials** | ![Material access](07-material-access.png) | Student-by-material open matrix, access chart and dated first-open records. An open is not proof of completed reading. |
| **Assessment Scores** | ![Scores](08-assessment-scores.png) | Current-version scoring matrix and historical attempts. **Download CSV** exports the displayed table. Earlier versions are labelled separately. |
| **Alerts** | ![Threshold review](09-threshold-review.png) | Adjustable **Review scores below (%)** filter and unanswered assessments against the confirmed roster. The threshold is local review guidance, not an official pass mark or risk prediction. |
| Student detail | ![Student drilldown](10-student-drilldown.png) | Select a learner in the matrix to open their radar, recorded history and attempts. **Escape** closes the dialog. |
| **Assessment Scores** in Student Monitoring | ![Monitoring scoring matrix](11-monitoring-scoring-matrix.png) | Raw-score charts, **Class average per assessment**, **Assessment submission rate**, matrix and attempts. `/scoring-sheet` reaches this same working view. |
| **Learning Material Access** | ![Monitoring material matrix](12-monitoring-material-matrix.png) | Open/unopened records, chart and CSV. **No recorded open** remains distinct from reading completion. |

Students receive only their own result/access records. The Dean's view is read-only. Associate Dean navigation to Performance returns to Dashboard; the backend continues to exclude attempts and accesses from that role.

## Oversight and course loading

| View | Capture | Sections |
| --- | --- | --- |
| **Syllabus Status** | ![Syllabus status](13-monitor-syllabus-status.png) | Active/not-active status, course readiness counts and expandable course details. Private signatory history is not exposed by the projection. |
| **Delivery Progress** | ![Delivery](14-monitor-delivery.png) | Material/assessment bars by course, publication counts, represented weeks and titles. Published weeks are counts, not full-syllabus completion percentages. |
| **Student Oversight** | ![Student oversight](15-monitor-students.png) | Block/enrollment summary and **Confirmed class lists**, with CSV export and role scope. |
| **Alerts** | ![Readiness alerts](16-monitor-alerts.png) | Actual inactive-syllabus, missing-roster or missing-publication gaps; no scheduled deadline is assumed. |
| **Course Monitoring** | ![Course Loading](17-course-loading.png) | Search/course filter, readiness KPIs, course table, CSV and expandable publication/roster details. |
| **Instructors** | ![Instructor delivery](18-instructor-delivery.png) | Expandable instructor account/course summaries. A matching confirmed private load import supplies a name; otherwise the account ID is visible. Qualifications and specializations are explicitly unavailable. EduSuite owns assignments. |

## Records and confirmed private file intake

| View | Capture | Behavior |
| --- | --- | --- |
| **Blocks / Sections** | ![Blocks](19-record-blocks.png) | Select a block card to filter confirmed roster entries; select it again to show all blocks. Counts deduplicate learners. |
| **Courses** | ![Courses](20-record-courses.png) | Authorized course identity, active status and source revision. |
| CSV preview | ![Intake preview](21-course-intake-preview.png) | Expected headers, valid/rejected counts, first ten accepted rows and rejection reasons. **Confirm Import (1 records)** saves only the valid row. |
| Saved intake | ![Saved intake](22-course-intake-saved.png) | Persistence receipt and **Saved private intake** table with CSV download. This fixture simulates revision-checked saving. |
| **Course Loads** | ![Load intake](23-load-intake.png) | Separate load CSV preview/save panel and saved rows. |
| **Student Class Lists** | ![Roster intake](24-roster-intake.png) | Separate roster CSV preview/save panel and saved rows. |
| **Templates** | ![Templates](25-intake-templates.png) | Three real CSV header-template downloads. |
| **History** | ![Import history](26-intake-history.png) | Filename/type/time and created/updated/rejected counts from the saved private workspace. |

File intake accepts CSV up to 1 MB and 1,000 rows per kind, with at most 50 history entries. Quoted commas/newlines are supported. Invalid and duplicate file rows are reported; stable keys update existing rows. Saves use the existing account workspace revision check and 3 MB total workspace limit. These records remain private to the importing Dean/Associate Dean; they do not enroll students, assign instructors or synchronize the official institution database. Instructors still register confirmed enrollment through **Syllabus → My Courses**.

## Student readers and assessment results

| View | Capture | Behavior |
| --- | --- | --- |
| Course/week navigation | ![Student course weeks](27-student-course-weeks.png) | Course/title search and expandable weeks for enrolled published materials. |
| **Document** | ![Student document](28-student-document.png) | Read-only styled lesson; **Download PDF**, print and back controls use the existing document viewer. Opening records access before displaying the material. |
| **Presentation** | ![Student presentation](29-student-presentation.png) | Title/section slides, previous/next, slide selector and fullscreen controls. |
| Assessment result | ![Student result](30-student-assessment-result.png) | Numbered question navigation, disabled question controls and raw score receipt. There is one saved objective attempt per published version; no answer key is released. An unanswered assessment shows answered count and elapsed time, with no invented deadline/countdown. |
| Account notices | ![Account notices](31-account-notices.png) | Record-derived notices and account/device-scoped **Mark All Read**. The fixture explicitly removes its last saved attempt and refreshes the account data to show **Unanswered assessment: Arrays quiz**. Notices are not an email or scheduled event service. |

## Dark and mobile views

| View | Capture | Behavior |
| --- | --- | --- |
| Dark performance | ![Dark performance](32-dark-performance.png) | Solid body/cards/controls, readable muted and semantic text, themed chart grid/axes/tooltips. |
| Mobile performance | ![Mobile charts](33-mobile-performance.png) | Charts stack; page tabs remain scrollable and wide matrices stay in their own scroll region. |
| Mobile monitoring | ![Mobile material access](34-mobile-materials.png) | Course/date controls, material matrix and chart fit the phone viewport. |
| Mobile dark dashboard | ![Mobile dark dashboard](35-mobile-dark-dashboard.png) | Role quick actions and dashboard sections on solid dark surfaces. |

The System Admin console remains separate: account/role management, health, audit and agent activity were retained. The verified owner's view switching preserves the original account identity; restored academic screens do not grant ordinary users that capability.
