# 44 · Teach from the assigned course workspace

**Who:** a verified instructor, including a verified System Admin instructor support view. **Where:** **Home** and **Pulse**.

## Class codes and announcements in an Admin support view

Open a loaded class from **Home**. **Announcements** shows **Class codes** and **Upcoming** beside the announcement feed on desktop. Cards and their controls wrap within that sidebar; on narrow screens the sidebar follows the feed. The header keeps **Syllabus**, **Block sections**, **Teaching Materials & Assessments**, **Class List** and **Scores** available.

A System Admin viewing a selected instructor sees the same active class codes, join records and announcements as that instructor. **Copy class code** and **Display class code** are available. The code's three-dot menu offers **Replace code** and **Turn off code**, each with confirmation. A block without an active code offers **Create code**. These instructor support actions use the selected instructor's current assignment and record the actual Admin actor.

![Sample Admin instructor view: class code fits beside the announcement feed](12-admin-class-codes.png)

On a phone, scroll past the announcement feed to **Class codes**. The sample below shows the code and its controls contained within the card.

![Sample Admin instructor view: class code and controls on a phone](13-admin-class-codes-phone.png)

Reload restores the authorized class, selected tab, code display and pending code confirmation. It reads the latest active code and never repeats a replacement, code creation or announcement write. Codes themselves and unsaved announcement text are not navigation hints. These screenshots use fictional accounts and controlled UI responses; database tests separately check authorization and persistence.

The signed-in Instructor navigation is **Home**, **Syllabus** and **Student Monitoring**. **Home** opens the assigned class, which retains its approved syllabus and teaching outline. **Syllabus** is the separate repository for drafts, sharing and PDF building. Former Course URLs reopen the class; nested syllabus URLs redirect to the standalone repository with their tab/edit references. See [the syllabus repository guide](../45-syllabus-repository/README.md). Older task screenshots below predate Home; the class-code captures above show the current class view.

## Review the assigned courses and students

The dashboard uses the same summary-card component as the other academic roles. **Courses loaded** counts the current Dean-recorded course assignments, **Students handled** counts distinct active enrolled learners in those courses, and **Teaching materials delivered** counts their available non-assessment publications. **Assessment average** uses current-version marked assessment results from those enrolled students. Missing marks remain missing, and a genuine score of zero remains zero. Scripted/Admin demonstration rows do not become independent learner results.

![Assigned-course dashboard with the shared summary-card design](01-dashboard.png)

**My courses and block sections** names the course and its loaded blocks. Select a course card or **Open courses**. The **Course** list includes only courses assigned to this instructor by the Dean, including assignments that do not yet have a syllabus. **Search loaded courses** filters by course or block. An old or unassigned course link shows the current assigned list with an explanation instead of displaying a different instructor's content.

![Only the instructor's loaded courses, including one awaiting a syllabus](02-courses.png)

## Continue an inherited class

A same-class instructor switch can provide a continued teaching copy, labelled **Continued from** inside the selected course. Its approved syllabus, teaching files, delivered content, weekly window and the block's existing student history remain available. The copy is independent of the former instructor's remaining blocks. Multiple teaching bases for the same course keep separate block-labelled cards and stable reload references. A removed load leaves the teaching list; keeping a repository file or an old local registration does not restore it.

## Add the approved syllabus for a loaded course

1. Open an assigned course. Until it has an active, unsuspended syllabus, **Weeks and topics** shows **Upload syllabi**. Drop an approved PDF or DOCX, or activate the browse area. The retained approved-file limit is 750 KB; this is separate from the teaching-file limit below.
2. Review the extracted course identity, weekly contents and warnings. **View syllabus** and the retained original allow comparison. The uploaded course code must match the selected loaded course. Reading and OCR do not verify signatures or invent missing weekly mappings.
3. Confirm the approved-copy acknowledgment and choose **Use syllabus for course**. Wait for the revision-checked save. Source reading, retention and readable-text indexing follow this explicit intake; an unread or inaccessible source remains disclosed.
4. Alternatively choose **Choose a shared syllabus from the system**. Select a received copy for the same loaded course, acknowledge that it is authorized, then choose **Use approved shared syllabus**. The server verifies the sender's retained approved file before adoption. Merely receiving a shared copy does not activate or publish it.

The upload area is absent from the ready **Weeks and topics** view. Use the separate **Syllabus** navigation page for saved syllabi, received copies, the draft builder, offline approval steps and sharing/removal controls. The repository includes all of your syllabi, while teaching remains limited to assigned courses. Prepared content remains visible in **Weeks and topics** before approval, with delivery blocked until the approved syllabus is active. Saved suspension remains required before deletion; approval and publication remain separate.

## Work through weeks and topics

**Weeks and topics** lists the approved outline chronologically. Open a topic to see its extracted **Contents**, **Learning outcomes**, **Teaching-learning activities**, teaching materials and assessments. A topic corresponds to the outline's saved scope section; a week may have several sections and the same section may cover multiple weeks. The complete extracted contents remain visible within that scope.

![A weekly topic with teaching materials, assessment coverage and progress pills](03-weeks-topics.png)

The quick-context pills show **Materials accessed** and **Assessment average**. Access is the proportion of currently enrolled students who opened the available materials; opening is not proof of finishing or understanding. The score pill uses marked current-version attempts, not pending written responses, revoked memberships or earlier publication versions. **Not delivered** and **No scores yet** are honest states, not fabricated zeros.

### Add teaching content

Choose **Add teaching material**. The extracted activity or topic text is shown as context and as the field placeholder. Set a **Title**, then select **Add as**:

| Option | What to add |
| --- | --- |
| **Write teaching content** | Instructor-written text in **Teaching content** |
| **Upload a file** | An original **Teaching file**, any file type up to 4 MB; readable supported documents can contribute extracted text |
| **Add a link** | A complete HTTP/HTTPS **Resource link**, with explanatory teaching text where needed |
| **Generate content with AI** | Explicit **Generation instructions**, followed by **Generate draft** |

![Teaching-material form with the extracted activity as context](04-material-form.png)

**Save material draft** creates a private draft and opens it in a separate reader. Binary uploads are private stored files, not public links or inline workspace blobs. A successful attachment does not mean every file type was read: unsupported or unreadable bytes remain downloadable but are not represented as source text for AI. Adding a teaching-resource link does not by itself establish that its contents were downloaded or read.

### Read and attach files in the page modal

**Open** displays a page-sized reader with a padded course-content heading, week/type context and a persistent close button. The document scrolls beneath that header; long titles and controls wrap on a phone. The reader uses larger teaching text and one document action toolbar. **Edit**, **Print** and **Download PDF** remain where applicable; an uploaded PDF, Word, PowerPoint, image or supported text file still displays its original contents. Unsupported files remain downloadable attachments rather than invented extracted text.

For an owned draft or checked material/assessment, **Attach file** opens the file chooser. Any file type up to 4 MB is supported. Choosing a file stages it locally; **Save attachment** uploads and saves it explicitly. A new attachment returns checked content to Draft for review while keeping its questions, teaching text, topic association and existing files. An instructor may also prepare private file-backed content before syllabus activation; approval and delivery remain separate required steps.

Pending local edits do not disable the file chooser. If a current save or a workspace conflict prevents persistence, the selected file remains visible with an explanation. Resolve the existing save recovery in Settings before retrying. A failed download restores its own button; it does not lock other attachments. Published/hidden content remains protected: **Prepare draft revision** is available from its normal reader, then attachment/editing happens in that draft. Read-only citation previews do not offer that authoring action.

The same reader layout is used for student course materials/assessments and practice sets, Admin-selected academic views, approved-syllabus previews and Dean/Program Coordinator course scans. Students and management can download files permitted by their current course access; their reader does not gain instructor upload/edit controls. Existing block opening/closing times, private file policies, score history and no-write reload remain in force. A reload restores an authorized reader, never a selected unsaved file, upload, download or assessment submission.

### Add an assessment after the relevant materials

Use **Add assessment after this material** or **Add assessment** after one or more materials. A regular assessment covers the teaching materials since the preceding regular assessment. The form names that coverage and shows the extracted assessment label/instructions as context. The final **Overall assessment** section is kept last and covers every teaching material in the topic.

An extracted assessment type preselects **Assessment type**. When generating without a specified type, leave **Choose automatically from the teaching content** or explicitly select Multiple choice, True or false, Enumeration, Identification, Essay, Matching type, or the single combined **Follow-along / Step-by-step documentation guide or criteria**. Manual authoring uses **Multiple choice (default)** when no type is selected. **Write assessment questions** opens the question editor; complete the question text and required choices, then **Save Assessment**. An incomplete assessment remains unsaved. Written formats retain instructor marking; they do not acquire automatic official grades.

**Generate content with AI** is optional. Assessment generation requires readable teaching content for its stated coverage and uses the approved topic and readable syllabus references. An attached file or URL without readable text cannot substitute for that context. Generated content starts in Draft; the model does not check or deliver it. If materials later change, review the displayed coverage warning before delivery.

### Check and deliver from the topic

There are exactly two course tabs: **Weeks and topics** and **Block sections**. The former Review and deliver / Review drafts workspace is removed from the signed-in course. Former review links redirect to Block sections. Draft authoring and review stay in the extracted weekly topic sections, including prepared drafts awaiting approval.

Open and review an item, then **Mark checked**. **Deliver to students** opens a separate dialog. For assessments, **Assessment settings** retains allowed attempts and the time limit; changing these rules returns the item to Draft for checking again. **Deliver checked content** requires an active approved syllabus and a saved opening for that week in at least one currently assigned block. The server rechecks the current load, schedule and checked-before-publication rules. A block without a matching saved schedule cannot access a new scheduled publication.

Delivered or hidden content is read-only. **Prepare draft revision** explains withdrawal and requires confirmation; it returns the item to Draft for editing/checking/redelivery while retaining recorded assessment scores and reading history. **Hide** withdraws the delivered item without deleting that history. Week moves retain the same protections below.

## Schedule delivery by block section

1. Open **Block sections**. Shared summary cards show assigned blocks, outline weeks, total scheduled block-weeks and weeks with an optional closing time. Each card names an actual assigned block and its current active roster count.
2. Select a block to open its page-sized **Delivery schedule** dialog. Dates and times use **Philippine time (Asia/Manila)**, regardless of the device timezone.
3. In **Weekly class pattern**, choose the first outlined week's class date and required class start. For example, Friday 20 November 2026 at **07:30**. Add **10:00** as the close if desired, then choose **Fill weekly dates**. This fills one date every seven days by the actual week number; examination slots and gaps keep their chronological dates.
4. Review the table and adjust individual dates for holidays or class changes. Every week needs a date and opening time. A closing time is optional and must follow the opening on the same day. Leaving it blank keeps that week's content available after opening.
5. Choose **Save delivery schedule** explicitly. Filling the pattern or reloading does not save. A stale save reports a conflict and keeps the entered form available; close/reopen the block to read the current saved revision before retrying. Unsaved date edits are not restored after a reload.
6. Return to **Weeks and topics** and deliver checked content. The saved per-block windows govern the newly delivered teaching materials and assessments for that week. Separate blocks can have different dates and times.

Students can see scheduled item titles and their own saved results outside a class window, but cannot read the locked teaching text, download its files, begin/submit an assessment or confirm reading. Availability is rechecked on an explicit open. Closing is exclusive: at 10:00 a 10:00 close has taken effect. The assessment's own duration/attempt rules still apply within the class window. A saved no-close window stays open after its start. Existing publications retain their previous delivery settings until explicitly revised/redelivered; saving a block calendar does not rewrite old content or scores.

### Move teaching weeks

Drag a week by its handle, or use its labelled **Move week … up/down** buttons. Move the complete teaching scope rather than editing the week number. The displayed week slots stay chronological and examination weeks keep their scheduled slots. Topic IDs and their associated teaching content move together.

If delivered or hidden items would move, a confirmation explains that affected content will return to Draft and be unavailable to students until reviewed and delivered again. **Move weeks and prepare drafts** performs the explicit revision-checked save. Cancel or reload does not perform the move. Recorded assessment scores and history are retained.

## Read the syllabus sources at the end

**Syllabus sources** follows the complete weekly sequence. It collects the overall bibliography and references in the actual outline sections, deduplicating shared sections. The panel distinguishes readable retained text, unread/unavailable sources and catalog-only metadata. A catalog match identifies a work; it does not supply a book's full contents or verify an edition.

![Syllabus sources after the weekly sequence](05-sources.png)

Approved-file intake checks/retains sources and indexes actual readable copies. Use **Search and read sources** to retry reading/indexing afterward. For the same link or book, open its source menu and choose **Attach readable copy** to add the matching readable PDF, DOCX, HTML, TXT or Markdown copy, up to 2 MB. Check the work and edition. This retained copy is the context for that citation; it is not a different substitute source. Existing saved copies can support later generation without a repeated download. **Search or read again** is an explicit refresh, and unread references cannot substantiate generated claims.

**View** opens the retained reading, provenance and original-copy download. Retained text is private to the actual account; shared syllabi do not automatically share its private source files. Keep a usable course file separate from the cited source copy when their roles differ. [Manual 31](../31-retained-syllabus-sources/README.md) covers reading limits, versioning, citation inspection and source selection.

## Use Pulse as system chat

Ordinary greetings, application questions, record searches and navigation use system rules and currently authorized EduPulse content. Keyword and bounded spelling matching do not rewrite IDs or authorize a record change. A miss offers clearer keywords or a target; it does not silently invoke a connected text model or search the Internet. A suggested navigation correction offers a button for confirmation. Explicit educational drafting or revision can use the connected provider or on-device model; web research requires an explicit request outside those authoring workflows.

Click a system-answer citation to open **Source reference**. The dialog checks the source again using the saved question and current authorization. Read the quoted passage and choose its **Open …** button to confirm navigation into EduPulse. Teaching-material references open a read-only reader; citation navigation does not record a learner open or start an assessment. A missing, changed or revoked source produces an unavailable explanation instead of displaying cached private text.

![Current authorized source in a separate dialog with confirmed navigation](06-source-popover.png)

Source navigation stores only bounded conversation/message/source IDs. Reload may repeat the read-only authorized source lookup, never a model request, save, learner action, publication or assessment response. Ephemeral attachments that are no longer available cannot be reconstructed from a filename. The existing microphone/Stop recording/transcribe-to-draft flow and explicit **Send** remain unchanged.

## Phone and reload behavior

The same cards, topic controls and dialogs fit a phone. A keyboard alternative accompanies dragging. The selected course/tab, block schedule dialog, expanded topics, current reader, source dialog and unfinished action location restore only after fresh account and record checks. Unsaved form text and assessment answers are not navigation hints. Focus, timers and reconnects do not involuntarily reload a loaded workspace.

![Assigned course and topic controls on a phone](07-mobile-course.png)

These captures use fictional academic records and controlled transport to exercise the real interface. They do not prove hosted sign-in, external approval, arbitrary-file extraction quality, protected-book access, paid inference quality or independent student achievement. The release validation records native/API/database and production checks separately.
