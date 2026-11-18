# 46 · Manage a course and inspect its teaching contents

**Who:** Dean and Program Coordinator, including a verified Admin support view. **Where:** **Course**.

Course list and Course loads are one workspace. Its summaries show Courses, Loaded courses, Not yet loaded and Instructor loads. Search and All/Loaded/Not yet loaded narrow the selected semester's course cards. Upload previews matches before confirmation. Old Course-list and Course-load URLs open this same page.

**Add Course** has exactly three fields: **Course code**, **Course title** and **Units**. The selected **Academic term** supplies the semester and academic year automatically. No course year level or default-semester input is required. Year levels come from the registered students in instructor-confirmed class lists. Edit can rename the title or change units; the code stays fixed. Course cards retain their three-dot Edit/Suspend menu and offer Reactivate/Remove after suspension. Removal preserves the identity, original teaching files, assignments and learner history.

Instructor cards use the same three-dot action menu for **Edit instructor**, **Suspend instructor**, and, after suspension, **Reactivate instructor** or **Remove instructor**. The instructor detail dialog also keeps these actions in a menu. Menu actions do not open the card detail at the same time. Arrow keys navigate, Escape closes the menu and returns focus, and menus stay within the viewport on desktop and phone. Reload restores only current authorized record references and action dialogs, never unsaved form values or mutations.

If the Instructor dialog and its menu are open during reload, the menu keeps keyboard focus. Escape closes the menu first, leaving the Instructor dialog open; a later Escape closes the dialog.

Select a card for its page modal, summaries and loaded instructors. **Add instructor** assigns the course to an active instructor in the selected semester. It has no block or student fields and does not enroll students. The instructor sees the assignment in Course, adds the approved syllabus, and opens **Block sections → Add block section**. Upload a class list or use **Choose individual students** to select registered students, including students from other blocks or departments. Confirmation verifies every official student identifier and the 35-student class limit. Home directory records remain unchanged. A class list may be confirmed before the syllabus; students see its course/instructor labels while awaiting content release.

**Academic term** is shared across Dashboard, Course, Instructors, Students and monitoring/performance views for the current account and role. Current is First Semester AY 2026–2027; Next is Second Semester AY 2026–2027. Only those periods expose authoring and CRUD controls. Previous, other recorded and All terms are view-only. The database also rejects writes to completed-term catalog, assignments, operational teaching files, class lists and learner records. Reload restores the selected term without repeating any save.

**View syllabus and contents** opens a separate read-only course scan. It uses the same matching course/term syllabus basis as the instructor workspace, preferring the active syllabus. It shows outline/material/assessment/published-item summaries, the extracted course outline and chronological weekly teaching contents, including saved drafts. An empty course says that no syllabus has been added. An outline without authored content shows the empty weekly state.

**View uploaded file** opens the actual approved PDF or DOCX retained by the instructor. It does not rebuild an imitation from extracted text. Teaching materials open in the existing read-only document reader; assessments show their questions and choices without answer keys or marking guides. Referenced teaching-file attachments use short-lived authorized downloads. Dean and Program Coordinator cannot edit, check, deliver, answer or mark the inspected content. Inspection does not record a learner open, reading progress, assessment session or attempt.

Reload restores the selected course, instructor scan and file/content reader after fresh authorization. Session view storage contains bounded record IDs only. Removed/reassigned loads and removed files/content are resolved again; the former response is not restored from storage. Close and Escape dismiss the top dialog and clear its saved reader reference. Switching roles/accounts keeps view references isolated. No assignment or learner command is replayed on reload.

This supersedes the older two-tab Course screenshots in [Dean activity records](../36-dean-activity-records/README.md). Broad screenshot publication remains paused by the owner; the browser pipeline checks the merged page, course modal, role parity and read-only scans.


## Continue a class with a replacement instructor

For the same course and academic term, **Edit → Instructor → Save instructor** gives the replacement independent teaching copies and continues its confirmed classes. The approved original file, extracted syllabus, materials, assessments, states and delivery windows are retained. Existing students keep recorded scores, attempts, reading/access history, dates and attribution. Private files remain immutable and use authorized downloads.

**Remove load** removes the course assignment and its confirmed classes from the instructor's teaching list and retains their teaching package. Adding an instructor later offers **Teaching package** when a retained package is available. Select that package to continue its actual classes, or start without an existing syllabus. An occupied class, unavailable instructor or stale assignment fails atomically. Another semester remains independent.

If the original instructor retains other blocks, their syllabus and teaching workspace remain unchanged. If the replacement already teaches another block of this course, the inherited block has its own bound syllabus and course card; existing content is not overwritten. Each card names its blocks. Owned repository drafts remain independent of teaching assignments.

The Instructor detail modal lists only syllabi belonging to assigned courses in the selected term. With no loads, its Course loads and Syllabi and delivery sections are empty even when that instructor owns repository files. A removal clears those teaching rows; reload rechecks current records.

Handover is atomic: invalid approved-file integrity, unavailable accounts, insufficient workspace/source capacity or another invalid record aborts the assignment and copies together. Unsaved local edits stay on their original device; the recipient's workspace revision advances so an older save must resolve the existing conflict recovery. Retained sources explicitly referenced by ID or source URL in the teaching package are copied with their provenance. Unavailable or unassociated source copies are not described as readable context. No paid inference, indexing, student-open event or assessment submission is triggered.

## Approved-load PDFs and terms

Course now accepts PDF through Upload course load, opening the same full page review used by Pulse attachments. Academic term switches current, next, previous, other recorded or unassigned terms. Instructor/course detail rows retain schedules, rooms, units, listed/computed hours, source headcounts and source filename/page. The instructor directory includes all original departments again. [Manual 47](../47-teaching-load-documents/README.md) describes review and confirmation; the supplied files were scanned without automatically reloading assignments.
