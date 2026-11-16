# Page readers and teaching attachment controls

Status: released and verified. Runtime source `7571cf45b45d7a800f7f727930f6799efd6d243f` is deployed to production.

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


## Production release

Git push advanced main from `25b579fe` to runtime `7571cf45`. Automatic Vercel production deployment `dpl_2JUnc994n77RnYvWM1ncJ46MGzSm` reached READY. The canonical [EduPulse site](https://edupulse-prototype.vercel.app) resolved to that exact ready deployment. Its unchanged `npm run verify` gate passed lint/type checking, model assets, all **399 tests with zero failures/cancellations/skips**, production bundling, and the built-assets/API-routing/serverless-health/public-retrieval checks. Existing lint, chunk-size and mixed dynamic/static import warnings remain advisory.

All **18 focused desktop/mobile page-reader tests then passed against the canonical production interface** using controlled authenticated academic and Storage transport. They verify the deployed components and assets, not real sign-in/upload or learner activity. Production data, auth accounts, scores, course loads, publications and file policies were not mutated by these checks. No SQL migration was part of this task.

Private release evidence: `.data/page-readers-vercel-build.log`, `.data/page-readers-deployment.json`, `.data/page-readers-alias.json`, `.data/page-readers-production-browser.log`, and `.data/page-readers-production-results`. The primary local main checkout was fast-forwarded while preserving existing and concurrent unrelated edits, including the separate provider work. These unrelated changes were not staged or published with this task.
