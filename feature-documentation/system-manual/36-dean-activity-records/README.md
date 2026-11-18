# 36 - View Dean course, instructor and student records

**Current Course flow — 15 November:** Dean and Program Coordinator now use one Course page with summary cards and course cards. A selected course opens a page-sized instructor-load modal with read-only syllabus/teaching inspection. The old Course list/Course loads tabs below are superseded. See [the current Course guide](../46-course-load-workspace/README.md). The dated screenshots are retained as historical captures while broad recapture is paused.

**Who:** Dean and Program Coordinator, including an authorized System Admin support view. Main navigation is **Dashboard**, **Course**, **Instructors** and **Students**. These pages read authorized academic records.

## Dashboard summaries

Each summary is a keyboard-accessible link. Other Dean summaries use the same icon, color, card and focus treatment.

| Card | Destination |
| --- | --- |
| **Released Courses** | **Course → Course records** |
| **Courses Loaded** | **Course → Course loads** |
| **Approved Syllabi** | **Course → Syllabi**, filtered to approved and active syllabi |
| **Not Yet Routed for Approval** | **Course → Syllabi**, filtered to Drafted and Checked |

![Dashboard summaries](01-dashboard.png)

## Course and instructor records

**Course records** lists course codes, titles, instructors, students and recorded activity. **Course loads** shows saved assignments and recorded blocks; **Confirmed course-load records** expands when imported rows exist. **Student class lists** lists current memberships with **Download CSV**. **Syllabi** provides a status filter and **View outline**.

**Instructors** provides name search and instructor cards. Select one for saved courses, statuses, released items, submissions and material opens. **Teaching instructors** filters to instructors assigned to saved courses.

Pulse navigation follows the same role destinations: a Dean's request to open course loading opens **Course → Course loads**. The Program Coordinator's request retains **Course Loading**.

| View | Desktop | Phone |
| --- | --- | --- |
| Course records | ![Course records](02-course-records.png) | ![Phone course records](mobile-02-course-records.png) |
| Course loads | ![Course loads](03-course-loads.png) | ![Phone course loads](mobile-03-course-loads.png) |
| Student class lists | ![Class lists](04-student-class-lists.png) | ![Phone class lists](mobile-04-student-class-lists.png) |
| Instructor cards | ![Instructors](05-instructors.png) | ![Phone instructors](mobile-05-instructors.png) |
| Instructor detail | ![Instructor details](06-instructor-detail.png) | ![Phone instructor details](mobile-06-instructor-detail.png) |

Catalog totals group course codes; separate saved offerings retain instructor and membership context. Released items exclude inactive and future releases. Submission counts use each learner's latest current-version attempt. Counts have no test suffix; provenance remains in stored audit fields. Opens do not establish completed reading; enrollment does not establish assessment completion.

**Syllabus & Delivery**, **Students → View student performance** retain oversight and read-only results. Review and approval take place outside EduPulse. Dean File Import, Templates, History and block-edit controls are removed. Saved records remain. The Program Coordinator retains the separate shared intake workflow.

### Unified Students page - 18 November 2026

**Students** is one page for the complete authorized student directory across all departments. There are no Student list / Blocks / Sections tabs. The summary cards precede **Search students**, **Department**, **Year level**, **Block section** and **Status** filters. With **All departments** selected, the table includes every matching department; no section cards are shown yet.

Choose a department to display its section cards grouped by recorded year. Choose a card to filter the same Student list table, or use the Block section selector. Changing department or year clears the previous block filter. Search matches name, student number or email; the filters combine. **Clear filters** restores the full directory. Pagination shows 25 students per page; **Download CSV** exports the complete filtered set, including matches on other pages, with spreadsheet-formula escaping.

Department, year, block, search, status and page remain in the URL across reload. Student details recheck the current authorized records before restoration; withdrawn records show **Record unavailable**. Filtering and reload issue no account, enrollment or learner-activity writes. Current/next semester account/import actions and previous-semester viewing restrictions remain. Instructor class-list selection and students' own home-block summaries are unchanged.

The earlier screenshots below are historical where they show separate tabs or block dialogs. Screenshot publication remains owner-paused; updated desktop/phone browser checks and capture assertions cover the unified page. [Release and validation](../../versions/2026-11-18-unified-students/README.md).

Historical Students captures (before the unified page; retained during the owner pause):

| Earlier view | Desktop | Phone |
| --- | --- | --- |
| Year groups | ![Earlier year groups](07-students-by-year.png) | ![Earlier phone year groups](mobile-07-students-by-year.png) |
| Block dialog | ![Earlier block dialog](08-block-students.png) | ![Earlier phone block dialog](mobile-08-block-students.png) |
| Restored block dialog | ![Earlier restored dialog](09-reloaded-block.png) | ![Earlier phone restored dialog](mobile-09-reloaded-block.png) |
| All-student dialog | ![Earlier all students](10-all-students.png) | ![Earlier phone all students](mobile-10-all-students.png) |
| Dark block view | ![Earlier dark blocks](11-dark-blocks.png) | ![Earlier phone dark blocks](mobile-11-dark-blocks.png) |
| Block summary dialog | ![Earlier block summary](15-all-blocks.png) | ![Earlier phone block summary](mobile-15-all-blocks.png) |
| Recorded-year dialog | ![Earlier year summary](16-year-levels.png) | ![Earlier phone year summary](mobile-16-year-levels.png) |

Phone navigation exposes all four destinations under **Open menu**. Wide tables scroll within their own region.

![Phone navigation](mobile-01-navigation.png)

## Summary and outline dialogs

**Syllabi** opens the recorded list; **View outline** displays the selected saved week/outcome/content rows. The **Instructors** summary opens its list. On Students, **Registered students** clears the filters, **Block sections** focuses the Department selector, **Irregular students** opens its retained list, and **Suspended** filters the main table. If a restored detail is no longer in the current authorized projection, the dialog presents **Record unavailable** without the old roster.

| View | Desktop | Phone |
| --- | --- | --- |
| Syllabi | ![Syllabi](12-syllabi.png) | ![Phone syllabi](mobile-12-syllabi.png) |
| Saved outline | ![Outline](13-syllabus-outline.png) | ![Phone outline](mobile-13-syllabus-outline.png) |
| All instructors | ![Instructor summary](14-all-instructors.png) | ![Phone instructor summary](mobile-14-all-instructors.png) |
| Withdrawn record | ![Unavailable record](17-record-unavailable.png) | ![Phone unavailable record](mobile-17-record-unavailable.png) |

## Existing links and access

Dean `/course-loading` opens **Course loads**; its instructor tab opens **Instructors**. Dean `/records?tab=sections` opens **Students**. Old import-tab addresses fall back to **Course records**. Program Coordinator Records/Course Loading/Monitor, imports, templates, history and block correction retain their existing role permissions. Both Dean and Program Coordinator use `/instructors` and `/students` within their existing record and score permissions.

Captures use original synthetic records and controlled account/API transport: four syllabus instances, three course codes, four students, five memberships and three blocks. One current attempt and one open retain test provenance in fixture data, without visible suffixes. The images demonstrate UI behavior, not hosted authentication or real student achievement. See [validation](../../versions/2026-11-11-dean-activity-records/validation/results.md).

## Curriculum population update

Course loads include **Curriculum load** with units, year and semester from the recorded curriculum. Counts labelled **Student assessment attempts** refer to learners, not instructor syllabus submissions. The instructor approval/signatory process remains offline. [Assignment and genuine-activity guide](../38-curriculum-population/README.md).


### Department home blocks - 18 November 2026

The current directory includes all six departments and groups home blocks by program and recorded year, independently of course enrollment. Use Department to narrow the unified Students list and reveal its section cards. Department selection stays in the URL on reload. A block card shows its actual directory members even when it has no courses. The 2027-x-xxxx intake is Year 1; other IDs retain their recorded year. The owner-confirmed allocation places 2,286 existing active students into 109 blocks of at most 35. It creates no teaching load, course enrollment or learner activity.

The student Dashboard shows its own recorded home block and size before any syllabus or course is assigned. Individual registered students, including students from other blocks/departments, remain selectable by the assigned instructor. No nationality is inferred from IDs or names.
