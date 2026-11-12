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
