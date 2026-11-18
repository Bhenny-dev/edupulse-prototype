# 46 · Manage a course and inspect its teaching contents

**Who:** Dean and Program Coordinator, including a verified Admin support view. **Where:** **Course**.

Course list and Course loads are one workspace. The first section uses the shared dashboard summary cards: Courses, Loaded courses, Not yet loaded and Class loads. Search and the All/Loaded/Not yet loaded filters narrow year-and-semester course cards. The existing course-load upload still previews matches before explicit confirmation. One CSV download includes course and instructor/block/semester details. Old Course-list and Course-load URLs open this same page.

**Add Course** at the top right records a course code, title, units, year level and default semester. It adds the catalog entry without assigning an instructor. Each course card has a **three-dot menu** containing **Edit course** and **Suspend course**. Editing can rename the title and change descriptive fields; the course code stays fixed so existing teaching records remain linked. A suspended course offers **Reactivate course** and **Remove course**. Remove appears only after suspension and asks for confirmation. Removal hides the catalog card while retaining its code, existing class loads, syllabus files, courseware and student history. Suspended or removed courses cannot receive new loads, including through imports. Existing classes remain available.

Instructor cards use the same three-dot action menu for **Edit instructor**, **Suspend instructor**, and, after suspension, **Reactivate instructor** or **Remove instructor**. The instructor detail dialog also keeps these actions in a menu. Menu actions do not open the card detail at the same time. Arrow keys navigate, Escape closes the menu and returns focus, and menus stay within the viewport on desktop and phone. Reload restores only current authorized record references and action dialogs, never unsaved form values or mutations.

If the Instructor dialog and its menu are open during reload, the menu keeps keyboard focus. Escape closes the menu first, leaving the Instructor dialog open; a later Escape closes the dialog.

Select a course card to open a page-sized modal. Its summaries show assigned instructors, class loads, distinct current registered students and extracted syllabi. Loaded instructors are listed with their block and semester. **Add instructor** assigns an active registered instructor to selected blocks; the assignment appears in that instructor's Course page. **Edit** changes the instructor, block or semester in one transaction. A stale selection, unavailable instructor or occupied destination fails without removing the original assignment. **Remove** asks for confirmation and removes the teaching load, retaining saved teaching content and assessment history. These actions manage course assignments, not deletion of instructor accounts.

**View syllabus and contents** opens a separate read-only course scan. It uses the same matching course/term syllabus basis as the instructor workspace, preferring the active syllabus. It shows outline/material/assessment/published-item summaries, the extracted course outline and chronological weekly teaching contents, including saved drafts. An empty course says that no syllabus has been added. An outline without authored content shows the empty weekly state.

**View uploaded file** opens the actual approved PDF or DOCX retained by the instructor. It does not rebuild an imitation from extracted text. Teaching materials open in the existing read-only document reader; assessments show their questions and choices without answer keys or marking guides. Referenced teaching-file attachments use short-lived authorized downloads. Dean and Program Coordinator cannot edit, check, deliver, answer or mark the inspected content. Inspection does not record a learner open, reading progress, assessment session or attempt.

Reload restores the selected course, instructor scan and file/content reader after fresh authorization. Session view storage contains bounded record IDs only. Removed/reassigned loads and removed files/content are resolved again; the former response is not restored from storage. Close and Escape dismiss the top dialog and clear its saved reader reference. Switching roles/accounts keeps view references isolated. No assignment or learner command is replayed on reload.

This supersedes the older two-tab Course screenshots in [Dean activity records](../36-dean-activity-records/README.md). Broad screenshot publication remains paused by the owner; the browser pipeline checks the merged page, course modal, role parity and read-only scans.


## Continue a class with a replacement instructor

For the same course, block and academic term, **Edit → Instructor → Save load** gives the replacement an independent teaching copy. The approved original file, extracted syllabus, materials, assessments, checked/draft/delivered states, release/deadline settings and that block's weekly delivery window are retained. Existing students keep their recorded scores, attempts, reading/access history, dates and attribution. Private teaching files remain immutable and use authorized downloads.

**Remove load** removes this class from the instructor's current teaching list and records its teaching package for the next assignment to the same course/block/term. Assigning a replacement later continues that saved package. Changing the block or term identifies a different class and does not automatically move the old class's student history. A stale removal is rejected when the instructor changed after opening the confirmation.

If the original instructor retains other blocks, their syllabus and teaching workspace remain unchanged. If the replacement already teaches another block of this course, the inherited block has its own bound syllabus and course card; existing content is not overwritten. Each card names its blocks. Owned repository drafts remain independent of teaching assignments.

The Instructor detail modal lists only syllabi belonging to assigned courses in the selected term. With no loads, its Course loads and Syllabi and delivery sections are empty even when that instructor owns repository files. A removal clears those teaching rows; reload rechecks current records.

Handover is atomic: invalid approved-file integrity, unavailable accounts, insufficient workspace/source capacity or another invalid record aborts the assignment and copies together. Unsaved local edits stay on their original device; the recipient's workspace revision advances so an older save must resolve the existing conflict recovery. Retained sources explicitly referenced by ID or source URL in the teaching package are copied with their provenance. Unavailable or unassociated source copies are not described as readable context. No paid inference, indexing, student-open event or assessment submission is triggered.

## Approved-load PDFs and terms

Course now accepts PDF through Upload course load, opening the same full page review used by Pulse attachments. Academic term switches current, next, previous, other recorded or unassigned terms. Instructor/course detail rows retain schedules, rooms, units, listed/computed hours, source headcounts and source filename/page. The instructor directory includes all original departments again. [Manual 47](../47-teaching-load-documents/README.md) describes review and confirmation; the supplied files were scanned without automatically reloading assignments.
