# 36 - View Dean course, instructor and student records

**Who:** Dean, including an authorized System Admin support view. Main navigation is **Dashboard**, **Course**, **Instructors** and **Students**. These pages read authorized academic records.

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

## Browse blocks by year and download students

1. Open **Students**. Summary cards open all students, blocks, recorded years or course memberships. Below them, year-level headings contain block cards. Year comes from the registered student directory, falling back to recorded roster or course/block metadata; **Year level not recorded** and **Mixed year levels** remain explicit. The system checks only students already in the authorized course memberships.
2. Select a block. The dialog lists each learner once within that block, with ID, name, email, recorded year, course codes and activity. **Search students** narrows the visible rows. **Download CSV** exports the complete block membership, including rows hidden by the search.
3. Browser reload restores the current route and dialog after fresh account and record verification. It does not replay imports, enrollment changes, assessment actions, material opens or inference. A withdrawn record displays **Record unavailable**. **Close**, the close icon and Escape dismiss the dialog; it stays closed after reload.
4. **Registered students** opens the deduplicated student list with the same search/download controls.

| View | Desktop | Phone |
| --- | --- | --- |
| Year groups | ![Blocks by year](07-students-by-year.png) | ![Phone year groups](mobile-07-students-by-year.png) |
| Block students | ![Block roster](08-block-students.png) | ![Phone block roster](mobile-08-block-students.png) |
| Restored dialog | ![Reloaded block](09-reloaded-block.png) | ![Phone reloaded block](mobile-09-reloaded-block.png) |
| All students | ![Student summary](10-all-students.png) | ![Phone student summary](mobile-10-all-students.png) |
| Solid dark mode | ![Dark blocks](11-dark-blocks.png) | ![Phone dark blocks](mobile-11-dark-blocks.png) |

Phone navigation exposes all four destinations under **Open menu**. Wide tables scroll within their own region.

![Phone navigation](mobile-01-navigation.png)

## Summary and outline dialogs

**Syllabi** opens the recorded list; **View outline** displays the selected saved week/outcome/content rows. The **Instructors**, **Blocks / Sections** and **Recorded year levels** summaries open their corresponding lists. If a restored detail is no longer in the current authorized projection, the dialog presents **Record unavailable** without the old roster.

| View | Desktop | Phone |
| --- | --- | --- |
| Syllabi | ![Syllabi](12-syllabi.png) | ![Phone syllabi](mobile-12-syllabi.png) |
| Saved outline | ![Outline](13-syllabus-outline.png) | ![Phone outline](mobile-13-syllabus-outline.png) |
| All instructors | ![Instructor summary](14-all-instructors.png) | ![Phone instructor summary](mobile-14-all-instructors.png) |
| All blocks | ![Block summary](15-all-blocks.png) | ![Phone block summary](mobile-15-all-blocks.png) |
| Year levels | ![Year summary](16-year-levels.png) | ![Phone year summary](mobile-16-year-levels.png) |
| Withdrawn record | ![Unavailable record](17-record-unavailable.png) | ![Phone unavailable record](mobile-17-record-unavailable.png) |

## Existing links and access

Dean `/course-loading` opens **Course loads**; its instructor tab opens **Instructors**. Dean `/records?tab=sections` opens **Students**. Old import-tab addresses fall back to **Course records**. Program Coordinator Records/Course Loading/Monitor, imports, templates, history and block correction retain their existing role permissions. New `/instructors` and `/students` routes are Dean-only.

Captures use original synthetic records and controlled account/API transport: four syllabus instances, three course codes, four students, five memberships and three blocks. One current attempt and one open retain test provenance in fixture data, without visible suffixes. The images demonstrate UI behavior, not hosted authentication or real student achievement. See [validation](../../versions/2026-11-11-dean-activity-records/validation/results.md).

## Curriculum population update

Course loads include **Curriculum load** with units, year and semester from the recorded curriculum. Counts labelled **Student assessment attempts** refer to learners, not instructor syllabus submissions. The instructor approval/signatory process remains offline. [Assignment and genuine-activity guide](../38-curriculum-population/README.md).
