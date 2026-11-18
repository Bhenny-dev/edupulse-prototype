# Course and Instructor card actions · 18 November 2026

Dean and Program Coordinator Course cards now expose Edit and Suspend in a three-dot menu, with Reactivate and Remove available after suspension. Add Course is at the top right of the Course panel. Course title and curriculum metadata can be edited without breaking the course code or changing original teaching files. Removal retains the catalog identity, existing classes and learner history. New loads reject suspended/removed courses.

Instructor cards replace separate Edit/Suspend buttons with the same accessible menu, retaining the existing account commands. Shared action menus remain inside the viewport after reload, including cards below the visible page. Fresh authorization and explicit confirmation remain required; navigation restoration never replays a write.

[Course loading guide](../../system-manual/46-course-load-workspace/README.md) · [Validation](validation/results.md).

Live on [EduPulse](https://edupulse-prototype.vercel.app) from `41914c86`. The hosted release gate passes 459 native tests; all 42 local desktop/mobile checks and 12 deployed menu/CRUD/reload checks pass. Course, Instructor and dialog menus retain the same management permissions and suspend-before-remove behavior.
