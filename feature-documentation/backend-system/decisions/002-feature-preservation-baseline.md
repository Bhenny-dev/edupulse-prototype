# ADR-002: preserve the pre-makeover feature contract

Date: 28 October 2026. Status: accepted by the owner in this conversation.

The preservation baseline is `5e7d95638c7abf8f74e85ec96cbf90ae491ed674` (8 October), immediately before the 24 October “Improve and integrate backend” conversation and commit `5afbd0c`. The owner confirmed it after a read-only comparison of code, specifications, manuals, role guides and historical screenshots. The scan inventoried 64 Markdown files; contradictions already existed within that baseline.

Preserve the feature contract while retaining later explicit corrections: five roles, Associate Dean excluded from student scores, Dean read-only performance, instructor-owned authoring, student enrollment boundaries, offline Dean review → CAO approval → EVP noting, secondary page tabs without duplicate sidebars, and solid dark surfaces. This is not a wholesale rollback or restoration of sample scores into authenticated accounts.

An absent backend operation is unfinished implementation, not permission to remove a documented feature. Shared file intake/loading, topic mastery, scheduled publication, response marking, notices and editable syllabus history remain in scope. Private CSV intake is not equivalent to shared roster import; assessment-score radar is not equivalent to syllabus-topic radar. Preview controls and success toasts do not prove durable behavior.

The implementation extends existing workspaces and authorized academic projections with additive migrations. Human-confirmed EduSuite exports remain the official input. Confirmed loading proposals can change the imported assignment in EduPulse; they do not write back to EduSuite or issue institutional appointments. Proposals rank recorded master's degree first, then specialization match, and require management review.

Question mappings must match approved outline topics. Unmapped and ungraded responses stay out of mastery. The latest attempt per published version contributes to the current view; historical mapped attempts remain in history. No AI risk prediction or institutional grade calculation is introduced.

The Dean review inbox records the offline station and correction request; it cannot approve electronically. Restoring a historical syllabus creates a new draft and clears approval. Changed teaching weeks withdraw affected courseware for review. Current approved-file bytes are not duplicated into historical snapshots.

See the [baseline release record](../../versions/2026-10-28-baseline-workflows/README.md) for validation and deployment limits. This decision supersedes earlier language treating shared loading or topic mastery as outside the restored scope.


## Official student directory extension, 2 November 2026

The owner supplied the official student list across 23 programs and explicitly requested student accounts grouped by year, department and program, with instructors choosing their course rosters. This authorizes a shared staff-readable student directory for those listed programs. It does not authorize automatic course enrollment, publication, new instructor assignments or separate institutional tenants. Students read only their own directory profile and retain course access only through their verified account email, instructor-confirmed enrollment, an active approved syllabus and released publications. Official profile rows are maintained by trusted provisioning; editable profile metadata cannot grant access.

## Owner correction: course pages and automatic sync, 7 November 2026

The owner explicitly moved instructor course roster management out of Syllabus and into **Student Monitoring → Students**, retaining **Assessment Scores** and **Learning Material Access**. Syllabus now has only **My Syllabus**, **Shared Repository** and **Syllabus Builder**. The instructor **Courseware** navigation/page title becomes **Course**, with materials, assessments, readers and actions retained. Old URLs continue to resolve.

Instructors may explicitly add registered accounts to their own course, change a block or remove course membership. This does not delete accounts, edit official directory identities, change institutional imports, compute grades or grant access to another instructor's courses. Saved removals remain effective across later import/sync; history stays retained.

Refresh and clean-workspace reconciliation are automatic, with stale-response isolation, one in-flight read, offline/backoff behavior and revision conflict protection. This authorization applies to idempotent reconciliation and authorized readback. It does not authorize automatic business-command replay, publication, approval or paid inference.

Owner correction, 8 November 2026: the existing System Admin role selector must also allow selecting an actual person. Preserve own-account role viewing as an explicit option. Subject academic permissions remain enforced, provider/private conversation ownership remains with the actual admin, support operations are audited, and support previews must not fabricate learner activity or scores.

## Owner correction: deliberate page refresh, 9 November 2026

The owner later requested that leaving and returning to a page preserve loaded/cache state and that reload be manual. This supersedes timer, focus, visibility and reconnect revalidation above. Identity entry and authorized readback after a confirmed local mutation remain necessary. Preserve workspace debounce saves, revision conflicts, lost-response reconciliation, role/subject isolation and publication/assessment boundaries. Other-tab changes may announce available updates without applying them or replaying commands.

### Owner correction: reload the current authorized view, 10 November 2026

The owner explicitly requires browser refresh to retain the viewed page and its supported modal/popover, including a System Admin's selected role and person. This is a preservation requirement for existing and future features, not permission to retain stale authority. Restore the hash route and allowlisted navigation references only after verifying the current session and, for a selected person, resolving that subject through the read-only support endpoint. Scope tab-local hints to the actual account, subject and role; store references rather than profiles, credentials or pending actions.

Do not redirect to the default dashboard while restoration is pending. A temporary verification failure preserves the URL and offers retry. An unavailable subject or changed role stays gated until an explicit recovery choice; returning to System Admin requires a freshly verified admin principal. Signing out, closing account selection or exiting a support view clears its corresponding hints. Reload must not replay support enter/leave, student opens/assessment commands, publication, workspace writes or inference. This extends the manual-refresh correction above without reintroducing focus/timer/reconnect polling. [Manual 23](../../system-manual/23-account-support-and-pulse-context/README.md) and [Manual 27](../../system-manual/27-cached-workspaces/README.md) describe the view boundaries.


## Owner correction: approved-copy course intake, 9 November 2026

The owner explicitly requested **Upload syllabi** from empty and populated Course lists, leading to approved-file scanning, viewing and selection in **My Syllabus**, and removal of the global five-station indicator. An instructor with an already approved copy need not manufacture a draft or register a course first. Explicit human attestation plus reviewed extraction may save an active syllabus directly through the normal owner-scoped workspace API. The retained file, hash, usable outline, revision checks, courseware review/publication and enrollment boundaries remain required. Builder draft preparation, historical versions and offline approval actions remain available; this correction does not grant electronic signature approval or automatic courseware release.

### Owner-requested syllabus source retention, 9 November 2026

Additive reference reading and immutable private copies extend the restored Course workspace. Section 7 and weekly resources enter generation; readable text supports passage citations, while bibliography listings alone do not. Existing optional drafting, checked/published content protection, shared syllabi, support-view boundaries and student delivery are preserved. A failed source read cannot masquerade as a verified source or remove the educational drafting interface. New source controls and exact-hash reviewed captures ship with [Manual 31](../../system-manual/31-retained-syllabus-sources/README.md).

### Person follow-up correction

The owner reported a registered-person answer followed by ?do you know him on fb?? returning aircraft. Preserve the recent person in the same conversation, recheck current permissions, and distinguish a public search suggestion from verified identity. Explicit topic changes must not inherit the prior person. Completed account switches continue to clear private conversation state.

## Owner correction: resumable courseware parts, 10 November 2026

The owner explicitly requested visible saved chunks and continuation after interruption. This supersedes the earlier whole-week-only visibility rule for unfinished drafts. Save validated parts in the existing private workspace, expose them as an unfinished read-only preview, and resume only missing compatible parts after an explicit action. Complete replacement still requires every requested plan part and the original draft comparison. Preserve published/reviewed content, reject incomplete checkpoint review/release at API and database boundaries, and never start paid inference merely because a page reloads. A checkpoint is not student delivery or completion.

## Owner correction: second designated admin, 11 November 2026

The owner requested a second System Admin using the specified institutional Google account, retaining the original admin. This supersedes the single-owner-address restriction only for those two designated accounts. Both require a trusted assigned admin role and Google verification. Ordinary role changes protect both admins; institution-wide email-domain membership does not grant admin access. Each admin retains its own provider credentials, private history, workspace and account-scoped reload hints. Support selections still apply the selected person's current permissions and cannot fabricate student activity. Registration is distinct from completing the account holder's first Google sign-in.

## Owner correction: Dean activity pages, 11 November 2026

The owner authorizes Dean navigation **Dashboard, Course, Instructors, Students**, clickable shared summary cards, read-only course/load/class-list statistics, removal of Dean import/Templates/History/block-edit controls, and year-grouped blocks opening downloadable student lists. This supersedes the earlier identical Dean/Associate Dean interface requirement for these controls only. Confirmed records and backend permissions remain; Associate Dean shared imports/loading/templates/history/block correction remain. Dean oversight, offline review and read-only Performance remain accessible from the new pages. [Manual 36](../../system-manual/36-dean-activity-records/README.md) records the replacement and reload behavior.

## Owner correction: syllabus builder header, 12 November 2026

The owner explicitly removes **Load curriculum outline** from the Syllabus Builder header. The matching introduction no longer offers that action. File import, **Upload Different**, curriculum course selection and Pulse drafting retain their existing behavior; this is not a change to generation, storage, authorization or reload restoration.

## Owner correction: remove in-app review, 12 November 2026

The owner removes Review Inbox, its navigation links and correction-request interface because syllabus review happens outside EduPulse. Old review-tab URLs resolve to Syllabus & Delivery. Existing saved notices and backend audit history remain intact. Demonstration activity must not be relabelled as genuine.

## Owner correction: CIT directory and named support accounts, 12 November 2026

The owner limits active students to CIT and removes own-account role views and their four placeholder accounts. Retired records are preserved rather than destroyed. Named staff and 417 CIT profiles retain access under their existing roles; selecting an actual authorized person is required for academic support views.

## Owner correction: compact providers and settings library removal, 11 November 2026

The owner requested a visible Gemini connection card and provider choices containing only a logo, name and Connect button. Reuse the existing Gemini key/model flow; preserve private saved credentials, OpenRouter authorization and model testing. ChatGPT plan access stays unavailable without approval, with requirements under Connection details. The owner also explicitly removed the Knowledge library panel from settings. Do not restore its drop zone, paste form, indexed table or comparison controls there. Preserve existing documents, access boundaries, retrieval, Pulse attachment intake and syllabus reference indexing. Removing a panel does not authorize deleting account data or removing backend extraction/OCR services.

## Owner correction: scoped outline sections and source-based courseware, 11 November 2026

The owner explicitly renamed the last columns to Teaching-Learning Activities and Assessments, replaced numbered Contents inputs with one multiline field per section, and removed the teaching-material dropdown. Assessment choices are restricted to Multiple choice, True or false, Enumeration, Identification, Essay, Matching type and one combined Follow-along / Step-by-step documentation guide or criteria. The owner confirmed that weeks may contain several sections and a section may span weeks. Preserve unique calendar slots, printed section boundaries, shared IDs and examination rows; changes to a shared section must reach every associated week. Do not flatten separate sections or restore retired type choices.

New section-based generation uses the scope's topics/outcomes and retained Section 7/weekly references. Teaching outputs may be generated or explicitly attached by the instructor; assessments follow actual teaching output and each section's supported format, with an explicit instructor request overriding the suggested type. Multiple assessment sections remain separate 3–5-question items, preserving the platform's publication and scoring limits. Enumeration, identification, essay, matching responses and documented follow-along work use instructor marking; do not fabricate automatic scores. Preserve checked/published items before inference, explicit resume, schema/source bounds and private ownership.

Retain accessible source bytes and extracted searchable text before source-based generation. Missing/protected/catalog-only material is not teaching evidence; request a readable copy and disclose truncation instead of claiming a whole book was read. A highlighted passage can search the draft's retained copies, show an exact or related source excerpt with the matching sentence highlighted, and explicitly send generated text plus source context to Pulse. Related text is not proof of factual support. Source popover reload hints contain only bounded coordinates, a content signature and a verified source ID, never source text or commands; reload may repeat authorized reads but never paid explanation or generation. Private attachment provenance stays in the existing instructor-only metadata envelope and must not enter learner delivery.

Do not regress section-specific generation identity: partial assessment generation must use the original outline section position/ID, never the index of a filtered response. Course completion and missing-content counts require every section assessment, while reviewed/published items and instructor attachments remain protected.

Do not regress progressive placement or phone geometry: a whole-week proposal without nested sections must replace its canonical blank section before normalization. Never discard existing multi-section/shared IDs. The wide outline remains inside its scroll/paint region on narrow screens, so it cannot enlarge the layout viewport or push fixed Pulse controls outside the phone.

Do not regress multiline export/import: remove the exact EduPulse approval/page footer from outline parsing. Its page counter must never populate a blank printed week or become an assessment. Preserve actual multiline outcomes/activities/assessments and the original retained bytes.

The trusted courseware plan supplies the stored written-response format when a model omits its optional responseFormat tag. Omission must not relabel enumeration, identification, matching or follow-along work as an essay; contradictory supplied formats still fail validation.

### Owner correction: instructor dashboard, syllabi and conditional scrolling · 12 November 2026

The owner requested course labels on block cards, actual score summaries, Delete in place of Archive, one combined history control, removal of Version/Outline list columns, sender-only Shared Repository and received copies in My Syllabus labelled by sender. Implement explicit saved-copy delivery to registered instructors; receipt must not grant access to private workspaces, retained books, approved bytes, courseware or automatic approval. Copying into an owned draft remains explicit. Deleting a syllabus withdraws publications and retains scored history; deleting an incoming entry does not delete the sender's work or an independent draft. Preserve current-version/marked score rules and pipeline-test provenance; missing scores cannot be fabricated.

Do not regress: shared UI tables/charts use available width and auto overflow. Short tables must not inherit a forced 420-pixel width on phones. Keep genuine wide matrices/outline scrollable. Support sharing stays owner-gated and audited. Reload restores current allowed reader/history/share/delete references without storing unsaved recipient emails or replaying writes. Focus/timers/reconnects must not trigger list reloads.

Score Snapshot displays saved values directly, without animating through intermediate percentages. Keep Recharts own measured width: its internal zero-width overflow wrapper means `max-width:100%` on the chart wrapper can collapse the visible SVG. Responsive checks must verify a nonzero chart width as well as absence of page overflow.

Do not regress approved-file intake preview: a freshly scanned, unsaved syllabus can open in the read-only syllabus modal before selection. Keep it in memory, separate from saved-record navigation references; opening it must not save or activate it.

Syllabus imports the shared academic stylesheet explicitly. Shared table/action/history layouts must work on direct navigation; do not rely on Dashboard or another lazy route having loaded those styles first.

Shared-summary reads use 500-row pages below the PostgREST response cap, and check the explicit 1,000-share capacity before returning success. Do not replace pagination with a 1,001-row limit that the API can silently cap at 1,000.

## Owner correction: combined instructor monitoring · 12 November 2026

The owner combines the instructor's Student Monitoring and Performance content and removes the separate instructor Performance page. Preserve Student and Dean performance authority. Student summaries precede class search/filters, then recorded year categories with course/block cards. A selected class opens a full-page dialog with Students, Assessment Scores and Learning Material Access, each with summary cards. Every chart/table/popover must use the same selected membership set; never fill a cross-course matrix with unrelated “Not enrolled” learners.

Retain raw assessment averages/radar/history, submission coverage, instructor marking, mapped-topic/cutoff review, acknowledgments, retained attempts and explicit reminders in the merged assessment tab. Student popovers show every released assessment or material and the final average/progress. Zero is a valid mark; missing, pending and old-version results cannot become zeros or current mastery. These are not official institutional grades.

Instructors manage only their course roster. Suspension precedes removal and blocks new released-content/assessment/progress actions at the database boundary. Resume is explicit. Removing a membership preserves the account, official directory profile and recorded history. Reimports cannot undo explicit suspension/removal; a single payload cannot bypass the prior saved-suspension requirement. Preserve the 35-student block limit and revision-checked confirmation/retry.

Reading completion must have actual persisted evidence. First opens never imply finishing. Students explicitly confirm each full document section in sequence; the database derives totals and checks current publication/version/enrollment, with idempotent locked progress. Retain old-version progress separately. Reading acknowledgment is not proof of comprehension. Staff support cannot create student activity, and test provenance stays explicit.

Do not regress nested dialog restoration: portal mount order can put a parent over its child on reload. Logical depth determines DOM order, focus and the active Escape handler. Restore only bounded current authorized class/student/action references; do not store unsaved roster edits or replay a write. Keep no-polling/manual-refresh behavior and native overflow only where content needs it.

Monitoring visual checks also preserve a single dark-mode select chevron and reset the internal class body to its summary cards when changing tabs. Completed-material counts remain distinct from confirmed-section progress; do not reuse section totals under the Materials completed heading.

Keep assessment-session SELECT authority in one policy containing the same student-self, owning instructor/admin and Dean conditions. Do not add overlapping permissive policies or broaden Associate Dean score access when extending monitoring.

## Owner correction: full curriculum population · 12 November 2026

The owner authorizes assignment of the recorded curriculum to active CIT students across all periods and year levels, including instructor/block designation. This is an administrative allocation, not an invented EduSuite export. Preserve units, recorded year and semester, the 35-student block cap, existing approved syllabi and private backups. Reconcile legacy test block labels as assignment corrections; never relabel activity provenance. Missing syllabi remain drafts and cannot manufacture offline approval.

Before release, students may see their own whitelisted course assignment metadata and pending status. Do not expose draft outlines, source files or assessment keys to achieve this. Staff support cannot fabricate learner opens, reading or responses. The owner requests true activity; missing scores must remain missing until actual student actions occur. Management labels must distinguish student assessment attempts from instructor syllabus approval, which remains outside the system.

Do not regress student dashboard assignment counts: merge pending assigned-course metadata with active-course records, deduplicate by course ID, retain missing scores as missing, and label pending/suspended status explicitly. Units and curriculum period remain visible on cards. Read block/year from authorized recorded metadata rather than parsing a block name. The narrow reminder header must wrap its guidance without overlapping the heading.

## Owner correction: author the teaching content directly · 12 November 2026

The owner asks Codex to generate Weeks 1–5 itself before depending on the signed-in provider session. Save original teaching/activity/assessment drafts additively under the actual instructor workspaces. Preserve existing content and approved scope; only blank Drafted outline rows may be prepared. Keep new content Draft and leave missing approvals and learner evidence missing. Direct authoring must be labelled accurately, with no fabricated provider execution, retained-source support, scores, attendance or service/practicum hours. Unselected language/elective tracks remain explicit instructor-review proposals. Do not regress idempotent additions, revision protection, private backups or multi-section refusal; a more complex scope requires an actual section mapping, not flattening.

## Owner correction: per-instructor teaching set and demonstration · 12 November 2026

The owner explicitly authorizes a primary eight-entry set for each active instructor: two received shared syllabi, four owned entries and two fully written drafts, plus a Weeks 1–3 delivery/assessment demonstration with later assessments untouched. Retain additional curriculum assignments under Show all syllabi. Complete drafts contain the full proposed outline, requirements, grading/policy proposals and readings, while actual offline signatories remain required. Do not fabricate approval to make every owned course active. Preserve the existing confirmed elective allocation when an approved offering has no block.

Label every scripted learner action Pipeline test. Normal score, access, session and reading RPCs remain authoritative; preserve genuine activity and graded test attempts on retry. Three selected members per recorded class exercise the pipe while other students and all Weeks 4–5 assessments remain available for manual testing. Scripted reading confirmations do not establish human reading or comprehension. Keep real timestamps and existing role access. Do not regress fixed True/False string options, canonical approved topic identity, the checked-before-publication transition or answer-key secrecy. Prepared unapproved content can be reviewed by its owner with approval status visible and Publish disabled.

## Correction: dashboard startup is read-only ? 13 November 2026

Remove once-per-session legacy projection replay from AcademicContext. Confirmed saves already maintain the projection. Do not regress: entering/restoring a dashboard or clicking Refresh records must issue academic GETs, never synchronization writes. A failed optional legacy command cannot prevent available authorized records from loading. Preserve subject verification, empty-on-revocation, manual refresh, revision protection and post-mutation readback.

## Owner correction: bounded instructor loads - 13 November 2026

Replace the all-block curriculum allocation with 5-10 actual course/block assignments per active named instructor. The screenshot count means course/block classes, not a display slice or unique block names. Preserve course ownership, the prepared syllabus mix, recorded year, units, 35-student class limit, approved delivery, and all scored/access/reading history. Retain private backups and use guarded administrative allocation changes. Do not regress by rerunning all-block population over bounded allocations or merely hiding excess cards. Monitoring and every role must read the same saved assignments. Current reload/manual-refresh rules still apply.


## Owner correction: registered sharing and suspension - 13 November 2026

Replace typed share emails with registered instructor selection. A received copy may become an owned draft or, after explicit acknowledgment and verification of the sender?s matching retained approved file, an owned active syllabus. Preserve sender provenance, shared outline IDs, private source boundaries, revision checks and idempotent retries. Approved use copies the approved attachment only through the server action; no publication or enrollment is implied. Remove Version History and Copy for next term controls; retain internal saved history. Require a saved suspension before a separate delete action for owned and shared entries, preserve scored history, and never republish on resume. These owner instructions supersede the earlier single-history/direct-delete baseline.

## Owner correction: student course cap, practice and Admin activity - 13 November 2026

The owner relaxes the instructor 5-10-class cap and requests at or below ten student subjects. Use ten recorded subjects in Years 1-3 and the five actual Year 4 curriculum subjects. Do not invent subjects or units. Preserve recorded class ownership, student year, approved scope and scored history. The original all-block expansion cannot overwrite the new allocation.

Authenticated My Courses has enrollment cards labelled with instructor and opens the selected course's delivered learning/assessment items. Reading must not wait for an access-record write; report a recording failure honestly. Practice Assessments has instructor-result baselines and separate repeatable self-practice, generated explicitly from released enrolled reading through the user's connected provider. No unreleased instructor questions/keys are used or revealed. Practice marks are not official instructor marks or topic mastery. Keep private answer keys, idempotent submissions, ownership/release checks and missing-mark semantics.

The owner explicitly authorizes Admin manipulation of the selected student view. Add opt-in labelled demonstrations through the existing live-verified support gateway, preserve the real Admin actor, and refuse relabelling/replacing independent learner work. Reload must clear action consent and must never replay activity. Keep ordinary read-only preview available. Owner-authorized scripted Weeks 1-3 exercises/allowed retakes remain Pipeline test; later assessments stay untouched for manual use. Their values cannot be presented as independently earned achievements.

## Owner correction: remove routine academic header controls - 13 November 2026

Remove the shown Records up to date indicator, page-header projection export buttons, and yellow Admin demonstration checkbox/panel. This supersedes the earlier UI opt-in requirement: an already verified Admin student view may send the existing labelled command flag on explicit learner actions directly. Do not regress live subject verification, Admin attribution, protection of independent student work or no-write reload restoration. Retain recovery/refresh when needed, specific CSV downloads and Settings workspace backup. No data or permission policy changes are implied.

## Owner correction: course tabs and complete assessment dialogs - 13 November 2026

Add All, Teaching Materials and Assessments to the selected student's course. Open delivered materials, official assessments and practice questions in separate page-sized dialogs using the existing modal layer. Every official question is in one continuous view; remove question wizard/Previous/Next controls. Do not regress keyboard close/focus, phone sizing, existing question formats, timers, deadlines, allowed attempts, grading or Admin attribution. Persist only authorized navigation references, resolve existing sessions from fresh records, and never replay an action on reload or store unsaved answers as navigation hints.

## Owner correction: remove visible test indicators - 13 November 2026

Remove Pipeline test/test suffixes and the Activity origin column from academic displays, dashboard/review labels and Dean totals. Remove the associated test-origin selector/notice. This supersedes the earlier requirement to show origin labels in those interfaces; preserve provenance in stored audit fields and Admin attribution, and do not rewrite test rows as independent learner work. Keep the same default saved rows, raw scores, dates, current/earlier version and marking status. Visible score CSVs match the reduced columns. Keep authorization, filtering by actual course/block/date, scoring and no-write navigation intact.

## Owner correction: direct editable syllabus drafts - 13 November 2026

Generated syllabus wording is validated and placed directly into the open draft form, without a separate chat confirmation. Saved owned drafts reopen as editable targets; saving stays in Syllabus Builder. Week-by-week follow-ups retain the current syllabus/conversation context, explicit week requests override stale selections, and relevant next actions are offered. Preserve immutable IDs, shared scopes, stale/conflict checks, source validation and revision saves. This supersedes generated-syllabus preview/placement confirmation only; file imports, roster operations and courseware retain their existing controls. AI edits never check, approve, activate or publish.

## Owner correction: consistent student summary cards - 13 November 2026

Student My Courses, Practice Assessments and Performance/topic summaries use the existing dashboard SummaryCard rather than a plain duplicate. Preserve the shared icon tile, color tokens, value/label typography and responsive grid. Do not regress: retain current authorized values and missing-result semantics, do not introduce student links to staff records, and preserve existing Dean summary destinations.

Keep long summary status text contained beside its icon on small screens; retain the original status text rather than replacing it with a numeric zero.


## Owner correction: independent monitoring and shared cards - 13 November 2026

Use Dashboard's SummaryCard component throughout instructor monitoring and put roster actions inside three-dot menus. The owner requires true student activity, excluding scripted demonstrations from monitoring scores/access/reading. This supersedes the earlier instruction to include the same saved demonstration rows in monitoring while hiding origin labels. Preserve those audit rows, approval/publication controls, zero-vs-missing marks, course/block/version boundaries, suspension-before-removal and no-write reload. Do not fabricate student activity to populate an unreleased class.

## Correction: canonical section reference collection - 14 November 2026

Collect source references from the actual outline sections, using weekly resources only for older rows without sections. Do not regress: section-only saved outlines must not lose source links, stale weekly projections must not reintroduce removed links, shared-section references must deduplicate, and selected-week generation must retain the overall bibliography without including unrelated weeks. Keep collection immutable, the existing 80-reference bound, exact citation associations, unread-source disclosure and private source boundaries. No saved-data rewrite is required.

## Correction: discoverable Pulse voice and independent playback - 14 November 2026

Keep the microphone control visible beside the message box before voice is enabled. Every Pulse text reply offers explicit Read aloud / Stop reading using existing browser speech playback, even without recognition support. Do not regress: no permission request until Start listening, no model call to reread text, no automatic audio on opening/reloading, account/view cleanup and typed chat remain available. Playback uses the existing bounded excerpt and speech-language preference. Stop or replacement must invalidate late callbacks from an older utterance; unavailable or failed playback must explain itself even with voice controls closed.

## Owner correction: one-button multilingual dictation - 14 November 2026

Remove language/mode dropdowns, the conversation loop and automatic speech submission. The composer microphone starts recording immediately and becomes a square Stop recording control in the same position. Stop releases the microphone and transcribes the recording into editable draft text; Send remains explicit. Use actual multilingual provider transcription rather than claiming that omitting Web Speech's single-language hint implements detection. The active actual-account OpenRouter/OpenAI/Gemini connection processes transient bounded audio; no silent provider switch, replay, audio persistence or chat-model selection change. Clearly disclose provider transcription and its usage. Ignore old conversation preferences. Cancel/close/hidden tab/account changes must discard pending audio/results and release tracks, including a late permission grant. Retain independent read-aloud playback, also stoppable from the composer icon. This supersedes the prior language selector, conversation mode, Start listening panel and browser-recognition-only requirements; preserve existing text/tool permissions and no-audio reload.


## Owner correction: course-contained Instructor teaching workflow - 14 November 2026

The owner places Syllabus inside Course and removes the Instructor Syllabus navbar. The signed-in Course list is authorized by exact current Dean load IDs, including courses awaiting a syllabus; an existing workspace file or guessed name is not a teaching-load grant. Dashboard totals and per-topic access/assessment pills summarize only accessible assigned courses/current active memberships, with independent current-version student evidence. Retain genuine zero vs missing/pending distinctions and exclude scripted/Admin demonstrations from independent monitoring.

A selected course without an active syllabus offers local approved PDF/DOCX intake or explicit adoption of a received approved same-course copy. Keep matching course identity, actual retained approved bytes, acknowledgment, offline approval and revision protection; extraction is not signature verification. The ready workspace presents chronological weeks and stable topic scope sections, direct/file/link teaching authoring, assessments covering materials since the prior assessment, and a final overall topic assessment. Extracted activities/assessment labels provide context. New AI generation is explicit and remains Draft for review; unread binary/URL metadata must not become source text. The seven assessment types and all existing grading, review/delivery and private answer-key boundaries remain.

Do not regress week moves: move complete sections and related content into chronological teaching slots, preserve IDs/shared scopes, and leave exam slots fixed. Confirm when delivered/hidden content is affected; changed content returns to Draft before rerelease while attempts/history remain. Concurrent saves/generation must reject stale outline/reference/topic targets, not overwrite newer teaching work. Keep the existing prepared-draft review and offline approval requirements; the navigation redesign does not authorize fabricating approval or scores.

Syllabus sources follow the weekly sequence. Explicit approved intake checks/reads cited links and indexes actual readable non-catalog copies; ordinary navigation/reload must not silently redownload them. An instructor's matching uploaded readable copy is primary context for the same cited work/link. Retained catalog metadata, inaccessible links and unread content remain separate from factual evidence. Preserve exact citation association, private immutable source copies, readable-context checks and current reference bounds.

Teaching attachments use a private immutable Storage bucket (4 MB per file), server-created subject paths and short signed downloads with current role/publication/enrollment checks. Keep byte payloads out of workspace JSON, do not make the bucket public, do not permit replacement of released bytes, and do not expose a service-role key. Any-file attachment support must not claim that every file type was extracted. Keep the distinct approved-file and retained-reference limits.

## Owner correction: system chat before generation - 14 November 2026

Ordinary chat, friendly replies, application explanations, record searches and navigation use system rules and currently authorized records/content. Bounded typo matching may suggest a page/name but never correct an identifier or execute a guessed mutation. Remove automatic generative planning/general-knowledge fallback; use AI for explicit educational content generation/revision only. Public Internet suggestions require an explicit allowed web request outside those authoring workflows. No provider/on-device inference is implied by a connected badge, lack of local evidence or vague navigation request. Existing deterministic write tools still require their applicable confirmations and authority.

System citations open a separate source dialog, recheck the original question/source under current authorization and offer explicit navigation into a whitelisted application route. Store only bounded conversation/message/source references, never source text or authorization DTOs. Resolve the exact current source ID and current route IDs; revoked, unavailable or ephemeral sources fail closed. Opening a teaching source is read-only and must not manufacture a student-open event, assessment session, response, save or inference, including on reload. Preserve the manual-refresh model, scoped view restoration, confirmation semantics and the current microphone Stop/transcribe-to-draft/explicit Send behavior.


## Owner correction: discard old teaching seeds - 15 November 2026

The owner explicitly removes the old seeded/generated teaching set before applying the new course-contained workflow. This supersedes earlier requests to retain the seeded syllabus mix and demonstration activity: remove the old saved syllabi, shared copies, coursewares, delivery publications, associated teaching sources and dependent demonstration records. Preserve the Dean/Program Coordinator's loaded courses, catalog, block/section rosters, matching course memberships, accounts and directory records. Do not regress: this is an explicit one-time operational reset, not an automatic startup/migration/CI cleanup; do not repopulate the rejected seeds, invent scores/activity, reset workspace revisions or weaken permissions. Require private backups, unchanged-snapshot guards, exact rollback rehearsal and preservation assertions. New independent learner activity must stop a repeat of this demonstration reset. Retain unrelated conversation/provider settings and audit history. Ordinary instructor delete/suspension and historical evidence rules continue for future real teaching work.


## Owner correction: separate Instructor syllabus repository - 15 November 2026

Restore Syllabus as an Instructor navigation destination, separate from Course. It contains the complete owned syllabus list, received copies with sender provenance, outgoing Shared Repository and Syllabus Builder. Draft PDF/DOCX intake extracts into editable fields; explicit save creates a draft and PDF export rebuilds the reviewed fields. Repository authoring does not add a Dean teaching load, activate a course, publish content or invent approval. Course retains one approved same-course syllabus as its teaching basis and offers intake only until one exists; the repository/builder must not be embedded in its tabs. Existing active-syllabus revision, offline approval, registered sharing, private files, saved suspension before deletion and conflict protections remain. Do not regress: preserve direct tab/edit URLs and authorized no-write reload, redirect former nested syllabus links to the repository, list all owned syllabi rather than a seeded teaching-set slice, and do not restore the discarded teaching seeds. This supersedes the earlier course-contained Syllabus navigation only; chronological weeks/topic teaching and system-first chat remain.


## Owner correction: remove Admin support footer - 15 November 2026

Remove the persistent bottom Viewing indicator and its Return to System Admin redirect button from every Admin-selected academic view. Use the existing header/account-menu Switch view chooser for account changes and explicit return to System Admin. Do not regress: do not reintroduce the sticky strip or substitute another routine banner; keep selected identity in the existing account menu, fresh actual-Admin/subject verification, actor attribution, permitted commands and no-write reload. This UI cleanup does not revoke the selected view or change authorization, and it does not remove explicit recovery when a saved subject cannot be verified. This supersedes the earlier routine persistent-banner requirement only.


## Owner correction: remove redundant sharing/status UI - 15 November 2026

Remove the routine Refresh shared syllabi action and the generic Workspace needs attention header indicator. Do not replace them with other routine labels or add polling to compensate. Keep actual shared-list errors with an error-only Retry, and retain detailed workspace save/backup/conflict recovery in Settings. Do not regress: suppressing the label must not clear dirty/error/conflict state, claim that a failed save is still pending, weaken revision checks or replay a write/inference. Existing read-on-entry/action refresh and manual-view freshness rules remain.


## Owner correction: unified Course and teaching-load inspection - 15 November 2026

Dean and Program Coordinator use one Course page: shared summaries first, then course cards. A course opens a page-sized modal with its own summaries and instructor/block/semester teaching-load CRUD. Assignment is the same persisted Dean load consumed by Instructor Course; it does not invent a syllabus or enrollment evidence. Course list and Course loads must not become separate tabs again. Keep legacy links, explicit import review, confirmed removal and scoped no-write reload.

Management can scan the current loaded instructor's syllabus original, extracted course/term outline and authored teaching materials/assessments, including drafts. This grants no content editing, delivery, grading, answer-key access or access to the full private workspace/source archive. Do not regress: recheck live role, current load and expected instructor; select the same course/term basis as Instructor Course; whitelist display fields and protect draft attachment downloads. Inspection and restored readers must never record learner events, attempts, opens or workspace saves. Atomic load edits must reject stale selections and occupied destinations without losing the original load or its extra metadata. Preserve offline approval, historical attempts, revision conflicts, private files and the prior one-time teaching reset.


## Owner correction: extracted topic authoring and weekly block delivery - 16 November 2026

The signed-in Instructor course has exactly Weeks and topics and Block sections. Remove the old Review and deliver / Review drafts workspace and keep prepared/approved content in the correct extracted topic sections. Do not regress: review/check, protected published revisions, assessment policy, reference association, draft approval boundary and actual topic progress remain. Legacy review URLs resolve to Block sections; Syllabus remains a separate repository.

Each currently assigned block has an explicit date/opening time for every outline week in Asia/Manila; a same-day later close is optional. A first-date pattern fills actual seven-day week slots, with individually editable dates and explicit revision-checked Save. No automatic guessed dates, saves on reload or cross-block schedule reuse. New/revised delivery uses the block calendar, requires checked content and an active approved syllabus, and cannot bypass the current assigned load. Older publications keep their delivery semantics until explicit redelivery. Do not regress: class windows govern actual learner/file/read/assessment actions, not only labels. Outside the window, return titles/availability and owned result history without content/questions; direct publication/file RLS also fails closed. Schedule changes stay outside the content hash and preserve attempts, scores and reading records. Optional no-close means available after opening; close is exclusive. Existing owned self-practice remains separate repeatable history, while creating a new practice set requires available reading. Scope reload hints to authorized IDs only and never replay a save/open/start/response/inference.


## Owner correction: remove Admin dashboard Refresh - 16 November 2026

Remove the routine Refresh button from the main System Admin dashboard header. Preserve initial authorized reads and readback after account changes; do not add polling or remove separate role monitoring controls.


## Owner correction: page readers and usable attachment selection - 16 November 2026

Teaching readers and long authoring forms use a shared page-modal shell: fixed padded contextual heading/close, one scrolling body, phone viewport sizing, focus/Escape restoration and the existing portal layer. Apply it consistently to Instructor content, Student official/practice readers, Admin support views, Dean/Program Coordinator course scans and approved-file previews. Existing syllabus-details and retained-source readers already separate their header/body controls; preserve those working paths. Small confirmation dialogs and source-passage popovers retain their purpose-specific sizes.

Do not regress: a pending local workspace journal must not permanently disable file selection or the entry to a teaching form. Stage an owned file, then explicitly save it through the existing private, immutable upload and revision-checked workspace paths. Expose the real current save/conflict reason while persistence must wait. Preserve file bytes, teaching text, questions, topic/coverage fields and metadata; changed checked content returns to Draft. Private preparation is allowed before approval; published/hidden revisions, approval and checked delivery remain guarded. Students/management retain read/download scopes only, including class windows, and an inaccessible file must show its actual error with usable retry controls. Failed downloads do not lock other files. Keep unsaved file bytes out of reload hints, and never replay uploads, downloads, learner opens, attempts, saves or inference on reload. No business-data rewrite or new database permission is authorized by this UI fix.


## Owner correction: restore students and restart document-based loading - 17 November 2026

The owner explicitly restores all original departments and removes all instructor teaching loads before uploading their actual load forms. This supersedes the 12 November CIT-only active directory and earlier load-retention clauses for this one-time reset. Restore the exact preserved non-CIT identities and their original unbanned status, retaining passwords and later independent suspensions/removals. Keep legacy placeholder accounts retired. Clear loads and reconcile their derived memberships; preserve catalog, blocks/rosters, workspaces, source files and academic history. No new teaching or learner activity seeds are authorized.

PDF intake through Pulse and Course is deterministic system work. Read native cells or on-device OCR with actual table boundaries, keep all rows within explicit file/page/row limits, and show unreadable pages, original fields and total discrepancies. Do not put a clipped chat excerpt or model guess in charge of administrative loading. Require active instructor, recorded course, actual block and term mappings plus a concrete review confirmation. Source subject suffixes are not proven block IDs; scanned degree/headcount fields do not overwrite staff qualifications or enroll students. Preserve source filename/page/row/year/semester, listed and computed schedule hours, lecture/lab units, room, days/time and program. Source AM/PM ambiguity is not authority to create delivery schedules.

The owner confirmed Current = First Semester AY 2026-2027, Previous = Second Semester AY 2025-2026 and Next = Second Semester AY 2026-2027. Retain historical/next loads separately by course, block, semester and year; they must not populate current enrollments or current instructor dashboard totals. Expose term filters on the relevant Course/Instructors lists and preserve the chosen filter in the URL. Do not regress: explicit import only, live management permissions, atomic stale-record checks, no duplicate target overwrites, no password resets, no automatic courseware/approval/learner writes, and no replay of upload or confirmation on reload. Unconfirmed upload bytes/forms stay outside navigation storage.

The restored directory must not reintroduce retired instructor placeholders. Exclude infinitely banned teachers from management choices, label finite current bans as suspended, and reject manual, CSV and document loads for currently banned teachers even if their separate suspension metadata is missing. Do not regress: verify live account status in the shared assignment function rather than trusting the selector alone.

An image-only chat/Course PDF can produce the sandbox's 422 `NO_READABLE_TEXT` response before the local table reader starts. Continue only that PDF-specific case into the bounded local PDF/OCR reader. Do not regress: keep authorization, rate, network, timeout, format and size failures intact; keep the sandbox/indexing quality checks, unreadable-scan refusal and explicit import confirmation. Browser scan fixtures must return the real no-text response rather than substituting a successful text-layer extraction.

## Owner correction: assigned Instructor details and independent class handovers - 17 November 2026

Instructor teaching rows require a current Dean/Coordinator load in the selected term; repository ownership alone must not populate an empty-load modal. Removing/switching a load removes those teaching rows. Preserve the separate owned syllabus repository.

The owner confirms independent copies when only some blocks move. Same-course/block/term replacement transfers a bounded copy of the approved source, extracted syllabus, authored/checked/published content, private file access, associated retained sources, schedule and that block's actual learner evidence. Remove-then-replace retains an immutable deduplicated teaching checkpoint. Other blocks, source workspaces and the recipient's unrelated teaching remain unchanged. Bind inherited loads to their specific syllabus basis; a course code alone cannot select between independent copies. Changed block/term is a different class and cannot silently inherit the old student's history.

Do not regress: atomic management-only writes, current account/banned checks, private immutable files, verified approved-file integrity, source provenance, capacity limits, actual block membership/overrides, marks/dates/versions/attempt limits and Admin/test attribution. Historical replication is not a learner action or a new earned score. Keep original records and add lineage to copied evidence. Existing published contents/windows continue without replaying delivery notices, opens, attempts, indexing or inference. A bounded private transaction/owner context permits this explicit transfer only; ordinary saves retain every owner/check/publication guard, ordered locks and revision conflicts. Reload restores only currently assigned class/basis references and never replays handover.

## Card actions and catalog lifecycle — 18 November 2026 correction

The prior unfinished Course-card action work was not present on the released branch. Restore Add Course and three-dot Course menus, and put Instructor card/dialog actions into the same shared menu pattern. Course removal is offered and accepted only after suspension. Keep course codes immutable, title/metadata editable, and current-version conflicts explicit. Do not regress existing classes or learner evidence: catalog suspension/removal blocks new assignments but preserves loads, original teaching files, courseware, scores and handover checkpoints. A removed code stays reserved. Imports must not reactivate it implicitly. Account removal retains its separate existing suspension requirement.

Do not regress keyboard access, focus return, portal isolation, in-viewport positioning on reload, role parity or support-view authorization. Restore only bounded record/action references from fresh records; never cache forms or replay writes. Catalog creation must not assign a class or populate a seed. The native handover regression must continue passing with catalog guards installed.

A restored parent dialog must not take keyboard focus from its already-open child action menu. Re-establish menu focus after parent layout initialization and cancel that pending work when closing/unmounting, so Escape dismisses the menu before the dialog. Check this for Dean and Program Coordinator on desktop and phone.

## Semester catalog and instructor-confirmed class lists — 18 November 2026 correction

The owner replaces course year/default-semester fields with code, title and units only. The shared selected academic term supplies the year/semester. Current and next are editable; previous, other recorded and aggregate views expose no authoring actions. A semester-specific catalog retains immutable course identity and independent title/units/status/version. Existing master curriculum records and source files remain unchanged.

Dean/Program Coordinator assignments grant a course to an instructor, without blocks or enrollments. PDF/grid intake follows that same rule and retains original schedule/page/row/term fields separately from the confirmed assignment. Source headcounts and suffixes never create students or blocks. Instructors add a class list under their own editable assignment, or choose individual registered students from the full directory, including other blocks/departments. Official identifiers and active accounts are verified; names/email/years are resolved from the directory rather than trusted from the upload. Maximum class size remains 35. Confirming a class before syllabus approval exposes course labels only to that student, never draft contents.

Do not regress: explicit confirmation, live role/account checks, revision conflicts, stale assignment/source checks, term-scoped rosters and overrides, immutable home records, independent replacement teaching copies, retained block evidence and private file boundaries. Switching/removing an instructor applies to that course/term's confirmed classes and preserves the teaching package for explicit continuation. It must not change another semester. Completed operational syllabi, publications, memberships and learner records reject writes even through a direct API/RPC. Current saves skip completed projections instead of deactivating or rebuilding them. Historical repository draft copies remain separate from operational history. No seed teaching loads, courseware, scores or learner actions are created by these migrations. Advancing the institution's current semester requires updating both the confirmed term configuration and the database term policy together; do not infer it from today's date.


## Department home placements - 18 November 2026 correction

The owner explicitly requests home blocks for all existing students across departments and confirms 2027-x-xxxx as the first-year intake. Allocate missing home placements by official program and recorded year with a 35-person maximum, preserving valid existing placements. Correct that intake to Year 1 only; do not derive every other year from an ID prefix. Retain individual/irregular placements when recorded. The earlier clarification defines ?international students? as individual directory selections across blocks/departments, not nationality. Do not invent nationality, irregular status, accounts, course membership, teaching loads or learner work.

Do not regress: home block summaries must use the directory even before any course is loaded. Enrollment-derived cohorts remain separately scoped to actual course teaching. Students read their own home placement and aggregate size only, through a live-role/identity checked helper; Admin support reuses the verified subject context. Preserve other account fields, passwords, bans, prior teaching and learner history. The one-time 2027 intake correction is not a permanent rule preventing later academic promotion.


### 18 November 2026 - One Students directory, department section filters

Owner correction: remove the Student list / Blocks / Sections tab split. Show the complete authorized directory on one page with search, department, year and block filters. Department selection reveals year-grouped home-section cards; a card filters the same table. Retain account management, student detail, irregular-student review and complete filtered CSV exports. Filters/page survive reload through bounded URL values; unavailable detail references fail closed.

Do not regress: never use course enrollment as the complete department directory, hide students merely because no teaching load exists, or recreate a separate Blocks tab. Switching department/year clears stale block selection. Filtering, pagination and reload must not write accounts, course enrollments or learner activity. The previous-semester read-only boundary and existing live-role authorization remain unchanged. No business data is modified for this presentation change.


## Owner-authorized previous-semester approved load backfill - 18 November 2026

Import the supplied approved revised Second Semester AY 2025-2026 loads as historical records, not Current or Next. Reuse existing identities, including teaching rows for current management staff; never change their live roles. Add the three absent teachers as sign-in-disabled historical accounts. The printed highest degree is a semester snapshot and must not overwrite or be overwritten by current staff qualifications.

Do not regress: all 66 source schedule rows remain intact under 37 course-only assignments and 21 historical course entries. Source suffixes/headcounts are not class placement or actual student membership. Preserve printed and computed totals, source identity/file/hash/page/row and missing AM/PM. A privileged no-JWT postgres maintenance insert may avoid the live handover trigger only for tagged completed-term course records. No client role, support view, public import or normal command can write completed terms. Keep previous-term UI read-only. Current accounts/roles/passwords/bans, master catalog, unrelated records, workspaces, enrollments, publications and learner evidence must remain unchanged. Never restore removed teaching seeds to fill historical gaps.


### 18 November 2026 - Header academic term placement

Move the shared Academic term control into the management page header, aligned right of the title. Remove the duplicate body selectors on Course, Instructors and Students. Wrap on small screens; preserve one accessible selector, shared term state, reload persistence and previous-term read-only behavior. No data or authorization change.


### 18 November 2026 - Landing-only footer

Remove the shared footer from authenticated Layout for all roles, including Admin support views. Keep LandingFooter on the public landing page. Do not reintroduce the bottom provider/status, branding, support or copyright strip on signed-in pages. Retain Settings access to providers and Help. This is presentation only.


### 18 November 2026 - Required manual instructor load metadata

Manual Add/Edit instructor loading collects schedule time/day, units, lecture/lab units, declared hours, room and program, with optional whole student headcount. Validate structured details before the atomic assignment; retain existing import compatibility, role checks, semester restrictions, handover continuity and actual class-list ownership. Never treat the headcount as enrollment.


### 19 November 2026 - Meeting-day selection

Reviewed load rows, manual instructor loads and new block schedules use a Monday through Saturday checkbox dropdown. Select one or two days: M, T, W, Th, F, S. Tuesday and Thursday save as TTh; the same stored codes drive computed contact hours and weekly delivery dates. Existing imported source strings remain visible until deliberately corrected; never silently truncate a source schedule. Do not regress Thursday into Tuesday or allow a third selected day in these editors. Historical source facts stay unchanged.


### 22 November 2026 - Shared agent deployment after account transfer

Do not infer deployment from main being pushed. The school-account EduPulse project is unlinked from Git, and GitHub Actions reports a billing lock before any steps execute. Claude and Codex use the same project-local authenticated `deploy:production` command, verifying the exact project/team, repo, root and remote-main SHA. Upload only a clean Git archive; never include account credentials, private data or unfinished working-tree changes. Keep original build verification, environment settings and production checks. Triggered is not Ready. Never change unrelated projects, billing or repository permissions as a workaround.


### 22 November 2026 - Course catalog table

Course cards and their course-detail modal are replaced by a single course/instructor table. Columns show code, title, units, status, instructor, block sections, retained schedule/source facts and student counts. Unloaded courses retain a row. The final Actions column uses the shared three-dot menu for catalog CRUD, instructor loading/edit/removal, block/class-list management and read-only syllabus inspection. Current/next-term permissions, past-term read-only access, confirmation dialogs and saved data boundaries remain unchanged. Do not recreate the course-detail modal or inline action-button strips.


### 22 November 2026 - Instructor directory table

Replace instructor cards and profile-detail modal with a table: name/email, qualifications/employee ID, specialization, status, course loads, syllabi, last sign-in and final-column three-dot actions. Course-load and syllabus breakdowns expand inline in their cells. Original syllabus/content inspection and explicit edit/status confirmation dialogs remain available through the row menu. Preserve historical term snapshots, past-term read-only access, role-restricted score columns and suspend-before-remove. No account or teaching records are changed by this layout.


### 22 November 2026 - Course weekly schedule popover

Remove the redundant Status column and retained-source-details dropdown from course rows. The Schedule button opens a weekday/time grid with duration-sized meetings, block labels and rooms. Monday-Friday are shown, with weekend columns only when present in recorded loads. Use confirmed section schedules first, source schedule rows only when sections have none; never display both as duplicate meetings or repeat course/instructor/units/term fact panels. Preserve source records and provenance in storage and the existing review/inspection flow. Closing the schedule or restoring its authorized view must not write loads or delivery schedules.


### 22 November 2026 - Instructor record popovers

Course loads and Syllabi cells now use explicit View buttons and separate read-only popovers, replacing the inline disclosure dropdowns. Each popover contains only the selected instructor and term data, preserves role restrictions, closes with Escape/outside click or its Close button, and restores its authorized view after reload. Account actions remain in the final three-dot menu. Opening or restoring these views never writes academic records.


## 23 November 2026 - Supporting UI specification ownership

See versions/supporting-ui-qa-2026-11-23.md for the independent QA matrix and Claude handoffs. Codex supporting changes: student course table with home-block context, no standalone Dean Students station (authorized class-directory links retained), presentation-only Pulse suppression during the actual unanswered student assessment reader, a named Next action for accessible same-course reader items, and neutral Recorded sources wording. Do not turn these UI changes into new enrollment, source processing, scoring, submission, release or academic approval implementations. Schema-limited MCQ options and the audited baseline three-source cap must be resolved with their connected backend, not cosmetic controls. Never claim fixture verification proves real learner achievement or server-side integrity.


## 23 November 2026 - Student classroom phase

Owner now requests student Home course cards, Join Class, published announcements, weekly topics/material-associated assessments, own Scores and a read-only published outline. This supersedes the earlier table-only Home interpretation; My Courses retains its secondary table. Codex owns Student UI; Claude owns Instructor UI and concurrent class-code/announcement backend. See versions/student-ui-2026-11-23.md for the audit matrix, test evidence and dependencies. Do not regress backend membership uniqueness, publication visibility, student-owned answer review or pending manual scores. Never turn an unavailable student draft/upload API into a fake saved draft or successful file submission.

## Topic work privacy and submission receipts

Keep public discussion within the enrolled block and private discussion within the student and assigned instructor. Preserve the parent thread audience on replies, validate publication access and version before writes, and keep student file access limited to confirmed submissions. A retry must preserve the original receipt. Restore the reader and discussion panel without replaying uploads, posts or submissions.
