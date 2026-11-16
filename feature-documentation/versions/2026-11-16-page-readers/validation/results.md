# Page readers and teaching attachment controls

Status: local verification complete; production release verification follows the source push.

Scope: page-sized teaching readers/authoring forms across Instructor, Student, Admin support and Dean/Program Coordinator scans. Fixed contextual header, one scrolling body, readable documents and available attachment selection with explicit private saves. Preserve original-file rendering, role scopes, class schedules, approval/revision guards and score history.

Verification uses the built application and controlled authenticated API/Storage transport. It does not claim hosted sign-in, live file uploads or independent learner activity. Broad guide image recapture remains paused by the owner; affected capture assertions are updated and private screenshots reviewed. No live teaching/student data is generated or rewritten.


## Completed local checks

- 54 distinct desktop/phone checks passed: 18 focused page/attachment scenarios, 28 existing Instructor/student/original-file regressions, and eight approved-file/Dean/Program Coordinator scan checks. The last two reader cases were rerun after the final phone touch-target styling and passed.
- Scenarios cover fixed header during body scrolling, viewport fit, explicit file selection/save, checked-to-draft transition, unchanged questions/content, prepared drafts before approval, pending failed-journal recovery, per-file download failure/retry, student/Admin downloads, management read-only scans, role revocation, original PDF/Word/PPT/image rendering, source navigation, practice, delivery and no-write/no-upload reload.
- Nine native tests passed for teaching-file Storage privacy/immutability/release/enrollment scope and Instructor course/topic boundaries. No schema, API contract, Storage policy or live business data was changed.
- Type checking, lint, production UI build and diff whitespace checks passed. Lint retains existing repository warnings. docs:check reports the existing owner pause; it was not weakened by this task.
- Final desktop and phone PNGs were opened and visually reviewed privately. The capture pipeline now asserts the page-reader class/header and adds desktop/phone reader scenes for the owner's later image recapture.

Initial development-browser timeouts occurred during severe host memory pressure (about 78 MB free). Switching to the built static UI transport and loading server chat fixture code only for its chat scenario resolved that overhead; the smaller and subsequent regression runs passed. Two focused tests initially exposed an ambiguous Add as accessible label, which was corrected. The management regression still expected the older PDF renderer's uploaded-syllabus label; its assertion now follows the shared renderer's existing uploaded-file label and continues to assert actual drawn pages and readonly/revoked access. Those corrected cases passed on desktop and phone.

Private evidence remains ignored: `.data/page-readers-{focused-final,regression,roles,native,final-visual,lint,build-final}.log`, `.data/page-readers-role-results`, `.data/page-readers-final-visual`, and `.data/page-reader-{desktop,mobile}-final.png`. These are synthetic transport evidence. No fixture account, file or assessment is persisted to production.
