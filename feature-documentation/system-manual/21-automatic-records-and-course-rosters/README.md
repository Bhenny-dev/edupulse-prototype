# 21 · Automatic records and course students

The examples use synthetic account, directory, workspace and academic transports. They show the real interface and request lifecycle. Native PostgreSQL tests and a rolled-back hosted canary separately check persistence, access removal and retained attempts; these images are not real student activity.

## Syllabus and Course

**Syllabus** has exactly three tabs: **My Syllabus**, **Shared Repository** and **Syllabus Builder**. Opening Syllabus defaults to **My Syllabus**. The former roster tab has moved to **Student Monitoring → Students**; an old `syllabus?tab=register` link redirects there.

![Three syllabus tabs](06-syllabus-tabs.png)

The instructor navigation and page title now say **Course**. The existing course/week workspace, generated materials, assessments, review, publishing, document/presentation readers and three-dot action menus remain. The `/courseware` address and saved course/week links still work. Student navigation retains **My Courses**. An active approved syllabus is still required for generation and release.

![Course page](07-course-page.png)

## Manage course memberships

Open **Student Monitoring → Students**. **Assessment Scores** and **Learning Material Access** remain available in the same page. The legacy **Scoring Sheet** address opens assessment scores.

![Instructor course students](01-course-students.png)

Use **Choose students** to select registered accounts. The directory retains its search, year-level, department, program and pagination controls. Choose **Course for selected students**, enter **Block section**, then **Register selected students**. The action waits for a revision-checked save. Failed saves retain the selection; background refresh never confirms or resubmits the registration.

**Import an EduSuite class list** expands the existing CSV, Excel, PDF, Word and text importer. It still reads the actual file and previews its rows before **Register Course**. Import failures leave the file/preview available. An email is required for account-based access; a name-only imported row does not create an account or grant access.

The roster combines this owner's saved registrations and authorized enrollment records. Filter by **Course**, **Block section** or **Find enrolled student**. The table contains individual course memberships, so a learner in two courses can appear twice. It does not become a college-wide editable student directory.

Open a student's three-dot menu:

* **Change block** opens **Change student block**. Enter **New block section** and choose **Save block assignment**. The database enforces a maximum of 35 students per course block; a failed change rolls back.
* **Remove from course** opens a confirmation. **Confirm removal** withdraws that course membership after the save. **Cancel** leaves it unchanged. The student account, official profile and past attempts remain. Missing-email file rows can be edited/removed locally without claiming account access.

![Confirm a block change](02-change-block.png)

![Confirm course removal](03-remove-membership.png)

For imported institutional class lists, a saved instructor membership decision is applied again during workspace projection and direct shared imports. A later sync cannot silently restore a removed learner. Explicitly registering the account again restores membership. Enrollment alone does not release drafts: an active approved syllabus and published, released materials are still required.

![Roster on a phone in dark mode](mobile-01-course-students.png)

![Mobile block change](mobile-02-change-block.png)

![Mobile removal confirmation](mobile-03-remove-membership.png)

## Cached records and deliberate refresh

The owner's later cache instruction supersedes automatic timer/focus refresh. Records load once on account/view entry. Returning focus, connectivity or visibility retains the loaded snapshot and open reader. There is no polling reload. **Export** / **Export authorized records** remains available after records load.

* Your own confirmed mutations still receive an authorized readback. One in-flight record read is shared; a mutation during that read invalidates its result and reads the newer projection. This preserves save/score/access correctness without replaying a business command.
* Normal workspace saves still project their confirmed contents transactionally. An instructor's older clean cloud workspace is reconciled once after its initial load. Dirty edits, saves, conflicts and errors block reconciliation.
* Workspace edits retain their existing debounce save. Confirmed writes retain revision checks and exact lost-response recovery. Focus/reconnect do not reload a workspace or retry a failed write. Local pending edits and conflict/export recovery remain available.
* Another of your account's tabs sends only an invalidation signal. **Updates available** offers **Refresh records**, without replacing the current view. **Settings ? Data & Privacy ? Refresh workspace and records** is available for a deliberate general refresh; pending edits, saves and conflicts must be resolved first.
* Offline and failed reads retain the loaded cache. **Retry connection** explicitly retries a failed read; there is no timer/backoff replay. Authorization failures clear records. Account/role/support-subject changes cancel obsolete reads and isolate caches.

The first image now shows an authorized readback after a synthetic confirmed change, while the loaded dashboard stays visible. The filename is retained for existing links; it is not evidence of timer polling.

![Authorized readback retaining the loaded dashboard](04-background-update.png)

![Offline cached dashboard](05-offline-cache.png)

![Loaded status and Export on a phone](mobile-04-dashboard.png)

**Records up to date** records the last successful authorized read, rather than a guarantee that another tab has made no changes. Pending workspace edits, conflicts, errors, loading, offline and update-available states remain distinct. No student scores or completion are guessed. Refresh does not submit assessments, approve syllabi, publish material, send reminders or call a paid model.

[Manual 27](../27-cached-workspaces/README.md) shows retained Course readers and deliberate refresh. The [original membership release validation](../../versions/2026-11-07-automatic-records-and-course-rosters/validation/results.md) remains historical evidence for roster persistence and access boundaries.
